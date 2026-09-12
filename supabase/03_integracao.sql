-- Execute este arquivo inteiro no SQL Editor do projeto Supabase da Lumina.
-- Requer as sete tabelas criadas nas duas etapas anteriores.
-- Instala funções; não migra, apaga ou substitui os dados existentes ao executar.
begin;
alter table public.lumina_configuracoes add column if not exists migracao_token text;

create or replace function public.lumina_ler_catalogo()
returns jsonb language sql stable security invoker set search_path = '' as $$
select jsonb_build_object(
 'revision', c.revisao,
 'data', jsonb_build_object(
  'categories',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',nome) order by criado_em,id) from public.lumina_categorias),'[]'::jsonb),
  'products',coalesce((select jsonb_agg(jsonb_build_object(
   'id',p.id,'title',p.nome,'description',p.descricao,'category',p.categoria_id,
   'price',p.preco_centavos,'stock',p.estoque,'image',p.imagem_principal,
   'photos',coalesce((select jsonb_agg(f.url order by f.ordem,f.id) from public.lumina_fotos f where f.produto_id=p.id),'[]'::jsonb)
  ) order by p.criado_em,p.id) from public.lumina_produtos p where p.ativo),'[]'::jsonb),
  'banners',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',titulo,'description',descricao,'image',imagem,'link',link_destino,'label',texto_botao,'position',ordem) order by ordem,id) from public.lumina_banners),'[]'::jsonb),
  'settings',jsonb_build_object('brand',c.nome_marca,'about',c.sobre,'email',c.email,'instagram',c.instagram,'whatsapp',c.whatsapp)
 )) from public.lumina_configuracoes c where c.id=1;
$$;

create or replace function public.lumina_salvar_catalogo(p_data jsonb,p_revision integer)
returns integer language plpgsql security invoker set search_path = '' as $$
declare atual integer; x jsonb; foto jsonb; pos integer;
begin
 select revisao into atual from public.lumina_configuracoes where id=1 for update;
 if atual is null then raise exception 'Configuração ausente'; end if;
 if atual<>p_revision then raise exception 'Conflito de revisão' using errcode='40001'; end if;
 if jsonb_typeof(p_data->'categories') is distinct from 'array'
 or jsonb_typeof(p_data->'products') is distinct from 'array'
 or jsonb_typeof(p_data->'banners') is distinct from 'array'
 or jsonb_typeof(p_data->'settings') is distinct from 'object'
 then raise exception 'Catálogo inválido'; end if;
 if jsonb_array_length(p_data->'categories') not between 1 and 30
 or jsonb_array_length(p_data->'products')>300
 or jsonb_array_length(p_data->'banners')>10 then raise exception 'Limites excedidos'; end if;
 for x in select value from jsonb_array_elements(p_data->'categories') loop
  insert into public.lumina_categorias(id,nome) values(x->>'id',x->>'title')
  on conflict(id) do update set nome=excluded.nome;
 end loop;
 for x in select value from jsonb_array_elements(p_data->'products') loop
  if jsonb_typeof(x->'photos') is distinct from 'array' then raise exception 'Fotos inválidas'; end if;
  insert into public.lumina_produtos(id,categoria_id,nome,descricao,preco_centavos,estoque,imagem_principal,ativo)
  values(x->>'id',x->>'category',x->>'title',x->>'description',(x->>'price')::integer,(x->>'stock')::integer,x->>'image',true)
  on conflict(id) do update set categoria_id=excluded.categoria_id,nome=excluded.nome,
   descricao=excluded.descricao,preco_centavos=excluded.preco_centavos,estoque=excluded.estoque,
   imagem_principal=excluded.imagem_principal,ativo=true;
  delete from public.lumina_fotos where produto_id=x->>'id';
  pos:=0;
  for foto in select value from jsonb_array_elements(x->'photos') loop
   insert into public.lumina_fotos(produto_id,url,ordem) values(x->>'id',foto#>>'{}',pos);
   pos:=pos+1;
  end loop;
 end loop;
 -- Itens removidos da vitrine ficam arquivados para preservar referências de carrinhos.
 update public.lumina_produtos set ativo=false
 where id not in (select value->>'id' from jsonb_array_elements(p_data->'products'));
 -- Categorias antigas são preservadas se ainda referenciadas por produtos arquivados.
 delete from public.lumina_categorias c
 where c.id not in (select value->>'id' from jsonb_array_elements(p_data->'categories'))
 and not exists(select 1 from public.lumina_produtos p where p.categoria_id=c.id);
 for x in select value from jsonb_array_elements(p_data->'banners') loop
  insert into public.lumina_banners(id,titulo,descricao,imagem,link_destino,texto_botao,ordem)
  values(x->>'id',x->>'title',x->>'description',x->>'image',x->>'link',x->>'label',(x->>'position')::integer)
  on conflict(id) do update set titulo=excluded.titulo,descricao=excluded.descricao,imagem=excluded.imagem,
   link_destino=excluded.link_destino,texto_botao=excluded.texto_botao,ordem=excluded.ordem;
 end loop;
 delete from public.lumina_banners where id not in(select value->>'id' from jsonb_array_elements(p_data->'banners'));
 update public.lumina_configuracoes set nome_marca=p_data->'settings'->>'brand',sobre=p_data->'settings'->>'about',
 email=p_data->'settings'->>'email',instagram=p_data->'settings'->>'instagram',
 whatsapp=coalesce(p_data->'settings'->>'whatsapp',''),revisao=atual+1 where id=1;
 return atual+1;
end; $$;

create or replace function public.lumina_ler_carrinho(p_usuario text)
returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_object_agg(produto_id,quantidade),'{}'::jsonb)
 from public.lumina_itens_carrinho where usuario_id=p_usuario;
$$;

create or replace function public.lumina_alterar_carrinho(p_usuario text,p_produto text,p_quantidade integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare disponivel integer;
begin
 if p_usuario is null or length(p_usuario) not between 1 and 200 or p_quantidade is null or p_quantidade not between 0 and 99 then raise exception 'Dados inválidos'; end if;
 -- Lock na configuração serializa estoque/catálogo e alterações no carrinho.
 perform 1 from public.lumina_configuracoes where id=1 for update;
 if p_quantidade>0 then
  select estoque into disponivel from public.lumina_produtos where id=p_produto and ativo;
  if disponivel is null or disponivel<p_quantidade then raise exception 'Estoque insuficiente'; end if;
 end if;
 insert into public.lumina_carrinhos(usuario_id) values(p_usuario) on conflict do nothing;
 if p_quantidade=0 then delete from public.lumina_itens_carrinho where usuario_id=p_usuario and produto_id=p_produto;
 else insert into public.lumina_itens_carrinho(usuario_id,produto_id,quantidade) values(p_usuario,p_produto,p_quantidade)
 on conflict(usuario_id,produto_id) do update set quantidade=excluded.quantidade;
 end if;
 return public.lumina_ler_carrinho(p_usuario);
end; $$;

create or replace function public.lumina_importar(p_data jsonb,p_carts jsonb,p_token text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare token_atual text; atual integer; c jsonb; item record;
begin
 select migracao_token,revisao into token_atual,atual from public.lumina_configuracoes where id=1 for update;
 if atual is null then raise exception 'Configuração ausente'; end if;
 if p_token is null or length(p_token)<16 then raise exception 'Token inválido'; end if;
 if token_atual=p_token then return jsonb_build_object('token',token_atual,'imported',true); end if;
 if token_atual is not null or atual<>0 or exists(select 1 from public.lumina_produtos)
 or exists(select 1 from public.lumina_carrinhos) or exists(select 1 from public.lumina_banners)
 then raise exception 'Destino já contém dados; conciliação necessária'; end if;
 perform public.lumina_salvar_catalogo(p_data,atual);
 for c in select value from jsonb_array_elements(p_carts) loop
  insert into public.lumina_carrinhos(usuario_id) values(c->>'user_id');
  for item in select key,value from jsonb_each_text(c->'cart') loop
   -- Um carrinho com referências inválidas impede a importação inteira.
   insert into public.lumina_itens_carrinho(usuario_id,produto_id,quantidade)
   values(c->>'user_id',item.key,item.value::integer);
  end loop;
 end loop;
 update public.lumina_configuracoes set migracao_token=p_token where id=1;
 return jsonb_build_object('token',p_token,'imported',true);
end; $$;

create or replace function public.lumina_conferir_migracao()
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('catalog',public.lumina_ler_catalogo(),
 'token',(select migracao_token from public.lumina_configuracoes where id=1),
 'carts',coalesce((select jsonb_agg(jsonb_build_object('user_id',c.usuario_id,'cart',public.lumina_ler_carrinho(c.usuario_id)) order by c.usuario_id) from public.lumina_carrinhos c),'[]'::jsonb));
$$;

-- Funções não podem ser chamadas pela chave pública ou por sessões do cliente.
revoke all on function public.lumina_ler_catalogo() from public,anon,authenticated;
revoke all on function public.lumina_salvar_catalogo(jsonb,integer) from public,anon,authenticated;
revoke all on function public.lumina_ler_carrinho(text) from public,anon,authenticated;
revoke all on function public.lumina_alterar_carrinho(text,text,integer) from public,anon,authenticated;
revoke all on function public.lumina_importar(jsonb,jsonb,text) from public,anon,authenticated;
revoke all on function public.lumina_conferir_migracao() from public,anon,authenticated;
grant execute on function public.lumina_ler_catalogo() to service_role;
grant execute on function public.lumina_salvar_catalogo(jsonb,integer) to service_role;
grant execute on function public.lumina_ler_carrinho(text) to service_role;
grant execute on function public.lumina_alterar_carrinho(text,text,integer) to service_role;
grant execute on function public.lumina_importar(jsonb,jsonb,text) to service_role;
grant execute on function public.lumina_conferir_migracao() to service_role;
notify pgrst,'reload schema';
commit;
