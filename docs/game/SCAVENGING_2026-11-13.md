# Scavenging de código, assets e ferramentas (13/11/2026)

Pesquisa pedida pelo Gabriel: o que, entre 30 links e algumas buscas próprias, poupa trabalho ou melhora visivelmente o Interprete, com três critérios: combate de ação em terceira pessoa, estética PS2 dark academia e custo externo zero. Nada foi integrado ao jogo. Os testes ficaram em `tools/scavenging/` (pacote npm próprio, fora do build) e em `/tmp`. O combate novo ainda está em transição em outra frente; este documento trata esse sistema como alvo móvel.

## Limites do que foi verificado

O contêiner alcança o GitHub por clonagem e o registro do npm, mas recusa por proxy (código 000 no curl) quaternius.itch.io, quaternius.com, kaylousberg.com, kenney.nl, polyhaven.com, opengameart.org, freesound.org e jfxr.frozenfractal.com. Os três primeiros foram lidos pela ferramenta de leitura de páginas, que retornou texto das páginas de UAL 1, UAL 2 e KayKit Animations (clipes, licença, preço). A página do Kenney Impact Sounds foi recusada (robots), então a licença CC0 e os 130 arquivos vêm só do catálogo Free Game Dev Assets, que registra leitura em 19/07/2026. Nenhum arquivo dessas fontes bloqueadas foi baixado, ouvido ou testado. O link `github.com/func-godot` (organização) respondeu 403; o repositório `func_godot_plugin` foi lido pela mesma ferramenta de páginas. Blender não existe no contêiner, então nada que dependa de `retarget.py` foi executado. Não há GPU: as imagens abaixo usam SwiftShader.

## O jogo hoje: onde estão os gargalos

A pilha é Vite 5, TypeScript estrito e Three.js 0.170, sem React, sem física de terceiros e sem biblioteca de partículas. Os gargalos que esta pesquisa tentou atacar vêm da leitura do código e não de medição de jogo.

A perseguição dos inimigos (`move` em `src/entities/enemy.ts`, por volta da linha 790) vai em linha reta até o alvo, empurra o círculo para fora dos colisores com `resolveCircle` (`src/world/region.ts`) e simplesmente não anda quando o chão adiante é nulo ou difere em mais de 0,9 m. Não há busca de caminho. Qualquer parede em U, fileira de pilares ou borda de plataforma prende o inimigo. O protagonista tem poucos clipes de combate (`attack` 0,67 s, `attack2` 0,73 s, `heavy` 1,00 s, `dodge`, `hit`, `die`), e o resto vem da camada procedural em `src/entities/motion.ts` e do combate novo. Não há sistema de partículas; faíscas e brasas são código avulso. Os diálogos são funções assíncronas em `src/story.ts`. O áudio é síntese WebAudio mais dez arquivos do Freesound cuja licença ainda não foi conferida (`REGISTRO_DE_ASSETS.md`). A camada PS2 (`src/core/ps2.ts`) já faz resolução interna baixa, snap de vértice por `onBeforeCompile`, textura sem filtro, névoa e quantização com dither Bayer.

## Tabela dos 30 itens

Veredito: integrar (vale entrar como está), adaptar (vale, com trabalho), referência (ler e copiar ideias) ou descartar. Licença de código e de assets separadas quando diferem. "Testado" diz o que eu executei de fato.

| # | Item | Licença código / assets | O que oferece de concreto | Testado | Veredito |
|---|---|---|---|---|---|
| 1 | Stillwater (moonlit-jianghu) | MIT / personagens KayKit CC0, fontes OFL; arte 2D legada de IA fora da licença | Godot 4.6, 3D. `scripts/enemies/BasicEnemy.gd`: anúncio e cancelamento do golpe (`_update_attack_windup`, `_cancel_windup`), atordoamento, golpe pelas costas, arremesso de inimigo contra parede ou outro inimigo com dano (`_check_slam_collisions`). `PlayerController.gd`: parada de quadro no acerto (`_apply_hit_pause`), defesa e vigor | Lido, não executado (Godot) | Referência |
| 2 | Veilspire | MIT / nenhum asset de terceiros | Three.js. `src/player/ThirdPersonCamera.js` (giro automático atrás da direção, mira travada por easing de yaw, colisão que encolhe rápido e abre devagar), `src/combat/combatMath.js` (`flankWaypoint`, flanco em torno do jogador) | Lido, não executado | Referência |
| 3 | Knockback Arena | MIT / Kenney Nature Kit e áudio CC0, resto procedural | `apps/client/src/game/bot/BotController.ts` (71 linhas: decisão por temporizador de reação, recuperação de travamento por deslocamento medido), câmera livre com colisão | Lido | Referência |
| 4 | Stick & Steel | MIT / armas, sons e texturas gerados por serviço de IA, termos desses arquivos não declarados; modelos estão em Git LFS e vieram como ponteiros | Duelo com Rapier e ragdoll ativo; guarda direcional | Só leitura do README | Descartar os assets; referência para a ideia de guarda direcional |
| 5 | Ecctrl | MIT / animações de exemplo derivadas da UAL (CC0) | Controlador em React Three Fiber e Rapier, exige three ≥ 0,184 e React; o jogo não usa nenhum dos dois | Lido | Referência |
| 6 | Recast Navigation JS 0.44.0 | MIT | `@recast-navigation/core`, `generators`, `three`. WASM de 340 KB (132 KB gzip), `threeToSoloNavMesh`, `NavMeshQuery`, `Crowd` | Sim, ver abaixo | Integrar (alternativa: navcat) |
| 7 | Game Models (NoLimitNexus) | Sem arquivo de licença na raiz / só `licenses/kaykit-character-animations.txt` (CC0) | `library/animations/*.glb`: 132 clipes KayKit CC0 já exportados só com animação sobre `Rig_Medium`; kit de corpo próprio (`library/ours`) sem licença declarada | Inspecionei os clipes | Descartar o repositório; pegar os clipes na fonte KayKit |
| 8 | Quaternius UAL 1 | CC0 (página lida) | 120+ clipes: locomoção em 8 direções, corrida, empurrar, nadar, morte, combate | Só página | Adaptar |
| 9 | Quaternius UAL 2 | CC0 (página lida) | 130+ clipes: combos corpo a corpo de 3 e 4 golpes separados em golpes com recuperação, parkour | Só página | Adaptar (top 2) |
| 10 | KayKit Animations | CC0 (página lida) | 133 clipes, `Rig_Medium` e `Rig_Large`, glTF e FBX. Combate corpo a corpo: `Melee_1H_Attack_Chop` 1,04 s, `Slice_Diagonal` 1,00 s, `Slice_Horizontal` 1,33 s, `Stab` 1,58 s, `Jump_Chop` 1,33 s, `Block`, `Block_Hit`, `2H_Attack_Spin` 2,38 s | Medi duração e canais nos GLB | Adaptar (top 2) |
| 11 | KayKit Skeletons | CC0 | 4 GLB de 4,6 a 5,9 mil triângulos, textura 1024, 95 clipes cada (`Dodge_*` ×4, `Hit_A/B`, `Death_*`, `Spawn_*`, `Skeletons_Awaken_*`) | Renderizado com a camada PS2 | Descartar como personagem; aproveitar os clipes |
| 12 | three-procedural-locomotion 0.3.0 | MIT (`"private": true`, sem pacote no npm: copiar o código) | Passada, planejamento de pés, IK de duas juntas, escadas e terreno, 116 parâmetros. Rigs Mixamo e Rigify; o esqueleto cmu_mb exige mapeamento de ossos | Suíte do repositório rodou até o fim sem falhas visíveis nas últimas 15 linhas (não guardei o total) | Adaptar, baixa prioridade |
| 13 | MPFB2 | Código GPL-3.0 (`LICENSE.CODE.md`) / assets CC0 (`LICENSE.ASSETS.md`) | Já é a base da forja (`tools/chars`) | Não repeti | Já integrado, como ferramenta |
| 14 | MPFB MCP | GPL-3.0 | 42 ferramentas via ponte para Blender; `mpfb_get_face_units` expõe unidades faciais estilo ARKit | Não (sem Blender) | Referência |
| 15 | FreeMoCap 2.0 alpha | AGPL-3.0 | Captura de movimento por câmeras, Python e Electron | Não | Descartar |
| 16 | Procedural Dungeon (Dungeon Forge) | MIT | Dungeon por semente: dispersão, Delaunay, árvore geradora, papéis de sala | Só leitura | Referência |
| 17 | KayKit Dungeon Remastered | CC0 | 203 GLB com `wall_arched`, `pillar_decorated`, `stairs`, `shelf_large`, `torch_mounted`, etc. Um atlas de paleta, estilo cartum | Renderizado | Referência de kit modular; visual não serve sem repintura |
| 18 | Quaternius Showcase | MIT (código) / modelos CC0 por pacote (tabela do próprio repositório, conferida pelo autor em 10/10/2026) | Espelho de 1.513 GLB acessível pelo GitHub quando quaternius.com está bloqueado. `modular_dungeon_pack` (41 peças, 936 KB: `Candelabrum_tall`, `Book_Open`, `ModularColumn_*`, `Carpet`), `modular_medieval_buildings_pack` (`WindowGothic`, torres), `medieval_weapons_pack` (24) | Listei arquivos; não renderizei | Adaptar (adereços, com repintura) |
| 19 | TrenchBroom | GPL-3.0-ou-posterior (editor; os mapas não ficam sob GPL) | Editor de blocos para formato Quake | Não | Descartar: não verifiquei carregador de `.map` mantido para Three.js |
| 20 | FuncGodot | MIT | Só Godot 4 | Página lida | Descartar |
| 21 | three-psx 0.1.0 | MIT | `src/shaders.ts` (190 linhas) e `PSX.ts`: snap, mapeamento afim, Gouraud com uma luz pontual por vértice, névoa por vértice, alvo 320×240, dither Bayer, 15 bits | Comparei com `ps2.ts` por leitura; não rodei no navegador | Referência |
| 22 | Level Generator (garretthogan) | MIT | Dungeons BSP e arenas, prévia 3D e exportação GLB | Só leitura | Referência |
| 23 | three.quarks 0.17.1 | MIT | Partículas em lote, bézier sobre vida, forças, editor visual. Declara three ≥ 0,182; o jogo está em 0,170 | Sim, ver abaixo | Adaptar (top 4) |
| 24 | Ink (inkle) | MIT | Linguagem e compilador C# | Via inkjs | Referência |
| 25 | inkjs 2.4.0 | MIT | Compilador e runtime em JS. `ink.js` de runtime com 128 KB (31 KB gzip), pacote completo com compilador 249 KB | Sim: compilou e rodou um diálogo | Adaptar, só para conteúdo novo |
| 26 | Yggdrasil Forge | MIT | Motor de árvores de habilidade, 22 pacotes, renderizador React. O jogo já tem três ramos de nove habilidades em `src/domain` | Só leitura | Descartar |
| 27 | GoNorth | MIT | Aplicativo web .NET com MongoDB para planejar história | Só leitura | Descartar |
| 28 | JFXR 0.13 | BSD-3-Clause (biblioteca e app) | Sintetizador de efeitos; a biblioteca roda em Node | Sim | Adaptar |
| 29 | Kenney Impact Sounds | CC0 (só pelo catálogo, leitura de 19/07/2026) | 130 arquivos de impacto | Não (bloqueado) | Integrar (top 3) |
| 30 | Free Game Dev Assets | CC0 | Índice de 420 fontes com licença citada e data de leitura | Usei para conferir licenças | Referência |

## Testes feitos

### Navegação: Recast e navcat contra a perseguição atual

`tools/scavenging/recast-teste.mjs` e `navcat-teste.mjs`. Quatro cenários sintéticos montados com os dois tipos de colisor de `region.ts` (círculo e caixa orientada), inimigo de raio 0,45 m a 3,2 m/s por até 60 s, e `resolveCircle` copiado fielmente do jogo para a perseguição atual. O inimigo com navegação reconsulta o caminho a cada 0,5 s. Os cenários não são regiões reais do jogo; extrair os colisores de uma `BuiltRegion` é o primeiro passo de qualquer integração.

| Cenário | Reta + `resolveCircle` (hoje) | Recast | navcat |
|---|---|---|---|
| Parede em U | preso, 7,8 m do alvo | chega em 8,1 s | chega em 7,6 s |
| Grade de 49 pilares (raio 1,2 m) | preso, 38,4 m | chega em 17,4 s | chega em 17,8 s |
| Portão de 1,6 m numa muralha | chega em 5,9 s | 5,9 s | 5,9 s |
| Sala em L com estante diagonal | preso, 17,0 m | chega em 11,1 s | chega em 11,1 s |

Construção do navmesh de 80 × 80 m com os obstáculos: Recast de 44 a 76 ms, navcat de 151 a 472 ms. Consulta de caminho de uns 40 m entre pilares: Recast 0,074 ms, navcat 0,182 ms. Multidão de 20 agentes no Recast: 0,150 ms por quadro. Os parâmetros dos dois não são idênticos (altura de escalada e raio foram ajustados à API de cada um), então a comparação entre eles é de ordem de grandeza. O navcat serializa o navmesh em JSON puro, o que permitiria assá-lo fora do jogo; isso está na documentação dele e eu não testei. Recast custa um WASM de 340 KB e inicialização assíncrona; navcat é JavaScript puro e tree-shakeable (a 0.4.1 é jovem: o próprio README admite desempenho menor).

### Narrativa e efeitos

inkjs: um diálogo de duas escolhas com variável (Custódia, a acendedora) compilou em 36 ms, rodou, aplicou a escolha e alterou `confianca`. Isso prova que funciona; não prova que compense trocar `story.ts`, que já é código com o estado do domínio à mão. three.quarks 0.17.1 com three 0.170.0: um sistema com 80 partículas por segundo, gravidade e tamanho sobre a vida construiu e rodou 600 passos de simulação em 36 ms, sem GPU. Não renderizei, então o visual e o custo de desenho não foram medidos, e o descompasso entre o `peerDependencies` (≥ 0,182) e o three do jogo (0,170) fica como risco até um teste com renderização.

### Áudio: JFXR

A biblioteca `jfxr/lib` rodou em Node 22 (o README diz que foi feita para o navegador) e gerou em 22 ms um WAV mono de 0,34 s a 44,1 kHz a partir do preset Hit/hurt com ruído marrom e passa-baixa. O arquivo está em `/tmp` e não foi ouvido por mim; o timbre do sfxr é de arcade, e a palavra final sobre servir ao clima gótico é de ouvido. A síntese WebAudio que o jogo já tem cobre o mesmo terreno.

### KayKit com a camada PS2

`docs/game/capturas/scavenging/kaykit-raw.png` e `kaykit-ps2.png` (página `tools/scavenging/render/kaykit.html`, três.js 0.170, 320×160 ampliado com vizinho mais próximo, luz fria e duas pontuais quentes, dither Bayer de 32 níveis). Os esqueletos têm cabeça de quase metade do corpo: proporção de bonequinho. Com a camada PS2 a paleta fica sombria, mas a silhueta continua cartum, o que contraria a regra de proporção humana correta. Minha iluminação de teste ficou escura demais no guerreiro; isso é defeito do teste e não do asset. As peças de cenário (chão hexagonal, parede, mesa) sobrevivem melhor, mas são de atlas de paleta lisa.

## Top 5 para testar no Interprete

1. **Navegação por navmesh (navcat ou Recast).** Resolve o único defeito de IA que reproduzi: inimigo preso em parede, pilar e borda. Esforço: moderado. Ler `BuiltRegion.colliders` e `platforms`, extrudar caixas e cilindros como no teste, gerar um navmesh por região na carga (50 a 470 ms por região de 80 m, a medir nas regiões reais) e trocar o destino do `move` por um waypoint. Os inimigos que flutuam (Matriarca, espectro) não precisam. Recomendo começar pelo navcat por não ter WASM nem gestão de memória e por poder assar o navmesh offline; trocar por Recast se o custo de geração em tempo de execução incomodar. Teste: `npm run e2e` mais um cenário em U no e2e do elenco.
2. **Clipes de combate CC0 da UAL 2 e da KayKit Animations.** Maior ganho visível para "combate fluido". Esforço: alto e incerto. Gabriel baixa os pacotes (hosts bloqueados aqui) para `D:\Assets jogo interprete`; o `Rig_Medium` da KayKit tem 23 ossos sem dedos, o cmu_mb tem 31, e o esqueleto da UAL eu nunca vi. O redirecionamento via `tools/pipeline/retarget.py` exige Blender, que não tenho aqui. Primeiro experimento sugerido: `Melee_1H_Attack_Slice_Diagonal` e `Melee_1H_Attack_Stab` no protagonista, comparando contra `attack` e `attack2` atuais; só avançar se a correção de postura da ponta dos pés e dos ombros não exigir retrabalho por clipe. Estilo dos clipes é exagerado para bonecos de cabeça grande e pode precisar de amortecimento.
3. **Kenney Impact Sounds e Kenney RPG Audio (CC0).** Eliminam a pendência de licença dos dez arquivos do Freesound sem custo e sem depender de conferência arquivo a arquivo. Esforço: baixo (cortar, normalizar, converter para MP3 e registrar). A licença CC0 vem do catálogo e não da página do pacote, que não consegui abrir.
4. **three.quarks.** Faíscas de golpe, brasas da tocha, poeira de esquiva e névoa, hoje espalhados em código avulso. Esforço: moderado. Testar primeiro com three 0.182 em diretório isolado, e só depois decidir se vale subir o three do jogo (a subida tem custo próprio, porque a camada PS2 patcha shaders por `onBeforeCompile`).
5. **three-procedural-locomotion (só IK de pés).** Pés no degrau e na rampa dos prédios do Arquivo e do Observatório, onde o deslize de pé já foi um problema medido (`docs/game/MOVIMENTO.md`). Esforço: moderado a alto (mapa de ossos do cmu_mb, código copiado porque o pacote é privado). Ganho incerto, por isso é o quinto.

## Opções fora da lista

**navcat** (MIT, isaac-mason, mesmo autor do Recast) supera o Recast no que importa a este jogo em bundle e manutenção: JavaScript puro, estruturas serializáveis, filtros de consulta como funções, sem `destroy()`. Perde em velocidade (medi 3 a 8 vezes mais lento na geração e 2,5 vezes na consulta).

**three-mesh-bvh** (MIT, Garrett Johnson, clonado, não testado) substitui os colisores 2D de círculo e caixa por consulta exata em malha: varredura de esfera ou cápsula para a lâmina do esgrima (o contato hoje é por poses e direções da lâmina) e colisão de câmera exata no lugar de `pointBlocked`. Supera o que temos no acerto de lâmina contra o corpo; o custo é construir o BVH das malhas dos inimigos animados, que não é trivial.

**Kenney RPG Audio** (CC0, só catálogo) supera os sons de passo e de espada do Freesound em segurança de licença. **Quaternius Ultimate Monsters** (50 criaturas animadas, CC0, só catálogo) seriam fonte de inimigos, mas o estilo é o mesmo liso e cartunesco do KayKit e exigiria repintura e redução de proporção; não superam a forja em fidelidade PS2. Nota de licença: o catálogo registra que a Quaternius publicou em 28/08/2026 uma licença própria (QAL v1.0) para lançamentos futuros, sem efeito retroativo; guardar uma cópia da página de cada pacote baixado.

Achados de busca que não verifiquei: BVHEcctrl (pmndrs, citado no README do Ecctrl), um artigo "Loading Quake engine maps in three.js" (dev.to) e o `godot-psx-style-demo`.

## Pendências para o Gabriel

Baixar UAL 2, KayKit Animations e Kenney Impact Sounds e RPG Audio para a pasta de assets, porque o ambiente não alcança esses hosts. Só então eles entram em `REGISTRO_DE_ASSETS.md`, com link da página, versão e data de leitura da licença. Decidir se o teste de navegação (item 1) vira um PR separado e pequeno depois que o combate novo for mesclado.

## Como repetir

`cd tools/scavenging && npm i --legacy-peer-deps && node recast-teste.mjs && node navcat-teste.mjs`. Os testes de inkjs, JFXR, three.quarks e a página de render apontam para clones em `/tmp/scav`; os caminhos estão nos próprios arquivos.
