// ============================================================
// analyze-tdraw
// Recebe PDF/imagem de um Desenho Técnico + disciplina,
// usa Gemini Vision com prompt especializado por área,
// retorna campos estruturados pra cadastro automático.
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_ORIGINS = [
  "http://localhost:3000","http://localhost:5173","http://localhost:8080",
  "https://projet.ia","https://www.projet.ia","https://projectia.vercel.app",
  "https://toapdhfouuedaexgqlsv.supabase.co"
];
function corsHeaders(origin: string | null) {
  const ok = origin && CORS_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin! : CORS_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
}

const COMMON_OUTPUT = `RETORNE APENAS UM JSON, sem markdown, no formato:
{
  "code": "código do desenho (ex: CV-PL-001)",
  "revision": "revisão (0, A, B, etc.)",
  "title": "título extraído",
  "tipo": "tipo de desenho — use uma das opções listadas acima para essa disciplina",
  "format": "A0 | A1 | A2 | A3 | A4",
  "scale": "escala (ex: 1:50, 1:100)",
  "author": "nome do projetista (se identificável no carimbo)",
  "reviewer": "nome do revisor (se identificável)",
  "issue_date": "YYYY-MM-DD",
  "discipline_data": { ... campos específicos da disciplina conforme abaixo ... },
  "confidence": 0.0 a 1.0,
  "notas_extrator": "observações sobre legibilidade, partes não lidas"
}

Se algum campo não estiver legível, retorne null (não invente).`;

const PROMPTS: Record<string, string> = {
  civil: `Você é um ENGENHEIRO CIVIL SÊNIOR analisando uma prancha de projeto civil/estrutural.
A prancha pode ser uma planta baixa, planta de cobertura, corte, vista, detalhe, fundação, forma ou armadura.

Identifique no carimbo e no conteúdo da prancha:
- Código do desenho (no carimbo)
- Revisão
- Título da prancha
- Tipo de desenho (uma destas: "Planta baixa", "Planta de cobertura", "Corte", "Vista", "Detalhe", "Fundação", "Forma", "Armadura", "Locação")
- Formato (A0/A1/A2/A3/A4)
- Escala
- Projetista, revisor
- Data de emissão
- Campos específicos:
  * volume_concreto: volume de concreto (m³) quantificado na legenda
  * kg_aco: peso total de aço (kg) na lista de aço
  * fck: resistência característica do concreto (MPa) — comum: 20, 25, 30, 35
  * cota_referencia: cota de referência (+0.00, +3.20 etc.)

${COMMON_OUTPUT}`,

  eletrica: `Você é um ENGENHEIRO ELETRICISTA SÊNIOR analisando um diagrama elétrico ou projeto de instalação.
Pode ser um unifilar, diagrama de força, comando, malha de aterramento, SPDA, percurso de cabos, P&ID elétrico ou layout de painel.

Identifique no carimbo e no conteúdo:
- Código do desenho
- Revisão, título
- Tipo de desenho (uma destas: "Diagrama unifilar", "Diagrama de força", "Diagrama de comando", "Malha de aterramento", "SPDA", "Percurso de cabos", "P&ID", "Layout de painel")
- Formato, escala
- Projetista, revisor, data
- Campos específicos:
  * tensao: nível de tensão. Use: "BT (até 1kV)", "MT (1-72,5kV)", ou "AT (>72,5kV)"
  * carga_kw: carga prevista total (kW) — extrair da legenda/quadro de cargas
  * sistema: classifique como "Iluminação", "Força motriz", "Controle", "SPDA", "Aterramento" ou "Automação"

${COMMON_OUTPUT}`,

  instrumentacao: `Você é um ENGENHEIRO DE INSTRUMENTAÇÃO E CONTROLE SÊNIOR analisando um documento de instrumentação industrial.
Pode ser um P&ID, malha de controle, fluxograma, layout de campo, lista de instrumentos ou hookup.

Identifique:
- Código, revisão, título
- Tipo (uma destas: "P&ID", "Malha de controle", "Fluxograma", "Layout de campo", "Lista de instrumentos", "Hookup")
- Formato, escala, projetista, data
- Campos específicos:
  * loop_number: número do loop (ex: "L-101")
  * tag_principal: TAG do instrumento principal (ex: "PT-101", "TIC-203")
  * tipo_lazo: "Indicação" | "Controle" | "Alarme" | "Shutdown (ESD)" | "Fire & Gas"

${COMMON_OUTPUT}`,

  pintura: `Você é um INSPETOR DE PINTURA INDUSTRIAL SÊNIOR (Petrobras N-, NACE) analisando esquema/memorial de pintura.
Pode ser um esquema, mapa, detalhe de preparo, norma ou memorial.

Identifique:
- Código, revisão, título
- Tipo (uma destas: "Esquema de pintura", "Mapa de pintura", "Detalhe de preparo", "Norma", "Memorial")
- Formato, escala, autor, data
- Campos específicos:
  * esquema: nome do esquema (ex: "PETROBRAS N-2628", "RAL 9006")
  * sistema: descrição das camadas (ex: "Primer EP + Inter + Acabamento PU")
  * dft_total: espessura DFT total em micrômetros (μm)
  * area_m2: área total de pintura prevista (m²)
  * qtd_demaos: quantidade de demãos (número)

${COMMON_OUTPUT}`,

  caldeiraria: `Você é um ENGENHEIRO DE CALDEIRARIA/ESTRUTURAS METÁLICAS SÊNIOR analisando desenho de fabricação.
Pode ser estrutura, perfil, detalhe de junta, detalhe de solda, vista geral ou montagem.

Identifique:
- Código, revisão, título
- Tipo (uma destas: "Estrutura", "Perfil", "Detalhe de junta", "Detalhe de solda", "Vista geral", "Montagem")
- Formato, escala, projetista, data
- Campos específicos:
  * material_perfil: especificação do material (ex: "ASTM A572 Gr.50", "AISI 1020")
  * espessura_mm: espessura principal (mm)
  * wps: código do procedimento de solda WPS (ex: "WPS-001")
  * nde_requerido: "Nenhum" | "VS" | "LP" | "PM" | "RX" | "US" | "TT"

${COMMON_OUTPUT}`,

  mecanica: `Você é um ENGENHEIRO MECÂNICO PROJETISTA SÊNIOR analisando desenho técnico mecânico.
Pode ser vista geral, corte, detalhe, lista de peças, montagem ou conjunto.

Identifique:
- Código, revisão, título
- Tipo (uma destas: "Vista geral", "Corte", "Detalhe", "Lista de peças", "Montagem", "Conjunto")
- Formato, escala, autor, data
- Campos específicos:
  * material: especificação (ex: "AISI 304", "ASTM A36")
  * tolerancia_geral: norma de tolerância (ex: "ISO 2768-m", "ISO 2768-f")
  * tratamento_sup: tratamento superficial (ex: "Galvanização a fogo", "Pintura epóxi", "Nenhum")

${COMMON_OUTPUT}`,

  hidraulica: `Você é um ENGENHEIRO HIDRÁULICO SÊNIOR analisando projeto hidrossanitário ou de combate a incêndio.
Pode ser planta hidráulica, isométrico, detalhe ou diagrama.

Identifique:
- Código, revisão, título
- Tipo (uma destas: "Planta hidráulica", "Isométrico", "Detalhe", "Diagrama")
- Formato, escala, autor, data
- Campos específicos:
  * pressao_bar: pressão de trabalho em bar
  * vazao_lps: vazão em L/s
  * diametro_mm: diâmetro principal em mm

${COMMON_OUTPUT}`
};

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);
  if (req.method === "OPTIONS") return new Response(null, { headers });

  try {
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const supaAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) throw new Error("GEMINI_API_KEY não configurada");

    const auth = req.headers.get("authorization") || "";
    const sb = createClient(supaUrl, supaAnon, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: userErr } = await sb.auth.getUser();
    if (userErr || !user) throw new Error("Não autenticado");

    const body = await req.json();
    const disciplina: string = body.disciplina || "civil";
    const images: Array<{ mime: string; b64: string }> = body.images || [];

    const prompt = PROMPTS[disciplina];
    if (!prompt) throw new Error(`Disciplina não suportada: ${disciplina}`);
    if (!images.length) throw new Error("Envie pelo menos uma imagem ou PDF");
    if (images.length > 6) throw new Error("Máximo 6 páginas por análise");

    const parts: Array<unknown> = [{ text: prompt }];
    for (const img of images) {
      const mime = img.mime || "image/jpeg";
      if (!/^(image\/(jpe?g|png|webp|gif|heic|heif)|application\/pdf)$/i.test(mime)) {
        throw new Error(`MIME não suportado: ${mime}`);
      }
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
    if (!resp.ok) {
      const errTxt = await resp.text();
      throw new Error(`Gemini ${resp.status}: ${errTxt.slice(0, 500)}`);
    }
    const json = await resp.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let extracted: Record<string, unknown> = {};
    try { extracted = JSON.parse(text); } catch (_) {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) { try { extracted = JSON.parse(m[0]); } catch (_) { /* */ } }
    }

    return new Response(JSON.stringify({
      ok: true,
      disciplina,
      extracted,
      images_count: images.length,
      model
    }), { headers: { ...headers, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" }
    });
  }
});
