const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');

test('verified Google Play purchases grant 30 days once to the correct family',async()=>{
 const db=new PGlite();
 const ids=[1,2,3,4,5,6].map(n=>'00000000-0000-0000-0000-00000000000'+n);
 const [order,user,family,otherOrder,otherUser,otherFamily]=ids;
 const expiry='2030-01-01T00:00:00.000Z';
 const grant='select public.ativar_compra_google_play_verificada($1,$2,$3) as expires';
 try{
  await db.exec(`
   create role anon; create role authenticated; create role service_role;
   create table public.familias(id uuid primary key,plano text,acesso_ate timestamptz);
   create table public.membros(usuario_id uuid,familia_id uuid);
   create table public.google_play_compras(id uuid primary key,usuario_id uuid,familia_id uuid,plano text,status text,decidido_em timestamptz,nota text);
   insert into public.familias values ('${family}','pro','${expiry}'),('${otherFamily}','pro','${expiry}');
   insert into public.membros values ('${user}','${family}'),('${otherUser}','${otherFamily}');
   insert into public.google_play_compras(id,usuario_id,familia_id,plano,status) values
     ('${order}','${user}','${family}','max','pendente'),
     ('${otherOrder}','${otherUser}','${otherFamily}','ultra','recusado');
  `);
  const folder=path.join(__dirname,'../supabase/migrations');
  const file=fs.readdirSync(folder).find(name=>name.endsWith('_ativar_compra_google_play_verificada.sql'));
  await db.exec(fs.readFileSync(path.join(folder,file),'utf8'));
  for(const role of ['anon','authenticated']){
   await db.exec('reset role;set role '+role);
   await assert.rejects(db.query(grant,[order,user,family]),/permission denied/);
  }
  await db.exec('reset role;set role service_role');
  await assert.rejects(db.query(grant,[order,otherUser,otherFamily]),/fora do escopo/);
  await assert.rejects(db.query(grant,[otherOrder,otherUser,otherFamily]),/não elegível/);
  const first=(await db.query(grant,[order,user,family])).rows[0].expires;
  const retry=(await db.query(grant,[order,user,family])).rows[0].expires;
  assert.equal(first.toISOString(),'2030-01-31T00:00:00.000Z');
  assert.equal(retry.toISOString(),first.toISOString());
  await db.exec('reset role');
  const rows=(await db.query('select plano,acesso_ate from public.familias order by id')).rows;
  assert.deepEqual(rows.map(x=>[x.plano,x.acesso_ate.toISOString()]),[['max',first.toISOString()],['pro',expiry]]);
 }finally{await db.close();}
});
