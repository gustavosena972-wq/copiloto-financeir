/* Business appointments use local calendar dates, independent of the accounting month. */
(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ranges={week:'Esta semana',next:'Próxima semana',month:'Próximo mês'};
  const iso=d=>d.toISOString().slice(0,10);
  function bounds(today,range){
    const start=new Date(today+'T12:00:00Z');
    if(range==='month'){start.setUTCDate(1);start.setUTCMonth(start.getUTCMonth()+1);}
    else start.setUTCDate(start.getUTCDate()-(start.getUTCDay()+6)%7+(range==='next'?7:0));
    const end=new Date(start);
    if(range==='month')end.setUTCMonth(end.getUTCMonth()+1);else end.setUTCDate(end.getUTCDate()+7);
    return [iso(start),iso(end)];
  }
  if(typeof module==='object'&&module.exports){module.exports={bounds};return;}
  const key=()=>JSON.stringify([S.user?.id,S.fam?.id,S.bootEpoch]);
  let state,request=0;
  function current(){
    if(state?.key!==key())state={key:key(),range:'week',staff:[],visits:[],loaded:false};
    return state;
  }
  const local=d=>d.split('-').reverse().join('/');
  async function pages(query){
    const all=[];
    for(let from=0;;from+=250){const rows=await q(query().range(from,from+249));all.push(...rows);if(rows.length<250)return all;}
  }
  function shell(){
    if(window.CFBusinessReports.area()==='agenda')queueMicrotask(()=>{if(document.getElementById('cf-agenda'))void load().catch(showError);});
    return window.CFBusinessReports.section('agenda')+'<div id="cf-agenda"><h2>Agenda e equipe</h2><p role="status">Carregando agenda…</p></div></section>';
  }
  function showError(){const root=document.getElementById('cf-agenda');if(root&&current().key===key())root.innerHTML='<h2>Agenda e equipe</h2><p role="status">Não foi possível atualizar a agenda.</p><button data-act="negocio-agenda-recarregar">Tentar novamente</button>';}
  async function load(){
    const st=current(),seq=++request,scope=st.key,fam=S.fam.id;
    const [from,to]=bounds(st.range==='custom'?st.anchor:localFinancialDate(),st.range);
    try{
      const [staff,visits]=await Promise.all([
        pages(()=>sb.from('negocio_equipe').select('id,nome,funcao').eq('familia_id',fam).order('nome').order('id')),
        pages(()=>sb.from('negocio_agenda').select('id,cliente,atividade,dia,hora,funcionario_id').eq('familia_id',fam).eq('cancelado',false).gte('dia',from).lt('dia',to).order('dia').order('hora').order('id'))
      ]);
      if(seq!==request||key()!==scope)return;
      Object.assign(st,{staff,visits,loaded:true});draw(st);
    }catch(error){if(seq===request&&key()===scope)showError();}
  }
  function draw(st){
    const root=document.getElementById('cf-agenda');if(!root)return;
    const team=new Map(st.staff.map(x=>[x.id,x.nome])),ed=canEdit();
    const [start]=bounds(st.range==='custom'?st.anchor:localFinancialDate(),st.range);
    const options=st.staff.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nome)+'</option>').join('');
    let day='';
    const list=st.visits.map(v=>{
      const heading=v.dia===day?'':'<h3>'+local(v.dia)+'</h3>';day=v.dia;
      return heading+'<div class="cf-visit"><time>'+esc(v.hora.slice(0,5))+'</time><div><strong>'+esc(v.cliente)+'</strong><small>'+esc([v.atividade,team.get(v.funcionario_id)].filter(Boolean).join(' · '))+'</small></div>'+(ed?'<button class="sec" data-act="negocio-agenda-cancelar" data-id="'+esc(v.id)+'">Cancelar</button>':'')+'</div>';
    }).join('');
    root.innerHTML='<h2>Agenda e equipe</h2><div class="cf-business-actions">'+Object.entries(ranges).map(([k,label])=>'<button class="sec" aria-pressed="'+(k===st.range)+'" data-act="negocio-agenda-periodo" data-range="'+k+'">'+label+'</button>').join('')+'</div>'+
      '<label class="cf-agenda-date">Ver semana de<input type="date" data-agenda-date value="'+(st.range==='custom'?st.anchor:start)+'"></label>'+
      (ed?'<details class="cf-agenda-form"><summary>+ Agendar cliente</summary><form data-agenda-form="visit"><label>Cliente<input name="cliente" required maxlength="100"></label><label>Serviço ou compromisso<input name="atividade" maxlength="120" placeholder="Ex.: corte, entrega ou reunião"></label><div class="cf-plan-fields"><label>Dia<input name="dia" type="date" required value="'+(st.range==='week'?localFinancialDate():start)+'"></label><label>Horário<input name="hora" type="time" required></label></div><label>Quem vai atender?<select name="funcionario"><option value="">A definir</option>'+options+'</select></label><button>Salvar agendamento</button></form></details>':'')+
      '<p class="mu">'+st.visits.length+' compromisso(s) · '+(ranges[st.range]||'Semana de '+local(start))+'</p>'+(list||'<p>Nenhum cliente agendado neste período.</p>')+
      '<details class="cf-agenda-form"><summary>Equipe ('+st.staff.length+')</summary><ul class="cf-business-list">'+st.staff.map(x=>'<li><strong>'+esc(x.nome)+'</strong><small>'+esc(x.funcao)+'</small></li>').join('')+'</ul>'+
      (ed?'<form data-agenda-form="staff"><label>Nome do funcionário<input name="nome" required maxlength="80"></label><label>Função (opcional)<input name="funcao" maxlength="80" placeholder="Ex.: atendimento"></label><button>Adicionar à equipe</button></form>':'')+'</details>';
    root.querySelector('[data-agenda-date]').onchange=event=>{const date=event.target.value;if(date){st.range='custom';st.anchor=date;void load();}};
    root.querySelectorAll('form').forEach(form=>form.onsubmit=async event=>{
      event.preventDefault();const btn=form.querySelector('button');if(btn.disabled||!canEdit()||key()!==st.key)return;
      const data=new FormData(form),val=k=>String(data.get(k)||'').trim(),visit=form.dataset.agendaForm==='visit';
      if(!val(visit?'cliente':'nome')){toast('Informe um nome.',1);return;}
      const id=form.dataset.eventId||(form.dataset.eventId=crypto.randomUUID());
      const row=visit?{cliente:val('cliente'),atividade:val('atividade'),dia:val('dia'),hora:val('hora'),funcionario_id:val('funcionario')||null}:{nome:val('nome'),funcao:val('funcao')};
      btn.disabled=true;
      try{
        await q(sb.from(visit?'negocio_agenda':'negocio_equipe').upsert({...row,id,familia_id:S.fam.id},{onConflict:'id',ignoreDuplicates:true}));
        toast(visit?'Cliente agendado para '+local(row.dia)+' às '+row.hora+'.':'Funcionário adicionado à equipe.');
        if(visit){st.anchor=row.dia;st.range='custom';}
        await load();
      }catch(e){if(e?.code==='23505')toast('Este funcionário já tem um compromisso nesse horário.',1);}
      finally{btn.disabled=false;}
    });
  }
  async function handle(action,button){
    const st=current();
    if(action==='negocio-agenda-periodo'&&Object.hasOwn(ranges,button.dataset.range))st.range=button.dataset.range;
    if(action==='negocio-agenda-cancelar'){
      const visit=st.visits.find(x=>x.id===button.dataset.id);
      if(!visit||!canEdit()||!confirm('Cancelar o compromisso de '+visit.cliente+' em '+local(visit.dia)+'?'))return;
      await q(sb.from('negocio_agenda').update({cancelado:true}).eq('id',visit.id).eq('familia_id',S.fam.id));
    }
    await load();
  }
  window.CFBusinessAgenda={shell,load,handle};
})();
