/*! PROJECT.IA — IA PCP (gerar pacotes semanais otimizados) v1 */
(function(w,d){'use strict';try{
function getSb(){return w.sb||null;}
function esc(s){if(s==null)return '';return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
let _state={projectId:null,extracted:null,busy:false};

async function generateWeeklyPackages(projectId){
  _state.projectId=projectId;_state.extracted=null;
  const prev=d.getElementById('pia-iapcp-ov');if(prev)prev.remove();
  const ov=d.createElement('div');ov.id='pia-iapcp-ov';
  ov.style.cssText='position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9885;display:flex;align-items:center;justify-content:center;padding:24px';
  d.body.appendChild(ov);
  ov.innerHTML='<div style="background:var(--t0,#fff);border-radius:10px;max-width:680px;width:100%;padding:24px;border:1px solid var(--t3,#E5E7EB)"><div style="font-size:14px;font-weight:600;color:var(--t9,#0F172A);margin-bottom:8px">Gerando pacotes semanais com IA...</div><div id="iapcp-status" style="font-size:11.5px;color:var(--t6,#64748B);margin-bottom:14px">Carregando cronograma + efetivo + materiais...</div><div id="iapcp-out" style="display:none;max-height:60vh;overflow-y:auto;border:1px solid var(--t3,#E5E7EB);border-radius:6px;padding:12px;background:var(--t1,#F8FAFC);font-size:12px"></div><div style="display:flex;justify-content:flex-end;margin-top:14px;gap:8px"><button class="btn bg" id="iapcp-x">Fechar</button><button class="btn bp" id="iapcp-save" style="display:none">Criar pacotes</button></div></div>';
  d.getElementById('iapcp-x').onclick=()=>ov.remove();
  d.getElementById('iapcp-save').onclick=save;
  go();
}
async function go(){
  const sb=getSb();if(!sb||!w.PIAAIRouter)return;
  const st=d.getElementById('iapcp-status');
  try{
    const [sched,effect,mats,pkgs]=await Promise.all([
      sb.from('schedule_activities').select('*').eq('project_id',_state.projectId).limit(200).then(r=>r.data||[]),
      sb.from('project_workforce').select('*').eq('project_id',_state.projectId).limit(100).then(r=>r.data||[]),
      sb.from('project_materials').select('*').eq('project_id',_state.projectId).limit(300).then(r=>r.data||[]),
      sb.from('pcp_packages').select('*').eq('project_id',_state.projectId).limit(50).then(r=>r.data||[])
    ]);
    st.textContent='IA otimizando alocação...';
    const ctx={cronograma:sched.slice(0,80),efetivo:effect,materiais_recebidos:mats.slice(0,80),pacotes_atuais:pkgs};
    const prompt=`Voce e planejador senior de obras industriais (PCP semanal). Com base nos dados, gere 5-15 PACOTES otimos pra proxima semana priorizando: (1) atividades do caminho critico, (2) frentes com efetivo disponivel, (3) escopo com materiais ja recebidos.\n\nDados: ${JSON.stringify(ctx).slice(0,10000)}\n\nRetorne JSON entre ###DISCIPLINE_IA_JSON### e ###FIM_DISCIPLINE_IA_JSON###:\n{"pacotes":[{"package_code":"PCP-XXX","title":"...","discipline":"...","work_front":"...","planned_start":"YYYY-MM-DD","planned_end":"YYYY-MM-DD","required_workforce":3,"required_materials":["..."],"dependencies":[],"priority":"alta|media|baixa","justification":"..."}]}\n\nApos JSON, 3 linhas de analise + riscos.`;
    const r=await w.PIAAIRouter.call('chat-projeto',{question:prompt,enable_search:false},{event:'pcp_generate'});
    if(!r.ok)throw new Error(r.error);
    const txt=r.data.answer||'';const m=txt.match(/###DISCIPLINE_IA_JSON###\s*([\s\S]*?)\s*###FIM_DISCIPLINE_IA_JSON###/);
    if(!m)throw new Error('IA nao retornou JSON');
    _state.extracted=JSON.parse(m[1].trim().replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,''));
    const pks=_state.extracted.pacotes||[];
    d.getElementById('iapcp-out').innerHTML=pks.map(p=>'<div style="padding:8px 10px;border-bottom:1px solid var(--t3,#E5E7EB)"><strong>'+esc(p.package_code||'')+'</strong> · '+esc(p.title||'')+' <span style="font-size:10px;color:var(--t6,#64748B)">('+esc(p.priority||'')+')</span><div style="font-size:11px;color:var(--t7,#475569);margin-top:3px">'+esc(p.work_front||'')+' · '+esc(p.planned_start||'')+' → '+esc(p.planned_end||'')+'</div><div style="font-size:11px;color:var(--t6,#64748B);font-style:italic;margin-top:3px">'+esc(p.justification||'')+'</div></div>').join('');
    d.getElementById('iapcp-out').style.display='block';d.getElementById('iapcp-save').style.display='inline-flex';
    st.textContent=pks.length+' pacotes propostos. Revise antes de gravar.';
  }catch(e){st.textContent='Erro: '+(e.message||e);st.style.color='#DC2626';}
}
async function save(){
  const sb=getSb();const orgId=(w._org&&w._org.id)||null;
  const pks=(_state.extracted&&_state.extracted.pacotes)||[];
  for(const p of pks){
    const payload={org_id:orgId,project_id:_state.projectId,package_code:p.package_code||('AI-'+Date.now()),title:p.title,discipline:p.discipline||null,work_front:p.work_front||null,planned_start:p.planned_start||null,planned_end:p.planned_end||null,required_workforce:parseInt(p.required_workforce)||null,priority:p.priority||'media',status:'planejado',meta:{ai_justification:p.justification,ai_dependencies:p.dependencies||[],ai_required_materials:p.required_materials||[]}};
    let r=await sb.from('pcp_packages').insert(payload);
    if(r.error&&/meta does not exist/i.test(r.error.message||'')){delete payload.meta;await sb.from('pcp_packages').insert(payload);}
  }
  d.getElementById('pia-iapcp-ov').remove();
  alert(pks.length+' pacotes criados.');
  if(w.PIAPCP&&w.PIAPCP.open)w.PIAPCP.open();
}
w.PIAIAPcp={generateWeeklyPackages};
}catch(e){console.error('[ai-pcp]',e);}})(window,document);
