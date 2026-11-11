# Design system · Interprete.

Fonte da verdade: `design/tokens.json` (exportado do design system "Interprete." no Claude). `design/tokens.css` é derivado dele. Para uso em tela, importe `design/tokens.css` e use as variáveis. Não escreva hex solto no código do jogo.

## Princípios

O sistema é plano. Sem gradiente, sem sombra (nem no logo), sem emoji. Elevação é troca de superfície mais um fio de 1px. Textura só como grão e fibra (`--texture-grain`, `--texture-fibers`), em baixa opacidade. Muito respiro é regra: espaçamento na escala de 4px, de `--space-1` a `--space-10`.

Proporção de cor por tela: 60% pink-essence (fundo), 20% dark-amaranth (marca), 12% crimson-violet (texto e fundo escuro), 8% classic-crimson (o corte, o dado, o destaque).

## Cor

Primitivas: dark-amaranth `#8C1535`, crimson-violet `#410230`, classic-crimson `#D62839`, debian-red `#D60858`, pink-essence `#F1EBE8`, paper-light `#F7F3F1`, violet-60 `#7d5a6c`, violet-40 `#a68f99`, violet-15 `#dcd0cf`, violet-08 `#e7dedc`, amaranth-dark `#6E0F29`, crimson-dark `#B31F2F`, debian-tint `#F6D9E2`, amaranth-tint `#EBD3D7`, ink-black `#120910`.

No código, use os aliases semânticos: `--bg-page`, `--bg-surface`, `--bg-sunken`, `--bg-brand`, `--bg-inverse`, `--text-primary`, `--text-secondary`, `--text-disabled`, `--text-brand`, `--text-on-dark`, `--text-accent`, `--border-subtle`, `--border-strong`, `--focus-ring`, `--action-primary`, `--action-accent`, `--status-critical`, `--tag-bg`.

Regras de contraste que importam para um jogo, onde a tentação é pôr cor em tudo:

- classic-crimson só em display e dado a partir de 24px (4,2:1 sobre pink-essence). Nunca em corpo de texto.
- classic-crimson e debian-red nunca na mesma tela.
- violet-40 (2,5:1) é só para desabilitado. violet-15 (1,3:1) é decorativo: separa, não identifica controle. Estado que carrega informação precisa de `--border-strong` ou de texto.
- Um botão primário por tela (dark-amaranth). O botão de destaque (classic-crimson, texto branco) aparece uma vez por peça.
- Texto sobre bg-inverse e bg-brand é sempre pink-essence.

## Tipografia

Três famílias, todas com woff2 em `design/fonts/`: Source Serif 4 (títulos, wordmark, peso 600), Inter (texto), IBM Plex Mono (dado e rótulo).

Escala: display 64, title-xl 44, title 32, subtitle-lg 24, subtitle 18, body-lg 17, body 15, caption 13, label 11, data 14. Leitura longa: 17px, entrelinha 1,55, medida `--measure-reading` (62ch). Títulos em sentence case, entrelinha 1,15, tracking `-0.01em`. Rótulo: mono 11px, caixa alta, `+0.2em`.

Atalhos prontos: `--type-title`, `--type-subtitle`, `--type-body`, `--type-caption`, `--type-label`, `--type-data`. Dado e medida em mono: magnitude em classic-crimson, intervalo e n em text-secondary.

Pendência registrada no design system: as mono alternativas (Courier Prime, DM Mono, Spline Sans Mono) estão no tokens.json como candidatas e não foram aprovadas. Não usar. Os arquivos delas não foram copiados.

## Forma e movimento

Raios: 0 em foto e recorte, 4px em botão, tag e campo, 8px em card, 22% no símbolo "I.", 999px na pílula da marca. Contorno de popover: `--shadow-overlay` (1px, sem blur).

Movimento só em estado de UI: 120ms (`--dur-fast`) em hover e press, 200ms (`--dur-base`) em troca de aba e interruptor, uma curva (`--ease-standard`). Hover escurece, press desloca 1px, foco = borda crimson-violet mais anel classic-crimson a 30%. O design system não prevê animação decorativa. Se o jogo precisar de animação de gameplay (feedback de acerto, transições de cena), isso é decisão nova, fora do sistema, e deve ser registrada aqui.

## Voz

Português do Brasil, "nós" e "você", frases curtas, jargão definido na primeira vez, certeza declarada de forma explícita ("a evidência sugere", "não permite concluir"). Sem promessa (transforme, destrave, revolucione, jornada). Separador `·`. Ironia leve, sempre sobre ideias, nunca sobre pessoas. Sem emoji.

## Lacunas conhecidas

Ícones: o design system usa Lucide como substituto, sem conjunto próprio aprovado. Não há tokens de estado de jogo (acerto, erro, nível, recompensa). Como o sistema não tem verde nem amarelo, feedback de acerto e erro deve ser resolvido com forma, texto e peso (marcação "gabarito", fio forte, rótulo mono), e não com semáforo. Cada decisão nova nessa área entra neste arquivo.

## Extensão de jogo

O design system não cobre luz, pedra e vegetação de uma cena 3D, nem estados de jogo. As decisões abaixo são novas, valem só para o Interprete RPG e têm como fonte `src/world/palette.ts` e `src/ui/game.css`.

Cores de mundo, usadas em materiais e luz e nunca em texto de interface: âmbar `#E5A85F` e âmbar quente `#FFC27A` (fogo, janelas, lanternas), ouro envelhecido `#BD9A61` (metal, filetes de moldura), esmeralda `#183D35` e esmeralda iluminada `#3F8C74` (vegetação, névoa do Bosque), azul meia-noite `#182C48` (céu, sombra fria), marfim `#F0E5D3` (pergaminho), carvão `#16121C` (fundo de painéis sobre a cena) e névoa `#8FB5A6`. As cores de marca seguem vindo de `design/tokens.json`; o carmesim clássico fica reservado a dano, perigo e ação principal.

A interface sobre a cena usa painéis escuros de carvão com fio de 1px em ouro envelhecido, sem blur e sem sombra projetada, com Source Serif 4 em títulos e falas, Inter em rótulos e IBM Plex Mono em números e teclas. Acerto e erro continuam sem semáforo: o jogo marca resultado com texto, peso e o comportamento do Crivo.

Animação de gameplay é permitida e foi registrada aqui como exceção ao item de movimento: antecipação de golpes inimigos, pausa de impacto de até 90ms, tremor curto de câmera, faixas de título de região e de missão. Ajustes oferece redução de movimento, que desliga tremor e pausa de impacto. Ícones são glifos SVG próprios em `src/ui/icons.ts`, desenhados em traço de 1,5px; Lucide não é usado no jogo.
