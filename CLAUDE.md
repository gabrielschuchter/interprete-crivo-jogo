# Interprete RPG · notas para agentes

Ler `DESIGN.md` antes de tocar em interface e `docs/game/DECISOES_TECNICAS.md` antes de tocar em arquitetura.

Comandos: `npm run dev`, `npm run build`, `npm run test`, `npm run e2e` (com o servidor de desenvolvimento no ar).

Regras que não mudam sem autorização explícita do Gabriel: não tocar banco de produção, Clerk, RLS, domínio canônico, migrations nem os apps Estudar e Comunidade; não usar pessoa real como NPC; todo asset novo entra em `docs/game/REGISTRO_DE_ASSETS.md` com origem e licença; nenhum conteúdo clínico real, e todo caso é fictício e marcado como simulação; PBE não vira quiz nem pirâmide rígida de evidências.

Convenções de código: x é leste, z é sul, figuras olham para +Z. O estado de jogo vive em `src/domain/state.ts` e só muda por funções puras de lá. Diálogos são funções assíncronas em `src/story.ts`. Texto de jogo em português do Brasil, sem emoji, sem "jornada" e afins.

Uma mudança de jogabilidade só está pronta quando `npm run e2e` passa.
