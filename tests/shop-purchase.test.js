// node tests/shop-purchase.test.js
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {Engine, VERSION} = require('../engine.js');
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname,'../data/shop-items.json'),'utf8'));
const soda = catalog.items.find(item => item.id === 'soft-drink');
assert.equal(VERSION,3,'save format remains v3');
assert.ok(soda,'탄산음료 상품 데이터');
assert.equal(soda.price,2200);
assert.deepEqual(soda.effect,{type:'fatigue_change',amount:-10});
assert.ok(fs.existsSync(path.join(__dirname,'..',soda.icon)),'icon preserved');

function game(money,fatigue){
  const e=new Engine(null,[]);
  e.s.money=money;e.s.fatigue=fatigue;
  return e;
}

const usual=game(10000,37);
assert.deepEqual(usual.s.inventory,{},'new games start with empty inventory');
assert.equal(usual.canPurchaseShopItem(soda),'');
assert.equal(usual.purchaseShopItem(soda),true);
assert.equal(usual.s.money,7800);
assert.equal(usual.s.fatigue,37,'buying does not recover fatigue');
assert.equal(usual.inventoryCount(soda.id),1);
assert.equal(usual.s.totals.expense,2200);
assert.equal(usual.purchaseShopItem(soda),true,'items can stack');
assert.equal(usual.s.money,5600);
assert.equal(usual.inventoryCount(soda.id),2);
assert.equal(usual.s.totals.expense,4400);
assert.equal(usual.canUseShopItem(soda),'');
assert.equal(usual.useShopItem(soda),true);
assert.equal(usual.s.fatigue,27);
assert.equal(usual.inventoryCount(soda.id),1);
assert.equal(usual.s.money,5600,'using item costs no extra money');
assert.equal(usual.s.totals.expense,4400);

const afterSave=new Engine(usual.export(),[]);
assert.equal(afterSave.s.money,5600,'money survives reload');
assert.equal(afterSave.s.fatigue,27,'fatigue survives reload');
assert.equal(afterSave.inventoryCount(soda.id),1,'inventory quantity survives reload');
assert.equal(afterSave.s.totals.expense,4400,'cumulative expense survives reload');
assert.equal(afterSave.useShopItem(soda),true);
assert.equal(afterSave.s.fatigue,17);
assert.equal(afterSave.inventoryCount(soda.id),0,'last consumption removes the stack');
assert.deepEqual(afterSave.s.inventory,{},'no empty stack remains');
assert.equal(afterSave.useShopItem(soda),false,'cannot use unowned items');

const low=game(2200,3);
assert.equal(low.purchaseShopItem(soda),true);
assert.equal(low.useShopItem(soda),true);
assert.equal(low.s.fatigue,0,'fatigue floor zero');
assert.equal(low.s.money,0);

const rested=game(4400,0);
assert.equal(rested.purchaseShopItem(soda),true,'can buy at zero fatigue for later');
assert.equal(rested.inventoryCount(soda.id),1);
const beforeRested=JSON.stringify(rested.export());
assert.equal(rested.canUseShopItem(soda),'피로도가 이미 0입니다.');
assert.equal(rested.useShopItem(soda),false);
assert.equal(JSON.stringify(rested.export()),beforeRested,'cannot consume item uselessly at zero fatigue');

const broke=game(2199,40);
const beforeBroke=JSON.stringify(broke.export());
assert.equal(broke.purchaseShopItem(soda),false);
assert.equal(JSON.stringify(broke.export()),beforeBroke,'failed payment does not alter inventory or funds');

const unsupported=game(10000,80);
const buff={...soda,id:'unimplemented',effect:{type:'timed_buff',target:'speed',value:20,durationMinutes:60}};
assert.equal(unsupported.purchaseShopItem(buff),false);
assert.equal(unsupported.inventoryCount(buff.id),0);
assert.equal(unsupported.s.money,10000);

const priorSave=game(12345,30).export();
delete priorSave.inventory; // v3 saves created before the inventory feature
const priorLoaded=new Engine(priorSave,[]);
assert.deepEqual(priorLoaded.s.inventory,{});
assert.equal(priorLoaded.s.money,12345);
assert.equal(priorLoaded.s.fatigue,30);
assert.equal(priorLoaded.s.offlineUpgrades.tablet,0);
assert.equal(priorLoaded.s.offlineUpgrades.chair,0);

assert.throws(()=>new Engine({...priorSave,inventory:[]},[]),'reject nonobject inventory');
assert.throws(()=>new Engine({...priorSave,inventory:{'soft-drink':-1}},[]),'reject negative stock');
assert.throws(()=>new Engine({...priorSave,inventory:{'soft-drink':1.5}},[]),'reject fractional stock');
assert.throws(()=>new Engine({...priorSave,inventory:{'invalid id':2}},[]),'reject malformed item IDs');
const max=game(5000,10);
max.s.inventory[soda.id]=Number.MAX_SAFE_INTEGER;
assert.equal(max.purchaseShopItem(soda),false,'prevent unsafe stack increment');

const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../reference.css'),'utf8');
new Function(app);
assert.ok(app.includes("fetch('data/shop-items.json'"),'editor catalog loaded by game');
assert.ok(app.includes('content=shop()'),'shop tab connected');
assert.ok(app.includes('engine.purchaseShopItem(item)'),'purchase click connected');
assert.ok(app.includes('engine.useShopItem(item)'),'use click connected');
assert.ok(app.includes("button('buy-shop:'+item.id,'구매'"),'shop shows buy only');
assert.ok(app.includes("button('use-shop:'+id,'사용'"),'inventory shows use button');
assert.ok(app.includes('shop-inventory-quantity'),'inventory badge');
assert.ok(app.includes("'>×'+count"),'stack counter displayed');
assert.ok(css.includes('.shop-inventory-quantity')&&css.includes('bottom:-5px'),'counter bottom-right');
assert.ok(app.includes("studio.workbench.v2"),'save key unchanged');
console.log('Shop inventory purchase/use and save compatibility checks passed.');
