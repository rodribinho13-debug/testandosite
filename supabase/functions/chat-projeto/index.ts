// chat-projeto v15 — IA universal (qualquer assunto) + RLS + Google Search + multimodal
// Versionado localmente em 2026-05-27 via mcp__supabase__get_edge_function
// ESSA FUNCAO JA E O AI-ROUTER ROBUSTO: Gemini + OpenAI + Claude com adapter completo, CORS whitelist e auth
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const DEFAULT_ORIGINS = ["https://hydrostec.com.br", "https://app.hydrostec.com.br", "https://www.hydrostec.com.br", "http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5500", "null"];
function corsHeaders(req: Request): Record<string,string> {
  const origin = req.headers.get("Origin") || "";
  const allowed = (Deno.env.get("CORS_ALLOWED_ORIGINS") || DEFAULT_ORIGINS.join(",")).split(",").map(s => s.trim()).filter(Boolean);
  const allow = allowed.includes(origin) || allowed.includes("*") ? (origin || "null") : allowed[0] || "null";
  return { "Access-Control-Allow-Origin": allow, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Vary": "Origin" };
}
const j = (req: Request, p: unknown, s = 200) => new Response(JSON.stringify(p), { status: s, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });

type Attachment = { name: string, mime_type: string, data_base64: string };
type AIMessage = { role: 'user'|'assistant'|'system', text: string, attachments?: Attachment[] };

async function callAI(systemPrompt: string, messages: AIMessage[], opts: {temperature?:number, maxTokens?:number, enableSearch?:boolean} = {}) {
  const provider = (Deno.env.get("AI_PROVIDER") || "gemini").toLowerCase();
  const t0 = performance.now();
  let result: any;
  if (provider === 'openai') result = await callOpenAI(systemPrompt, messages, opts);
  else if (provider === 'claude' || provider === 'anthropic') result = await callClaude(systemPrompt, messages, opts);
  else result = await callGemini(systemPrompt, messages, opts);
  return { ...result, provider, elapsed_ms: Math.round(performance.now() - t0) };
}

async function callGemini(sys: string, msgs: AIMessage[], opts: any) {
  const apiKey = Deno.env.get("GEMINI_API_KEY"); if (!apiKey) throw new Error("GEMINI_API_KEY nao configurada");
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
  const contents: any[] = [];
  for (const m of msgs) {
    const parts: any[] = [{ text: m.text || '' }];
    if (m.attachments && Array.isArray(m.attachments)) {
      for (const att of m.attachments) {
        if (att?.data_base64 && att?.mime_type) {
          parts.push({ inline_data: { mime_type: att.mime_type, data: att.data_base64 } });
        }
      }
    }
    contents.push({ role: m.role==='assistant'?'model':'user', parts });
  }
  const body: any = {
    systemInstruction: { parts: [{ text: sys }] },
    contents,
    generationConfig: { temperature: opts.temperature??0.6, maxOutputTokens: opts.maxTokens??6000 }
  };
  if (opts.enableSearch !== false) body.tools = [{ google_search: {} }];
  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  if (!resp.ok) { const ej = await resp.json().catch(()=>({})); throw new Error(ej?.error?.message || ('Gemini HTTP '+resp.status)); }
  const data = await resp.json();
  const cand = data?.candidates?.[0];
  let sources: any[] = [];
  try {
    const chunks = cand?.groundingMetadata?.groundingChunks || [];
    sources = chunks.map((c: any) => ({
      title: c?.web?.title || '',
      uri: c?.web?.uri || ''
    })).filter((s: any) => s.uri).slice(0, 8);
  } catch(_) {}
  return { text: cand?.content?.parts?.map((p: any)=>p.text||'').join('') || 'Sem resposta.', model, usage: data?.usageMetadata || null, sources, search_used: sources.length > 0 };
}

async function callOpenAI(sys: string, msgs: AIMessage[], opts: any) {
  const apiKey = Deno.env.get("OPENAI_API_KEY"); if (!apiKey) throw new Error("OPENAI_API_KEY nao configurada");
  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
  const messages: any[] = [{ role:'system', content: sys }];
  for (const m of msgs) {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    if (m.attachments && m.attachments.length) {
      const content: any[] = [{ type: 'text', text: m.text || '' }];
      for (const att of m.attachments) {
        if (att?.data_base64 && att?.mime_type?.startsWith('image/')) {
          content.push({ type: 'image_url', image_url: { url: 'data:'+att.mime_type+';base64,'+att.data_base64 } });
        }
      }
      messages.push({ role, content });
    } else {
      messages.push({ role, content: m.text || '' });
    }
  }
  const resp = await fetch('https://api.openai.com/v1/chat/completions', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey}, body: JSON.stringify({ model, messages, temperature: opts.temperature??0.6, max_tokens: opts.maxTokens??6000 }) });
  if (!resp.ok) { const ej = await resp.json().catch(()=>({})); throw new Error(ej?.error?.message || ('OpenAI HTTP '+resp.status)); }
  const data = await resp.json();
  return { text: data?.choices?.[0]?.message?.content || 'Sem resposta.', model, usage: data?.usage || null, sources: [], search_used: false };
}

async function callClaude(sys: string, msgs: AIMessage[], opts: any) {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("CLAUDE_API_KEY"); if (!apiKey) throw new Error("ANTHROPIC_API_KEY nao configurada");
  const model = Deno.env.get("CLAUDE_MODEL") || "claude-haiku-4-5-20251001";
  const messages: any[] = [];
  for (const m of msgs) {
    if (m.role === 'system') continue;
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    if (m.attachments && m.attachments.length) {
      const content: any[] = [{ type:'text', text: m.text || '' }];
      for (const att of m.attachments) {
        if (att?.data_base64 && att?.mime_type?.startsWith('image/')) {
          content.push({ type:'image', source:{ type:'base64', media_type: att.mime_type, data: att.data_base64 } });
        }
      }
      messages.push({ role, content });
    } else {
      messages.push({ role, content: m.text || '' });
    }
  }
  const resp = await fetch('https://api.anthropic.com/v1/messages', { method:'POST', headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'}, body: JSON.stringify({ model, max_tokens: opts.maxTokens??6000, temperature: opts.temperature??0.6, system: sys, messages }) });
  if (!resp.ok) { const ej = await resp.json().catch(()=>({})); throw new Error(ej?.error?.message || ('Claude HTTP '+resp.status)); }
  const data = await resp.json();
  return { text: data?.content?.[0]?.text || 'Sem resposta.', model, usage: data?.usage || null, sources: [], search_used: false };
}

async function safe(supa: any, table: string, cols: string, filt: any, limit = 100): Promise<any[]> {
  try {
    let q = supa.from(table).select(cols);
    if (filt.project_id) q = q.eq('project_id', filt.project_id);
    if (filt.org_id) q = q.eq('org_id', filt.org_id);
    if (filt.soft_del) q = q.is('deleted_at', null);
    if (filt.is_active) q = q.eq('is_active', true);
    q = q.limit(limit);
    const { data, error } = await q;
    if (error) return [];
    return data || [];
  } catch (_) { return []; }
}

async function loadOrgContext(supa: any, orgId: string|null) {
  const oc: any = {}; if (!orgId) return oc;
  oc.projetos = await safe(supa, 'projects', 'id,name,code,client_name,status', { org_id: orgId, soft_del: true }, 50);
  oc.fornecedores_ativos = await safe(supa, 'suppliers', 'id,name,trade_name,cnpj,category', { org_id: orgId, soft_del: true }, 100);
  oc.cotacoes_recentes = await safe(supa, 'quotations', 'id,quotation_number,title,project_id,status,total_value_brl', { org_id: orgId, soft_del: true }, 50);
  oc.compras = await safe(supa, 'purchase_orders', 'id,project_id,status,total', { org_id: orgId, soft_del: true }, 50);
  return oc;
}
async function loadProjectContext(supa: any, projectId: string, orgId: string|null) {
  const ctx: any = {};
  const { data: proj } = await supa.from('projects').select('id,name,code,client_name,status').eq('id', projectId).maybeSingle();
  if (!proj) return null;
  ctx.projeto = proj;
  ctx.folhas_isometricas = await safe(supa, 'isometric_sheets', 'iso_number,line,fab_pre,fab_sol,fab_end,mon_pre,mon_sol,mon_end,disciplina,area', { project_id: projectId, soft_del: true }, 100);
  ctx.juntas = await safe(supa, 'joints', 'joint_number,line,diameter_in,status_qa,disciplina', { project_id: projectId, soft_del: true }, 150);
  ctx.pendencias = await safe(supa, 'pendings', 'id,description,priority,status,disciplina', { project_id: projectId }, 50);
  ctx.orcamento_linhas = await safe(supa, 'project_composition_lines', 'discipline,description,quantity,unit_price,total_price', { project_id: projectId }, 100);
  return ctx;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return j(req, { error: "Method not allowed." }, 405);
  let body: any; try { body = await req.json(); } catch { return j(req, { error: "Body invalido." }, 400); }
  const { question, project_id, history, attachments, enable_search } = body;
  if (!question && !(Array.isArray(attachments) && attachments.length)) return j(req, { error: "question obrigatorio (ou anexo)." }, 400);
  const sbUrl = Deno.env.get("SUPABASE_URL")!;
  const sbAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return j(req, { error: "Auth obrigatorio." }, 401);
  const supa = createClient(sbUrl, sbAnonKey, { global: { headers: { Authorization: authHeader } } });
  let orgId: string|null = null; let userId: string|null = null;
  try {
    const { data: { user } } = await supa.auth.getUser();
    userId = user?.id || null;
    const { data: m } = await supa.from('org_members').select('org_id').eq('user_id', userId).limit(1).maybeSingle();
    orgId = m?.org_id || null;
  } catch(_){}
  if (!orgId) return j(req, { error: "Sem organizacao associada ao usuario." }, 403);

  const orgContext = await loadOrgContext(supa, orgId);
  let projectContext: any = null;
  if (project_id) { try { projectContext = await loadProjectContext(supa, project_id, orgId); } catch (_) {} }
  const counts: any = {};
  if (projectContext) for (const k in projectContext) if (Array.isArray(projectContext[k])) counts['projeto.'+k] = projectContext[k].length;
  for (const k in orgContext) if (Array.isArray(orgContext[k])) counts['org.'+k] = orgContext[k].length;

  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
  const attHint = hasAttachments ? `\n\nO usuario anexou ${attachments.length} arquivo(s): ${attachments.map((a: any) => `${a.name} (${a.mime_type})`).join(', ')}.` : '';

  const sysPrompt = `Voce eh um assistente de IA universal e helpful. Pode responder QUALQUER tipo de pergunta, em qualquer area do conhecimento.

Voce esta integrado ao PROJECT.IA (SaaS de gestao de obras industriais), entao alem das suas capacidades padrao voce tem 3 SUPERPODERES:

1. DADOS DA ORGANIZACAO do usuario logado (filtrados por RLS Supabase via JWT)
2. BUSCA WEB (Google Search) — decida automaticamente quando usar
3. ANALISE MULTIMODAL (PDF/imagem)

REGRAS DE ISOLAMENTO (CRITICAS):
- Os dados da organizacao do usuario sao PRIVADOS. Voce SO ve os dados da org dele (RLS).
- NUNCA mencione ou compare com dados de outras empresas/clientes.

ESTILO: Markdown, portugues brasileiro, adapte o tom ao contexto.

Contagem de dados disponiveis na org atual: ${JSON.stringify(counts)}${attHint}`;

  const fullContext = { obra: projectContext, organizacao: orgContext };
  const ctxStr = (projectContext || Object.keys(orgContext).length) ? `\n\n=== DADOS DA ORG DO USUARIO (filtrados por org_id via RLS) ===\n${JSON.stringify(fullContext, null, 2)}\n=== FIM DADOS ===\n` : '';
  const messages: AIMessage[] = [];
  if (Array.isArray(history)) for (const h of history.slice(-6)) if (h.role && h.text) messages.push({ role: h.role==='assistant'?'assistant':'user', text: String(h.text).slice(0,3000) });
  let cleanAtts: Attachment[] = [];
  if (hasAttachments) {
    let totalSize = 0;
    for (const a of attachments.slice(0, 5)) {
      if (!a?.data_base64 || !a?.mime_type) continue;
      const sz = (a.data_base64.length * 3) / 4;
      if (totalSize + sz > 8 * 1024 * 1024) break;
      totalSize += sz;
      cleanAtts.push({ name: String(a.name||'arquivo').slice(0, 200), mime_type: String(a.mime_type).slice(0, 100), data_base64: a.data_base64 });
    }
  }
  messages.push({ role: 'user', text: question || '(analise os anexos)', attachments: cleanAtts });
  try {
    const result = await callAI(sysPrompt + ctxStr, messages, { temperature: 0.6, maxTokens: 6000, enableSearch: enable_search !== false });
    return j(req, { answer: result.text, provider: result.provider, model: result.model, duration_ms: result.elapsed_ms, usage: result.usage, sources: result.sources || [], search_used: !!result.search_used, project_context_loaded: !!projectContext, org_id: orgId, counts });
  } catch(e: any) { return j(req, { error: 'IA: ' + (e?.message || 'erro') }, 502); }
});
