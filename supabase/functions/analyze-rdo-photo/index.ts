// analyze-rdo-photo v1 - Gemini Vision para analise de fotos de obra (RDO)
// Versionado localmente em 2026-05-27 via mcp__supabase__get_edge_function
// Retorna JSON estruturado: atividade, EPIs, equipamentos, seguranca, indicadores por disciplina
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const DEFAULT_ORIGINS = ["https://hydrostec.com.br","https://app.hydrostec.com.br","http://localhost:3000","http://localhost:5173","http://127.0.0.1:5500","null"];
function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowed = (Deno.env.get("CORS_ALLOWED_ORIGINS") || DEFAULT_ORIGINS.join(",")).split(",").map(s=>s.trim()).filter(Boolean);
  const allow = allowed.includes(origin) || allowed.includes("*") ? (origin || "null") : allowed[0] || "null";
  return { "Access-Control-Allow-Origin": allow, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Vary": "Origin" };
}
const j = (req: Request, p: unknown, s = 200) => new Response(JSON.stringify(p), { status: s, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });

const PROMPT_BASE = `Voce e um inspetor de obra experiente analisando uma FOTO DE CAMPO de uma obra industrial/civil.

Analise a imagem com olhos de engenheiro/tecnico de seguranca e retorne APENAS um JSON com a seguinte estrutura (sem markdown, sem texto fora do JSON):

{
  "caption": "legenda curta (max 80 chars) descrevendo o que ve",
  "activity_detected": "atividade principal observada (ex: concretagem de pilar P1, montagem de tubulacao 6 polegadas, pintura epoxi etc)",
  "equipment_visible": ["lista","de equipamentos/materiais visiveis"],
  "workforce_count": numero_de_pessoas_visiveis_ou_null,
  "epi_observed": {
    "capacete": true/false/null,
    "oculos": true/false/null,
    "luva": true/false/null,
    "botina": true/false/null,
    "colete": true/false/null,
    "cinto_seguranca": true/false/null,
    "protecao_respiratoria": true/false/null,
    "protecao_auditiva": true/false/null
  },
  "safety_concerns": ["lista","de problemas de seguranca observados"],
  "safety_score": numero_de_0_a_10,
  "discipline_indicators": {
    // CAMPOS DEPENDEM DA DISCIPLINA INFORMADA. Preencha apenas os relevantes:
    // civil: m3_concreto_estimado, fck_visivel, slump_visual, m2_forma
    // tubulacao: juntas_visiveis, diametro_estimado_pol, material_visivel
    // eletrica: metros_cabo_visiveis, tipo_eletroduto
    // pintura: m2_aplicado_estimado, tinta_visivel, sa_padrao_jato
    // mecanica: equip_montados, alinhamento_visivel
    // caldeiraria: pecas_visiveis, soldas_visiveis
    // seguranca: incidentes_observados
  },
  "recommendations": ["recomendacoes praticas para o RDO"],
  "confidence": numero_de_0_a_1
}

NAO use markdown, NAO escreva nada fora do JSON.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return j(req, { error: "Method not allowed." }, 405);
  let body: any; try { body = await req.json(); } catch { return j(req, { error: "Body invalido." }, 400); }
  const { image_base64, mime_type, disciplina, project_name } = body;
  if (!image_base64) return j(req, { error: "image_base64 obrigatorio." }, 400);

  const sbUrl = Deno.env.get("SUPABASE_URL")!;
  const sbAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return j(req, { error: "Auth obrigatorio." }, 401);
  const supa = createClient(sbUrl, sbAnonKey, { global: { headers: { Authorization: authHeader } } });
  try {
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return j(req, { error: "Sessao invalida." }, 401);
  } catch (_) { return j(req, { error: "Falha auth." }, 401); }

  let b64 = image_base64;
  if (b64.startsWith('data:')) {
    const m = b64.match(/^data:([^;]+);base64,(.+)$/);
    if (m) { b64 = m[2]; }
  }
  const mime = mime_type || 'image/jpeg';

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return j(req, { error: "GEMINI_API_KEY nao configurada" }, 500);
  const model = Deno.env.get("GEMINI_VISION_MODEL") || "gemini-2.5-flash";

  const userPrompt = `Disciplina do RDO: ${disciplina || 'industrial'}\nProjeto: ${project_name || 'nao informado'}\n\nAnalise a foto e retorne o JSON conforme especificado.`;

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: PROMPT_BASE },
              { text: userPrompt },
              { inline_data: { mime_type: mime, data: b64 } }
            ]
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2500,
            responseMimeType: 'application/json'
          }
        })
      }
    );
    if (!resp.ok) {
      const ej = await resp.json().catch(()=>({}));
      return j(req, { error: 'Gemini Vision: ' + (ej?.error?.message || resp.status) }, 502);
    }
    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let parsed: any;
    try { parsed = JSON.parse(text); } catch { parsed = { error: 'IA retornou JSON invalido', raw: text }; }
    return j(req, {
      analysis: parsed,
      model,
      disciplina: disciplina || 'industrial',
      usage: data?.usageMetadata || null
    });
  } catch (e: any) {
    return j(req, { error: 'Vision: ' + (e?.message || 'erro') }, 502);
  }
});
