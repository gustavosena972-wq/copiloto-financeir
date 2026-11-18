/* Calculations use recorded data and user-selected assumptions. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CFBusiness=api;
})(globalThis,function(){
  'use strict';
  function price(cost,minutes,hourly,fixed,fees,margin){
    const values=[cost,minutes,hourly,fixed,fees,margin];
    if(!values.every(Number.isFinite)||values.some(x=>x<0)||fees+margin>=100||
      !Number.isInteger(minutes)||minutes>1440||
      [cost,hourly,fixed,fees,margin].some(x=>x>1000000||Math.abs(x*100-Math.round(x*100))>1e-6))return null;
    // Integer cents prevent a binary floating point residue from adding an extra cent.
    const cents=x=>BigInt(Math.round(x*100));
    const base60=(cents(cost)+cents(fixed))*60n+BigInt(minutes)*cents(hourly);
    const denominator=60n*(10000n-cents(fees)-cents(margin));
    if(denominator<=0n)return null;
    const totalCents=(base60*10000n+denominator-1n)/denominator;
    if(totalCents>BigInt(Number.MAX_SAFE_INTEGER))return null;
    return {total:Number(totalCents)/100,labor:Number((BigInt(minutes)*cents(hourly)+30n)/60n)/100,
      base:Number((base60+30n)/60n)/100,margin:Number((totalCents*cents(margin)+5000n)/10000n)/100};
  }
  function summary(rows,today,money){
    const result=money.summarize(rows,today);
    return {...result,pendingIncome:result.rows.filter(x=>x.tipo==='receita'&&x.status!=='pago')
      .sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')),
      salesCount:result.rows.filter(x=>x.tipo==='receita').length};
  }
  return {price,summary};
});
