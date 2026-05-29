/*! PROJECT.IA — IA Compras (PDF de cotacao do fornecedor -> mapa comparativo) v1 */
(function(w,d){'use strict';try{
function getSb(){return w.sb||null;}
function esc(s){if(s==null)return '';return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function n(x){const v=parseFloat(x);return isNaN(v)?0:v;}
let _state={rfqId:null,supplierId:null,file:null,b64:null,mime:null,extracted:null,busy:false};

const PROMPT=`Voce e comprador senior. Analise uma PROPOSTA COMERCIAL/COTACAO de fornecedor (PDF/imagem). Extraia itens + condicoes comerciais.

JSON entre ###DISCIPLINE_IA_JSON### e ###FIM_DISCIPLINE_IA_JSON###:
{
  "fornecedor": {"nome":"...","cnpj":"...","contato":"..."},
  "proposta": {"numero":"...","data":"YYYY-MM-DD","validade_dias":30,"moeda":"BRL","frete":"CIF|FOB","prazo_entrega_dias":15,"condicao_pagamento":"30dd|a vista|..."},
  "itens":[{"item_rfq":"item1","descricao":"...","quantidade":10,"unidade":"un","preco_unitario":100.50,"preco_total":1005.00,"prazo_item_dias":null,"observacao":"..."}],
  "totais":{"subtotal":1000,"impostos":100,"frete":50,"desconto":0,"total":1150},
  "inconsistencias":["item X da RFQ nao cotado","condicao comercial diferente do solicitado",...]
}
Regras: numericos sempre numero, nunca string. Se nao identificar valor, null. Apos JSON, 2-3 linhas de analise comercial.`;

async function openImport(rfqId){
  _state.rfqId=rfqId;_state.file=null;_state.b64=null;_state.extracted=null;
  const prev=d.getElementById('pia-iaq-ov');if(prev)prev.remove();
  const ov=d.createElement('div');ov.id='pia-iaq-ov';
  ov.style.cssText='position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9885;display:flex;align-items:center;justify-content:center;padding:24px;overflow:auto';
  ov.onclick=e=>{if(e.target===ov&&!_state.busy)ov.remove();};
  d.body.appendChild(ov);renderUpload();
}
function renderUpload(){
  const ov=d.getElementById('pia-iaq-ov');if(!ov)return;
  ov.innerHTML='<div style="background:var(--t0,#fff);border-radius:10px;max-width:540px;width:100%;border:1px solid var(--t3,#E5E7EB);box-shadow:0 24px 60px rgba(0,0,0,.18)">'
    +'<div style="padding:18px 22px;border-bottom:1px solid var(--t3,#E5E7EB)"><div style="font-size:15px;font-weight:600;color:var(--t9,#0F172A)">IA Cotacoes — Ler proposta do fornecedor</div><div style="font-size:11.5px;color:var(--t6,#64748B);margin-top:3px;line-height:1.5">Envie PDF/imagem da proposta. A IA extrai itens, precos, prazos, frete, pagamento e detecta inconsistencias com a RFQ.</div></div>'
    +'<div style="padding:18px 22px"><label style="border:1.5px dashed var(--t3,#E5E7EB);border-radius:7px;padding:20px;text-align:center;cursor:pointer;display:block;background:var(--t1,#F8FAFC)"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto 6px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><div style="font-size:12.5px;font-weight:600;color:var(--t9,#0F172A)">Selecionar PDF/imagem</div><input id="iaq-file" type="file" accept=".pdf,image/*" style="display:none"></label><div id="iaq-prev" style="margin-top:10px;font-size:11px;color:var(--t6,#64748B)"></div></div>'
    +'<div style="padding:14px 22px;border-top:1px solid var(--t3,#E5E7EB);display:flex;justify-content:flex-end;gap:8px"><button class="btn bg" id="iaq-x">Cancelar</button><button class="btn bp" id="iaq-go" disabled>Extrair proposta</button></div></div>';
  d.getElementById('iaq-x').onclick=()=>ov.remove();
  d.getElementById('iaq-go').onclick=start;
  d.getElementById('iaq-file').onchange=e=>{const f=e.target.files[0];if(!f)return;_state.file=f;_state.mime=f.type||'application/pdf';d.getElementById('iaq-prev').textContent=f.name;d.getElementById('iaq-go').disabled=false;};
}
async function start(){
  if(!_state.file||!w.PIAAIRouter)return alert('IA indisponivel.');
  _state.busy=true;const b=d.getElementById('iaq-go');b.disabled=true;b.textContent='Lendo...';
  try{_state.b64=await w.PIAAIRouter.fileToBase64(_state.file);
    const r=await w.PIAAIRouter.call('analyze-discipline-doc',{file:_state.b64,mime:_state.mime,discipline_code:'custom',custom_prompt:PROMPT},{event:'quotation_extract',tables:['quotation_items']});
    if(!r.ok)throw new Error(r.error);
    _state.extracted=r.data?.extracted||r.data||{};renderReview();
  }catch(e){alert('Erro: '+e.message);b.disabled=false;b.textContent='Extrair proposta';}finally{_state.busy=false;}
}
function renderReview(){
  const ov=d.getElementById('pia-iaq-ov');if(!ov)return;
  const ex=_state.extracted||{};const itens=ex.itens||[];const inc=ex.inconsistencias||[];
  ov.innerHTML='<div style="background:var(--t0,#fff);border-radius:10px;max-width:980px;width:100%;height:88vh;display:flex;flex-direction:column;border:1px solid var(--t3,#E5E7EB);box-shadow:0 24px 60px rgba(0,0,0,.18);overflow:hidden">'
    +'<div style="padding:16px 22px;border-bottom:1px solid var(--t3,#E5E7EB);display:flex;align-items:center;gap:12px"><div style="flex:1"><div style="font-size:15px;font-weight:600;color:var(--t9,#0F172A)">Revisar proposta extraida</div><div style="font-size:11px;color:var(--t6,#64748B);margin-top:2px">'+itens.length+' itens · Total: R$ '+(n(ex.totais&&ex.totais.total)).toLocaleString('pt-BR')+'</div></div><button class="btn bg" id="iaq-back">Voltar</button><button class="btn bp" id="iaq-save">Gravar no mapa</button></div>'
    +'<div style="flex:1;overflow-y:auto;padding:18px 22px">'
    +(inc.length?'<div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:6px;padding:10px 12px;margin-bottom:14px"><div style="font-size:11px;font-weight:600;color:#92400E;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">Inconsistencias detectadas</div><ul style="margin:0;padding-left:18px;font-size:11.5px;color:#78350F;line-height:1.5">'+inc.map(i=>'<li>'+esc(i)+'</li>').join('')+'</ul></div>':'')
    +'<table style="width:100%;border-collapse:collapse;font-size:11.5px"><thead><tr style="background:var(--t1,#F8FAFC)"><th style="text-align:left;padding:8px 10px;font-size:10px;color:var(--t6,#64748B);text-transform:uppercase;font-weight:600">Descrição</th><th style="text-align:right;padding:8px 10px;font-size:10px;color:var(--t6,#64748B);text-transform:uppercase;font-weight:600">Qtd</th><th style="text-align:left;padding:8px 10px;font-size:10px;color:var(--t6,#64748B);text-transform:uppercase;font-weight:600">Un</th><th style="text-align:right;padding:8px 10px;font-size:10px;color:var(--t6,#64748B);text-transform:uppercase;font-weight:600">Preço un</th><th style="text-align:right;padding:8px 10px;font-size:10px;color:var(--t6,#64748B);text-transform:uppercase;font-weight:600">Total</th></tr></thead><tbody>'
    +itens.map(it=>'<tr style="border-bottom:1px solid var(--t2,#F1F5F9)"><td style="padding:8px 10px;color:var(--t8,#1E293B)">'+esc(it.descricao||'')+'</td><td style="padding:8px 10px;text-align:right;font-family:ui-monospace,monospace">'+(it.quantidade||0)+'</td><td style="padding:8px 10px">'+esc(it.unidade||'')+'</td><td style="padding:8px 10px;text-align:right;font-family:ui-monospace,monospace">R$ '+n(it.preco_unitario).toLocaleString('pt-BR')+'</td><td style="padding:8px 10px;text-align:right;font-family:ui-monospace,monospace">R$ '+n(it.preco_total||n(it.quantidade)*n(it.preco_unitario)).toLocaleString('pt-BR')+'</td></tr>').join('')
    +'</tbody></table></div></div>';
  d.getElementById('iaq-back').onclick=()=>renderUpload();
  d.getElementById('iaq-save').onclick=save;
}
async function save(){
  const sb=getSb();if(!sb)return alert('Sem conexao.');
  _state.busy=true;const b=d.getElementById('iaq-save');b.disabled=true;b.textContent='Gravando...';
  try{
    const ex=_state.extracted||{};const itens=ex.itens||[];
    const orgId=(w._org&&w._org.id)||null;
    var _fail=0, _lastErr='';
    for(const it of itens){
      // quotation_items só tem: rfq_id, description, unit, quantity, budget_unit_price, notes.
      // total/prazo/observação preservados em notes (não há colunas próprias).
      const _extra=[];
      if(it.preco_total) _extra.push('Total: '+it.preco_total);
      if(it.prazo_item_dias) _extra.push('Prazo: '+it.prazo_item_dias+'d');
      if(it.observacao) _extra.push(String(it.observacao));
      const payload={
        rfq_id:_state.rfqId,
        description:String(it.descricao||'Item').slice(0,500),
        quantity:n(it.quantidade)||1,
        unit:String(it.unidade||'un').slice(0,20),
        budget_unit_price:n(it.preco_unitario)||null,
        notes:_extra.length?_extra.join(' · '):null
      };
      const r=await sb.from('quotation_items').insert(payload);
      if(r.error){ _fail++; _lastErr=r.error.message; console.warn('[ai-quotation] item falhou:', r.error.message); }
    }
    if(_fail){ alert('Alguns itens não foram gravados ('+_fail+'). '+_lastErr); }
    b.textContent='✓ Gravado';setTimeout(()=>{d.getElementById('pia-iaq-ov').remove();if(w.PIAQuotations&&w.PIAQuotations.open)w.PIAQuotations.open();},700);
  }catch(e){alert('Erro: '+e.message);b.disabled=false;b.textContent='Gravar no mapa';}finally{_state.busy=false;}
}
w.PIAIAQuotation={openImport};
}catch(e){console.error('[ai-quotation]',e);}})(window,document);
