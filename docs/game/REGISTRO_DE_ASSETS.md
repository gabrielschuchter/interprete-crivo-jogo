# Registro de assets

Todo asset do jogo, com origem e licença. Um asset que não está aqui não entra no repositório.

| Asset | Onde | Origem | Licença |
| --- | --- | --- | --- |
| Texturas de pedra, madeira, pergaminho, tecido, metal, vitral, chão e céu | `src/world/textures.ts` | Geradas em canvas por código escrito para este projeto | Autoral, do projeto |
| Arquitetura, mobiliário, vegetação e adereços | `src/world/kit.ts` e arquivos de região | Geometria paramétrica escrita para este projeto | Autoral, do projeto |
| Figuras humanas, Crivo e inimigos | `src/entities/` | Geometria e animação procedurais escritas para este projeto | Autoral, do projeto |
| Trilha generativa e efeitos sintetizados (reserva de todo arquivo gravado) | `src/core/audio.ts` | Síntese em WebAudio escrita para este projeto | Autoral, do projeto |
| Ícones da interface | `src/ui/icons.ts` | Glifos SVG desenhados para este projeto | Autoral, do projeto |
| Source Serif 4, Inter, IBM Plex Mono | `design/fonts/` | Já presentes no repositório, vindas do design system do Interprete | SIL Open Font License 1.1 |
| Cinzel 500 e 700 (subconjunto latino) | `design/fonts/cinzel-latin-*.woff2` | Pacote npm `@fontsource/cinzel` 5.3.0, de The Cinzel Project Authors | SIL Open Font License 1.1 |
| IM Fell English 400, normal e itálico | `design/fonts/im-fell-english-latin-*.woff2` | Pacote npm `@fontsource/im-fell-english` 5.3.0 (tipos Fell digitalizados por Igino Marini) | SIL Open Font License 1.1 |
| UnifrakturCook 700 | `design/fonts/unifrakturcook-latin-700-normal.woff2` | Pacote npm `@fontsource/unifrakturcook` 5.3.0 (j. 'mach' wust, Peter Wiegel) | SIL Open Font License 1.1 |
| Textura de comparação PS2 | `public/direcao-de-arte/img/tex-*.webp` | Derivada de `public/textures/cobblestone_embedded_asphalt_diff.webp` (Poly Haven, CC0) por `tools/ps2/degradar-textura.py` | CC0 |
| Capturas de comparação das predefinições de arte | `public/direcao-de-arte/img/*.jpg`, `docs/game/capturas/ps2/` | Capturas do próprio jogo por `tools/ps2/capturar.mjs` | Autoral, do projeto |
| Texturas de piso e parede PS2 (7 PNG indexados de 128 px, 24 cores) | `public/textures/ps2/` | Seis derivadas por `tools/ps2/recolorir-piso.py` de texturas CC0 do Poly Haven já registradas (cobblestone_embedded_asphalt, coast_rocks_01, road_damaged, fort_wall, bark_debris_01), recoloridas nas rampas ardósia e musgo dos tokens; `piso_madeira.png` é autoral, gerada por código | CC0 (derivadas) e autoral, do projeto |
| Molduras 9-slice da interface PS2 (pedra, bronze, papel), SVG de 48 px | `public/ui/ps2/moldura-*.svg` | Geradas por código em `tools/ps2/gerar-molduras.mjs` a partir das rampas dos tokens | Autoral, do projeto |
| Three.js | dependência npm | three.js authors | MIT |

As cinco imagens góticas e o atlas visual enviados ao projeto foram usados como referência de direção de arte. Nenhuma delas foi copiada para o repositório nem usada como textura.

Nenhum personagem representa pessoa real. Heloísa, Íris, Anselmo, Dalva, Lia, Noêmia e Tomé são inventados, assim como a Academia.

## Lote 1: assets externos convertidos para a web (12/11/2026)

Os arquivos originais foram baixados por Gabriel em `D:\Assets jogo interprete` e convertidos sem edição manual: Blender 5.3 em modo de fundo (bpy), MPFB2 para os humanos, `gltf-transform` com compressão meshopt e texturas WebP, e ffmpeg para o áudio. Os originais de 4K não entram no repositório; entram só as versões reduzidas abaixo.

| Asset | Onde | Origem | Licença |
| --- | --- | --- | --- |
| 42 modelos de cenário e adereço: gothic_statue, marble_bust_01, street_lamp_01, large_castle_door, large_iron_gate, chandelier_02 e _03, lantern_chandelier_01, vintage_grandfather_clock_01, gothiccommode_01, gothic_coffee_table, classicconsole_01, classicnightstand_01, side_table_tall_01, schooldesk_01, woodenchair_01, woodentable_03, wooden_stool_01, wooden_crate_02, wooden_barrels_01, planter_box_03, binder_notebook, magnifying_glass_01, pocket_watch, vintage_pocket_watch, antique_estoc, ornate_medieval_dagger, ornate_medieval_mace, ornate_war_hammer, machete, wooden_axe, wooden_handle_saber, jacaranda_tree, modular_fort_01, root_cluster_01 e _02, bark_debris_01, grass_medium_01, namaqualand_boulder_02, coastal_cliff_01, coast_rocks_01, coast_line_02 | `public/models/props/` | Poly Haven (polyhaven.com), pacotes Blend 4K reduzidos para glTF; em 13/11/2026 a geometria passou pelo orçamento PS2 de `tools/pipeline/ps2_lod.mjs` (simplificação meshoptimizer e raleio de cartões de folha da jacarandá), 868 mil para 263 mil triângulos no conjunto | CC0 |
| Texturas PBR fort_wall, fort_plaster, fort_trim, cobblestone_embedded_asphalt, bark_debris_01, coast_rocks_01, road_damaged, asphalt_02 | `public/textures/` | Poly Haven, mapas difuso, normal e rugosidade em WebP | CC0 |
| HDRI zavelstein (2K, RGBE) | `public/textures/zavelstein_2k.hdr` | Poly Haven, convertida do EXR 4K | CC0 |
| Corpos humanos, peles, olhos, sobrancelhas, cílios, cabelos short02, long01, afro01, sapatos | `public/models/personagens/` | MakeHuman 1.x, assets de sistema, montados com MPFB2 (o código do MPFB2 é GPL e foi usado só como ferramenta, não está no jogo) | CC0 |
| Versão PS2 dos personagens (12/11/2026): malha reduzida, cabelo em casca sólida e texturas reprocessadas, gerada por `tools/pipeline/ps2.py` a partir das linhas acima e abaixo; oito modelos `player_<masc/fem>_<corte>`, os sete NPCs e o vulto | `public/models/personagens/` | Derivado, sem material novo de terceiros; textura do cabelo e mármore do vulto são procedurais | CC0 (herda das fontes) |
| Roupas e cabelos da comunidade MakeHuman: donitz_monk_robe e _hood (Donitz); toigo_suit_with_dinner_jacket, toigo_male_suit_3, toigo_female_suit_2, toigo_fisherman_sweater, toigo_wool_pants, toigo_long_full_skirt, toigo_dress_with_tiered_skirt, toigo_light_skin_female_ginger (MargaretToigo); elvs_french_braid_variation, elvs_reverse_french_braid_bun (Elvaerwyn); rehmanpolanski_hair_bun_brown (RehmanPolanski); jujube_newsboy_cap (jujube); frankyaye_glasses_library_male (frankyaye); grinsegold_beard_sigmund_wip (grinsegold); wdg_scruffy_beard (WDG) | idem | makehumancommunity.org, licença lida no índice de cada pacote | CC0 |
| Animações dos personagens e dos espectros (idle 77_02, walk 16_15, run 16_35, attack 02_07, heavy 02_08, dodge 77_09, hit 22_12, die 90_12 (antes 90_16), jump 16_01, attack2 02_09, interact 26_09, cast 120_03, talk 18_08, sit 113_15, shrug 111_25, wave 13_26, point 13_27, listen 141_20) | embutidas nos GLB de personagens | CMU Graphics Lab Motion Capture Database, conversão BVH de B. Hahne, redirecionadas para o esqueleto cmu_mb do MPFB2; as variantes torch_* são derivadas desses clipes com o braço esquerdo reposicionado | Uso livre. Agradecimento pedido: "The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217." |
| Música: Night Vigil (Pátio), Equatorial Complex (Bosque), Aquarium (Arquivo), Ether Vox (Observatório), That Zen Moment (título, cortada em 5 min) | `public/audio/musica/` | Kevin MacLeod, incompetech.com; autor e título confirmados nas etiquetas ID3 dos arquivos | Creative Commons com atribuição obrigatória. A versão 4.0 é a que o autor declara; ver a conferência abaixo |
| Ambiências e efeitos do Freesound (dez sons, tabela abaixo) | `public/audio/ambiente/`, `public/audio/efeitos/` | Freesound, cortados, normalizados e convertidos para MP3 | **Não conferida.** Ver a tabela abaixo |

### Áudio: conferência de licença, arquivo a arquivo

Estado em 12/11/2026. A rede do ambiente de desenvolvimento recusa `freesound.org` (resposta 403 do proxy em três tentativas por caminhos diferentes), de modo que nenhuma das dez páginas foi lida daqui. Gabriel decidiu, na mesma data, manter os arquivos publicados enquanto confere. A coluna "Licença na página" fica em branco até alguém abrir o link e anotar o que está escrito lá, com a data. Se a página disser CC BY-NC (não comercial) ou "Sampling+", o arquivo sai de `public/audio/` e o nome sai de `efeitos/indice.json`; o jogo cai sozinho no efeito sintetizado daquele grupo, e o painel de Configurações passa a listar a ausência em "Diagnóstico". Se disser CC BY, o crédito que já está na tela de Créditos basta, com o título exato do som acrescentado. Se disser CC0, nada mais é exigido.

| Arquivo no jogo | Origem | Autor | Licença na página | Conferido em |
| --- | --- | --- | --- | --- |
| `ambiente/sala.mp3` | https://freesound.org/s/766206/ | dolineh | | |
| `ambiente/salao.mp3` | https://freesound.org/s/789860/ | klankbeeld | | |
| `efeitos/energia.mp3` | https://freesound.org/s/877794/ | isalreky | | |
| `efeitos/lamina-1.mp3` | https://freesound.org/s/877796/ | isalreky | | |
| `efeitos/espada-1.mp3` a `espada-3.mp3` | https://freesound.org/s/877860/ | incrediblesgm | | |
| `ambiente/poca.mp3` | https://freesound.org/s/877999/ | starsoundzzz | | |
| `ambiente/agua.mp3`, `efeitos/passo-agua-1.mp3` a `-6.mp3` | https://freesound.org/s/878005/ | starsoundzzz | | |
| `efeitos/passo-pedra-1.mp3` a `-6.mp3` | https://freesound.org/s/878006/ | starsoundzzz | | |
| `efeitos/passo-terra-1.mp3` a `-8.mp3` | https://freesound.org/s/878026/ | duranburrus | | |
| `efeitos/passo-entulho-1.mp3` a `-6.mp3` | https://freesound.org/s/878286/ | loganzsound | | |

A correspondência entre som de origem e arquivo derivado nas linhas de `lamina`, `espada`, `agua` e `passo-agua` foi deduzida dos nomes e da descrição do lote, porque o script de corte não ficou no repositório; quem conferir a licença deve confirmar também essa correspondência ouvindo o original.

As cinco músicas: a página de licenças do incompetech.com, lida em 12/11/2026, confirma que a opção gratuita é Creative Commons e exige crédito. Ela não mostra o número da versão nem o texto do crédito, que o site gera faixa a faixa. Falta abrir a página de cada faixa, copiar o crédito gerado e guardar link e data aqui. A tela de Créditos hoje traz os cinco títulos, o autor, o site, a licença CC BY 4.0 com o endereço e as alterações feitas (recompressão e o corte de "That Zen Moment"), que é o que a CC BY pede.

O hash SHA-256 de cada arquivo publicado em `public/` fica em `docs/game/assets-sha256.txt`, gerado por `bash tools/hash-assets.sh`. Ele identifica o derivado; a URL individual, a versão e a data de download de cada modelo do Poly Haven e de cada pacote do MakeHuman ainda não estão registradas item a item.

O que ficou de fora do lote, por não aderir à estética: baseball_bat, modern_coffee_table_02, concrete_cat_statue, modular_street_seating.

## Modelos glTF externos (opcional)

O jogo carrega modelos de alta resolução de `public/models/`, listados em `manifest.json` por chave (`player` e o id de cada NPC). Sem entrada, vale o corpo procedural. Os modelos do lote 1 estão listados acima; cada arquivo novo adicionado entra aqui com origem, autor e licença. Detalhes de formato e nomes de animação em `public/models/LEIA-ME.md`.

## Uso novo de assets já registrados e geometria procedural (12/11/2026)

As sete armas do Poly Haven listadas no lote 1 (antique_estoc, wooden_handle_saber, ornate_medieval_dagger, machete, ornate_medieval_mace, ornate_war_hammer, wooden_axe) deixaram de ser só adereço e agora são as armas empunhadas e as armas caídas no chão. A licença continua CC0; a única alteração é a normalização em tempo de carga (`src/entities/weapons.ts`), que mede a lâmina, põe a origem no punho e esconde a bainha.

Feitos em código, sem arquivo externo e sem licença de terceiros: a tocha da mão esquerda (cabo torneado, anéis de corda, chama em três planos com shader, em `src/entities/weapons.ts`), a lanterna de latão da Lanterna da Transparência (`src/entities/player.ts`) e as silhuetas de cidade ao longe no Pátio e abaixo do terraço do Observatório (`skyline` em `src/world/kit.ts`).

## Elenco PS2 da forja (13/11/2026)

Os 29 GLB de `public/models/personagens/ps2/` (protagonistas em oito combinações, doze moradores, quatro inimigos comuns, quatro mini-chefes e o chefe final) saem de `tools/chars/` sem edição manual. Detalhes e evidências em `docs/game/PIPELINE_DE_PERSONAGENS.md`. Nenhum personagem representa pessoa real; o corpo é paramétrico (MakeHuman), não escaneado.

| Asset | Onde | Origem | Licença |
| --- | --- | --- | --- |
| Corpo de baixa contagem (proxies female1605 e male1591), malha base, peles (young/middleage/old caucasian), olhos low-poly e sobrancelhas | embutidos nos GLB de `personagens/ps2/` | MakeHuman 1.x, assets de sistema e pacotes skins01 e eyebrows01, montados com MPFB2 (código GPL usado só como ferramenta, fora do jogo) | CC0 |
| Seis expressões faciais (morph targets `piscar`, `sobrancelha_erguer`, `sobrancelha_franzir`, `boca_abrir`, `sorriso`, `tristeza`) | malha do corpo dos 28 GLB humanos de `personagens/ps2/` | Combinação das unidades de expressão do MakeHuman (`targets/expression/units/caucasian`: eye-closure, eyebrows-up/down/inner-up, mouth-open, mouth-corner-puller, mouth-depression, eye-slit) transferida para a proxy por `tools/chars/build.py` | CC0 |
| Tons de pele dos protagonistas (`fem_0` a `fem_4`, `masc_0` a `masc_4`, WebP de 512 px) | `public/textures/ps2/pele/` | Peles young_caucasian, young_asian e young_african (feminina e masculina) do MakeHuman, assadas na UV da proxy por `tools/chars/build.py` e misturadas por `tools/chars/peles.py` (`tools/chars/peles.sh` refaz tudo) | CC0 |
| Figurino, cabelo, barba, máscaras, adereços (lampião, alabarda, martelo, gancho, florete, punhal, incensários, coroa, auréola, cristais, correntes, cogumelos) e o atlas pintado | idem | Geometria e textura procedurais de `tools/chars/figurino.py` e `tools/chars/paint.py`, escritas para este projeto | Autoral, do projeto |
| Espectro da Lanterna (malha, esqueleto, textura e dez clipes) | `personagens/ps2/mob_02_espectro.glb` | `tools/chars/criatura.py`, procedural | Autoral, do projeto |
| Clipes de animação dos humanos (os mesmos números CMU da tabela do lote 1) e as variantes derivadas (braço do lampião, tocha, cabeça nivelada, pernas paradas nos gestos) | embutidos nos GLB humanos | CMU Graphics Lab Motion Capture Database, redirecionada por `tools/pipeline/retarget.py` | Uso livre. Agradecimento pedido: "The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217." |

Os oito `player_*.glb` antigos de `public/models/personagens/` saíram do repositório: o manifesto aponta para os novos. O `vulto.glb` antigo fica como reserva de corpo de inimigo.
