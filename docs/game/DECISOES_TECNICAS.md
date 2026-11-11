# Decisões técnicas

Registro das escolhas de arquitetura feitas em novembro de 2026, com o motivo de cada uma e o que a faria mudar.

## Pilha

Vite 5, TypeScript em modo estrito e Three.js 0.170, sem framework de interface. A interface é DOM e CSS sobre `design/tokens.css`. A alternativa considerada foi React Three Fiber; foi descartada porque o jogo tem um laço de quadro único e pouca interface reativa, e a camada extra custaria tamanho de pacote e controle de alocação sem dar nada em troca. O pacote final tem 838 kB de JavaScript (244 kB em gzip), quase todo Three.js.

## Assets gerados em código

Não há modelo, textura ou áudio externo. Texturas PBR são pintadas em canvas (`src/world/textures.ts`), a arquitetura vem de um kit paramétrico (`src/world/kit.ts`), personagens são figuras articuladas com animação procedural (`src/entities/figure.ts`), o pelo do Crivo usa camadas de casca e o som é sintetizado em WebAudio (`src/core/audio.ts`). O motivo foi duplo: o ambiente de desenvolvimento não alcança repositórios de assets, e a regra de licenças do projeto fica trivial quando tudo é autoral. O custo é visível: as figuras humanas são estilizadas, sem malha esculpida nem captura de movimento. Substituir por modelos glTF é possível sem mexer em jogabilidade, porque `Figure` expõe só pose, âncoras e estados.

## Estado e registro

Todo o estado de partida é um objeto serializável em `src/domain/state.ts`, alterado por funções puras e sem dependência de Three.js. O registro grava esse objeto em `localStorage` (chave `interprete-rpg-registro-v1`) por meio de um adaptador com três métodos. Trocar por Supabase significa escrever outro adaptador; nada foi conectado a banco, Clerk ou domínio, conforme os limites do projeto.

## Cooperativo

O jogo é para um jogador. O que está pronto para cooperativo é a separação: regras e progresso no domínio puro, entrada abstraída em ações nomeadas, inimigos e jogador como entidades com estado próprio e resolução de golpes centralizada em `Game.resolveAttack`. O que falta é tudo o que é rede: autoridade, sincronização de entidades, reconciliação e sessão. Isso não foi implementado e não deve ser descrito como parcialmente pronto.

## Regiões

Cada região é uma função que devolve geometria estática fundida, colisores 2D com etiquetas, plataformas, pontos de entrada, objetos interativos e ações de animação. A colisão é 2D com altura por plataforma, o que basta para o desenho atual e impede níveis com sobreposição vertical real (uma passarela sobre uma área caminhável). Viagem entre regiões descarta a cena anterior inteira.

## Narrativa

Diálogos são funções assíncronas (`await g.say`, `await g.choose`) em `src/story.ts`. Lê-se como roteiro e dispensa um formato de dados próprio. O progresso é guardado como passo numérico por missão e um conjunto de marcas. Com mais de umas vinte missões isso pede um editor ou um formato declarativo.

## Testes

Vitest cobre domínio, conteúdo e o caso simulado (27 testes). `tests/e2e/playthrough.mjs` joga a campanha inteira em Chromium com 29 verificações, usando as mesmas ações de entrada do jogador humano e um jogador automático simples para as lutas. O teste já pagou o próprio custo: encontrou que o caso de Lia destravava no códice a página que conta como sexta página solta, o que permitia concluir a missão das páginas com cinco.

## Desempenho

Medido apenas em renderização por software (SwiftShader), a 1280×720: de 10 a 17 quadros por segundo. Isso não diz nada sobre uma placa de vídeo real, e não houve teste em hardware. Há três níveis de qualidade em Ajustes que alteram sombras, densidade de vegetação, resolução interna e pós-processamento. A medição em máquinas reais é a primeira pendência.
