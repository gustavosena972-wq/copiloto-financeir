/* Dates only. Never forwards descriptions, amounts, member names or tokens. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CFReminderPlan=factory();})(globalThis,function(){
 function validDay(value){const text=String(value||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(text))return null;const date=new Date(text+'T12:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===text?text:null;}
 function addDays(today,count){const day=new Date(today+'T12:00:00Z');day.setUTCDate(day.getUTCDate()+count);return day.toISOString().slice(0,10);}
 function planDays(rows,today){
  today=validDay(today);if(!today)return [];
  const dates=(Array.isArray(rows)?rows:[]).filter(row=>row.tipo==='despesa'&&row.status!=='pago').map(row=>validDay(row.data_vencimento)).filter(Boolean);
  const pending=new Set(dates),overdue=dates.some(day=>day<today),days=[];
  for(let offset=1;offset<=7;offset++){const day=addDays(today,offset);if(overdue||pending.has(day)||pending.has(today))days.push(day);}
  return days;
 }
 return {validDay,planDays};
});
