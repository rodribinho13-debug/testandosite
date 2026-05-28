// analyze-discipline-multi v2 — IA visual + contagem ainda que nao haja BM
// Versionado localmente em 2026-05-27 via mcp__supabase__get_edge_function
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_ORIGINS = ["http://localhost:3000","http://localhost:5173","http://localhost:8080","https://projet.ia","https://www.projet.ia","https://projectia.vercel.app","https://toapdhfouuedaexgqlsv.supabase.co"];
function corsHeaders(origin){const ok=origin&&CORS_ORIGINS.includes(origin);return{"Access-Control-Allow-Origin":ok?origin:CORS_ORIGINS[0],"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};}

const VISION_HINT = `\n\nIMPORTANTE - VISAO COMPUTACIONAL:\nMesmo que nao haja tabela/lista no documento, voce DEVE contar visualmente os elementos:\n- VALVULAS sao reconheciveis por forma (gaveta=retangulo, globo=esfera, esfera=esfera, retencao=triangulo)\n- COTOVELOS 90 sao curvas em angulo reto, cotovelos 45 em diagonal\n- TES sao bifurcacoes em T\n- FLANGES sao pares de discos paralelos\n- SUPORTES sao representados por hachuras ou simbolos padronizados\n- TUBO: estimar comprimento aproximado pelas cotas se houver. Se nao houver cota, conte trechos visiveis e use 'qty=null, length_m=null' deixando para o usuario completar.\nConte CADA item e adicione no array de 'materials'.\nUse 'estimated_visually:true' nos itens que voce contou apenas observando (sem BM explicito).\n`;

const COMMON = `\nRegras:\n- Retorne UM JSON valido com cada categoria como array (mesmo se vazio)\n- Use chaves de coluna em minusculo (snake_case)\n- Para materiais, sempre que possivel inclua: code, description, category, material_type, diameter_in, schedule, pressure_class, unit, quantity\n- Nunca invente nada que nao consiga observar. Se a quantidade nao for clara, retorne null\n`;

const PROMPTS = {
  tubulacao: `Voce e um ENGENHEIRO MECANICO/TUBULACAO SENIOR especialista em montagem industrial (Petrobras, ASME B31.3, NR-13). Analise este documento (isometrico, P&ID, fluxograma, lista de materiais, ou desenho tecnico) e extraia TODOS os elementos categorizados.\n${VISION_HINT}\nRetorne JSON EXATO:\n{\n  "sheets": [],\n  "materials": [],\n  "joints": [],\n  "supports": [],\n  "em": [],\n  "summary": ""\n}\n${COMMON}`,

  civil: `Voce e um ENGENHEIRO CIVIL/ESTRUTURAL SENIOR (NBR 6118, 14931). Analise:\n${VISION_HINT}\nRetorne JSON:\n{\n  "drawings": [],\n  "pours": [],\n  "elements": [],\n  "insumos": [],\n  "summary": ""\n}\n${COMMON}`,

  eletrica: `Voce e um ENGENHEIRO ELETRICISTA SENIOR (NBR 5410, NR-10). Analise diagramas, P&IDs, unifilares.\n${VISION_HINT}\nRetorne JSON:\n{\n  "drawings": [],\n  "cables": [],\n  "conduits": [],\n  "panels": [],\n  "grounding": [],\n  "summary": ""\n}\n${COMMON}`,

  instrumentacao: `Voce e um ENGENHEIRO DE INSTRUMENTACAO SENIOR. Analise P&IDs identificando: PT, TI, FIC, LV, etc.\n${VISION_HINT}\nRetorne JSON:\n{\n  "drawings": [],\n  "instruments": [],\n  "summary": ""\n}\n${COMMON}`,

  pintura: `Voce e um INSPETOR DE PINTURA INDUSTRIAL SENIOR. Analise:\n${VISION_HINT}\nRetorne JSON:\n{\n  "drawings": [],\n  "inspections": [],\n  "summary": ""\n}\n${COMMON}`,

  caldeiraria: `Voce e um ENGENHEIRO DE CALDEIRARIA SENIOR (AWS D1.1). Analise estruturas:\n${VISION_HINT}\nRetorne JSON:\n{\n  "drawings": [],\n  "structures": [],\n  "profiles": [],\n  "summary": ""\n}\n${COMMON}`,

  mecanica: `Voce e um ENGENHEIRO MECANICO SENIOR. Analise:\n${VISION_HINT}\nRetorne JSON:\n{\n  "drawings": [],\n  "summary": ""\n}\n${COMMON}`,

  hidraulica: `Voce e um ENGENHEIRO HIDRAULICO SENIOR. Analise:\n${VISION_HINT}\nRetorne JSON:\n{\n  "drawings": [],\n  "systems": [],\n  "summary": ""\n}\n${COMMON}`
};

const CATEGORY_TO_TABLE = {
  sheets:{table:'isometric_sheets',label:'Isometricos'},
  materials:{table:'project_materials',label:'Materiais'},
  joints:{table:'joints',label:'Juntas'},
  supports:{table:'supports',label:'Suportes'},
  em:{table:'structural_em_records',label:'Estruturas Metalicas'},
  pours:{table:'civil_concrete_pours',label:'Concretagens'},
  elements:{table:'civil_concrete_elements',label:'Elementos Estruturais'},
  insumos:{table:'civil_insumos_catalog',label:'Insumos Civis'},
  cables:{table:'electrical_cables',label:'Cabos'},
  conduits:{table:'eletroduct_runs',label:'Eletrodutos'},
  panels:{table:'electrical_panels',label:'Paineis'},
  grounding:{table:'electrical_grounding',label:'SPDA / Aterramento'},
  instruments:{table:'instruments',label:'Instrumentos'},
  inspections:{table:'painting_inspections',label:'Inspecoes DFT'},
  structures:{table:'structural_em_records',label:'Estruturas'},
  profiles:{table:'structural_profiles_catalog',label:'Perfis'},
  systems:{table:'hydraulic_systems',label:'Sistemas Hidraulicos'},
  drawings:{table:'technical_drawings',label:'Desenhos Tecnicos'}
};

Deno.serve(async(req)=>{
  const origin=req.headers.get("origin");const headers=corsHeaders(origin);
  if(req.method==="OPTIONS")return new Response(null,{headers});
  try{
    const supaUrl=Deno.env.get("SUPABASE_URL");const supaAnon=Deno.env.get("SUPABASE_ANON_KEY");
    const geminiKey=Deno.env.get("GEMINI_API_KEY");
    if(!geminiKey)throw new Error("GEMINI_API_KEY nao configurada");
    const auth=req.headers.get("authorization")||"";
    const sb=createClient(supaUrl,supaAnon,{global:{headers:{Authorization:auth}}});
    const{data:{user},error:userErr}=await sb.auth.getUser();
    if(userErr||!user)throw new Error("Nao autenticado");
    const body=await req.json();
    const disciplina=body.disciplina||"tubulacao";
    const images=body.images||[];
    const prompt=PROMPTS[disciplina];
    if(!prompt)throw new Error(`Disciplina nao suportada: ${disciplina}`);
    if(!images.length)throw new Error("Envie pelo menos uma imagem ou PDF");
    if(images.length>8)throw new Error("Maximo 8 paginas");
    const parts=[{text:prompt}];
    for(const img of images){const mime=img.mime||"image/jpeg";if(!/^(image\/(jpe?g|png|webp|gif|heic|heif)|application\/pdf)$/i.test(mime))throw new Error(`MIME nao suportado: ${mime}`);parts.push({inline_data:{mime_type:mime,data:img.b64}});}
    const model="gemini-2.5-flash";
    const url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
    const reqBody={contents:[{parts}],generationConfig:{responseMimeType:"application/json",temperature:0.15,maxOutputTokens:8192}};
    const resp=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(reqBody)});
    if(!resp.ok){const errTxt=await resp.text();throw new Error(`Gemini ${resp.status}: ${errTxt.slice(0,500)}`);}
    const json=await resp.json();
    const text=json?.candidates?.[0]?.content?.parts?.[0]?.text||"{}";
    let extracted={};
    try{extracted=JSON.parse(text);}catch(_){const m=text.match(/\{[\s\S]*\}/);if(m){try{extracted=JSON.parse(m[0]);}catch(_){}}}
    const categories={};let totalItems=0;
    for(const k in extracted){if(!Array.isArray(extracted[k]))continue;const meta=CATEGORY_TO_TABLE[k];if(!meta)continue;categories[k]={items:extracted[k],count:extracted[k].length,table:meta.table,label:meta.label};totalItems+=extracted[k].length;}
    return new Response(JSON.stringify({ok:true,disciplina,categories,total_items:totalItems,summary:extracted.summary||"",raw_extracted:extracted,images_count:images.length,model}),{headers:{...headers,"Content-Type":"application/json"}});
  }catch(e){return new Response(JSON.stringify({ok:false,error:e.message}),{status:400,headers:{...headers,"Content-Type":"application/json"}});}
});
