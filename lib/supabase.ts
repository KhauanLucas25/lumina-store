import {env} from 'cloudflare:workers';
import type {Content} from './catalog';
export class DatabaseError extends Error {
 constructor(message:string,public status=503){super(message)}
}
export async function rpc<T>(name:string,args:Record<string,unknown>={}):Promise<T>{
 const config=env as unknown as {SUPABASE_URL?:string;SUPABASE_SECRET_KEY?:string};
 if(!config.SUPABASE_URL||!config.SUPABASE_SECRET_KEY)throw new DatabaseError('Configure SUPABASE_URL e SUPABASE_SECRET_KEY nas configurações do Site.');
 const secret=config.SUPABASE_SECRET_KEY.trim();
 if(!/^sb_secret_[A-Za-z0-9_-]+$/.test(secret))throw new DatabaseError('A chave cadastrada tem formato inválido. Em Sites → Configurações, substitua SUPABASE_SECRET_KEY somente pelo valor que começa com sb_secret_, sem aspas, espaços ou o nome da variável.');
 const url=new URL(config.SUPABASE_URL.trim());
 if(url.origin!=='https://mkkfjgozuxfvywuwkskm.supabase.co')throw new DatabaseError('A URL configurada não corresponde ao projeto Supabase desta loja.');
 let response:Response;
 try{response=await fetch(`${url.origin}/rest/v1/rpc/${name}`,{method:'POST',cache:'no-store',headers:{apikey:secret,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(25000),redirect:'manual'});}catch(e){
  // Never log request headers, bodies or credential values.
  const raw=e instanceof Error?e.message:'Unknown network error';
  const safe=raw.replaceAll(secret,'[redacted]').replace(/sb_secret_[A-Za-z0-9_-]+/g,'[redacted]').slice(0,350);
  console.error('Supabase transport failure',JSON.stringify({operation:name,type:e instanceof Error?e.name:'unknown',reason:safe}));
  if(e instanceof Error&&['TimeoutError','AbortError'].includes(e.name))throw new DatabaseError('O Supabase não respondeu em 25 segundos. Confira se o projeto está ativo no painel Supabase e tente novamente.');
  if(/header|byte.?string|invalid character/i.test(raw))throw new DatabaseError('A credencial contém caracteres inválidos. Copie novamente a Secret key para SUPABASE_SECRET_KEY, sem aspas nem quebras de linha.');
  if(/dns|resolve|hostname/i.test(raw))throw new DatabaseError('A hospedagem não conseguiu localizar o endereço do Supabase (DNS). Confira se o projeto está ativo.');
  if(/certificate|tls|ssl/i.test(raw))throw new DatabaseError('Falha na conexão segura entre a hospedagem e o Supabase (TLS).');
  throw new DatabaseError('A conexão externa da hospedagem com o Supabase falhou. O motivo foi registrado para diagnóstico; o banco original continua ativo.');
 }

 if(response.status>=300&&response.status<400)throw new DatabaseError('O Supabase retornou um redirecionamento inesperado. A conexão foi interrompida para proteger a credencial.');
 if(!response.ok){
  const detail=await response.json().catch(()=>({})) as {code?:string};
  if(detail.code==='PGRST202')throw new DatabaseError('Execute o SQL de integração no Supabase e tente novamente.');
  if(detail.code==='40001')throw new DatabaseError('O catálogo foi alterado em outra sessão. Recarregue antes de salvar.',409);
if (detail.code === "P0001") {
  throw new DatabaseError(
    "Estoque insuficiente. Reduza a quantidade do produto no carrinho.",
    409,
  );
}  throw new DatabaseError('O Supabase não concluiu a operação. Nenhuma gravação parcial foi aplicada.');
 }
 return response.json() as Promise<T>;
}
export type CatalogResult={data:Content;revision:number};
export const pgCatalog=()=>rpc<CatalogResult>('lumina_ler_catalogo');
export const pgSave=(data:Content,revision:number)=>rpc<number>('lumina_salvar_catalogo',{p_data:data,p_revision:revision});
export const pgCart=(id:string)=>rpc<Record<string,number>>('lumina_ler_carrinho',{p_usuario:id});
export async function pgSetCart(id:string,product:string,quantity:number){
 await rpc('lumina_alterar_carrinho',{p_usuario:id,p_produto:product,p_quantidade:quantity});
 return pgCart(id);
}
