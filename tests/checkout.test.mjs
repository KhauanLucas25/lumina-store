import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=ts.transpileModule(readFileSync(new URL('../lib/whatsapp.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {checkoutMessage}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const data={settings:{brand:'Lumina'},products:[{id:'vela',title:'Vela',price:1000,stock:5},{id:'kit',title:'Kit',price:2500,stock:3}]};
test('WhatsApp includes every product, quantity and total',()=>{
 const text=checkoutMessage(data,{vela:2,kit:3});
 assert.match(text,/2 × Vela/);assert.match(text,/3 × Kit/);assert.match(text,/95,00/);
});
test('stock increase allows checkout and stock shortage identifies the product',()=>{
 assert.throws(()=>checkoutMessage(data,{vela:6}),/Vela.*6.*5/);
 const updated=structuredClone(data);updated.products[0].stock=8;
 assert.match(checkoutMessage(updated,{vela:6,kit:1}),/6 × Vela/);
});
test('removed products and empty carts have actionable errors',()=>{
 assert.throws(()=>checkoutMessage(data,{old:1,vela:1}),/Remova o item indisponível/);
 assert.throws(()=>checkoutMessage(data,{}),/vazio/);
});
