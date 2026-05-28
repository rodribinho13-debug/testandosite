/*! PROJECT.IA — IA Manutencao (classifica OS + sugere tecnico) v1 */
(function(w,d){'use strict';try{
function getSb(){return w.sb||null;}
async function classifyOSDescription(description,projectId){
  if(!w.PIAAIRouter||!description)return null;
  const sb=getSb();if(!sb)return null;
  // Carrega contexto: técnicos e OS similares passadas
  const [tecs,similar]=await Promise.all([
    sb.from('org_members').select('user_id,name,skills,roles').limit(50).then(r=>r.data||[]),
    sb.from('maintenance_orders').select('description,discipline,severity,assigned_user_id,resolution_hours').eq('status','fechada').limit(30).then(r=>r.data||[])
  ]);
  const prompt=`Voce e supervisor de manutencao industrial. Classifique essa OS recem-aberta:\n\nDescricao: "${description}"\n\nTecnicos disponiveis: ${JSON.stringify(tecs.slice(0,20))}\n\nOS similares fechadas (referencia ETA): ${JSON.stringify(similar.slice(0,15))}\n\nRetorne SO JSON valido:\n{"discipline":"mecanica|eletrica|instrumentacao|tubulacao|outros","severity":"baixa|media|alta|critica","suggested_technician_id":"...","suggested_technician_name":"...","estimated_hours":2,"justification":"...","recommended_priority":"P1|P2|P3|P4"}`;
  const r=await w.PIAAIRouter.call('chat-projeto',{question:prompt,enable_search:false},{event:'maintenance_classify'});
  if(!r.ok)return null;
  const txt=r.data.answer||'';
  try{const m=txt.match(/\{[\s\S]*\}/);if(m)return JSON.parse(m[0]);}catch(_){}
  return null;
}
w.PIAIAMaintenance={classifyOSDescription};
}catch(e){console.error('[ai-maintenance]',e);}})(window,document);
