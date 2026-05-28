/*! PROJECT.IA — IA Catalogo (ABC por uso real + fornecedor preferido) v1 */
(function(w,d){'use strict';try{
function getSb(){return w.sb||null;}
let _busy=false;

async function smartClassifyABC(){
  if(_busy)return;_busy=true;
  const sb=getSb();if(!sb){alert('Sem conexao.');return;}
  const orgId=(w._org&&w._org.id)||null;if(!orgId){alert('Sem org.');_busy=false;return;}
  try{
    // 1. Pega uso real (PO history)
    const {data:usage}=await sb.rpc('hyd_material_usage_stats',{p_org_id:orgId}).then(r=>r,()=>({data:null}));
    // Fallback: agregação manual
    let realUsage=usage;
    if(!realUsage){
      const {data:items}=await sb.from('purchase_order_items').select('material_id,quantity,unit_price,po:purchase_orders(supplier_id,org_id)').limit(5000);
      const agg={};
      (items||[]).filter(i=>i.po&&i.po.org_id===orgId).forEach(i=>{
        const id=i.material_id;if(!id)return;
        if(!agg[id])agg[id]={total_value:0,frequency:0,suppliers:{}};
        agg[id].total_value+=(parseFloat(i.quantity)||0)*(parseFloat(i.unit_price)||0);
        agg[id].frequency++;
        const sup=i.po.supplier_id;if(sup){agg[id].suppliers[sup]=(agg[id].suppliers[sup]||0)+1;}
      });
      realUsage=Object.entries(agg).map(([material_id,v])=>({material_id,...v,top_supplier:Object.entries(v.suppliers).sort((a,b)=>b[1]-a[1])[0]&&Object.entries(v.suppliers).sort((a,b)=>b[1]-a[1])[0][0]}));
    }
    // 2. Score = total_value * frequency (Pareto)
    realUsage.sort((a,b)=>(b.total_value*b.frequency)-(a.total_value*a.frequency));
    const total=realUsage.reduce((s,r)=>s+r.total_value*r.frequency,0);let acc=0;
    const updates=[];
    realUsage.forEach(r=>{
      acc+=r.total_value*r.frequency;
      const pct=acc/total;
      const abc=pct<=0.8?'A':pct<=0.95?'B':'C';
      updates.push({id:r.material_id,abc_class:abc,preferred_supplier_id:r.top_supplier||null});
    });
    // 3. Update em batch
    for(const u of updates){
      await sb.from('materials_catalog').update({abc_class:u.abc_class,preferred_supplier_id:u.preferred_supplier_id}).eq('id',u.id).then(()=>{}).catch(()=>{});
    }
    alert(updates.length+' materiais reclassificados por uso real. ABC: A='+updates.filter(u=>u.abc_class==='A').length+' B='+updates.filter(u=>u.abc_class==='B').length+' C='+updates.filter(u=>u.abc_class==='C').length);
    if(w.PIAMaterialsCatalog&&w.PIAMaterialsCatalog.open)w.PIAMaterialsCatalog.open();
  }catch(e){console.error('[ai-catalog]',e);alert('Erro: '+(e.message||e));}
  _busy=false;
}
w.PIAIACatalog={smartClassifyABC};
}catch(e){console.error('[ai-catalog]',e);}})(window,document);
