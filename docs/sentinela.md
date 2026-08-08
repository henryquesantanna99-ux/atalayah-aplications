# Sentinela

## Arquitetura e isolamento

Sentinela é um contexto de conta separado do aplicativo principal. A autorização nunca é inferida de e-mail: o acesso nasce de `sentinela_memberships`, sempre vinculado a uma temporada. Toda entidade funcional carrega `season_id`, impedindo que uma associação de uma temporada autorize leitura em outra. Operações administrativas usam o papel persistido da associação.

Os cálculos de calendário ficam em `lib/sentinela/calendar.ts`; regras de acesso, autenticação, onboarding e progressão ficam em módulos puros no mesmo diretório. Essa separação permite testar regras sem React, relógio global ou banco.

## Rotas e redirects

Rotas públicas esperadas: `/login`, `/confirmar-email`, `/redefinir-senha` e o callback de autenticação. A área autenticada usa `/sentinela`; onboarding usa `/sentinela/onboarding`; diário pode usar `/sentinela/diario`. O parâmetro `next` só pode ser um caminho interno iniciado por uma única `/`. Signup conduz à confirmação, confirmação/login sem cadastro completo conduzem ao onboarding, recuperação conduz à redefinição, redefinição conduz ao login e logout sempre encerra no login.

## Account scopes e papéis

- `main` e `sentinela` são scopes explícitos e independentes; estar em um não concede acesso ao outro.
- `participant` acessa somente seus dados e sua temporada.
- `mentor` registra avaliações e mantém progresso/checkpoints oficiais.
- `coordinator` também administra membros da temporada.
- `admin` tem administração de temporada, mas continua sujeito a um vínculo Sentinela persistido.

## Entidades

- `sentinela_seasons` e `sentinela_memberships`: limites temporais, vínculo e papel.
- `sentinela_onboarding`: rascunho retomável, resposta ao chamado, instrumento condicional, avatar e diagnóstico.
- `sentinela_private_evidence` e `sentinela_journals`: conteúdo privado do participante.
- `sentinela_official_progress`: XP educacional, nível de marco e competência independentes.
- `sentinela_checkpoints`: requisitos configurados e itens concluídos.
- `sentinela_competency_assessments`: trilha auditável de avaliações autorizadas.

## Onboarding

Cada avanço salva `step`, de modo que fechar ou trocar de dispositivo retome a etapa persistida. A resposta ao chamado é obrigatória. `instrument` só é obrigatório quando `serves_with_instrument` é verdadeiro. Conclusão também exige `avatar_path` e diagnóstico não vazio. O avatar salvo é um caminho no bucket, nunca uma URL pública ou credencial.

## Temporada e progressão

O início e o fim são inclusivos; depois do fim o evento está concluído. Semana zero representa a pré-temporada e semana um começa exatamente em `starts_at`. Countdown nunca fica negativo. Fases usam janelas inclusivas.

XP educacional não promove nível de marco. Marcos são uma progressão separada e deliberada. Um checkpoint só está completo quando **todos** os requisitos marcados como obrigatórios aparecem nos itens concluídos. Apenas mentor, coordenador ou admin podem registrar avaliação que altere competência; valores são limitados a 0–100.

## RLS e storage

Todas as tabelas Sentinela têm RLS habilitada. Evidência e diário são acessíveis somente ao dono dentro da temporada. Participantes leem o próprio progresso e checkpoint, enquanto escritas oficiais exigem papel autorizado. Avaliações exigem que o autor autenticado seja o avaliador e tenha papel autorizado.

O bucket `sentinela-private` é privado. Objetos seguem `season-id/user-id/arquivo`; políticas validam simultaneamente `auth.uid()` e associação à temporada. Nunca gere URL pública para esse bucket: use download autenticado ou URL assinada curta após autorização.

## Migrations, seeds e testes locais

1. Instale a CLI do Supabase e Docker fora do repositório.
2. Execute `supabase start` e depois `supabase db reset`. Isso aplica migrations em ordem, incluindo `042_sentinela_foundation.sql`.
3. Seeds devem usar UUIDs locais descartáveis, criar temporadas antes das associações e jamais conter usuários, senhas, tokens ou chaves reais. Prefira `supabase/seed.sql` ignorado/local quando houver dados sensíveis.
4. Rode testes unitários com `npm test`.
5. Para habilitar os testes reais de RLS, exporte apenas valores da instância **local** como `SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY` e `SUPABASE_TEST_SERVICE_ROLE_KEY`, então rode `npm test`. Sem essas variáveis, a suíte de integração é explicitamente ignorada.

A service-role existe apenas no processo de teste/seeding local e no backend seguro. Nunca use prefixo `NEXT_PUBLIC_`, registre o valor no Git ou envie-o ao navegador.
