import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
function moduleUrl(file,replacements={}){
 let source=ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 for(const [from,to] of Object.entries(replacements))source=source.replaceAll(`'${from}'`,JSON.stringify(to));
 return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
}
const cartUrl=moduleUrl('../lib/cart.ts');
const {currentCart}=await import(cartUrl);
const data={settings:{brand:'Lumina',whatsapp:'5581996149622'},products:[{id:'vela',title:'Vela',price:1000,stock:5},{id:'kit',title:'Kit',price:2500,stock:3}]};
const state={cart:{removido:1},data};
globalThis.__cartRegression=state;
const stub=`
 const state=globalThis.__cartRegression;
 export const identity=async()=> 'test-user';
 export const sameOrigin=req=>req.headers.get('origin')===new URL(req.url).origin;
 export const readCatalog=async()=>({data:state.data});
 import {currentCart} from ${JSON.stringify(cartUrl)};
 export const readCart=async()=>currentCart(state.data,state.cart);
 export const setCart=async(id,product,quantity)=>{
 const p=state.data.products.find(p=>p.id===product);
 if(quantity>0&&(!p||quantity>p.stock))throw Error('Estoque insuficiente');
 if(quantity)state.cart[product]=quantity;else delete state.cart[product];
 return readCart();
 };
 export const error=(message,status=400)=>Response.json({error:message},{status});
 export const databaseFailure=(e,fallback)=>error(fallback,503);
`;
const stubUrl=`data:text/javascript;base64,${Buffer.from(stub).toString('base64')}`;
const cartRoute=await import(moduleUrl('../app/api/cart/route.ts',{'@/lib/server':stubUrl,zod:new URL('../node_modules/zod/index.js',import.meta.url).href}));
const checkoutRoute=await import(moduleUrl('../app/api/checkout/route.ts',{'@/lib/server':stubUrl,'@/lib/whatsapp':moduleUrl('../lib/whatsapp.ts')}));
const request=(path,body)=>new Request('https://store.test'+path,{method:'POST',headers:{origin:'https://store.test','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
test('historical cart is empty; two additions survive; checkout returns configured WhatsApp and full order',async()=>{
 assert.deepEqual(await (await cartRoute.GET()).json(),{});
 const empty=await checkoutRoute.POST(request('/api/checkout'));assert.equal(empty.status,409);assert.match((await empty.json()).error,/vazio/);
 assert.deepEqual(await (await cartRoute.POST(request('/api/cart',{id:'vela',quantity:2}))).json(),{vela:2});
 assert.deepEqual(await (await cartRoute.POST(request('/api/cart',{id:'kit',quantity:1}))).json(),{vela:2,kit:1});
 assert.deepEqual(await (await cartRoute.GET()).json(),{vela:2,kit:1});
 const response=await checkoutRoute.POST(request('/api/checkout'));assert.equal(response.status,200);
 const url=new URL((await response.json()).url);
 assert.equal(url.origin,'https://wa.me');assert.equal(url.pathname,'/5581996149622');
 const message=url.searchParams.get('text');assert.match(message,/2 × Vela/);assert.match(message,/1 × Kit/);assert.match(message,/45,00/);assert.doesNotMatch(message,/removido/);
});
test('current products with no stock remain subject to stock validation',()=>{
 assert.deepEqual(currentCart({...data,products:[{...data.products[0],stock:0}]},{vela:1,removido:1}),{vela:1});
});
