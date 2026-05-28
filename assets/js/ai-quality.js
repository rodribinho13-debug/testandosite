/*! PROJECT.IA — IA Qualidade (Juntas criticas + Laudo END) v1 */
(function(w,d){'use strict';try{
function getSb(){return w.sb||null;}
function esc(s){if(s==null)return '';return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

// 1) Marca juntas críticas baseado em dados do banco (sem IA externa — heurística + LLM consultivo)
async function flagCriticalJoints(projectId){
  const sb=getSb();if(!sb)return;
  const {data:joints}=await sb.from('joints').select('*').eq('project_id',projectId).limit(2000);
  if(!joints||!joints.length){alert('Sem juntas pra analisar.');return;}
  let flagged=0;
  for(const j of joints){
    const isCrit=(parseFloat(j.diameter_in)>=6)||(j.fluid_class&&/(critico|toxico|hidrocarboneto|H2S)/i.test(j.fluid_class))||(j.pressure_class&&parseFloat(j.pressure_class)>=600)||(j.material&&/(inox|duplex|cromo)/i.test(j.material))||(j.ndt_required===true);
    if(isCrit&&!j.is_critical){
      await sb.from('joints').update({is_critical:true,ndt_required:true,criticality_reason:'IA: '+([j.diameter_in&&parseFloat(j.diameter_in)>=6?'diam alto':null,j.fluid_class?'fluido critico':null,j.pressure_class?'classe alta':null,j.material&&/inox|duplex/i.test(j.material)?'material nobre':null].filter(Boolean).join(', '))}).eq('id',j.id).then(()=>flagged++).catch(()=>{});
    }
  }
  alert(flagged+' junta(s) marcada(s) como crítica(s).');
}

// 2) Lê laudo END (PDF) e cadastra inspecao
async function importEndReport(){
  const prev=d.getElementById('pia-iaend-ov');if(prev)prev.remove();
  const ov=d.createElement('div');ov.id='pia-iaend-ov';
  ov.style.cssText='position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9885;display:flex;align-items:center;justify-content:center;padding:24px';
  d.body.appendChild(ov);
  ov.innerHTML='<div style="background:var(--t0,#fff);border-radius:10px;max-width:540px;width:100%;border:1px solid var(--t3,#E5E7EB)"><div style="padding:18px 22px;border-bottom:1px solid var(--t3,#E5E7EB)"><div style="font-size:15px;font-weight:600;color:var(--t9,#0F172A)">Laudo END com IA</div><div style="font-size:11.5px;color:var(--t6,#64748B);margin-top:3px">Envie laudo PDF (LP / PM / RX / UT). A IA extrai achados, classifica conformidade e vincula à junta correspondente.</div></div><div style="padding:18px 22px"><input id="iaend-f" type="file" accept=".pdf,image/*" style="width:100%;padding:8px;border:1px solid var(--t3,#E5E7EB);border-radius:6px;font-size:13px"></div><div style="padding:14px 22px;border-top:1px solid var(--t3,#E5E7EB);display:flex;justify-content:flex-end;gap:8px"><button class="btn bg" id="iaend-x">Cancelar</button><button class="btn bp" id="iaend-go">Processar</button></div></div>';
  d.getElementById('iaend-x').onclick=()=>ov.remove();
  d.getElementById('iaend-go').onclick=async()=>{
    const f=d.getElementById('iaend-f').files[0];if(!f)return alert('Selecione arquivo.');
    if(!w.PIAAIRouter)return alert('IA indisponivel.');
    const b=d.getElementById('iaend-go');b.disabled=true;b.textContent='Processando...';
    try{
      const b64=await w.PIAAIRouter.fileToBase64(f);
      const prompt=`Voce e inspetor END/NDT (ASNT/SNQC) lendo um LAUDO de END. Extraia em JSON entre ###DISCIPLINE_IA_JSON### e ###FIM_DISCIPLINE_IA_JSON###:\n{"laudo":{"numero":"...","data":"YYYY-MM-DD","metodo":"LP|PM|RX|UT|VS","inspetor":"...","empresa_inspecao":"..."},"juntas_inspecionadas":[{"identificacao_junta":"...","resultado":"aprovada|reprovada|aprovada_com_ressalva","descontinuidades":["..."],"observacao":"..."}]}\nSeja preciso. NUNCA invente identificacao de junta.`;
      const r=await w.PIAAIRouter.call('analyze-discipline-doc',{file:b64,mime:f.type||'application/pdf',discipline_code:'custom',custom_prompt:prompt},{event:'ndt_report_extract',tables:['ndt_inspections']});
      if(!r.ok)throw new Error(r.error);
      const ex=r.data?.extracted||{};const ll=ex.laudo||{};const js=ex.juntas_inspecionadas||[];
      const sb=getSb();const orgId=(w._org&&w._org.id)||null;
      for(const ji of js){
        const payload={org_id:orgId,joint_identifier:ji.identificacao_junta,result:ji.resultado,method:ll.metodo,report_number:ll.numero,report_date:ll.data,inspector:ll.inspetor,inspection_company:ll.empresa_inspecao,findings:ji.descontinuidades||[],observation:ji.observacao,source:'ai-end'};
        await sb.from('ndt_inspections').insert(payload).then(()=>{}).catch(()=>{});
      }
      d.getElementById('pia-iaend-ov').remove();
      alert(js.length+' inspeções gravadas.');
    }catch(e){alert('Erro: '+(e.message||e));b.disabled=false;b.textContent='Processar';}
  };
}

w.PIAIAQuality={flagCriticalJoints,importEndReport};
}catch(e){console.error('[ai-quality]',e);}})(window,document);
