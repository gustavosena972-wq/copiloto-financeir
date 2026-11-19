const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs'),path=require('node:path');

test('service catalog calculates prices and rejects cross-space writes, readers, invalid values and duplicates',async()=>{
 const db=new PGlite();
 const id=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0');
 const [family,other,owner,reader,editor,outsider]=[1,2,3,4,5,6].map(id);
 const as=async(user,role='authenticated')=>{
   await db.exec('reset role');await db.query("select set_config('test.user',$1,false)",[user]);
   await db.exec('set role '+role);
 };
 const save=(fam=family,name='Corte',values=[10,60,20,5,5,20],service=null)=>db.query(
   'select salvar_servico_negocio($1,$2,$3,$4,$5,$6,$7,$8,$9) id',[fam,name,...values,service]);
 try{
  await db.exec(`create role authenticated;create role anon;create schema auth;create schema private;
   grant usage on schema auth,private to authenticated;
   create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.user'),'')::uuid$$;
   create function auth.jwt() returns jsonb language sql as $$select '{}'::jsonb$$;
   create table familias(id uuid primary key);create table membros(familia_id uuid,usuario_id uuid,papel text);
   create table espaco_configuracao(familia_id uuid primary key,modo text);
   create function private.eh_membro(fam uuid) returns boolean language sql security definer as $$select exists(select 1 from membros where familia_id=fam and usuario_id=auth.uid())$$;
   create function private.pode_editar(fam uuid) returns boolean language sql security definer as $$select exists(select 1 from membros where familia_id=fam and usuario_id=auth.uid() and papel in ('dono','editor'))$$;
   create function public.is_internal_tester() returns boolean language sql as $$select current_setting('test.tester')='true'$$;
   select set_config('test.tester','true',false);
   insert into familias values('${family}'),('${other}');
   insert into espaco_configuracao values('${family}','negocio'),('${other}','negocio');
   grant select on espaco_configuracao to authenticated;
   insert into membros values('${family}','${owner}','dono'),('${family}','${reader}','leitor'),('${family}','${editor}','editor'),('${other}','${outsider}','dono');`);
  const dir=path.join(__dirname,'../supabase/migrations');
  const file=fs.readdirSync(dir).find(x=>x.endsWith('_catalogo_servicos_negocios.sql'));
  await db.exec(fs.readFileSync(path.join(dir,file),'utf8'));
  await as(owner);
  const service=(await save()).rows[0].id;
  const row=(await db.query('select * from negocio_servicos')).rows[0];
  assert.equal(Number(row.preco),46.67);
  assert.equal(row.minutos,60);
  await assert.rejects(save(family,' corte '),/Já existe/);
  for(const values of [[10,60,20,5,10,90],[-1,60,20,5,5,20],[10,1441,20,5,5,20],['NaN',60,20,5,5,20],[10,60,20,5,0.001,20],[null,60,20,5,5,20]])
    await assert.rejects(save(family,'Inválido',values));
  await assert.rejects(db.query("update negocio_servicos set nome='Fraude'"));
  await assert.rejects(db.query('delete from negocio_servicos'));
  await as(outsider);
  assert.equal((await db.query('select count(*)::int n from negocio_servicos')).rows[0].n,0);
  await assert.rejects(save(family,'Intruso'));
  await assert.rejects(save(other,'Intruso',[0,0,0,0,0,0],service));
  assert.equal((await db.query('select arquivar_servico_negocio($1,$2) ok',[other,service])).rows[0].ok,false);
  await as(reader);
  assert.equal((await db.query('select count(*)::int n from negocio_servicos')).rows[0].n,1);
  await assert.rejects(save());
  await assert.rejects(db.query('select arquivar_servico_negocio($1,$2)',[family,service]));
  await as(editor);
  await save(family,'Corte atualizado',[10,30,20,5,5,20],service);
  assert.equal(Number((await db.query('select preco from negocio_servicos')).rows[0].preco),33.34);
  assert.equal((await db.query('select arquivar_servico_negocio($1,$2) ok',[family,service])).rows[0].ok,true);
  assert.equal((await db.query('select arquivar_servico_negocio($1,$2) ok',[family,service])).rows[0].ok,false);
  await assert.rejects(save(family,'Arquivado',[0,0,0,0,0,0],service));
  await save(family,'Corte atualizado'); // Name can be reused after explicit archive.
  await db.exec('reset role');
  await assert.rejects(db.query("update espaco_configuracao set modo='pessoal' where familia_id=$1",[family]));
  await db.query("select set_config('test.tester','false',false)");await as(owner);
  assert.equal((await db.query('select count(*)::int n from negocio_servicos')).rows[0].n,0);
  await assert.rejects(save());
  await as('', 'anon');await assert.rejects(save());
 }finally{await db.close()}
});
