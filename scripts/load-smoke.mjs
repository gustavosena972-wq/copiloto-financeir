const APP_URL='https://gustavosena972-wq.github.io/copiloto-financeir/';
const AUTH_HEALTH='https://jlufubazlnrelrbsvsal.supabase.co/auth/v1/health';

const args=Object.fromEntries(process.argv.slice(2).map((v,i,a)=>{
  if(!v.startsWith('--')) return [];
  return [v.slice(2), a[i+1] && !a[i+1].startsWith('--') ? a[i+1] : 'true'];
}));
const concurrency=Number(args.concurrency||2);
const rounds=Number(args.rounds||5);
if(!Number.isInteger(concurrency)||concurrency<1||concurrency>10) throw new Error('concurrency must be 1..10');
if(!Number.isInteger(rounds)||rounds<1||rounds>20) throw new Error('rounds must be 1..20');

async function one(url){
  const started=performance.now();
  try{
    const r=await fetch(url,{method:'GET',redirect:'follow',cache:'no-store'});
    const ms=Math.round(performance.now()-started);
    await r.arrayBuffer();
    return {ok:r.ok,status:r.status,ms};
  }catch(error){
    return {ok:false,status:0,ms:Math.round(performance.now()-started),error:String(error)};
  }
}
async function runRound(){
  const jobs=Array.from({length:concurrency},()=>Promise.all([one(APP_URL),one(AUTH_HEALTH)]));
  return (await Promise.all(jobs)).flat();
}
const all=[];
for(let i=0;i<rounds;i++){
  const result=await runRound();
  all.push(...result);
  const failures=result.filter(x=>!x.ok);
  console.log(JSON.stringify({round:i+1,concurrency,requests:result.length,failures:failures.length,maxMs:Math.max(...result.map(x=>x.ms)),avgMs:Math.round(result.reduce((a,x)=>a+x.ms,0)/result.length)}));
}
const failures=all.filter(x=>!x.ok);
const times=all.map(x=>x.ms).sort((a,b)=>a-b);
const p95=times[Math.min(times.length-1,Math.ceil(times.length*.95)-1)];
console.log(JSON.stringify({summary:{concurrency,rounds,totalRequests:all.length,failures:failures.length,failureRate:failures.length/all.length,p95Ms:p95,maxMs:times.at(-1)}}));
if(failures.length>0) process.exit(1);
