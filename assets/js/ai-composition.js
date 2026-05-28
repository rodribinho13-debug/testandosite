/*! PROJECT.IA — IA Composicoes (gerar via linguagem natural) v1 */
(function(w,d){'use strict';try{
function getSb(){return w.sb||null;}
function esc(s){if(s==null)return '';return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
let _state={prompt:'',extracted:null,busy:false};

const SYS_PROMPT=`Voce e engenheiro orcamentista especialista em composicoes unitarias (TCPO, SINAPI, SBC). Receba uma descricao em linguagem natural e gere uma COMPOSICAO completa.

JSON entre ###DISCIPLINE_IA_JSON### e ###FIM_DISCIPLINE_IA_JSON###:
{
  "composicao": {
    "code":"AI-XXX",
    "description":"descricao curta",
    "unit":"un|m|m2|m3|kg|jt|h",
    "discipline":"civil|tubulacao|eletrica|...",
    "fonte_referencia":"TCPO Tabela X|SINAPI 12345|estimativa engenharia",
    "produtividade_observacao":"..."
  },
  "insumos":[
    {"kind":"mao_de_obra","description":"Servente","unit":"h","coefficient":4,"unit_price_ref":15.00,"category":"mod"},
    {"kind":"material","description":"Cimento CP-II-Z-32","unit":"kg","coefficient":350,"unit_price_ref":0.65,"category":"mat"},
    {"kind":"equipamento","description":"Betoneira 400L","unit":"h","coefficient":1,"unit_price_ref":8,"category":"equip"}
  ]
}
Regras: coeficientes realistas, preços ref de mercado (orientativos), unit price = null se nao souber. Apos JSON, 1 linha justificando a estrutura.`;

async function open(){
  _state.prompt='';_state.extracted=null;
  const prev=d.getElementById('pia-iac-ov');if(prev)prev.remove();
  const ov=d.createElement('div');ov.id='pia-iac-ov';
  ov.style.cssText='position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9885;display:flex;align-items:center;justify-content:center;padding:24px';
  d.body.appendChild(ov);renderInput();
}
function renderInput(){
  const ov=d.getElementById('pia-iac-ov');if(!ov)return;
  ov.innerHTML='<div style="background:var(--t0,#fff);border-radius:10px;max-width:560px;width:100%;border:1px solid var(--t3,#E5E7EB)"><div style="padding:18px 22px;border-bottom:1px solid var(--t3,#E5E7EB)"><div style="font-size:15px;font-weight:600;color:var(--t9,#0F172A)">Gerar composição via IA</div><div style="font-size:11.5px;color:var(--t6,#64748B);margin-top:3px;line-height:1.5">Descreva o serviço em texto livre. Ex: "soldagem topo a topo aço carbono Sch 40 6 polegadas com PQR ASME IX". A IA estrutura mão de obra + materiais + equipamentos.</div></div><div style="padding:18px 22px"><textarea id="iac-q" placeholder="Descreva o serviço..." style="width:100%;min-height:120px;padding:10px;border:1px solid var(--t3,#E5E7EB);border-radius:6px;font-size:13px;font-family:inherit;resize:vertical"></textarea></div><div style="padding:14px 22px;border-top:1px solid var(--t3,#E5E7EB);display:flex;justify-content:flex-end;gap:8px"><button class="btn bg" id="iac-x">Cancelar</button><button class="btn bp" id="iac-go">Gerar</button></div></div>';
  d.getElementById('iac-x').onclick=()=>ov.remove();
  d.getElementById('iac-go').onclick=async()=>{
    const q=d.getElementById('iac-q').value.trim();if(!q){alert('Descreva o servico.');return;}
    if(!w.PIAAIRouter)return alert('IA indisponivel.');
    _state.busy=true;const b=d.getElementById('iac-go');b.disabled=true;b.textContent='Gerando...';
    try{
      _state.prompt=q;
      const r=await w.PIAAIRouter.call('chat-projeto',{question:SYS_PROMPT+'\n\n=== DESCRICAO DO SERVICO ===\n'+q,enable_search:false},{event:'composition_generate'});
      if(!r.ok)throw new Error(r.error);
      // Extrai JSON do texto
      const txt=r.data.answer||'';const m=txt.match(/###DISCIPLINE_IA_JSON###\s*([\s\S]*?)\s*###FIM_DISCIPLINE_IA_JSON###/);
      if(m){try{_state.extracted=JSON.parse(m[1].trim().replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,''));}catch(e){throw new Error('IA retornou JSON invalido');}}
      else throw new Error('IA nao retornou JSON');
      renderReview();
    }catch(e){alert('Erro: '+(e.message||e));b.disabled=false;b.textContent='Gerar';}
    _state.busy=false;
  };
}
function renderReview(){
  const ov=d.getElementById('pia-iac-ov');if(!ov)return;
  const ex=_state.extracted||{};const c=ex.composicao||{};const ins=ex.insumos||[];
  ov.innerHTML='<div style="background:var(--t0,#fff);border-radius:10px;max-width:780px;width:100%;max-height:88vh;display:flex;flex-direction:column;border:1px solid var(--t3,#E5E7EB);overflow:hidden"><div style="padding:16px 22px;border-bottom:1px solid var(--t3,#E5E7EB)"><div style="font-size:15px;font-weight:600;color:var(--t9,#0F172A)">Revisar composição</div></div><div style="flex:1;overflow-y:auto;padding:18px 22px"><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px"><label><div style="font-size:10.5px;color:var(--t6,#64748B);font-weight:600;margin-bottom:3px">Código</div><input id="iac-code" value="'+esc(c.code||'')+'" style="width:100%;padding:6px 9px;border:1px solid var(--t3,#E5E7EB);border-radius:5px;font-size:12px"></label><label style="grid-column:span 2"><div style="font-size:10.5px;color:var(--t6,#64748B);font-weight:600;margin-bottom:3px">Descrição</div><input id="iac-desc" value="'+esc(c.description||'')+'" style="width:100%;padding:6px 9px;border:1px solid var(--t3,#E5E7EB);border-radius:5px;font-size:12px"></label><label><div style="font-size:10.5px;color:var(--t6,#64748B);font-weight:600;margin-bottom:3px">Unidade</div><input id="iac-unit" value="'+esc(c.unit||'un')+'" style="width:100%;padding:6px 9px;border:1px solid var(--t3,#E5E7EB);border-radius:5px;font-size:12px"></label><label><div style="font-size:10.5px;color:var(--t6,#64748B);font-weight:600;margin-bottom:3px">Disciplina</div><input id="iac-disc" value="'+esc(c.discipline||'')+'" style="width:100%;padding:6px 9px;border:1px solid var(--t3,#E5E7EB);border-radius:5px;font-size:12px"></label></div><div style="font-size:11px;color:var(--t6,#64748B);font-weight:600;text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Insumos ('+ins.length+')</div><table style="width:100%;border-collapse:collapse;font-size:11.5px"><thead><tr style="background:var(--t1,#F8FAFC)"><th style="text-align:left;padding:6px 8px">Tipo</th><th style="text-align:left;padding:6px 8px">Descrição</th><th style="text-align:right;padding:6px 8px">Coef</th><th style="text-align:left;padding:6px 8px">Unid</th><th style="text-align:right;padding:6px 8px">R$ ref</th></tr></thead><tbody>'+ins.map(i=>'<tr style="border-bottom:1px solid var(--t2,#F1F5F9)"><td style="padding:6px 8px">'+esc(i.kind||'')+'</td><td style="padding:6px 8px">'+esc(i.description||'')+'</td><td style="padding:6px 8px;text-align:right;font-family:ui-monospace,monospace">'+(i.coefficient||0)+'</td><td style="padding:6px 8px">'+esc(i.unit||'')+'</td><td style="padding:6px 8px;text-align:right;font-family:ui-monospace,monospace">'+(i.unit_price_ref!=null?'R$ '+i.unit_price_ref:'—')+'</td></tr>').join('')+'</tbody></table></div><div style="padding:14px 22px;border-top:1px solid var(--t3,#E5E7EB);display:flex;justify-content:flex-end;gap:8px"><button class="btn bg" id="iac-back">Voltar</button><button class="btn bp" id="iac-save">Gravar composição</button></div></div>';
  d.getElementById('iac-back').onclick=()=>renderInput();
  d.getElementById('iac-save').onclick=save;
}
async function save(){
  const sb=getSb();if(!sb)return;
  const orgId=(w._org&&w._org.id)||null;
  const ex=_state.extracted||{};
  const c={org_id:orgId,code:d.getElementById('iac-code').value.trim()||('AI-'+Date.now().toString(36)),description:d.getElementById('iac-desc').value.trim(),unit:d.getElementById('iac-unit').value.trim()||'un',discipline:d.getElementById('iac-disc').value.trim()||null,source:'ai-composition',meta:{prompt:_state.prompt,reference:ex.composicao&&ex.composicao.fonte_referencia}};
  let r=await sb.from('compositions').insert(c).select('id').single();
  if(r.error&&/meta does not exist/i.test(r.error.message||'')){delete c.meta;r=await sb.from('compositions').insert(c).select('id').single();}
  if(r.error){alert('Erro: '+r.error.message);return;}
  const cid=r.data.id;
  for(const i of (ex.insumos||[])){
    const row={composition_id:cid,kind:i.kind||'material',description:String(i.description||'').slice(0,300),unit:i.unit||'un',coefficient:parseFloat(i.coefficient)||0,unit_price_ref:i.unit_price_ref!=null?parseFloat(i.unit_price_ref):null,category:i.category||null};
    await sb.from('composition_items').insert(row).then(()=>{}).catch(()=>{});
  }
  d.getElementById('pia-iac-ov').remove();
  (window.PIAToast ? PIAToast('Composição cadastrada.','success') : alert('Composição cadastrada.'));
  if(w.PIACompositions&&w.PIACompositions.open)w.PIACompositions.open();
}
w.PIAIAComposition={open};
}catch(e){console.error('[ai-composition]',e);}})(window,document);
