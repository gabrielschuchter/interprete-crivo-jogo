# Desempenho de carga e tremor do chão (13/11/2026)

Relato do Gabriel: o chão do Pátio treme, e a primeira carga (menu e Novo jogo) é lenta. Este documento separa o que foi medido do que não pôde ser. Todas as medidas foram feitas em Chromium sem placa de vídeo (WebGL por software, SwiftShader), com o build de produção servido por `vite preview`. Bytes, triângulos, programas de shader e chamadas de desenho valem para qualquer máquina. Tempos de parede no SwiftShader servem só para comparar antes e depois, e variam muito de uma execução para outra (o Novo jogo oscilou entre 7 e 29 s com o mesmo build), porque o SwiftShader compila pipelines de shader no processo da GPU sem que o JavaScript veja.

## Tremor do chão

Causa: a camada PS2 prende cada vértice a uma grade de tela (`ps2Snap` em `src/core/ps2.ts`). O chão do Pátio é um único quadrado de 150 m com dois triângulos, e seus cantos ficam atrás ou muito longe da câmera. Prender à grade um vértice com profundidade pequena ou negativa, ou a 80 m de distância, desloca o canto em dezenas de centímetros, o plano inteiro inclina um pouco e a textura salta a cada movimento mínimo da câmera. Os anéis de laje a 2 cm acima do chão entravam e saíam do chão junto (z-fighting induzido).

Medida (`tools/perf/tremor.mjs`): a câmera anda em passos de 5 mm e cada quadro é comparado com o anterior na faixa de baixo da tela. Antes, 20% dos pixels do chão saltavam de uma vez em alguns passos (diferença média de 16 a 19 por pixel, contra 0,2 nos passos normais). Com a grade desligada, o pior passo tinha 3,2% de pixels saltando. Depois da correção, 0,3%, e a série é igual à da grade desligada. Bosque, Arquivo e Observatório não tinham saltos nem antes.

Correção: só se prendem à grade vértices na frente da câmera (profundidade entre 0,5 e 30 m) e dentro da tela. Objetos próximos mantêm a oscilação de época; planos grandes deixam de tremer. A sombra do sol passou a andar em passos de um texel do mapa de sombras, no plano da luz, o que tira o escorregar das bordas de sombra no chão quando o jogador anda (correto por construção, não medido no teste acima, que mantém o jogador parado).

## Carga

Comparação lado a lado, mesmo contêiner, `tools/perf/metricas.mjs`, main de 13/11 contra este trabalho:

| Medida | Antes | Depois |
|---|---|---|
| Download até a tela de abertura | 30,6 MB em 119 pedidos | 15,5 MB em 90 pedidos |
| Triângulos desenhados num quadro da abertura (inclui sombras) | 2,86 milhões | 0,82 milhão |
| Triângulos desenhados num quadro de jogo no Pátio | 4,68 milhões | 1,37 milhão |
| Programas de shader ao entrar no jogo | 151 | 84 |
| Tempo até a abertura (SwiftShader) | 7,9 a 9,1 s | 5,5 a 6,8 s |
| Novo jogo, do clique até jogar (SwiftShader) | 25 a 48,5 s | 6,6 a 29 s |
| Tela de criação, primeiro quadro (SwiftShader) | 2,7 a 4,2 s | 0,4 s |

O que mudou, por ordem de peso:

1. Props no orçamento PS2. A jacarandá tinha 291 mil triângulos (quatro no Pátio, mais de um milhão de triângulos só de árvore); o poste, o busto e a estátua tinham de 14 a 28 mil cada. `tools/pipeline/ps2_lod.mjs` simplifica cada prop para até 6 mil triângulos (a árvore para 22 mil, o forte modular para 20 mil) e raleia os cartões de folha da árvore, aumentando os que ficam para a copa não abrir. Conjunto: 868 mil para 263 mil triângulos, 15 MB para 9,1 MB. Os originais ficam em `tools/pipeline/.lod-orig/` (fora do git) na primeira passada.
2. Compilação dupla. `Engine.precompile` compilava os materiais antes de a camada PS2 trocar o shader deles e com a tela como alvo, enquanto o quadro real desenha no alvo do compositor (sem tom nem espaço de cor no shader). O primeiro quadro jogava fora o que tinha sido compilado e compilava tudo de novo. Agora a camada PS2 é aplicada antes e a compilação usa o alvo do compositor.
3. Mapas que a camada PS2 já anulava (normal, rugosidade, metal) saem do material em vez de só ter a escala zerada: menos variantes de shader e menos texturas na placa.
4. Texturas reenviadas. A camada PS2 marcava `needsUpdate` nas texturas de cada material novo; como cada figura clona seus materiais, a mesma imagem subia de novo para a placa a cada personagem que aparecia. Agora cada textura é ajustada uma vez.
5. Objetos que entram depois da região (jogador, Crivo, moradores, inimigos) eram compilados e tinham as texturas enviadas no primeiro quadro de jogo. `Game.warmScene` faz isso ainda com a tela escura, e o boneco da criação é compilado na abertura, atrás da barra.
6. Sem a extensão de compilação paralela (Firefox, SwiftShader, parte dos celulares) o driver só termina um shader no primeiro uso. Os programas pendentes da abertura terminam um por quadro enquanto o menu está na tela (`Engine.linkPending`).
7. Ordem de download. Antes do menu descem só os props do Pátio e o corpo padrão da criação (mais o do jogo salvo); os outros seis protagonistas (6,4 MB) e o resto dos props descem com o menu já na tela. O Novo jogo espera o corpo escolhido antes de montar a cena.
8. Em produção o renderizador não pede o registro de erros de cada shader, consulta que força a espera da compilação.

## O que não foi medido

Não há placa de vídeo no ambiente, então não há número de quadros por segundo nem de tempo de compilação em GPU real. Em Windows com ANGLE sobre Direct3D, cada programa de shader do three.js costuma custar dezenas a centenas de milissegundos para compilar; a queda de 151 para 84 programas e de 4,7 para 1,4 milhão de triângulos deve pesar mais lá do que aparece aqui, mas isso é inferência. A rede também não foi limitada nas medidas acima: com 20 Mbit/s, os 15 MB a menos antes da abertura equivalem a cerca de 6 s.

Os sete NPCs da história (`public/models/personagens/*.glb`, 800 KB cada, do pipeline antigo) entram na carga do Pátio e não foram mexidos; a refação deles está em outra frente.

## Como medir de novo

Build e `npx vite preview --port 4173`, depois: `node tools/perf/metricas.mjs` (bytes, programas, triângulos, tempos), `node tools/perf/carga.mjs` (detalhe por tipo de arquivo e quadros lentos; `REDE=20` limita a banda), `node tools/perf/tremor.mjs` (`REGIOES=atrio,bosque` e `SO=1` para só a série com a camada PS2), `node tools/perf/perfil.mjs` (perfil de CPU do Novo jogo; `PILHA=1` mostra quem chama as funções que bloqueiam) e `node tools/perf/vistas.mjs <prefixo>` para capturas fixas de antes e depois.
