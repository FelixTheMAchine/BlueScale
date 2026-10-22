import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const E=require('../demo/engine.js');
const X=require('../demo/xlsx.js');

test('demo gera atribuições respeitando restrições obrigatórias',()=>{
 const state=E.seed(),ev=state.events[0];
 const allocations=E.generate(state,ev);
 assert.equal(E.errors(state,ev,allocations).length,0);
 assert.ok(allocations.length>0);
 assert.ok(E.coverage({...ev,assignments:allocations}).filled>0);
});

test('exportação offline produz XLSX em estrutura ZIP com cinco abas',async()=>{
 const state=E.seed(),ev=state.events[0];ev.assignments=E.generate(state,ev);
 const bytes=new Uint8Array(await X.workbook(ev,state,E).arrayBuffer());
 assert.equal(bytes[0],0x50);assert.equal(bytes[1],0x4b);
 const binary=Buffer.from(bytes).toString('latin1');
 for(const required of ['xl/worksheets/sheet1.xml','xl/worksheets/sheet2.xml','xl/worksheets/sheet3.xml','xl/worksheets/sheet4.xml','xl/worksheets/sheet5.xml'])assert.ok(binary.includes(required),required);
 assert.ok(binary.includes('xl/workbook.xml'));
});

test('tela principal inicia offline e apresenta assinatura DAs',()=>{
 const elem={innerHTML:''},toast={textContent:'',style:{},classList:{add(){},remove(){}}},events={};
 const document={documentElement:{dataset:{}},querySelector(selector){return selector==='#app'?elem:toast},addEventListener(event,callback){events[event]=callback}};
 const window={BlueScaleEngine:E,BlueScaleXlsx:X,scrollTo(){}};
 const localStorage={getItem(){return null},setItem(){}};
 const script=fs.readFileSync(new URL('../demo/app.js',import.meta.url),'utf8');
 vm.runInNewContext(script,{window,document,localStorage,console,setTimeout,clearTimeout,Intl,Date,Math,Number,Array,Map,Set,String,JSON,Boolean,Error,RegExp,parseInt,confirm(){return true}}, {timeout:3000});
 assert.match(elem.innerHTML,/BlueScale/);
 assert.match(elem.innerHTML,/DAs/);
 assert.match(elem.innerHTML,/Gerar escala/);
 assert.ok(events.click);
 events.click({target:{closest(){return {dataset:{action:'generate'}}}}});
 assert.match(elem.innerHTML,/Distribuição de turnos|Seu evento em destaque/);
 events.click({target:{closest(){return {dataset:{nav:'equipe'}}}}});
 assert.match(elem.innerHTML,/Equipe/);
 assert.match(elem.innerHTML,/Alice Almeida/);
});
