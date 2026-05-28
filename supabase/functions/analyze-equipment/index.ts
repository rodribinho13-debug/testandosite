// EQUIPAMENTO IA - Cadastra equipamento automaticamente a partir de plot plan, P&ID ou placa de identificacao
// Versionado localmente em 2026-05-27 via mcp__supabase__get_edge_function
// USAR NA FASE D.7 (IA NR-13): ja existe e funciona — basta wire UI
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const DEFAULT_MODEL = "gemini-2.5-flash";
const MAX_INPUT_BYTES = 20 * 1024 * 1024;

const PROMPT = `Voce e engenheiro de inspecao de equipamentos industriais especialista em NR-13.

A imagem em anexo e UMA das tres coisas:
1) Plot plan / arranjo geral de planta (mostra varios equipamentos com TAGs)
2) P&ID (Piping & Instrumentation Diagram)
3) Placa de identificacao / dataplate de UM equipamento especifico

Extraia TODOS os equipamentos estaticos/rotativos visiveis. Retorne JSON estruturado.

FORMATO EXATO:

###EQUIPAMENTOS_IA_JSON###
[
  {
    "tag": "V-101",
    "name": "Vaso separador de gas",
    "equipment_type": "vaso_pressao",
    "manufacturer": "...",
    "model": "...",
    "serial_number": "...",
    "fabrication_year": 2020,
    "design_pressure_bar": 50,
    "design_temp_c": 200,
    "operating_pressure_bar": 45,
    "operating_temp_c": 180,
    "volume_m3": 25.5,
    "diameter_mm": 1500,
    "height_or_length_mm": 6000,
    "shell_thickness_mm": 12.7,
    "head_thickness_mm": 14.5,
    "material_spec": "ASTM A516 Gr.70",
    "fluid_service": "Gas natural",
    "nr13_category": "III",
    "nr13_required": true,
    "design_code": "ASME VIII Div.1",
    "insulation_type": "La rocha 50mm",
    "external_paint": "Alkidico cinza",
    "location_area": "Area 100",
    "notes": "..."
  }
]
###FIM_EQUIPAMENTOS_IA_JSON###

=== ANALISE DESCRITIVA ===
Apos o JSON, analise tecnica do que voce viu.

REGRAS:
- equipment_type valido: vaso_pressao, tanque, torre, forno, trocador_calor, reator, separador, filtro, outros
- Categoria NR-13 baseada em P*V (litros*bar): I se >100, II se >25, III se >5, IV se >1, V se <=1
- nr13_required = true se P > 1.5 bar OU vapor saturado/superaquecido OU equipamento sob pressao
- Campos NAO IDENTIFICADOS: use null. NUNCA invente.
- Se for plot plan/P&ID com varios equipamentos, liste TODOS
- Se for placa: liste apenas 1 equipamento
- JSON parseavel. Comece DIRETO com '###EQUIPAMENTOS_IA_JSON###'.`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractEqsFromText(text: string): any[] {
  const m = text.match(/###EQUIPAMENTOS_IA_JSON###\s*([\s\S]*?)\s*###FIM_EQUIPAMENTOS_IA_JSON###/);
  if (m) {
    try {
      const raw = m[1].trim().replace(/^```(?:json)?\s*/i,'').replace(/```$/,'').trim();
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
      if (typeof arr === 'object') return [arr];
    } catch (e) { console.error("parse erro:", e); }
  }
  const m2 = text.match(/\[\s*\{[\s\S]*?\}\s*\]/);
  if (m2) {
    try { const arr = JSON.parse(m2[0]); if (Array.isArray(arr)) return arr; } catch {}
  }
  return [];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json({ error: "Sem chave de IA configurada." }, 500);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Body invalido." }, 400); }

  const { file, mime, project_id, auto_save } = body;
  const model = body.model || DEFAULT_MODEL;

  if (!file || !mime) return json({ error: "Campos file e mime obrigatorios." }, 400);
  const approxBytes = (file.length * 3) / 4;
  if (approxBytes > MAX_INPUT_BYTES) return json({ error: "Arquivo muito grande (max 20 MB)." }, 413);

  const allowedMimes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (!allowedMimes.includes(mime)) return json({ error: `Mime nao suportado: ${mime}.` }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization");

  let supa: any = null;
  let orgId: string | null = null;
  if (authHeader) {
    supa = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    if (project_id) {
      const { data: proj } = await supa.from("projects").select("id, org_id").eq("id", project_id).maybeSingle();
      if (proj) orgId = proj.org_id;
    } else {
      const { data: u } = await supa.auth.getUser();
      if (u?.user) {
        const { data: m } = await supa.from("org_members").select("org_id").eq("user_id", u.user.id).limit(1).maybeSingle();
        if (m) orgId = m.org_id;
      }
    }
  }

  const requestBody = {
    contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mime, data: file } }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 16000 },
  };
  const t0 = performance.now();
  let modelResp: Response;
  try {
    modelResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody) }
    );
  } catch (e) {
    return json({ error: "Falha de rede ao chamar IA: " + String(e) }, 502);
  }
  const elapsedMs = Math.round(performance.now() - t0);

  if (!modelResp.ok) {
    const errJson = await modelResp.json().catch(() => ({}));
    return json({ error: "IA: " + (errJson?.error?.message || `HTTP ${modelResp.status}`) }, 502);
  }

  const data = await modelResp.json();
  const candidate = data?.candidates?.[0] ?? {};
  const fullText = candidate?.content?.parts?.[0]?.text ?? "";
  const finishReason = candidate?.finishReason || "UNKNOWN";
  const equipments = extractEqsFromText(fullText);
  const descriptiveText = fullText.replace(/###EQUIPAMENTOS_IA_JSON###[\s\S]*?###FIM_EQUIPAMENTOS_IA_JSON###/g, '').trim();

  let savedIds: string[] = [];
  if (auto_save && supa && orgId && equipments.length > 0) {
    for (const eq of equipments) {
      if (!eq.tag || !eq.name) continue;
      try {
        const payload: any = {
          org_id: orgId,
          project_id: project_id || null,
          tag: eq.tag,
          name: eq.name,
          equipment_type: eq.equipment_type || 'outros',
          manufacturer: eq.manufacturer || null,
          model: eq.model || null,
          serial_number: eq.serial_number || null,
          fabrication_year: eq.fabrication_year || null,
          design_pressure_bar: eq.design_pressure_bar || null,
          design_temp_c: eq.design_temp_c || null,
          operating_pressure_bar: eq.operating_pressure_bar || null,
          operating_temp_c: eq.operating_temp_c || null,
          volume_m3: eq.volume_m3 || null,
          diameter_mm: eq.diameter_mm || null,
          height_or_length_mm: eq.height_or_length_mm || null,
          shell_thickness_mm: eq.shell_thickness_mm || null,
          head_thickness_mm: eq.head_thickness_mm || null,
          material_spec: eq.material_spec || null,
          fluid_service: eq.fluid_service || null,
          nr13_category: eq.nr13_category || null,
          nr13_required: !!eq.nr13_required,
          design_code: eq.design_code || null,
          insulation_type: eq.insulation_type || null,
          external_paint: eq.external_paint || null,
          location_area: eq.location_area || null,
          notes: eq.notes || 'Cadastrado via IA',
          status: 'operando'
        };
        const { data: existing } = await supa.from("equipments").select("id").eq("org_id", orgId).eq("tag", eq.tag).maybeSingle();
        if (existing) {
          await supa.from("equipments").update(payload).eq("id", existing.id);
          savedIds.push(existing.id);
        } else {
          const { data: ins } = await supa.from("equipments").insert(payload).select("id").single();
          if (ins) savedIds.push(ins.id);
        }
      } catch (e) { console.error("erro eq:", e); }
    }
  }

  return json({
    text: descriptiveText, equipments,
    saved_count: savedIds.length, saved_ids: savedIds,
    model, duration_ms: elapsedMs, finish_reason: finishReason
  });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
