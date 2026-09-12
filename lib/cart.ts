import type {Content} from './catalog';

// Archived products can remain in historical database carts. They are not
// purchasable selections and must never count toward a new order.
export function currentCart(data:Content,cart:Record<string,number>):Record<string,number>{
 const activeIds=new Set(data.products.map(product=>product.id));
 return Object.fromEntries(Object.entries(cart).filter(([id])=>activeIds.has(id)));
}
