/*! PROJECT.IA — IA NR-13 (PMTA/plot plan/placa -> equipamentos) v1
 *  Wraps analyze-equipment edge function (que ja existe e funciona) com UI consistente.
 */
(function(w,d){'use strict';try{
let _state={file:null,b64:null,mime:null,projectId:null,extracted:null,busy:false};

async function openImport(projectId){
  _state.projectId=projectId||(w._curProject&&w._curProject.id)||null;
  _state.file=null;_state.extracted=null;
  const prev=d.getElementById('pia-iaeq-ov');if(prev)prev.remove();
  const ov=d.createElement('div');ov.id='pia-iaeq-ov';
  ov.style.cssText='position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9885;display:flex;align-items:center;justify-content:center;padding:24px';
  d.body.appendChild(ov);renderUpload();
}
function renderUpload(){
  const ov=d.getElementById('pia-iaeq-ov');if(!ov)return;
  ov.innerHTML='<div style="background:var(--t0,#fff);border-radius:10px;max-width:540px;width:100%;border:1px solid var(--t3,#E5E7EB)"><div style="padding:18px 22px;border-bottom:1px solid var(--t3,#E5E7EB)"><div style="font-size:15px;font-weight:600;color:var(--t9,#0F172A)">IA Equipamentos NR-13</div><div style="font-size:11.5px;color:var(--t6,#64748B);margin-top:3px;line-height:1.5">Envie PMTA, placa de identificação (dataplate), plot plan ou P&ID. A IA cadastra equipamentos (vasos, tanques, trocadores) com cálculo automático de categoria NR-13 (P×V).</div></div><div style="padding:18px 22px"><input id="iaeq-f" type="file" accept=".pdf,image/*" style="width:100%;padding:8px;border:1px solid var(--t3,#E5E7EB);border-radius:6px;font-size:13px"></div><div style="padding:14px 22px;border-top:1px solid var(--t3,#E5E7EB);display:flex;justify-content:flex-end;gap:8px"><button class="btn bg" id="iaeq-x">Cancelar</button><button class="btn bp" id="iaeq-go" disabled>Extrair</button></div></div>';
  d.getElementById('iaeq-x').onclick=()=>ov.remove();
  d.getElementById('iaeq-f').onchange=e=>{const f=e.target.files[0];if(!f)return;_state.file=f;_state.mime=f.type||'application/pdf';d.getElementById('iaeq-go').disabled=false;};
  d.getElementById('iaeq-go').onclick=async()=>{
    if(!w.PIAAIRouter)return alert('IA indisponivel.');
    _state.busy=true;const b=d.getElementById('iaeq-go');b.disabled=true;b.textContent='Lendo...';
    try{
      _state.b64=await w.PIAAIRouter.fileToBase64(_state.file);
      // Usa analyze-equipment direto (ja deployed e robusto)
      const r=await w.PIAAIRouter.call('analyze-equipment',{file:_state.b64,mime:_state.mime,project_id:_state.projectId,auto_save:false},{event:'equipment_extract',tables:['equipments']});
      if(!r.ok)throw new Error(r.error);
      _state.extracted=r.data;
      renderReview();
    }catch(e){alert('Erro: '+e.message);b.disabled=false;b.textContent='Extrair';}
    _state.busy=false;
  };
}
function renderReview(){
  const ov=d.getElementById('pia-iaeq-ov');if(!ov)return;
  const ex=_state.extracted||{};const eqs=ex.equipments||[];
  const esc=s=>s==null?'':String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  ov.innerHTML='<div style="background:var(--t0,#fff);border-radius:10px;max-width:960px;width:100%;height:88vh;display:flex;flex-direction:column;border:1px solid var(--t3,#E5E7EB);overflow:hidden"><div style="padding:16px 22px;border-bottom:1px solid var(--t3,#E5E7EB);display:flex;align-items:center;gap:12px"><div style="flex:1"><div style="font-size:15px;font-weight:600;color:var(--t9,#0F172A)">'+eqs.length+' equipamento(s) extraído(s)</div></div><button class="btn bg" id="iaeq-back">Voltar</button><button class="btn bp" id="iaeq-save">Gravar todos</button></div><div style="flex:1;overflow-y:auto;padding:18px 22px"><table style="width:100%;border-collapse:collapse;font-size:11.5px"><thead><tr style="background:var(--t1,#F8FAFC)"><th style="text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;font-weight:600;color:var(--t6,#64748B)">TAG</th><th style="text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;font-weight:600;color:var(--t6,#64748B)">Nome</th><th style="text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;font-weight:600;color:var(--t6,#64748B)">Tipo</th><th style="text-align:right;padding:8px 10px;font-size:10px;text-transform:uppercase;font-weight:600;color:var(--t6,#64748B)">P design</th><th style="text-align:right;padding:8px 10px;font-size:10px;text-transform:uppercase;font-weight:600;color:var(--t6,#64748B)">Vol m³</th><th style="text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;font-weight:600;color:var(--t6,#64748B)">NR-13</th></tr></thead><tbody>'+eqs.map(e=>'<tr style="border-bottom:1px solid var(--t2,#F1F5F9)"><td style="padding:8px 10px;font-family:ui-monospace,monospace">'+esc(e.tag||'')+'</td><td style="padding:8px 10px">'+esc(e.name||'')+'</td><td style="padding:8px 10px">'+esc(e.equipment_type||'')+'</td><td style="padding:8px 10px;text-align:right;font-family:ui-monospace,monospace">'+(e.design_pressure_bar||'—')+' bar</td><td style="padding:8px 10px;text-align:right;font-family:ui-monospace,monospace">'+(e.volume_m3||'—')+'</td><td style="padding:8px 10px"><span style="background:'+(e.nr13_required?'#FEE2E2':'#F1F5F9')+';color:'+(e.nr13_required?'#991B1B':'#475569')+';padding:1px 8px;border-radius:6px;font-size:10px;font-weight:600">Cat '+(e.nr13_category||'—')+'</span></td></tr>').join('')+'</tbody></table></div></div>';
  d.getElementById('iaeq-back').onclick=()=>renderUpload();
  d.getElementById('iaeq-save').onclick=async()=>{
    if(!w.PIAAIRouter)return;
    const b=d.getElementById('iaeq-save');b.disabled=true;b.textContent='Gravando...';
    // Re-chama com auto_save:true
    const r=await w.PIAAIRouter.call('analyze-equipment',{file:_state.b64,mime:_state.mime,project_id:_state.projectId,auto_save:true},{event:'equipment_save',tables:['equipments']});
    if(!r.ok){alert('Erro: '+r.error);return;}
    d.getElementById('pia-iaeq-ov').remove();
    alert((r.data.saved_count||0)+' equipamentos cadastrados.');
  };
}
w.PIAIAEquipment={openImport};
}catch(e){console.error('[ai-equipment]',e);}})(window,document);
