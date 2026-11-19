(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CFTamanduaTaskCore=api;})(globalThis,function(){
 'use strict';
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 const scope=s=>JSON.stringify([s.user?.id||null,s.fam?.id||null,s.mes?.id||null,s.bootEpoch||0]);
 function editable(s){return !!s.user?.id&&!!s.fam?.id&&!!s.mes?.id&&['dono','editor'].includes(s.me?.papel)&&s.mes.status==='aberto';}
 function intent(message){const m=norm(message);if(/\b(organiz|categoriz|arrum)/.test(m)&&/planilha|lancamento|despesa|receita|mes/.test(m))return 'categorize';if(/\b(import|anex|enviar planilha)/.test(m))return 'import';if(/\b(registr|adicion|cadastr|lanc)/.test(m)&&/despesa|receita|gasto|conta/.test(m))return 'entry';return null;}
 function categoryChoices(row,categories){return categories.filter(c=>c.tipo===row.tipo);}
 function suggest(row,categories){
  const desc=norm(row.descricao);const hits=categoryChoices(row,categories).filter(c=>{const name=norm(c.nome);return name.length>=3&&desc.includes(name);});
  return hits.length===1?hits[0].id:'';
 }
 function uncategorized(s){return (s.lanc||[]).filter(r=>r.id&&!r.categoria_id&&['despesa','receita'].includes(r.tipo)).slice(0,50);}
 async function applyCategories({snapshot,getState,selections,write}){
  if(!editable(snapshot))throw new Error('Você precisa ter permissão de edição e um mês aberto.');
  const key=scope(snapshot),rows=uncategorized(snapshot),seen=new Set();let applied=0,skipped=0;
  if(!Array.isArray(selections)||selections.length>50)throw new Error('Seleção inválida.');
  const plan=selections.map(selected=>{
   if(!selected)throw new Error('Seleção inválida.');
   const row=rows.find(r=>r.id===selected.id),category=(snapshot.cats||[]).find(c=>c.id===selected.categoryId&&c.tipo===row?.tipo);
   if(!row||!category||seen.has(row.id))throw new Error('A seleção contém um lançamento ou categoria inválida.');seen.add(row.id);
   return {row,category};
  });
  for(const {row,category} of plan){
   if(scope(getState())!==key||!editable(getState()))throw new Error('A conta ou o mês mudou. Abra a organização novamente.');
   try{const changed=await write(row,category,snapshot);if(changed)applied++;else skipped++;}catch(error){return {applied,skipped,failed:true};}
  }
  return {applied,skipped,failed:false};
 }
 return {norm,scope,editable,intent,categoryChoices,suggest,uncategorized,applyCategories};
});
