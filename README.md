# Lumina Store

Loja virtual responsiva para venda de velas aromáticas, essências, kits e acessórios.

O projeto possui catálogo de produtos, carrossel promocional, carrinho de compras, controle de estoque, painel administrativo protegido e finalização do pedido pelo WhatsApp.

## Funcionalidades

- Catálogo organizado por categorias
- Produtos com fotos, descrição, preço e estoque
- Carrossel promocional automático
- Carrinho persistente por navegador
- Resumo do pedido enviado ao WhatsApp
- Painel administrativo responsivo
- Cadastro e edição de produtos
- Gerenciamento de categorias e banners
- Upload de imagens
- Controle de estoque
- Autenticação administrativa
- Proteção contra alterações concorrentes
- Layout adaptado para computadores, tablets e celulares

## Tecnologias

- TypeScript
- React
- Vinext
- Vite
- Supabase Auth
- PostgreSQL
- Supabase Storage
- Zod

## Banco de dados

O PostgreSQL do Supabase armazena:

- produtos;
- categorias;
- banners;
- configurações da loja;
- estoque;
- carrinhos anônimos.

As imagens dos produtos e banners são armazenadas no Supabase Storage.

## Variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_URL=
SUPABASE_SECRET_KEY=
```

Preencha os valores utilizando as configurações do seu projeto Supabase.

Nunca publique `.env.local` ou `SUPABASE_SECRET_KEY`. O arquivo já está protegido pelo `.gitignore`.

## Instalação

Instale as dependências:

```bash
npm install
```

Inicie o ambiente de desenvolvimento:

```bash
npm run dev
```

A aplicação estará disponível no endereço apresentado pelo terminal, normalmente:

```text
http://localhost:5173
```

## Compilação

Em Linux ou Git Bash:

```bash
npm run build
```

No PowerShell do Windows, também é possível executar:

```powershell
& "C:\Program Files\Git\bin\bash.exe" scripts/build-verified.sh
```

## Painel administrativo

O painel está disponível em:

```text
/admin
```

Somente usuários autenticados e cadastrados como administradores no Supabase podem acessar as funções de gerenciamento.

## Segurança

- Secret Keys utilizadas somente no servidor
- Autenticação administrativa pelo Supabase Auth
- Controle de acesso baseado em função
- Validação de dados com Zod
- Verificação de origem nas rotas administrativas
- Controle de revisão para evitar sobrescritas
- Limitação de tamanho e formato no upload de imagens
- Consultas parametrizadas no PostgreSQL

## Objetivo

Projeto desenvolvido para fins de portfólio e demonstração de uma aplicação de comércio eletrônico integrada a serviços de autenticação, banco de dados e armazenamento.