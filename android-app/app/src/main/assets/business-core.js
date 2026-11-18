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
  function review(rows,today,money){
    const d=summary(rows,today,money),groups=new Map();
    const aging=tipo=>{
      const buckets=[['future','A vencer'],['1-7','1 a 7 dias'],['8-30','8 a 30 dias'],['31+','Mais de 30 dias'],['undated','Sem vencimento']]
        .map(([key,label])=>({key,label,cents:0,count:0}));
      for(const row of d.rows.filter(x=>x.tipo===tipo&&x.status!=='pago')){
        const days=row.due?Math.round((Date.parse(today+'T12:00:00Z')-Date.parse(row.due+'T12:00:00Z'))/86400000):null;
        const key=days===null?'undated':days<=0?'future':days<=7?'1-7':days<=30?'8-30':'31+';
        const b=buckets.find(x=>x.key===key);b.cents+=row.cents;b.count++;
      }
      return buckets;
    };
    for(const row of d.rows){
      // Only flag comparable dated records. Never delete or merge automatically.
      if(!row.due||!String(row.descricao||'').trim())continue;
      const key=JSON.stringify([row.tipo,String(row.descricao).trim().toLocaleLowerCase('pt-BR'),row.cents,row.due,row.categoria_id||null]);
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(row);
    }
    return {...d,receivableAging:aging('receita'),payableAging:aging('despesa'),
      missingDue:d.rows.filter(x=>x.status!=='pago'&&!x.due),
      missingCategory:d.rows.filter(x=>x.categoria==='Sem categoria'||(!x.categoria_id&&!x.categoria)),
      duplicates:[...groups.values()].filter(x=>x.length>1).flat()};
  }
  function ledger(d,filters={}){
    const query=String(filters.query||'').trim().toLocaleLowerCase('pt-BR').slice(0,120);
    const rows=d.rows.filter(r=>{
      if(query&&!String(r.descricao||'').toLocaleLowerCase('pt-BR').includes(query))return false;
      if(['receita','despesa'].includes(filters.tipo)&&r.tipo!==filters.tipo)return false;
      if(filters.categoria&&r.categoria_id!==filters.categoria)return false;
      const overdue=r.status!=='pago'&&r.due&&r.due<d.today;
      if(filters.status==='pago'&&r.status!=='pago')return false;
      if(filters.status==='pendente'&&r.status==='pago')return false;
      if(filters.status==='overdue'&&!overdue)return false;
      return true;
    }).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')||String(a.id||'').localeCompare(String(b.id||'')));
    const pages=Math.max(1,Math.ceil(rows.length/25)),page=Math.max(1,Math.min(pages,Number.isInteger(filters.page)?filters.page:1));
    return {rows:rows.slice((page-1)*25,page*25),page,pages,count:rows.length,
      income:rows.filter(x=>x.tipo==='receita').reduce((s,x)=>s+x.cents,0),
      expense:rows.filter(x=>x.tipo==='despesa').reduce((s,x)=>s+x.cents,0)};
  }
  function plan(input,money){
    const fixed=money.cents(input.fixed),sales=money.cents(input.sales),target=money.cents(input.target);
    const rate=x=>/^\d+(\.\d{1,2})?$/.test(String(x))&&Number(x)<100?Math.round(Number(x)*100):null;
    const variable=rate(input.variable),tax=rate(input.tax),days=Number(input.days);
    if([fixed,sales,target,variable,tax].some(x=>x===null)||variable+tax>=10000||!Number.isInteger(days)||days<1||days>31)return null;
    const contribution=10000-variable-tax;
    const ceilDivide=(n,d)=>Number((n+BigInt(d)-1n)/BigInt(d));
    const breakEven=ceilDivide(BigInt(fixed)*10000n,contribution);
    const targetRevenue=ceilDivide((BigInt(fixed)+BigInt(target))*10000n,contribution);
    const estimatedResult=Number((BigInt(sales)*BigInt(contribution)+5000n)/10000n)-fixed;
    if(![breakEven,targetRevenue,estimatedResult].every(Number.isSafeInteger))return null;
    return {contributionRate:contribution/100,breakEven,targetRevenue,dailyTarget:Math.ceil(targetRevenue/days),
      estimatedResult,gap:Math.max(0,targetRevenue-sales),fixed,sales,target,days,variable:variable/100,tax:tax/100};
  }
  return {price,summary,review,ledger,plan};
});
