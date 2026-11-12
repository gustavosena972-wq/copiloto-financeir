const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
test('internal-test lookup reads only the callers own access, not notes or other testers',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role authenticated;create schema auth;grant usage on schema auth to authenticated;create function auth.jwt() returns jsonb language sql as $$select coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb$$;create table internal_testers(email text,acesso_ate timestamptz,observacao text);insert into internal_testers values('a@example.invalid',now()+interval '1 day','private-a'),('b@example.invalid',now()+interval '1 day','private-b');`);
  const migration=name=>fs.readFileSync(path.join(__dirname,'../supabase/migrations',name),'utf8').replace(/^\uFEFF/,'');
  await db.exec(migration('20261107190000_harden_internal_tester_security.sql'));
  await db.exec(`set role authenticated;select set_config('request.jwt.claims','{"email":"a@example.invalid"}',false);`);
  await assert.rejects(db.query('select is_internal_tester()'),/permission denied/);
  await db.exec('reset role;');
  await db.exec(migration('20261110110825_restore_internal_tester_self_lookup.sql'));
  await db.exec('set role authenticated;');
  assert.equal((await db.query('select is_internal_tester() as allowed')).rows[0].allowed,true);
  assert.deepEqual((await db.query('select email from internal_testers')).rows,[{email:'a@example.invalid'}]);
  await assert.rejects(db.query('select observacao from internal_testers'),/permission denied/);
  await db.exec(`select set_config('request.jwt.claims','{"email":"outsider@example.invalid"}',false)`);
  assert.equal((await db.query('select is_internal_tester() as allowed')).rows[0].allowed,false);
 }finally{await db.close();}
});
