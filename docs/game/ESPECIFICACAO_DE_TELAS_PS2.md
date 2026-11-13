# Especificação de telas na direção PS2

Complementa `DIRECAO_DE_ARTE_PS2.md` (seção 7) com o que cada tela usa, em termos de molduras, tokens e comportamento. Todos os valores vêm de `design/ps2/ps2.tokens.json`; o acabamento está em `src/ui/ps2-ui.css` e vale por padrão (`data-arte="ps2"` no html; `?arte=off` desliga). Glifos e brasão em `src/ui/ps2-glyphs.ts`.

## Regras comuns

Moldura de pedra: fundo breu-3 com grão, filete de 2 px em breu-1 por fora, fio de ouro-3 por dentro, tachas de ouro-4 de 8 px nos quatro cantos em painéis grandes. Texto corrido em Source Serif 4, 17 px; títulos em Cinzel 700 com rastreio de 0,06em; rótulos e números em Plex Mono 12 px em caixa alta. Foco e seleção por inversão (preenchimento ouro-4, texto breu-1) ou por marcador de brasa à esquerda; hover e foco são o mesmo estado. Nenhuma transição suave: degraus (`steps`) ou corte. Estado nunca só por cor. Redução de movimento desliga o piscar do cursor e o grão animado.

## Telas

**Abertura.** Cena do Átrio ao fundo, brasão de 72 px em ouro-4 no topo, logotipo em fraktur com a brasa no lugar do ponto, subtítulo em IM Fell itálico, e a linha "Pressione qualquer tecla" em Plex Mono piscando em dois estados. Sem moldura: a tela é o título.

**Menu principal.** Painel de pedra à esquerda (420 px) com brasão, logotipo, subtítulo e lista de no máximo sete itens em Cinzel, separados por filete ouro-1; o item focado leva losango de brasa e recuo de 26 px. À direita, o Átrio vivo em câmera lenta. Rodapé em Source Serif apagado com a nota de simulação.

**Criação.** Painel de pedra à esquerda, cena com a figura à direita. Ofícios em grade de dois, com losango dourado no selecionado e a descrição em IM Fell itálico; nome em campo com fio de ouro-2; cor de pele e cabelo em amostras quadradas com contorno de 2 px em osso no selecionado.

**HUD.** Vida e vigor no canto superior esquerdo em calha de pedra com enchimento em degraus de 6 px (vinho-4 e ouro-4); objetivo no superior direito, painel de pedra com filete; atalhos no inferior direito em casas com chanfro; moedas no inferior esquerdo. Avisos (toasts) à esquerda, em painel de pedra, sem animação de entrada. Barra de chefe no topo, centralizada, em carmesim clássico com degraus.

**Diálogo.** Painel de pedra de 880 px na parte inferior, aba de nome em vinho-2 sobre a moldura, texto em máquina de escrever a 40 caracteres por segundo, escolhas como botões com número em Plex Mono à esquerda e rótulo ("evidência", "valor") à direita; indicador de continuação piscando. Retrato opcional de busto à esquerda, com luz-chave única.

**Livro (inventário, habilidades, mapa, diário, códice, ajustes).** Moldura de pedra de 1180 px com navegação lateral em Cinzel; aba atual com barra de brasa de 4 px à esquerda. Casas de inventário com chanfro, vazias afundadas, selecionada com contorno de 2 px em brasa. Árvore de habilidades em losangues retos (sem rotação), nó disponível com contorno osso, ativo com contorno ouro-4. Mapa como gravura em papel: sem suavização, hachura em dither de um bit, jogador como brasa. Diário e códice em moldura de papel (osso-5, tinta ferrogálica, IM Fell na marginália).

**Loja.** Lista de linhas com ícone de 34 px, nome em Source Serif, preço em Plex Mono dourado; linha selecionada com barra de brasa e fundo vinho-1; painel de detalhe à direita com a mesma casa chanfrada do inventário.

**Pausa.** Cartão de pedra centralizado de 460 px sobre a cena escurecida (sem desfoque), cinco botões no máximo; o primeiro é o primário em vinho-3.

**Dossiê de caso.** Mesa escura com folha de papel osso-5 e borda serrilhada; estatísticas em Plex Mono; selo "simulação" em lacre de vinho-3. Acerto e erro continuam sem semáforo.

**Derrota e final.** Fundo breu com gravura em dither de um bit em ouro-3; título em Cinzel caixa alta com sombra dura de 2 px; um único botão primário.

## O que ainda não está feito

As molduras de papel e de bronze existem como regra, mas só a de pedra está implementada em CSS para todas as telas; o papel vale no dossiê e o bronze, no inventário. Os glifos existem e o brasão aparece na abertura e no menu; o uso dos demais glifos no mapa, no códice e nos itens depende da thread de conteúdo. Retratos de busto no diálogo dependem de arte nova.
