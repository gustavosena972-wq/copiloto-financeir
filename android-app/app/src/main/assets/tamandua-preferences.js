(() => {
 const state=()=>{try{return S}catch(_){return {}}},client=()=>window.__copilotoSupabase||null;
 const gate=window.CFTamanduaSession.createSessionGate(()=>{document.getElementById('cf-tamandua-preferences')?.close();window.CopilotoAlerts?.postMessage(JSON.stringify({action:'clear'}));});
 let scopeKey=undefined,lastSignature='',timer=null,sequence=0;const pending=new Map();
 function scope(){const s=state();return s.user?.id&&s.fam?.id?JSON.stringify([s.user.id,s.fam.id]):null;}
 function notice(text,error=false){if(typeof toast==='function')toast(text,error?1:0);}
 function permission(){
  if(!window.CopilotoAlerts?.postMessage)return Promise.resolve(false);
  const id='permission_'+Date.now()+'_'+(++sequence),ticket=gate.ticket(state());
  return new Promise(resolve=>{const timer=setTimeout(()=>{pending.delete(id);resolve(false);},60000);pending.set(id,{resolve,timer,ticket});window.CopilotoAlerts.postMessage(JSON.stringify({action:'permission',id,scope:scope()}));});
 }
 window.addEventListener('copiloto:alerts-permission',event=>{const result=event.detail||{},request=pending.get(result.id);if(!request)return;clearTimeout(request.timer);pending.delete(result.id);request.resolve(gate.accepts(request.ticket,state())&&result.granted===true);});
 async function syncAlerts(){
  const s=state(),key=scope(),ticket=gate.ticket(s),db=client();if(!key||!ticket||!db||!window.CopilotoAlerts?.postMessage)return;
  const prefs=await db.from('tamandua_preferencias').select('acompanhamento_habilitado').eq('usuario_id',s.user.id).eq('familia_id',s.fam.id).maybeSingle();
  if(!gate.accepts(ticket,state()))return;
  if(prefs.error||!prefs.data?.acompanhamento_habilitado){window.CopilotoAlerts.postMessage(JSON.stringify({action:'sync',scope:key,enabled:false,days:[]}));return;}
  const now=new Date(),month=s.mes?.mes||Number(new Intl.DateTimeFormat('en',{timeZone:'America/Sao_Paulo',month:'numeric'}).format(now)),year=s.ano?.ano||Number(new Intl.DateTimeFormat('en',{timeZone:'America/Sao_Paulo',year:'numeric'}).format(now));
  const result=await db.rpc('tamandua_contexto_financeiro',{p_mes:month,p_ano:year});
  if(!gate.accepts(ticket,state()))return;
  const days=result.error?[]:window.CFReminderPlan.planDays(result.data?.vencimentos_30_dias,result.data?.data_referencia);
  window.CopilotoAlerts.postMessage(JSON.stringify({action:'sync',scope:key,enabled:!result.error,days}));
 }
 function observe(){
  gate.update(state());const key=scope();
  if(key!==scopeKey){scopeKey=key;lastSignature='';window.CopilotoAlerts?.postMessage(JSON.stringify(key?{action:'sync',scope:key,enabled:false,days:[]}:{action:'clear'}));}
  if(!key||!document.querySelector('.app-shell'))return;
  const s=state(),signature=key+JSON.stringify((s.lanc||[]).map(x=>[x.id,x.status,x.data_vencimento,x.valor]));
  if(signature===lastSignature)return;lastSignature=signature;clearTimeout(timer);timer=setTimeout(()=>syncAlerts().catch(()=>{}),800);
 }
 async function openPreferences(){
  if(document.getElementById('cf-tamandua-preferences'))return;
  const s=state(),ticket=gate.ticket(s),db=client();if(!ticket||!db)return;
  const dialog=document.createElement('dialog');dialog.id='cf-tamandua-preferences';dialog.className='cf-preferences-dialog';
  dialog.innerHTML='<form method="dialog"><button class="cf-preferences-close" aria-label="Fechar preferências">Fechar</button></form><p class="cf-preferences-kicker">Seu Tamanduá, do seu jeito</p><h2>Memória e acompanhamento</h2><p>Você escolhe como quer ser acompanhado. Estas preferências pertencem à sua conta na família atual.</p><form id="cf-preferences-form"><label class="cf-preferences-option"><input type="checkbox" name="memory" checked><span><strong>Usar minhas preferências</strong><small>Personaliza as respostas com o que você compartilhou. Desativar não apaga conversas.</small></span></label><label class="cf-preferences-option"><input type="checkbox" name="follow"><span><strong>Receber lembretes no Android</strong><small>Avisos discretos sobre vencimentos registrados, por até 7 dias após sincronizar. O Android controla a entrega.</small></span></label><p class="cf-preferences-native">Nenhum valor, nome de conta ou mensagem aparece na notificação.</p><p class="cf-preferences-status" role="status">Conferindo suas preferências…</p><button type="submit">Salvar minhas escolhas</button></form>';
  document.body.append(dialog);dialog.showModal();dialog.addEventListener('close',()=>dialog.remove());
  const form=dialog.querySelector('#cf-preferences-form'),memory=form.elements.memory,follow=form.elements.follow,status=form.querySelector('[role="status"]'),submit=form.querySelector('[type="submit"]');
  submit.disabled=true;
  try{
   const result=await db.from('tamandua_preferencias').select('memoria_habilitada,acompanhamento_habilitado,idioma').eq('usuario_id',s.user.id).eq('familia_id',s.fam.id).maybeSingle();
   if(!gate.accepts(ticket,state())||!dialog.isConnected)return;
   if(result.error)throw result.error;
   memory.checked=result.data?.memoria_habilitada!==false;follow.checked=result.data?.acompanhamento_habilitado===true;status.textContent='';
   if(!window.CopilotoAlerts?.postMessage){follow.checked=false;follow.disabled=true;status.textContent='Lembretes disponíveis no aplicativo Android instalado.';}
   submit.disabled=false;
   follow.onchange=async()=>{if(!follow.checked)return;follow.disabled=true;const granted=await permission();if(!gate.accepts(ticket,state())||!dialog.isConnected)return;follow.disabled=false;follow.checked=granted;if(!granted)status.textContent='Notificações não autorizadas. Suas demais preferências podem ser salvas.';};
   form.onsubmit=async event=>{
    event.preventDefault();if(!gate.accepts(ticket,state()))return;submit.disabled=true;status.textContent='Salvando…';
    const result=await db.from('tamandua_preferencias').upsert({usuario_id:s.user.id,familia_id:s.fam.id,memoria_habilitada:memory.checked,acompanhamento_habilitado:follow.checked,atualizado_em:new Date().toISOString()},{onConflict:'usuario_id,familia_id'});
    if(!gate.accepts(ticket,state())||!dialog.isConnected)return;
    if(result.error){status.textContent='Não foi possível salvar. Tente novamente.';submit.disabled=false;return;}
    dialog.close();notice('Suas preferências foram salvas.');syncAlerts().catch(()=>{});
   };
  }catch(_){if(dialog.isConnected)status.textContent='Não foi possível conferir suas preferências. Feche e tente novamente.';}
 }
 window.addEventListener('copiloto:tamandua-preferences',()=>openPreferences().catch(()=>{}));
 new MutationObserver(observe).observe(document.body,{childList:true,subtree:true});observe();
})();
