/*! PROJECT.IA — IA Fornecedores (parecer homologacao + risco atraso) v1 */
(function(w,d){'use strict';try{
function getSb(){return w.sb||null;}
function esc(s){if(s==null)return '';return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
let _state={supplierId:null,busy:false,result:null};

async function generateAdvisory(supplierId){
  _state.supplierId=supplierId;_state.result=null;
  const prev=d.getElementById('pia-iasup-ov');if(prev)prev.remove();
  const ov=d.createElement('div');ov.id='pia-iasup-ov';
  ov.style.cssText='position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9885;display:flex;align-items:center;justify-content:center;padding:24px';
  d.body.appendChild(ov);
  ov.innerHTML='<div style="background:var(--t0,#fff);border-radius:10px;max-width:680px;width:100%;padding:24px;border:1px solid var(--t3,#E5E7EB)"><div style="font-size:14px;font-weight:600;color:var(--t9,#0F172A);margin-bottom:8px">Gerando parecer de IA...</div><div id="iasup-status" style="font-size:11.5px;color:var(--t6,#64748B);margin-bottom:14px">Carregando KPIs e histórico de POs...</div><div id="iasup-out" style="white-space:pre-wrap;font-size:12.5px;color:var(--t8,#1E293B);line-height:1.5;max-height:60vh;overflow-y:auto;border:1px solid var(--t3,#E5E7EB);border-radius:6px;padding:12px;background:var(--t1,#F8FAFC);display:none"></div><div style="display:flex;justify-content:flex-end;margin-top:14px;gap:8px"><button class="btn bg" id="iasup-x">Fechar</button><button class="btn bp" id="iasup-save" style="display:none">Salvar parecer</button></div></div>';
  d.getElementById('iasup-x').onclick=()=>ov.remove();
  d.getElementById('iasup-save').onclick=savePar;
  go();
}
async function go(){
  const sb=getSb();if(!sb||!w.PIAAIRouter){d.getElementById('iasup-status').textContent='IA indisponivel.';return;}
  const st=d.getElementById('iasup-status');
  try{
    st.textContent='Carregando dados...';
    const [sup,kpis,certs,pos]=await Promise.all([
      sb.from('suppliers').select('*').eq('id',_state.supplierId).maybeSingle().then(r=>r.data),
      sb.from('supplier_kpis').select('*').eq('supplier_id',_state.supplierId).order('month',{ascending:false}).limit(12).then(r=>r.data||[]),
      sb.from('supplier_certifications').select('*').eq('supplier_id',_state.supplierId).then(r=>r.data||[]),
      sb.from('purchase_orders').select('id,total,status,planned_date,received_date,created_at').eq('supplier_id',_state.supplierId).limit(50).then(r=>r.data||[])
    ]);
    if(!sup)throw new Error('Fornecedor nao encontrado');
    st.textContent='IA analisando histórico...';
    const ctx={fornecedor:sup,kpis_12m:kpis,certificacoes:certs,historico_po:pos};
    const prompt=`Voce e analista senior de compras industriais. Avalie esse fornecedor e gere PARECER DE HOMOLOGACAO + ANALISE DE RISCO em portugues. Dados: ${JSON.stringify(ctx).slice(0,12000)}\n\nEstrutura do parecer (markdown):\n## Parecer técnico\n- Pontos fortes\n- Pontos de atenção\n- Conformidade documental\n\n## Análise de risco\n- Risco de atraso em PO futura: BAIXO/MEDIO/ALTO + justificativa\n- Risco de qualidade: idem\n- Risco financeiro: idem\n\n## Recomendação\nHOMOLOGAR | HOMOLOGAR COM RESSALVAS | NAO HOMOLOGAR + razao curta.\n\nMaximo 400 palavras. Use bullets. Seja honesto baseado nos dados.`;
    const r=await w.PIAAIRouter.call('chat-projeto',{question:prompt,enable_search:false},{event:'supplier_advisory'});
    if(!r.ok)throw new Error(r.error);
    _state.result=r.data.answer||'';
    d.getElementById('iasup-out').textContent=_state.result;
    d.getElementById('iasup-out').style.display='block';
    d.getElementById('iasup-save').style.display='inline-flex';
    st.textContent='Parecer gerado em '+(r.duration_ms||0)+'ms';
  }catch(e){st.textContent='Erro: '+(e.message||e);st.style.color='#DC2626';}
}
async function savePar(){
  const sb=getSb();if(!sb||!_state.result)return;
  const orgId=(w._org&&w._org.id)||null;
  const _r=await sb.from('supplier_advisories').insert({org_id:orgId,supplier_id:_state.supplierId,kind:'ai_homologation',content:_state.result,generated_at:new Date().toISOString()});
  if(_r.error){ console.warn('[ai-supplier] save:',_r.error); alert('Não foi possível salvar o parecer: '+_r.error.message); return; }
  d.getElementById('pia-iasup-ov').remove();
  alert('Parecer salvo.');
}
w.PIAIASupplier={generateAdvisory};
}catch(e){console.error('[ai-supplier]',e);}})(window,document);
