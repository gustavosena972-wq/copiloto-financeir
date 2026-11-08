import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
const db=new PGlite();
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const [a,b,c,fa,fb,ca,cb,cc,ma,mb]=[1,2,3,10,20,101,102,103,30,40].map(id);
async function session(user){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec('set role authenticated');}
before(async()=>{
 await db.exec(await readFile(new URL('./bootstrap.sql',import.meta.url),'utf8'));
 await db.exec(`
 insert into perfis(id,nome) values('${a}','Pessoa A'),('${b}','Pessoa B'),('${c}','Pessoa C');
 insert into familias(id,nome,criado_por,plano) values('${fa}','Família A','${a}','pro'),('${fb}','Família B','${b}','max');
 insert into membros(familia_id,usuario_id,nome,papel) values('${fa}','${a}','Pessoa A','dono'),('${fb}','${b}','Pessoa B','dono'),('${fa}','${c}','Pessoa C','leitor');
 insert into anos(id,familia_id,ano) values('${id(31)}','${fa}',2026),('${id(41)}','${fb}',2026);
 insert into meses(id,ano_id,familia_id,mes) values('${ma}','${id(31)}','${fa}',11),('${mb}','${id(41)}','${fb}',11);
 insert into lancamentos(familia_id,mes_id,tipo,descricao,valor,status) values
 ('${fa}','${ma}','receita','Receita A',100,'pago'),('${fb}','${mb}','receita','Receita B',999,'pago');
 insert into conversas_ia(id,familia_id,usuario_id,titulo) values
 ('${ca}','${fa}','${a}','Privada A'),('${cb}','${fb}','${b}','Privada B'),('${cc}','${fa}','${c}','Privada C');
 insert into mensagens_ia(familia_id,conversa_id,papel,conteudo) values
 ('${fa}','${ca}','usuario','Somente A'),('${fb}','${cb}','usuario','Somente B'),('${fa}','${cc}','usuario','Somente C');
 insert into ia_aprendizados(familia_id,usuario_id,chave,valor) values('${fa}','${a}','preferencia','{"tema":"metas"}');
 `);
 if(process.env.SKIP_MIGRATION!=='1')
  await db.exec(await readFile(new URL('../../supabase/migrations/20261108161900_tamandua_private_memory_and_background_insights.sql',import.meta.url),'utf8'));
});
after(()=>db.close());
test('family A reads only its own conversation and message, not B or same-family C',async()=>{
 await session(a);
 assert.deepEqual((await db.query('select id from conversas_ia')).rows.map(r=>r.id),[ca]);
 assert.deepEqual((await db.query('select conteudo from mensagens_ia')).rows.map(r=>r.conteudo),['Somente A']);
});
test('family B cannot read A and gets its own financial snapshot',async()=>{
 await session(b);
 assert.deepEqual((await db.query('select id from conversas_ia')).rows.map(r=>r.id),[cb]);
 const {rows}=await db.query('select tamandua_contexto_financeiro(11,2026) as context');
 assert.equal(rows[0].context.totais.receitas,999);
 assert.equal(rows[0].context.plano,'max');
});
test('family A snapshot ignores all financial rows from B',async()=>{
 await session(a);
 const {rows}=await db.query('select tamandua_contexto_financeiro(11,2026) as context');
 assert.equal(rows[0].context.totais.receitas,100);
 assert.equal(rows[0].context.totais.quantidade,1);
 assert.equal(rows[0].context.fonte,'banco_autorizado');
});
test('forged cross-family conversation and message inserts are denied',async()=>{
 await session(a);
 await assert.rejects(db.query('insert into conversas_ia(familia_id,usuario_id,titulo) values($1,$2,$3)',[fb,a,'forjada']),e=>e.code==='42501');
 await assert.rejects(db.query('insert into mensagens_ia(familia_id,conversa_id,papel,conteudo) values($1,$2,$3,$4)',[fb,cb,'usuario','forjada']),e=>e.code==='42501');
});
test('same-family member cannot append to another persons conversation',async()=>{
 await session(c);
 await assert.rejects(db.query('select tamandua_salvar_conversa($1,$2,$3)',[ca,'forjada','resposta']),e=>e.code==='42501');
});
test('conversation owner and family cannot be reassigned',async()=>{
 await session(a);
 await assert.rejects(db.query('update conversas_ia set familia_id=$1 where id=$2',[fb,ca]),e=>e.code==='42501');
 await assert.rejects(db.query('update conversas_ia set usuario_id=$1 where id=$2',[c,ca]),e=>e.code==='42501');
});
test('owner can save an atomic pair of messages and read them',async()=>{
 await session(a);
 const {rows}=await db.query('select tamandua_salvar_conversa(null,$1,$2) as id',['Pergunta','Resposta']);
 const result=await db.query('select papel from mensagens_ia where conversa_id=$1 order by papel',[rows[0].id]);
 assert.deepEqual(result.rows.map(r=>r.papel),['assistente','usuario']);
});
test('owner can delete memory; another account cannot read it',async()=>{
 await session(c);
 assert.equal((await db.query('select * from ia_aprendizados')).rows.length,0);
 await session(a);
 assert.equal((await db.query("delete from ia_aprendizados where chave='preferencia' returning id")).rows.length,1);
});
test('preferences are session owned and cannot point to another family',async()=>{
 await session(a);
 await assert.rejects(db.query('insert into tamandua_preferencias(usuario_id,familia_id) values($1,$2)',[a,fb]),e=>e.code==='42501');
 await db.query('insert into tamandua_preferencias(usuario_id,familia_id) values($1,$2)',[a,fa]);
 await session(b);
 assert.equal((await db.query('select * from tamandua_preferencias')).rows.length,0);
});
test('anonymous callers cannot invoke finance or save APIs',async()=>{
 await db.exec('reset role; set role anon');
 await assert.rejects(db.query('select public.tamandua_contexto_financeiro(11,2026)'),e=>e.code==='42501');
 await assert.rejects(db.query("select public.tamandua_salvar_conversa(null,'x','y')"),e=>e.code==='42501');
});
