/* Calculations use recorded data and user-selected assumptions. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CFBusiness=api;
})(globalThis,function(){
  'use strict';
  function price(cost,minutes,hourly,fixed,fees,margin){
    const values=[cost,minutes,hourly,fixed,fees,margin];
    if(!values.every(Number.isFinite)||values.some(x=>x<0)||fees+margin>=100)return null;
    const labor=minutes/60*hourly;
    const base=cost+labor+fixed;
    const total=Math.ceil(base/(1-(fees+margin)/100)*100)/100;
    if(!Number.isSafeInteger(Math.round(total*100)))return null;
    return {total,labor:Math.round(labor*100)/100,base:Math.round(base*100)/100,
      margin:Math.round(total*margin)/100};
  }
  function summary(rows,today,money){
    const result=money.summarize(rows,today);
    return {...result,pendingIncome:result.rows.filter(x=>x.tipo==='receita'&&x.status!=='pago')
      .sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')),
      salesCount:result.rows.filter(x=>x.tipo==='receita').length};
  }
  return {price,summary};
});
