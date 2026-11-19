const test=require('node:test'),assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs'),path=require('node:path');
const {bounds}=require('../android-app/app/src/main/assets/business-agenda.js');
test('week and next month continue across calendar year and leap day',()=>{
 assert.deepEqual(bounds('2027-01-03','week'),['2026-12-28','2027-01-04']);
 assert.deepEqual(bounds('2026-12-31','next'),['2027-01-04','2027-01-11']);
 assert.deepEqual(bounds('2024-01-31','month'),['2024-02-01','2024-03-01']);
});
test('agenda is isolated by business, role and assigned employee',async()=>{
 const db=new PGlite(),id=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0');
 try{
 await db.exec(`create role anon;create role authenticated;create schema private;grant usage on schema private to authenticated;
 create table familias(id uuid primary key);create table espaco_configuracao(familia_id uuid,modo text);
 insert into familias values('${id(1)}'),('${id(2)}');insert into espaco_configuracao select id,'negocio' from familias;
 grant select on espaco_configuracao to authenticated;
 create function private.eh_membro(uuid) returns boolean language sql as $$select $1::text=current_setting('app.family')$$;
 create function private.pode_editar(uuid) returns boolean language sql as $$select private.eh_membro($1) and current_setting('app.edit')='yes'$$;
 create function public.is_internal_tester() returns boolean language sql as $$select true$$;`);
 const dir=path.resolve(__dirname,'../supabase/migrations');
 await db.exec(fs.readFileSync(path.join(dir,fs.readdirSync(dir).find(f=>f.endsWith('_agenda_equipe.sql'))),'utf8'));
 await db.exec(`set role authenticated;set app.family='${id(2)}';set app.edit='yes';insert into negocio_equipe(id,familia_id,nome) values('${id(4)}','${id(2)}','Equipe B');set app.family='${id(1)}'`);
 assert.equal((await db.query('select * from negocio_equipe')).rows.length,0);
 await db.exec(`insert into negocio_equipe(id,familia_id,nome) values('${id(3)}','${id(1)}','Equipe A')`);
 const add=emp=>db.query("insert into negocio_agenda(familia_id,cliente,dia,hora,funcionario_id) values($1,'Cliente','2026-11-23','13:30',$2) returning id",[id(1),emp]);
 await assert.rejects(add(id(4)));const a=(await add(id(3))).rows[0];await assert.rejects(add(id(3)));
 await db.query('update negocio_agenda set cancelado=true where id=$1',[a.id]);await add(id(3));
 await db.exec("set app.edit='no'");await assert.rejects(add(null));
 await db.exec(`set app.family='${id(2)}'`);assert.equal((await db.query('select * from negocio_agenda')).rows.length,0);
 }finally{await db.close();}
});
