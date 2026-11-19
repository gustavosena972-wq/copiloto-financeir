const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {fromJson,fromOfx}=require('../android-app/app/src/main/assets/structured-import.js');
const source=fs.readFileSync(path.join(__dirname,'../android-app/app/src/main/assets/mobile.html'),'utf8');
const parser=source.slice(source.indexOf('function parseMoneyCell('),source.indexOf('function parseSheetRows('));
function parse(rows){
 const context={rows,S:{cats:[]},window:{},norm:value=>String(value??'').trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'')};
 return JSON.parse(JSON.stringify(vm.runInNewContext(parser+';parseTabularData(rows)',context)));
}

test('JSON with standard transaction fields reaches the spreadsheet review',()=>{
 const data={transactions:[
  {description:'Salário',amount:1250,date:'2026-11-09',type:'income'},
  {description:'Mercado',amount:-69.15,date:'10/11/2026'},
  {description:'Data impossível',amount:25,date:'31/02/2026'}
 ]};
 const periods=parse(fromJson(JSON.stringify(data)));
 assert.equal(periods.length,1);
 assert.equal(periods[0].mes,11);
 assert.deepEqual(periods[0].itens.map(x=>[x.descricao,x.valor,x.grupo,x.parcela_atual]),[
  ['Salário',1250,'receita',null],['Mercado',69.15,'variaveis',null],
 ]);
 assert.throws(()=>fromJson('{"meta":1250}'),/lista de lançamentos/);
});

test('OFX maps credits and debits and rejects other currencies',()=>{
 const text='<OFX><CURDEF>BRL<STMTTRN><DTPOSTED>20261110<TRNAMT>-23.50<NAME>Padaria</STMTTRN><STMTTRN><DTPOSTED>20261111<TRNAMT>100.00<MEMO>Crédito recebido</STMTTRN><STMTTRN><TRNTYPE>XFER<DTPOSTED>20261111<TRNAMT>400.00<NAME>Transferência</STMTTRN></OFX>';
 const [period]=parse(fromOfx(text));
 assert.deepEqual(period.itens.map(x=>[x.valor,x.grupo,x.status]),[[23.50,'variaveis','pago'],[100,'receita','pago']]);
 assert.throws(()=>fromOfx(text.replace('BRL','USD')),/reais/);
});

