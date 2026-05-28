// ANALYZE DISCIPLINE DOC v11 - tokens 32k + log finishReason
// Hub central de IA: aceita custom_prompt arbitrário OU resolve via discipline_ai_prompts (RLS-protected)
// Versionado localmente em 2026-05-27 via mcp__supabase__get_edge_function
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const DEFAULT_MODEL = "gemini-2.5-flash";
const MAX_INPUT_BYTES = 20 * 1024 * 1024;

const BASE_RULES = `\n\nREGRAS GERAIS:\n- Retorne UM unico bloco JSON valido entre marcadores ###DISCIPLINE_IA_JSON### e ###FIM_DISCIPLINE_IA_JSON###\n- Apos o JSON, escreva uma analise descritiva CURTA (max 150 palavras)\n- Campos nao identificados use null. NUNCA invente.\n- JSON parseavel sem comentarios, sem trailing commas\n- Comece DIRETO com '###DISCIPLINE_IA_JSON###'\n- SEMPRE feche com '###FIM_DISCIPLINE_IA_JSON###' antes da analise descritiva\n- PRIORIDADE: completar o JSON antes da analise. Se faltar espaço, OMITA a analise mas FECHE o JSON.\n`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractBalancedJson(text: string): string | null {
  if (!text) return null;
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === '"') { inStr = false; continue; }
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  if (depth > 0) return text.slice(start) + '}'.repeat(depth);
  return null;
}

function extractJson(text: string): any {
  if (!text) return {};
  const m = text.match(/###DISCIPLINE_IA_JSON###\s*([\s\S]*?)\s*###FIM_DISCIPLINE_IA_JSON###/);
  if (m && m[1]) {
    try {
      const raw = m[1].trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
      return JSON.parse(raw);
    } catch (e) { console.warn('[extractJson] parse 1:', String(e).slice(0, 200)); }
  }
  const m2 = text.match(/###DISCIPLINE_IA_JSON###\s*([\s\S]*)$/);
  if (m2 && m2[1]) {
    const trimmed = m2[1].trim().replace(/^```(?:json)?\s*/i, '').replace(/```[\s\S]*$/, '').trim();
    const balanced = extractBalancedJson(trimmed);
    if (balanced) {
      try { return JSON.parse(balanced); } catch (e) { console.warn('[extractJson] parse 2:', String(e).slice(0, 200)); }
    }
  }
  const balanced = extractBalancedJson(text);
  if (balanced) {
    try { return JSON.parse(balanced); } catch (e) { console.warn('[extractJson] parse 3:', String(e).slice(0, 200)); }
  }
  const m4 = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m4 && m4[1]) {
    try { return JSON.parse(m4[1].trim()); } catch (e) { console.warn('[extractJson] parse 4:', String(e).slice(0, 200)); }
  }
  return {};
}

function stripJson(text: string): string {
  let t = text.replace(/###DISCIPLINE_IA_JSON###[\s\S]*?###FIM_DISCIPLINE_IA_JSON###/g, '').trim();
  t = t.replace(/###DISCIPLINE_IA_JSON###[\s\S]*$/g, '').trim();
  return t;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json({ error: "Servico de IA temporariamente indisponivel." }, 503);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Body invalido." }, 400); }

  const { file, mime, discipline_code, document_type, project_id, custom_instructions, custom_prompt } = body;
  const model = body.model || DEFAULT_MODEL;

  if (!file || !mime) return json({ error: "file e mime obrigatorios." }, 400);
  if (!discipline_code) return json({ error: "discipline_code obrigatorio." }, 400);

  const approxBytes = (file.length * 3) / 4;
  if (approxBytes > MAX_INPUT_BYTES) return json({ error: "Arquivo muito grande (max 20 MB)." }, 413);

  const binaryMimes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
  const textMimes   = ["text/csv", "text/tab-separated-values", "text/plain", "text/markdown", "application/json"];
  const allMimes = [...binaryMimes, ...textMimes];
  if (!allMimes.includes(mime)) return json({ error: `Mime nao suportado: ${mime}.` }, 400);

  let finalPrompt: string;
  let expectedFields: any = null;

  if (discipline_code === 'custom' || custom_prompt) {
    if (!custom_prompt) return json({ error: 'custom_prompt obrigatorio quando discipline_code=custom' }, 400);
    finalPrompt = custom_prompt + BASE_RULES;
  } else {
    if (!document_type) return json({ error: "document_type obrigatorio." }, 400);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supaService = createClient(supabaseUrl, supabaseServiceKey);
    const { data: promptDef } = await supaService.from("discipline_ai_prompts")
      .select("prompt_template, expected_fields, target_tables")
      .eq("discipline_code", discipline_code)
      .eq("document_type", document_type)
      .eq("active", true)
      .maybeSingle();
    if (!promptDef) return json({ error: `Prompt nao encontrado para ${discipline_code}/${document_type}` }, 404);
    finalPrompt = promptDef.prompt_template + BASE_RULES;
    expectedFields = promptDef.expected_fields;
    if (custom_instructions) finalPrompt += `\n\n=== INSTRUCOES ADICIONAIS ===\n${custom_instructions}\n=== FIM ===\n`;
  }

  let parts: any[];
  if (textMimes.includes(mime)) {
    let txt = '';
    try {
      const bin = atob(file);
      const bytes = new Uint8Array(bin.length);
      for (let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
      txt = new TextDecoder('utf-8').decode(bytes);
    } catch (e) { return json({ error: "Falha decodificando arquivo." }, 400); }
    parts = [{ text: finalPrompt + '\n\n=== CONTEUDO ===\n' + txt + '\n=== FIM ===' }];
  } else {
    parts = [{ text: finalPrompt }, { inline_data: { mime_type: mime, data: file } }];
  }

  const reqBody = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 32000,
      responseMimeType: 'text/plain'
    },
  };
  const t0 = performance.now();
  let modelResp: Response;
  try {
    modelResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reqBody) }
    );
  } catch (e) { return json({ error: "Falha de rede ao chamar servico IA." }, 502); }
  const elapsedMs = Math.round(performance.now() - t0);

  if (!modelResp.ok) {
    const errText = await modelResp.text().catch(() => '');
    console.error('[analyze-discipline-doc] AI error:', modelResp.status, errText.slice(0, 500));
    return json({ error: "Servico de IA retornou erro temporario.", ai_status: modelResp.status }, 502);
  }

  const data = await modelResp.json();
  const candidate = data?.candidates?.[0] ?? {};
  const fullText = candidate?.content?.parts?.[0]?.text ?? "";
  const finishReason = candidate?.finishReason ?? null;
  const usage = data?.usageMetadata ?? null;

  const extracted = extractJson(fullText);
  const descriptive = stripJson(fullText);

  const response: any = {
    text: descriptive,
    extracted,
    raw_text: fullText.slice(0, 6000),
    raw_text_length: fullText.length,
    finish_reason: finishReason,
    discipline_code, document_type: document_type || null,
    expected_fields: expectedFields,
    model, usage, duration_ms: elapsedMs,
    auto_save: false
  };
  if (extracted && typeof extracted === 'object') {
    for (const k in extracted) { if (Array.isArray(extracted[k])) response[k] = extracted[k]; }
  }

  return json(response);
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
