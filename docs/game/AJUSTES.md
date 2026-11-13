# Ajustes e imagem

Revisão de 13/11/2026, a pedido do Gabriel: uma imagem só, a PS2 tardia em qualidade alta, e uma tela de Ajustes mínima, em que cada linha muda a jogabilidade ou a acessibilidade. O critério foi comparar com o que jogos de ação em terceira pessoa costumam oferecer (volumes, brilho, câmera, inversão, remapeamento, legendas e tamanho de texto, dificuldade) e cortar tudo o que é técnico, cosmético ou redundante. O que o jogo pode decidir sozinho, decide.

## Imagem

A PS2 tardia (`design/ps2/ps2.tokens.json`, `render.imagem`) é a única imagem. Saíram a Era PS2 crua de 448 linhas, a Limpa (sem a camada de época), as predefinições de estudo A, B e C, o parâmetro `?arte=` e a chave `interprete-arte` no armazenamento local. A interface PS2 também deixou de ter desligamento: `data-arte="ps2"` está fixo no `index.html`. O caminho de render sem a camada (névoa exponencial, render direto em qualidade baixa, sombra dura) saiu do `Engine`, que agora monta a camada PS2 sempre.

A qualidade deixou de ser opção. `src/core/quality.ts` começa em alta no computador (576 linhas, sombra suave, brilho das luzes) e em baixa em aparelho de toque (448 linhas, sem sombra), que já era o comportamento da primeira execução em celular. Durante o jogo, se o ritmo médio ficar abaixo de 28 quadros por segundo por quatro segundos seguidos, a qualidade desce um degrau, até a baixa, e não volta a subir na mesma sessão, porque cada troca recompila os shaders. Os primeiros seis segundos depois de uma troca não contam. Com `?teste` na URL a regra fica desligada, porque o render por software dos testes é lento de propósito. Não há forma de forçar alta num celular; se isso fizer falta em aparelho bom, o caminho é medir em GPU real e subir o ponto de partida, não devolver a opção.

## O que ficou

| Ajuste | Por quê |
| --- | --- |
| Brilho (novo) | Calibragem de tela é o ajuste de imagem que importa num jogo escuro: sem ele, em monitor ou celular com gama alta, o breu das salas e da névoa esconde inimigos e avisos de golpe. Atua no render, como curva de gama no passe de cor (`uGamma` no `GradeShader`), de 70% a 150%; o branco quase não muda, então abrir as sombras não lava chamas nem a lua. A amostra abaixo do controle mostra três emblemas em 3%, 7% e 13% sobre preto, com a mesma curva: a instrução é subir até o da esquerda mal aparecer. |
| Volume geral, Música, Efeitos e ambiente | O trio padrão do gênero. O antigo volume de Ambiente virou parte de Efeitos (vento, chuva e salas seguem 0,82 do volume de efeitos, a razão dos padrões antigos), porque ninguém ajusta os dois em separado num jogo sem voz falada. |
| Dificuldade | Muda a experiência inteira (PR #28). Fica igual: História, Padrão e Rigor, com a nota de cada um. |
| Sensibilidade da câmera | Muda a mira e o giro em combate; no toque, vale também para o arrasto do olhar. |
| Inverter eixo vertical | Preferência motora, presente em praticamente todo jogo com câmera livre. |
| Tamanho dos botões de toque | Acessibilidade motora no celular. Só aparece em aparelho de toque. |
| Tamanho do texto e da interface | Acessibilidade de leitura. Absorve a antiga escala da interface em jogo: as barras, o objetivo e os atalhos crescem junto, em proporção menor (`hudScaleFor`, de 0,9 a 1,3), para não cobrir a cena. |
| Alto contraste | Acessibilidade visual. |
| Reduzir movimento | Acessibilidade vestibular: sem tremor de câmera, clarões, grão animado e texto animado. Começa igual à preferência do sistema. |
| Remapeamento de teclado, mouse e controle | Acessibilidade motora e teclados fora do padrão (AZERTY). Conflito troca as duas ações e avisa. |
| Restaurar padrões, Diagnóstico, Créditos | Restaurar é a saída de quem se perdeu; Diagnóstico só aparece quando um arquivo falhou; Créditos são obrigação das licenças CC BY da música. |

Tela cheia continua só na pausa, onde já estava; repetir nos Ajustes seria redundância. Legendas não entram porque o jogo não tem voz falada: toda fala já é texto. Vibração não entra porque o jogo não vibra. A mira travada não pede opção: tem botão próprio, e a troca de alvo vem do puxão lateral ou de Z e C.

## O que saiu, e o que o jogo faz no lugar

| Ajuste antigo | Destino |
| --- | --- |
| Aparência (PS2 tardia, Era PS2 crua, Limpa) | Imagem única, a PS2 tardia. |
| Qualidade (baixa, média, alta) | Automática, ver acima. |
| Campo de visão | Fixo em 58 graus, o teto da faixa de composição da direção de arte (50 a 58). Em terceira pessoa ele pouco muda o enjoo; muda o enquadramento, que é da direção. |
| Grão de filme e Vinheta | Cosméticos e parte da imagem PS2: ficam sempre ligados. O grão é animado e sai com Reduzir movimento. |
| Sensibilidade vertical | Rara em jogos de ação em terceira pessoa; a geral e a inversão cobrem o uso. |
| Distância da câmera | Fixa em 4,6 m; a câmera já encurta sozinha contra paredes e chega mais perto na carga do golpe firme. |
| Tamanho da interface em jogo | Fundido no tamanho do texto. |
| Mostrar interface durante o jogo | Cosmético (modo foto) e arriscado: quem esconde a interface perde vida e objetivo. |
| Números nas barras | Informação redundante com as barras; leitores de tela continuam recebendo os valores pelos medidores. |
| Correr sem levar o dedo à borda | Virou o comportamento único: a corrida por toque liga a 85% do curso do analógico e desliga abaixo de 70% (antes, 94% e 80%). |
| Zona morta dos analógicos | Fixa em 18%, radial e com reescala, dentro do que controles comuns precisam. |
| Duração de avisos e dicas | Avisos passados ficam no Diário, então nada se perde quando um aviso some. |

## Preferências gravadas

As preferências moram em `interprete-rpg-config-v1` no armazenamento local, e `sanitizeSettings` descarta em silêncio os campos que saíram, sem aviso e sem perder o resto (volumes, sensibilidade, inversão, texto, contraste, movimento, dificuldade das novas partidas, teclas e botões). Quem tinha aumentado só a interface em jogo (escala a partir de 115%, com texto no padrão) passa a texto "Maior". A qualidade antiga gravada é ignorada: vale a automática. O registro de jogo (save versão 3) não muda.

## Testes

`tests/unit/imagem-e-ajustes.test.ts` confere a imagem única, a migração das preferências antigas e a descida de qualidade. `npm run e2e:controles` navega pelos Ajustes com o teclado (Tab, Shift+Tab, setas no Brilho e no Tamanho do texto) e confere que o brilho chega ao passe de cor do render.
