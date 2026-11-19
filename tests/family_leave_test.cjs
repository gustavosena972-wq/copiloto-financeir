const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');

test('leaving a family preserves shared records and revokes private access',async()=>{
 const db=new PGlite();
 const ids=Array.from({length:10},(_,i)=>'00000000-0000-0000-0000-'+String(i+1).padStart(12,'0'));
 const [owner,editor,reader,outsider,f1,f2,m1,m2,m3,m4]=ids;
 const files=path.join(__dirname,'../supabase/migrations');
 const migration=fs.readdirSync(files).find(name=>name.endsWith('_sair_minha_familia.sql'));
 const as=async user=>{
  await db.exec('reset role;set role authenticated');
  await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:user})]);
 };
 try{
  await db.exec(`
   create role authenticated;create role anon;create schema private;create schema auth;
   grant usage on schema auth,private to authenticated;
   create function auth.jwt() returns jsonb language sql stable as $$select current_setting('request.jwt.claims')::jsonb$$;
   create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
   create table perfis(id uuid primary key,nome text);
   create table familias(id uuid primary key,plano text,acesso_ate timestamptz,criado_por uuid);
   create table membros(id uuid primary key default gen_random_uuid(),familia_id uuid,usuario_id uuid,nome text,papel text,renda_mensal numeric,criado_em timestamptz default now());
   create unique index membros_usuario_unico_idx on membros(usuario_id) where usuario_id is not null;
   create table convites(id uuid default gen_random_uuid(),familia_id uuid,codigo text,papel text,email text,criado_por uuid,usado_por uuid,expira_em timestamptz default now()+interval '1 day');
   create table lancamentos(familia_id uuid,membro_id uuid references membros(id) on delete cascade);
   create table conversas_ia(familia_id uuid,usuario_id uuid);
   create table ia_aprendizados(familia_id uuid,usuario_id uuid);
   create function private.modo_teste_gratuito() returns boolean language sql as $$select false$$;
   create function private.eh_dono_base(fam uuid) returns boolean language sql stable security definer as $$select exists(select 1 from public.membros where familia_id=fam and usuario_id=auth.uid() and papel='dono')$$;
   create function private.eh_membro(fam uuid) returns boolean language sql stable security definer as $$select exists(select 1 from public.membros where familia_id=fam and usuario_id=auth.uid())$$;
   create function private.pode_editar(fam uuid) returns boolean language sql stable security definer as $$select exists(select 1 from public.membros where familia_id=fam and usuario_id=auth.uid() and papel in ('editor','dono'))$$;
   alter table membros enable row level security;
   create policy member_read on membros for select to authenticated using(private.eh_membro(familia_id));
   create policy member_update on membros for update to authenticated using(private.pode_editar(familia_id)) with check(private.pode_editar(familia_id));
   create policy member_delete on membros for delete to authenticated using(private.eh_dono_base(familia_id));
   grant select,insert,update,delete on membros to authenticated;
   alter table lancamentos enable row level security;
   alter table conversas_ia enable row level security;
   alter table ia_aprendizados enable row level security;
   grant select on lancamentos,conversas_ia,ia_aprendizados to authenticated;
   create policy reads on lancamentos for select to authenticated using(private.eh_membro(familia_id));
   create policy reads on conversas_ia for select to authenticated using(usuario_id=auth.uid() and private.eh_membro(familia_id));
   create policy reads on ia_aprendizados for select to authenticated using(usuario_id=auth.uid() and private.eh_membro(familia_id));
   insert into perfis values ('${owner}','Owner'),('${editor}','Editor'),('${reader}','Reader'),('${outsider}','Other owner');
   insert into familias values ('${f1}','max',now()+interval '30 days','${owner}'),('${f2}','max',now()+interval '30 days','${outsider}');
   insert into membros(id,familia_id,usuario_id,nome,papel) values
    ('${m1}','${f1}','${owner}','Owner','dono'),('${m2}','${f1}','${editor}','Editor','editor'),
    ('${m3}','${f1}','${reader}','Reader','leitor'),('${m4}','${f2}','${outsider}','Other owner','dono');
   insert into lancamentos values ('${f1}','${m2}'),('${f2}','${m4}');
   insert into conversas_ia values ('${f1}','${editor}'),('${f1}','${owner}'),('${f2}','${outsider}');
   insert into ia_aprendizados select * from conversas_ia;
   insert into convites(familia_id,codigo,papel) values ('${f2}','ABCDEF1234567890ABCDEF12','leitor');
  `);
  await db.exec(fs.readFileSync(path.join(files,migration),'utf8'));
  await db.exec(`
   create function public.tamandua_salvar_conversa(uuid,text,text) returns uuid
   language sql as $$select familia_id from public.membros where usuario_id=auth.uid()$$;
  `);
  const binding=fs.readdirSync(files).find(name=>name.endsWith('_tamandua_conversa_vinculada.sql'));
  await db.exec(fs.readFileSync(path.join(files,binding),'utf8'));
  const save="select tamandua_salvar_conversa_vinculada($1,$2,null,'pergunta','resposta') as familia_id";

  await db.exec(`
   create trigger membros_protege before update or delete on membros for each row execute function trg_membros_protege();
   create trigger membros_limite before insert on membros for each row execute function limitar_membros_por_plano();
   create function public.aceitar_convite(text) returns uuid language sql as $$select private.aceitar_convite($1)$$;
  `);
  await as(editor);
  assert.deepEqual((await db.query(save,[m2,f1])).rows,[{familia_id:f1}]);
  assert.equal((await db.query('select familia_id from lancamentos')).rows[0].familia_id,f1);
  assert.equal((await db.query('select usuario_id from conversas_ia')).rows[0].usuario_id,editor);
  await assert.rejects(db.query("select aceitar_convite('ABCDEF1234567890ABCDEF12')"),/única família/);
  await assert.rejects(db.query('update membros set usuario_id=null where id=$1',[m2]),/permission denied/);
  await assert.rejects(db.query('select sair_minha_familia($1)',[f2]),/não participa/);
  await db.query('select sair_minha_familia($1)',[f1]);
  for(const table of ['lancamentos','conversas_ia','ia_aprendizados']){
   assert.equal((await db.query('select * from '+table)).rows.length,0);
  }
  await db.query("select aceitar_convite('ABCDEF1234567890ABCDEF12')");
  assert.deepEqual((await db.query('select familia_id from lancamentos')).rows,[{familia_id:f2}]);
  await assert.rejects(db.query(save,[m2,f1]),/vínculo com a família mudou/);
  for(const table of ['conversas_ia','ia_aprendizados']){
   assert.equal((await db.query('select * from '+table)).rows.length,0);
  }
  await as(owner);
  await assert.rejects(db.query('select sair_minha_familia($1,$2)',[f1,m4]),/outra pessoa desta família/);
  assert.equal((await db.query('select membro_id from lancamentos')).rows[0].membro_id,m2);
  assert.equal((await db.query('delete from membros where id=$1 returning id',[m2])).rows.length,0);
  await db.query('select sair_minha_familia($1,$2)',[f1,m3]);
  await as(reader);
  assert.deepEqual((await db.query('select papel from membros where usuario_id=auth.uid()')).rows,[{papel:'dono'}]);
  assert.equal((await db.query('select membro_id from lancamentos')).rows[0].membro_id,m2);
  await db.exec('reset role;set role anon');
  await assert.rejects(db.query('select sair_minha_familia($1)',[f1]),/permission denied/);
 }finally{await db.close();}
});

