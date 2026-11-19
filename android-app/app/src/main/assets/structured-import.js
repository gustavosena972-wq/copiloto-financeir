/* Normalize supported structured files into the same preview used for spreadsheets. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CFStructuredImport=api;
})(globalThis,function(){
  const headers=['Descrição','Valor','Data','Tipo','Categoria','Status','Mês','Ano'];
  const maxRows=10000;
  function fromJson(text){
    const parsed=JSON.parse(text);
    const items=Array.isArray(parsed)?parsed:parsed?.lancamentos??parsed?.transactions;
    if(!Array.isArray(items))throw new Error('O JSON precisa conter uma lista de lançamentos.');
    if(items.length>maxRows)throw new Error('Divida o arquivo em partes de até 10 mil linhas.');
    const rows=items.filter(item=>item&&typeof item==='object'&&!Array.isArray(item)).map(item=>{
      const value=item.valor??item.amount;
      const type=item.tipo??item.type;
      return [
        item.descricao??item.description,
        typeof value==='number'?Math.abs(value):String(value??'').replace(/^\s*-/,''),
        item.data_vencimento??item.data??item.date,
        type||(Number(value)<0?'despesa':''),
        item.categoria??item.category,
        item.status,
        item.mes??item.month,
        item.ano??item.year
      ].map(cell=>typeof cell==='string'||typeof cell==='number'?cell:null);
    });
    return [headers,...rows];
  }
  function fromOfx(text){
    const currencies=[...text.matchAll(/<CURDEF>\s*([A-Z]{3})/gi)];
    if(currencies.some(match=>match[1].toUpperCase()!=='BRL')){
      throw new Error('O extrato OFX precisa estar em reais (BRL).');
    }
    const rows=[headers];
    const tag=(record,name)=>record.match(new RegExp('<'+name+'>\\s*([^<\\r\\n]+)','i'))?.[1].trim()||'';
    for(const match of text.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN\s*>/gi)){
      if(rows.length>maxRows)throw new Error('Divida o extrato em partes de até 10 mil transações.');
      const record=match[1];
      if(tag(record,'TRNTYPE').toUpperCase()==='XFER')continue;
      const date=tag(record,'DTPOSTED').match(/^(\d{4})(\d{2})(\d{2})/);
      const rawAmount=tag(record,'TRNAMT');
      const amount=/^[+-]?\d+(?:[.,]\d{1,2})?$/.test(rawAmount)?Number(rawAmount.replace(',','.')):NaN;
      const description=tag(record,'NAME')||tag(record,'MEMO');
      if(!date||!description||!Number.isFinite(amount)||amount===0)continue;
      rows.push([description.slice(0,160),Math.abs(amount),date.slice(1).join('-'),amount<0?'despesa':'receita','','pago']);
    }
    return rows;
  }
  return {fromJson,fromOfx,maxRows};
});

