# AtalaYah Applications

Aplicação Next.js integrada ao Supabase. A arquitetura e o modelo de segurança do módulo de temporadas estão documentados em **[Sentinela](docs/sentinela.md)**.

## Requisitos

- Node.js 20 ou superior e npm;
- uma instância Supabase e suas variáveis públicas para autenticação;
- Supabase CLI e Docker somente para migrations e testes locais de banco;
- integrações opcionais conforme os comentários de `.env.example`.

Copie `.env.example` para `.env.local` e substitua os placeholders pelos valores do seu ambiente. Não versione `.env.local`, chaves, tokens, senhas ou credenciais. `SUPABASE_SERVICE_ROLE_KEY` é exclusiva do servidor e nunca deve usar prefixo `NEXT_PUBLIC_`.

## Desenvolvimento

```bash
npm ci
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Qualidade

```bash
npm test
npm run lint
npm run build
```

Os testes seguem `tests/**/*.test.ts`. A suíte Sentinela inclui testes unitários determinísticos e testes de RLS executáveis contra Supabase local. Consulte o [procedimento de migrations, seeds e testes locais](docs/sentinela.md#migrations-seeds-e-testes-locais) para habilitar a integração sem expor credenciais.
