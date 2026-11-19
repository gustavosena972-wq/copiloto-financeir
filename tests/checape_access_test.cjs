const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const fixtures=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/checape_functions.json'),'utf8').replace(/^\uFEFF/,''));
const A='00000000-0000-0000-0000-000000000101',B='00000000-0000-0000-0000-000000000102';
const U='00000000-0000-0000-0000-000000000001',V='00000000-0000-0000-0000-000000000002',R='00000000-0000-0000-0000-000000000003';
const M='00000000-0000-0000-0000-000000000201',H='00000000-0000-0000-0000-000000000202',N='00000000-0000-0000-0000-000000000203';
test('Checape invoker permissions preserve authenticated household boundaries',async t=>{
 const db=new PGlite();
 const login=async user=>{await db.exec('reset role;set role authenticated;');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:user})]);};
 const run=()=>db.query('select public.gerar_checape($1::uuid) as total',[M]);
 try{
  await db.exec(`create role authenticated;create role anon;create schema private;grant usage on schema private to authenticated;
   create table membros(familia_id uuid,usuario_id uuid,papel text);
   create table anos(id uuid primary key,ano int,familia_id uuid);
   create table meses(id uuid primary key,familia_id uuid,ano_id uuid,mes int);
   create table categorias(id uuid primary key,familia_id uuid,nome text);
   create table lancamentos(mes_id uuid,categoria_id uuid,tipo text,valor numeric);
   create table sugestoes(id uuid default gen_random_uuid(),familia_id uuid,mes_id uuid,tipo text,titulo text,explicacao text,categoria_id uuid,economia_estimada numeric,base_calculo jsonb,status text default 'nova');
   create function public.pode_editar(fam uuid) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$select exists(select 1 from membros where familia_id=fam and usuario_id=(coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb->>'sub')::uuid and papel in ('dono','editor'))$$;
   -- The basic generator is a minimal transactional stand-in; the trend helper
   -- and invoker wrapper below are snapshots of the deployed function bodies.
   create function private.gerar_checape(p_mes uuid) returns integer language plpgsql security definer set search_path=pg_catalog,public as $$declare fam uuid;begin select familia_id into fam from meses where id=p_mes;if not public.pode_editar(fam) then raise exception 'sem permissão';end if;delete from sugestoes where mes_id=p_mes and status='nova';insert into sugestoes(familia_id,mes_id,tipo,titulo) values(fam,p_mes,'dica','Base');return 1;end$$;
   insert into membros values('${A}','${U}','dono'),('${B}','${V}','editor'),('${A}','${R}','leitor');
   insert into anos values('${A}',2026,'${A}'),('${B}',2026,'${B}');
   insert into meses values('${M}','${A}','${A}',11),('${H}','${A}','${A}',10),('${N}','${B}','${B}',11);
   insert into categorias values('${A}','${A}','Alimentação'),('${B}','${B}','Categoria de outra família');
   insert into lancamentos values('${M}','${A}','despesa',200),('${H}','${A}','despesa',100),('${N}','${B}','despesa',99999);
   insert into sugestoes(familia_id,mes_id,tipo,titulo) values('${B}','${N}','dica','Privada B');`);
  for(const f of fixtures)await db.exec(f.definition);
  await db.exec(`revoke all on function private.gerar_alertas_tendencia(uuid) from public,authenticated,anon;revoke all on function public.gerar_checape(uuid) from public,anon;grant execute on function public.gerar_checape(uuid),private.gerar_checape(uuid) to authenticated;`);
  await t.test('missing helper permission reproduces the failure and rolls back basic suggestions',async()=>{await login(U);await assert.rejects(run(),/permission denied for function gerar_alertas_tendencia/);await db.exec('reset role;');assert.equal((await db.query('select count(*)::int as n from sugestoes where mes_id=$1',[M])).rows[0].n,0);});
  const folder=path.join(__dirname,'../supabase/migrations');const migration=fs.readdirSync(folder).find(n=>n.endsWith('_restore_checape_trend_execute.sql'));
  assert.ok(migration,'The production grant migration must exist');await db.exec(fs.readFileSync(path.join(folder,migration),'utf8').replace(/^\uFEFF/,''));
  await t.test('the grant restores full generation and calculates only the owners household history',async()=>{await login(U);assert.equal((await run()).rows[0].total,2);await db.exec('reset role;');const alerts=(await db.query("select familia_id,base_calculo from sugestoes where mes_id=$1 and base_calculo ? 'media_historica'",[M])).rows;assert.equal(alerts.length,1);assert.equal(alerts[0].familia_id,A);assert.equal(alerts[0].base_calculo.media_historica,100);});
  await t.test('generating twice does not duplicate new alerts or touch another family',async()=>{await login(U);assert.equal((await run()).rows[0].total,2);await db.exec('reset role;');assert.equal((await db.query('select count(*)::int as n from sugestoes where mes_id=$1',[M])).rows[0].n,2);assert.equal((await db.query('select titulo from sugestoes where mes_id=$1',[N])).rows[0].titulo,'Privada B');});
  await t.test('an editor of family B cannot run family As checkup',async()=>{await login(V);await assert.rejects(run(),/sem permissão/);});
  await t.test('read-only members cannot generate or replace suggestions',async()=>{await login(R);await assert.rejects(run(),/sem permissão/);});
  await t.test('authenticated calls without a real subject are denied',async()=>{await login('00000000-0000-0000-0000-000000000099');await assert.rejects(run(),/sem permissão/);});
  await t.test('anonymous execution stays blocked',async()=>{await db.exec('reset role;set role anon;');await assert.rejects(run(),/permission denied/);});
 }finally{await db.close();}
});
