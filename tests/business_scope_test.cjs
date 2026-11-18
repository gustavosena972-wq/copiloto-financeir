const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs');
const assert=require('node:assert/strict');
require('node:test').test('business setup checks owner permission and isolates each space',async()=>{
 const db=new PGlite();
 const family='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002';
 const owner='00000000-0000-0000-0000-000000000003',reader='00000000-0000-0000-0000-000000000004',outsider='00000000-0000-0000-0000-000000000005';
 try{
 await db.exec(`
 create role authenticated;create role anon;create schema auth;create schema private;
 grant usage on schema auth,private to authenticated;
 create function auth.uid() returns uuid language sql as $$select current_setting('test.user')::uuid$$;
 create function auth.jwt() returns jsonb language sql as $$select '{}'::jsonb$$;
 create table familias(id uuid primary key);create table membros(familia_id uuid,usuario_id uuid,papel text);
 create table lancamentos(familia_id uuid);create table metas(familia_id uuid);create table dividas(familia_id uuid);create table patrimonio_itens(familia_id uuid);
 create function private.eh_membro(fam uuid) returns boolean language sql security definer as $$select exists(select 1 from membros where familia_id=fam and usuario_id=auth.uid())$$;
 create function public.is_internal_tester() returns boolean language sql as $$select true$$;
 insert into familias values ('${family}'),('${other}');
 insert into membros values ('${family}','${owner}','dono'),('${family}','${reader}','leitor'),('${other}','${outsider}','dono');
 `);
 await db.exec(fs.readFileSync(require('node:path').join(__dirname,'../supabase/migrations/20261118025444_contexto_e_negocios_alpha.sql'),'utf8'));
 const as=async id=>{await db.exec('reset role');await db.query("select set_config('test.user',$1,false)",[id]);await db.exec('set role authenticated')};
 await as(owner);
 await db.query("select configurar_meu_espaco('negocio','Salão')");
 assert.equal((await db.query('select modo from espaco_configuracao')).rows[0].modo,'negocio');
 await assert.rejects(db.query("update espaco_configuracao set modo='pessoal'"));
 await as(reader);
 assert.equal((await db.query('select count(*)::int n from espaco_configuracao')).rows[0].n,1);
 await assert.rejects(db.query("select configurar_meu_espaco('pessoal')"));
 await as(outsider);
 assert.equal((await db.query('select count(*)::int n from espaco_configuracao')).rows[0].n,0);
 await db.exec('reset role');await db.query('insert into lancamentos values($1)',[family]);await as(owner);
 await assert.rejects(db.query("select configurar_meu_espaco('familiar')"));
 await db.exec('reset role;set role anon');
 await assert.rejects(db.query("select configurar_meu_espaco('negocio')"));
 console.log('PASS business configuration: owner, reader, outside family, direct update, populated workspace and anonymous checks');
 }finally{await db.close()}
});

