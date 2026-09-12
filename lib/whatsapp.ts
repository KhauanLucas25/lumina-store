import type {Content} from './catalog';
export function checkoutMessage(data:Content,cart:Record<string,number>){
 const currency=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n/100);
 const entries=Object.entries(cart);
 if(!entries.length)throw Error('Seu carrinho está vazio.');
 let total=0;
 const lines=entries.map(([id,quantity])=>{
  const p=data.products.find(p=>p.id===id);
  if(!p)throw Error('Há um produto removido da loja no carrinho. Remova o item indisponível para continuar.');
  if(!Number.isInteger(quantity)||quantity<1)throw Error(`Revise a quantidade de ${p.title}.`);
  if(quantity>p.stock)throw Error(`${p.title}: você selecionou ${quantity}, mas há ${p.stock} unidade(s) disponível(is). Ajuste a quantidade no carrinho.`);
  total+=p.price*quantity;
  return `${quantity} × ${p.title}\nUnitário: ${currency(p.price)} | Subtotal: ${currency(p.price*quantity)}`;
 });
 return `Olá! Gostaria de finalizar meu pedido na ${data.settings.brand}.\n\n${lines.join('\n\n')}\n\nTotal dos produtos: ${currency(total)}\nFrete: a combinar.\n\nPodemos confirmar a disponibilidade, a entrega e a forma de pagamento?`;
}
