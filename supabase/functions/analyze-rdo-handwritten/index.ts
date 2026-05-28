// ============================================================
// analyze-rdo-handwritten
// Lê foto(s) de RDO preenchido à mão pelo encarregado e extrai
// dados estruturados via Gemini Vision.
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_ORIGINS = [
  "http://localhost:3000","http://localhost:5173","http://localhost:8080",
  "https://projet.ia","https://www.projet.ia","https://projectia.vercel.app",
  "https://toapdhfouuedaexgqlsv.supabase.co"
];
function corsHeaders(origin: string | null){
  const ok = origin && CORS_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin! : CORS_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
}

const PROMPT = `Você é um engenheiro de planejamento de montagem industrial brasileira.
Você está analisando uma foto de um RDO (Relatório Diário de Obra) preenchido À MÃO por um encarregado de campo.
O encarregado preencheu em papel um formulário com data, equipe, atividades, HH, materiais, ocorrências, clima, etc.
Sua tarefa é EXTRAIR as informações da foto e retornar um JSON estruturado.

REGRAS DE OURO:
1. Se algum campo não estiver legível ou ausente, retorne null (não invente).
2. Datas em formato ISO YYYY-MM-DD. Se só tiver dia/mês, complete com o ano atual.
3. Quantidades numéricas como números (não strings).
4. Para "atividades", quebre em itens individuais. Cada item tem: descricao, hh, qty (se houver), disciplina (tubulacao, civil, eletrica, mecanica, instrumentacao, pintura, caldeiraria, hidraulica, seguranca, ou industrial se incerto).
5. Para "clima", use uma destas palavras: ensolarado, nublado, chuvoso, parcialmente_nublado, chuva_forte, vento_forte.
6. Para "epi_observado" e "equipamentos", liste o que conseguir ler.
7. Para "ocorrencias" / "pendencias", liste cada uma como string curta.
8. Use seu julgamento como engenheiro — não traduza tipos errados, mas se vir "soldagem raiz GTAW" entenda como atividade de tubulação.
9. NÃO invente nada. Se a foto estiver borrada ou ilegível em uma parte, deixe null e diga isso no campo "confidence" e "notas_extrator".

RETORNE APENAS UM JSON, sem markdown, sem comentários, no formato:

{
  "data_relatorio": "YYYY-MM-DD" | null,
  "turno": "manha" | "tarde" | "noite" | "integral" | null,
  "clima": "...",
  "equipe": "string com nome da equipe / encarregado",
  "efetivo": { "soldadores": N, "ajudantes": N, "encarregados": N, "tecnicos": N, "outros": N, "total": N },
  "atividades": [
    { "descricao": "...", "disciplina": "...", "hh": N, "qty": N | null, "unidade": "m|m²|jt|pç|kg|..." }
  ],
  "materiais_consumidos": [
    { "item": "...", "qty": N, "unidade": "..." }
  ],
  "equipamentos_utilizados": ["..."],
  "epi_observado": ["capacete", "óculos", ...],
  "ocorrencias": ["..."],
  "pendencias": ["..."],
  "observacoes_gerais": "string livre",
  "confidence": 0.0 a 1.0,
  "notas_extrator": "comentário sobre legibilidade, partes não lidas, etc"
}`;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);
  if(req.method === "OPTIONS") return new Response(null, { headers });

  try {
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const supaAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if(!geminiKey) throw new Error("GEMINI_API_KEY não configurada");

    const auth = req.headers.get("authorization") || "";
    const sb = createClient(supaUrl, supaAnon, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: userErr } = await sb.auth.getUser();
    if(userErr || !user) throw new Error("Não autenticado");

    const body = await req.json();
    const images: Array<{mime:string,b64:string}> = body.images || [];
    if(!images.length) throw new Error("Envie pelo menos uma imagem");
    if(images.length > 6) throw new Error("Máximo 6 fotos por análise");

    // Constrói o payload Gemini multi-imagem
    const parts: Array<unknown> = [{ text: PROMPT }];
    for(const img of images){
      const mime = img.mime || "image/jpeg";
      if(!/^image\/(jpe?g|png|webp|gif|heic|heif)$/i.test(mime)) throw new Error(`MIME não suportado: ${mime}`);
      parts.push({ inline_data: { mime_type: mime, data: img.b64 } });
    }

    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
    const reqBody = {
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
        maxOutputTokens: 4096
      }
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBody)
    });
    if(!resp.ok){
      const errTxt = await resp.text();
      throw new Error(`Gemini ${resp.status}: ${errTxt.slice(0,500)}`);
    }
    const json = await resp.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let extracted: Record<string, unknown> = {};
    try { extracted = JSON.parse(text); } catch(_){
      // Tenta tirar markdown se vier ```json ... ```
      const m = text.match(/\{[\s\S]*\}/);
      if(m){ try { extracted = JSON.parse(m[0]); } catch(_){ /* ignore */ } }
    }

    return new Response(JSON.stringify({
      ok: true,
      extracted,
      images_count: images.length,
      model
    }), { headers: { ...headers, "Content-Type": "application/json" } });
  } catch(e){
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" }
    });
  }
});
