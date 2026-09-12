import {readCatalog,error} from '@/lib/server';
export async function GET(){try{return Response.json(await readCatalog(),{headers:{'Cache-Control':'no-store'}})}catch{return error('O catálogo está indisponível. Tente novamente.',503)}}
