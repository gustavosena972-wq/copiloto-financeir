const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../android-app/app/src/main/assets/mobile.html'),'utf8');
const section=source.slice(source.indexOf('const BASE_PLAN_RESOURCES='),source.indexOf('function tamanduaPlanMarkup'));
const plans=vm.runInNewContext(section+';PLANOS');
test('Ultra preserves every enabled capability from Pro and Max',()=>{for(const tier of ['pro','max'])for(const [name,enabled]of Object.entries(plans[tier].recursos))if(enabled)assert.equal(plans.ultra.recursos[name],true,name);assert.ok(Object.values(plans.pro.recursos).filter(Boolean).length>=8);});
test('Ultra preserves the family capacity and adds the advanced capabilities',()=>{assert.ok(plans.ultra.limite===null||plans.ultra.limite>=plans.max.limite);for(const name of ['relatorios','patrimonioHistorico','simulador'])assert.equal(plans.ultra.recursos[name],true);assert.equal(plans.pro.valor,30);assert.equal(plans.max.valor,40);assert.equal(plans.ultra.valor,60);});
test('the Ultra presentation explicitly includes both lower plans',()=>{const start=source.indexOf('<article class="landing-plan-card ultra"'),end=source.indexOf('</article>',start);assert.match(source.slice(start,end),/Tudo dos planos Pro e Max/);});
