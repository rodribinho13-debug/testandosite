// ISOMETRICO IA v17 - hardened, no fallback key, cache + freemium + audit
// Versionado localmente em 2026-05-27 via mcp__supabase__get_edge_function
// GOLD STANDARD: replicar esse padrão (ai_extractions cache + hyd_check_and_track_usage + isValidTag + upsert idempotente) nas novas IAs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const DEFAULT_MODEL = "gemini-2.5-flash";
const MAX_INPUT_BYTES = 20 * 1024 * 1024;

const BASE_PROMPT = `Voce e engenheiro senior de tubulacao industrial com 20+ anos de experiencia. Pense como engenheiro analisando o desenho 360 graus.

A imagem em anexo e um isometrico industrial. Extraia APENAS informacao tecnica REALMENTE VISIVEL E IDENTIFICAVEL. Qualidade > quantidade.

PRINCIPIO FUNDAMENTAL (CRITICO): A INTEGRIDADE DOS DADOS E PRIORIDADE MAXIMA. Melhor RETORNAR MENOS itens corretos do que muitos itens inventados.

REGRAS RIGIDAS DE OMISSAO:
1. SE um material NAO tem codigo de engenharia VISIVEL no desenho => NAO INCLUA. NUNCA invente codigo.
2. SE um suporte/estrutura/cabo/eletroduto NAO tem TAG REAL => NAO INCLUA.
3. SE iso_number nao estiver visivel => deixe null. NAO invente.
4. SE quantidade nao for explicita => deixe null.
5. NUNCA gere codigos automaticos. NUNCA preencha placeholders.

###ISOMETRICO_IA_JSON###
{
  "header_info": { "iso_number": "...", "revision": "...", "line_tag": "...", "area": "...", "fluid_class": null, "inspection_class": null, "nr13_required": false, "visible_joints_count": null },
  "materials": [{"codigo_eng":"CODIGO_REAL","descricao":"...","categoria":"tubo","diametro_pol":null,"schedule":null,"classe_pressao":null,"material":"...","quantidade":0,"unidade":"m"}],
  "engineering_findings": ["..."],
  "warnings": ["..."],
  "extra_fields": {
    "supports_list": [{"tag":"TAG_REAL","tipo":"...","peso_kg":null,"material":"...","location":"..."}],
    "structures_list": [{"tag":"TAG_REAL","perfil":"...","material":"...","peso_kg":null,"quantity":1}],
    "cables_list": [{"tag":"TAG_REAL","cable_type":"...","gauge":"...","length_m":null,"from":"...","to":"..."}],
    "eletroducts_list": [{"tag":"TAG_REAL","conduit_type":"...","size":"...","length_m":null}]
  }
}
###FIM_ISOMETRICO_IA_JSON###

Apos JSON escreva analise em portugues. JSON parseavel sem comentarios. Comece com ###ISOMETRICO_IA_JSON###.`;

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

async function sha256Hex(b64: string): Promise<string> {
  const bin = atob(b64); const bytes = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

function extractFromText(text: string) {
  const empty = { header_info: {}, materials: [], engineering_findings: [], warnings: [], extra_fields: {} };
  const m = text.match(/###ISOMETRICO_IA_JSON###\s*([\s\S]*?)\s*###FIM_ISOMETRICO_IA_JSON###/);
  if (m) { try { const raw = m[1].trim().replace(/^```(?:json)?\s*/i,'').replace(/```$/,'').trim(); const obj = JSON.parse(raw); return { header_info: obj.header_info || {}, materials: Array.isArray(obj.materials) ? obj.materials : [], engineering_findings: Array.isArray(obj.engineering_findings) ? obj.engineering_findings : [], warnings: Array.isArray(obj.warnings) ? obj.warnings : [], extra_fields: obj.extra_fields || {} }; } catch (e) { } }
  return empty;
}
function stripJsonFromText(text: string): string { let t = text.replace(/###ISOMETRICO_IA_JSON###[\s\S]*?###FIM_ISOMETRICO_IA_JSON###/g, '').trim(); t = t.replace(/^=+\s*[A-Z\s]+=+\s*\n?/gim, '').trim(); return t; }
function isValidTag(t: any): boolean { if (!t) return false; const s = String(t).trim(); if (s.length < 2) return false; if (/^(n\/a|na|nd|-+|\?+|sem\s*tag|tbd|tba|auto|generic|item\s*\d+|sem\s*identif|nao\s*identif|null|undefined)$/i.test(s)) return false; if (/^auto-/i.test(s)) return false; return true; }
function buildPrompt(customInstructions?: string, extraFields?: any[]) { let prompt = BASE_PROMPT; if (customInstructions && customInstructions.trim()) prompt += `\n\n=== INSTRUCOES ADICIONAIS ===\n${customInstructions.trim()}\n=== FIM ===\n`; if (extraFields && extraFields.length > 0) { const fieldsDesc = extraFields.map((f: any) => `- "${f.key}" (${f.type || 'text'}): ${f.label || f.key}`).join('\n'); prompt += `\n\n=== CAMPOS EXTRAS ===\n${fieldsDesc}\nSe nao identificar, use null. NUNCA invente.\n=== FIM ===\n`; } return prompt; }

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json({ error: "Servico de IA temporariamente indisponivel." }, 503);
  let body: any; try { body = await req.json(); } catch { return json({ error: "Body invalido." }, 400); }
  const { file, mime, project_id, isometric_number, custom_instructions, preset_id, extra_fields, demo_fingerprint, demo_source } = body;
  const model = body.model || DEFAULT_MODEL;
  const skipCache = body.skip_cache === true;
  const isDemoMode = !project_id && !!demo_fingerprint;
  if (!file || !mime) return json({ error: "Campos file e mime obrigatorios." }, 400);
  const approxBytes = (file.length * 3) / 4;
  if (approxBytes > MAX_INPUT_BYTES) return json({ error: "Arquivo muito grande (max 20 MB)." }, 413);
  const allowedMimes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (!allowedMimes.includes(mime)) return json({ error: `Mime nao suportado: ${mime}.` }, 400);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization");
  let supa: any = null; let orgId: string | null = null;
  if (isDemoMode) {
    if (supabaseServiceKey) {
      const supaService = createClient(supabaseUrl, supabaseServiceKey);
      const { data: check } = await supaService.rpc('hyd_check_anonymous_ia', { p_fingerprint: demo_fingerprint, p_max_uses: 1 });
      if (check && check.allowed === false) return json({ error: "Voce ja usou sua analise gratuita. Crie sua conta!", limit_reached: true, remaining: 0, signup_url: "/hydrostec_v9.html#signup" }, 429);
    }
  } else if (project_id && authHeader) {
    supa = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: proj } = await supa.from("projects").select("id, org_id").eq("id", project_id).maybeSingle();
    if (proj) orgId = proj.org_id;
  }
  let finalCustomInstructions = custom_instructions; let finalExtraFields = extra_fields;
  if (preset_id && supa && orgId) {
    const { data: preset } = await supa.from("ai_extraction_presets").select("custom_instructions, extra_fields").eq("id", preset_id).eq("org_id", orgId).maybeSingle();
    if (preset) {
      finalCustomInstructions = [preset.custom_instructions, custom_instructions].filter(Boolean).join('\n\n---\n\n');
      const presetFields = Array.isArray(preset.extra_fields) ? preset.extra_fields : [];
      const reqFields = Array.isArray(extra_fields) ? extra_fields : [];
      finalExtraFields = [...presetFields, ...reqFields];
      await supa.from("ai_extraction_presets").update({ last_used_at: new Date().toISOString() }).eq("id", preset_id);
    }
  }
  const finalPrompt = buildPrompt(finalCustomInstructions, finalExtraFields);
  if (!isDemoMode && !skipCache && supa && orgId && !finalCustomInstructions) {
    const fileHash = await sha256Hex(file);
    const { data: cached } = await supa.from("ai_extractions").select("raw_response, parsed_data, model_used, input_tokens, output_tokens, duration_ms").eq("org_id", orgId).eq("file_hash", fileHash).eq("success", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (cached) { const parsed = (cached.parsed_data as any) || {}; const materials = Array.isArray(parsed.materials) ? parsed.materials : []; if (materials.length > 0) return json({ text: stripJsonFromText(cached.raw_response || ""), header_info: parsed.header_info || {}, materials, engineering_findings: Array.isArray(parsed.engineering_findings) ? parsed.engineering_findings : [], warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [], extra_fields: parsed.extra_fields || {}, model: cached.model_used, duration_ms: cached.duration_ms, cached: true }); }
    const { data: usageCheck } = await supa.rpc("hyd_check_and_track_usage", { p_org_id: orgId });
    if (usageCheck && usageCheck.allowed === false) return json({ error: "Limite mensal atingido (" + usageCheck.used + "/" + usageCheck.max + "). Faca upgrade.", limit_reached: true, plan: usageCheck.plan, used: usageCheck.used, max: usageCheck.max }, 429);
  }
  const requestBody = { contents: [{ parts: [{ text: finalPrompt }, { inline_data: { mime_type: mime, data: file } }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 24000 } };
  const t0 = performance.now(); let modelResp: Response;
  try { modelResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody) }); } catch (e) { return json({ error: "Falha temporaria de rede." }, 502); }
  const elapsedMs = Math.round(performance.now() - t0);
  if (!modelResp.ok) return json({ error: "Servico de IA retornou erro temporario." }, 502);
  const data = await modelResp.json();
  const candidate = data?.candidates?.[0] ?? {};
  const fullText = candidate?.content?.parts?.[0]?.text ?? "";
  const finishReason = candidate?.finishReason || "UNKNOWN";
  const usage = data?.usageMetadata ?? null;
  const extracted = extractFromText(fullText);
  const descriptiveText = stripJsonFromText(fullText);
  const truncated = finishReason === "MAX_TOKENS";
  if (isDemoMode) {
    if (supabaseServiceKey) { const supaService = createClient(supabaseUrl, supabaseServiceKey); await supaService.rpc('hyd_track_anonymous_ia', { p_fingerprint: demo_fingerprint, p_source: demo_source || 'direct' }); }
    return json({ text: descriptiveText, header_info: extracted.header_info, materials: extracted.materials, engineering_findings: extracted.engineering_findings, warnings: extracted.warnings, extra_fields: extracted.extra_fields, model, usage, duration_ms: elapsedMs, demo_mode: true, demo_remaining: 0, signup_message: "Esta foi sua analise gratuita. Crie sua conta para mais 3." });
  }
  const fileHash = await sha256Hex(file);
  let saved: any = { materials_added: 0, materials_skipped: 0, cached: false, finish_reason: finishReason };
  if (supa && orgId && project_id) {
    try {
      const hiNum = extracted.header_info?.iso_number;
      const isoNumber = isometric_number || (isValidTag(hiNum) ? hiNum : `ISO-AI-${Date.now()}`);
      const { data: iso } = await supa.from("isometrics").insert({ org_id: orgId, project_id, number: isoNumber, title: "Extraido via IA" }).select("id").single();
      const realSuccess = extracted.materials.length > 0 && !truncated;
      const { data: ext } = await supa.from("ai_extractions").insert({ org_id: orgId, project_id, isometric_id: iso?.id, file_hash: fileHash, file_size_bytes: Math.round(approxBytes), model_used: model, input_tokens: usage?.promptTokenCount ?? null, output_tokens: usage?.candidatesTokenCount ?? null, cost_usd: ((usage?.promptTokenCount||0)*0.30 + (usage?.candidatesTokenCount||0)*2.50) / 1_000_000, raw_response: fullText, parsed_data: { header_info: extracted.header_info, materials: extracted.materials, engineering_findings: extracted.engineering_findings, warnings: extracted.warnings, extra_fields: extracted.extra_fields, finish_reason: finishReason, custom_instructions_used: !!finalCustomInstructions, preset_id_used: preset_id || null }, success: realSuccess, duration_ms: elapsedMs }).select("id").single();
      let added = 0; let skipped = 0; const skippedDetail: string[] = [];
      for (const m of extracted.materials) {
        try {
          const rawCode = String(m.codigo_eng || m.code || '').trim();
          const desc = String(m.descricao || m.spec || '').trim();
          const qty = parseFloat(m.quantidade) || 0;
          if (!isValidTag(rawCode)) { skipped++; skippedDetail.push((rawCode||desc.slice(0,30)||'?')+' (sem codigo real)'); continue; }
          if (!desc) { skipped++; skippedDetail.push(rawCode+' (sem descricao)'); continue; }
          if (qty <= 0) { skipped++; skippedDetail.push(rawCode+' (sem quantidade)'); continue; }
          const cat = String(m.categoria || 'outro').toLowerCase();
          const unit = String(m.unidade || 'un').toLowerCase();
          let dia: any = m.diameter_in || m.diametro_pol;
          if (typeof dia === "string" && dia.includes("/")) { const parts = dia.split("/"); const a = parseFloat(parts[0]); const b = parseFloat(parts[1]); if (a && b) dia = a/b; }
          dia = parseFloat(dia) || null;
          const sch = m.schedule || null; const cls = m.classe_pressao || null;
          const code = rawCode.slice(0, 60);
          let { data: existMat } = await supa.from("materials_catalog").select("id").eq("org_id", orgId).eq("code", code).is("deleted_at", null).maybeSingle();
          let matId: string;
          if (existMat) matId = existMat.id;
          else { const { data: newMat } = await supa.from("materials_catalog").insert({ org_id: orgId, code, description: desc, category: cat, unit, material_type: m.material || null, diameter_in: dia, schedule: sch, pressure_class: cls }).select("id").single(); if (!newMat) { skipped++; skippedDetail.push(code+' (falha insert)'); continue; } matId = newMat.id; }
          const { data: existPM } = await supa.from("project_materials").select("id, qty_planned").eq("project_id", project_id).eq("material_id", matId).maybeSingle();
          if (existPM) await supa.from("project_materials").update({ qty_planned: (parseFloat(existPM.qty_planned) || 0) + qty }).eq("id", existPM.id);
          else await supa.from("project_materials").insert({ org_id: orgId, project_id, material_id: matId, qty_planned: qty });
          added++;
        } catch (e) { skipped++; }
      }
      saved = { isometric_id: iso?.id, extraction_id: ext?.id, materials_added: added, materials_skipped: skipped, materials_skipped_detail: skippedDetail, cached: false, finish_reason: finishReason, truncated };
    } catch (e) { return json({ text: descriptiveText, ...extracted, model, usage, duration_ms: elapsedMs, save_error: "Falha ao persistir dados.", finish_reason: finishReason }); }
  }
  return json({ text: descriptiveText, header_info: extracted.header_info, materials: extracted.materials, engineering_findings: extracted.engineering_findings, warnings: extracted.warnings, extra_fields: extracted.extra_fields, model, usage, duration_ms: elapsedMs, ...saved });
});

function json(payload: unknown, status = 200) { return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
