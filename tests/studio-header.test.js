// node tests/studio-header.test.js
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'),'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'),'utf8');
new Function(source);

const start = source.indexOf('function studio(){');
const end = source.indexOf('function growthNote(){',start);
assert.ok(start >= 0 && end > start,'studio rendering exists');
const studio = source.slice(start,end);
assert.ok(studio.includes('<section class="hero">'),'work area remains');
assert.ok(studio.includes('오늘의 작업대'),'work desk heading remains');
assert.ok(!studio.includes('성장·운영'),'unrequested Growth/Operations button removed from studio');
assert.ok(!studio.includes('의뢰함·도감'),'unrequested Inbox/Collection button removed from studio');
assert.ok(!studio.includes('data-action="open-notes"'),'removed note trigger');
assert.ok(!studio.includes('data-action="open-collection"'),'removed collection trigger');
assert.ok(source.includes('function renderNote(){'),'growth note implementation preserved');
assert.ok(source.includes('function collection(){'),'collection implementation preserved');
assert.ok(source.includes('function shopSidebar(){'),'shop side panel preserved');
assert.ok(source.includes('innerWidth<1050?\'<section class="studio-inline-note"'),'growth content embedded in mobile studio');
assert.ok(source.includes('growthNote(true)'),'studio shares growth and operations content');
assert.ok(source.includes("if(b.closest('.studio-inline-note'))"),'mobile growth tabs update in place');
assert.ok(source.includes("note.hidden=onboarding||!desktop"),'growth overlay hidden on mobile');
assert.ok(source.includes('training?duration(StudioCore.PRACTICE.duration-s.practiceDone)'),'highlighted timer counts down in game minutes');
assert.ok(!studio.includes('real(StudioCore.PRACTICE.duration)'),'no real seconds shown for practice');
assert.ok(source.includes('shop-inventory-quantity'),'inventory quantity UI preserved');
assert.ok(source.includes("button('use-shop:'+id,'사용'"),'inventory use control preserved');
for (const name of ['studio','home','shop','gacha','journal']){
  assert.ok(html.includes('data-tab="'+name+'"'),'main menu retains '+name);
}
console.log('Studio header button removal checks passed.');
