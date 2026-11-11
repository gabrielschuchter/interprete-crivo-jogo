# Interprete RPG

RPG de ação em terceira pessoa, 3D, que roda no navegador. O jogador chega à Academia do Limiar com o Crivo, um companheiro de pelúcia e olho único, e atravessa quatro regiões (Átrio, Bosque do Viés, Arquivo das Vozes e Observatório) enquanto uma névoa de certezas apressadas avança sobre a vila. A prática baseada em evidências aparece como linguagem do mundo: mecanismos que perguntam para quem a ponte foi feita, registros que se copiam, um dossiê de decisão compartilhada. Não há quiz.

A campanha atual tem uma missão de chegada, três missões principais, quatro paralelas, dois chefes, um caso simulado e um epílogo com o Átrio ao amanhecer. Dura de 40 a 60 minutos numa primeira partida.

## Rodar

```
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # typecheck + pacote em dist/
npm run test       # 27 testes unitários (domínio, conteúdo, caso simulado)
npm run e2e        # campanha inteira em Chromium; exige npm run dev em outro terminal
```

`npm run e2e` usa o Playwright instalado na máquina. O parâmetro `?teste` na URL resolve diálogos sem espera e dispensa a captura do ponteiro; serve só para automação.

## Controles

WASD move, o mouse gira a câmera, Shift corre, Espaço esquiva, E interage, botão esquerdo ou J dá o golpe leve, botão direito ou K o golpe firme, Q aciona a habilidade ativa do Crivo, R troca a habilidade, F toma o caldo, H pede uma dica ao Crivo, T trava a mira, Tab abre o caderno (inventário, habilidades, mapa, diário, códice, ajustes; L, M e P abrem direto em diário, mapa e habilidades) e Esc pausa. Todas as teclas podem ser remapeadas em Ajustes. Gamepad padrão é reconhecido.

## Organização

`src/core` tem motor, entrada, áudio e ajustes. `src/world` constrói as regiões com geometria e texturas geradas em código. `src/entities` tem jogador, Crivo, inimigos e NPCs. `src/domain` guarda o estado puro e serializável, sem dependência de Three.js, que é a parte pronta para um servidor de cooperativo. `src/content/data.ts` reúne itens, missões, códice e habilidades. `src/story.ts` contém os diálogos e a lógica das missões, e `src/game.ts` orquestra tudo. `src/ui` é DOM e CSS sobre os tokens de `design/`.

A documentação de decisões, o registro de assets, a lista de verificação e as pendências ficam em `docs/game/`. As regras do design system estão em `DESIGN.md` e devem ser lidas antes de qualquer mudança de interface.
