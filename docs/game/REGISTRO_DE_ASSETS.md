# Registro de assets

Todo asset do jogo, com origem e licença. Um asset que não está aqui não entra no repositório.

| Asset | Onde | Origem | Licença |
| --- | --- | --- | --- |
| Texturas de pedra, madeira, pergaminho, tecido, metal, vitral, chão e céu | `src/world/textures.ts` | Geradas em canvas por código escrito para este projeto | Autoral, do projeto |
| Arquitetura, mobiliário, vegetação e adereços | `src/world/kit.ts` e arquivos de região | Geometria paramétrica escrita para este projeto | Autoral, do projeto |
| Figuras humanas, Crivo e inimigos | `src/entities/` | Geometria e animação procedurais escritas para este projeto | Autoral, do projeto |
| Música ambiente e efeitos sonoros | `src/core/audio.ts` | Síntese em WebAudio escrita para este projeto | Autoral, do projeto |
| Ícones da interface | `src/ui/icons.ts` | Glifos SVG desenhados para este projeto | Autoral, do projeto |
| Source Serif 4, Inter, IBM Plex Mono | `design/fonts/` | Já presentes no repositório, vindas do design system do Interprete | SIL Open Font License 1.1 |
| Three.js | dependência npm | three.js authors | MIT |

As cinco imagens góticas e o atlas visual enviados ao projeto foram usados como referência de direção de arte. Nenhuma delas foi copiada para o repositório nem usada como textura.

Nenhum personagem representa pessoa real. Heloísa, Íris, Anselmo, Dalva, Lia, Noêmia e Tomé são inventados, assim como a Academia.

## Lote 1: assets externos convertidos para a web (12/11/2026)

Os arquivos originais foram baixados por Gabriel em `D:\Assets jogo interprete` e convertidos sem edição manual: Blender 5.3 em modo de fundo (bpy), MPFB2 para os humanos, `gltf-transform` com compressão meshopt e texturas WebP, e ffmpeg para o áudio. Os originais de 4K não entram no repositório; entram só as versões reduzidas abaixo.

| Asset | Onde | Origem | Licença |
| --- | --- | --- | --- |
| 42 modelos de cenário e adereço: gothic_statue, marble_bust_01, street_lamp_01, large_castle_door, large_iron_gate, chandelier_02 e _03, lantern_chandelier_01, vintage_grandfather_clock_01, gothiccommode_01, gothic_coffee_table, classicconsole_01, classicnightstand_01, side_table_tall_01, schooldesk_01, woodenchair_01, woodentable_03, wooden_stool_01, wooden_crate_02, wooden_barrels_01, planter_box_03, binder_notebook, magnifying_glass_01, pocket_watch, vintage_pocket_watch, antique_estoc, ornate_medieval_dagger, ornate_medieval_mace, ornate_war_hammer, machete, wooden_axe, wooden_handle_saber, jacaranda_tree, modular_fort_01, root_cluster_01 e _02, bark_debris_01, grass_medium_01, namaqualand_boulder_02, coastal_cliff_01, coast_rocks_01, coast_line_02 | `public/models/props/` | Poly Haven (polyhaven.com), pacotes Blend 4K reduzidos para glTF | CC0 |
| Texturas PBR fort_wall, fort_plaster, fort_trim, cobblestone_embedded_asphalt, bark_debris_01, coast_rocks_01, road_damaged, asphalt_02 | `public/textures/` | Poly Haven, mapas difuso, normal e rugosidade em WebP | CC0 |
| HDRI zavelstein (2K, RGBE) | `public/textures/zavelstein_2k.hdr` | Poly Haven, convertida do EXR 4K | CC0 |
| Corpos humanos, peles, olhos, sobrancelhas, cílios, cabelos short02, long01, afro01, sapatos | `public/models/personagens/` | MakeHuman 1.x, assets de sistema, montados com MPFB2 (o código do MPFB2 é GPL e foi usado só como ferramenta, não está no jogo) | CC0 |
| Roupas e cabelos da comunidade MakeHuman: donitz_monk_robe e _hood (Donitz); toigo_suit_with_dinner_jacket, toigo_male_suit_3, toigo_female_suit_2, toigo_fisherman_sweater, toigo_wool_pants, toigo_long_full_skirt, toigo_dress_with_tiered_skirt, toigo_light_skin_female_ginger (MargaretToigo); elvs_french_braid_variation, elvs_reverse_french_braid_bun (Elvaerwyn); rehmanpolanski_hair_bun_brown (RehmanPolanski); jujube_newsboy_cap (jujube); frankyaye_glasses_library_male (frankyaye); grinsegold_beard_sigmund_wip (grinsegold); wdg_scruffy_beard (WDG) | idem | makehumancommunity.org, licença lida no índice de cada pacote | CC0 |
| Animações dos personagens e dos espectros (idle 77_02, walk 16_15, run 16_35, attack 02_07, heavy 02_08, dodge 77_09, hit 22_12, die 90_16, interact 26_09, cast 120_03, talk 18_08, sit 113_15, shrug 111_25, wave 13_26, point 13_27, listen 141_20) | embutidas nos GLB de personagens | CMU Graphics Lab Motion Capture Database, conversão BVH de B. Hahne, redirecionadas para o esqueleto cmu_mb do MPFB2 | Uso livre. Agradecimento pedido: "The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217." |
| Música: Night Vigil (Pátio), Equatorial Complex (Bosque), Aquarium (Arquivo), Ether Vox (Observatório), That Zen Moment (título, cortada em 5 min) | `public/audio/musica/` | Kevin MacLeod, incompetech.com; autor e título confirmados nas etiquetas ID3 dos arquivos | CC-BY 4.0, crédito obrigatório (tela de Créditos em Configurações) |
| Ambiências e efeitos: 766206 dolineh (sala de aula), 789860 klankbeeld (salão com conversa), 877794 isalreky (energia escura), 877796 isalreky (espada), 877860 incrediblesgm (espadas), 877999 starsoundzzz (poça), 878005 starsoundzzz (água), 878006 starsoundzzz (passos em mármore), 878026 duranburrus (passos na terra), 878286 loganzsound (passos em entulho) | `public/audio/ambiente/`, `public/audio/efeitos/` | Freesound (freesound.org/s/<id>/), cortados, normalizados e convertidos para MP3 | **A confirmar som a som.** O proxy deste ambiente bloqueia o Freesound. Se algum for CC-BY-NC, o arquivo sai e o jogo volta ao efeito sintetizado daquele grupo sem quebrar nada; se for CC-BY, o autor entra nos Créditos |

O que ficou de fora do lote, por não aderir à estética: baseball_bat, modern_coffee_table_02, concrete_cat_statue, modular_street_seating.

## Modelos glTF externos (opcional)

O jogo carrega modelos de alta resolução de `public/models/`, listados em `manifest.json` por chave (`player` e o id de cada NPC). Sem entrada, vale o corpo procedural. Os modelos do lote 1 estão listados acima; cada arquivo novo adicionado entra aqui com origem, autor e licença. Detalhes de formato e nomes de animação em `public/models/LEIA-ME.md`.
