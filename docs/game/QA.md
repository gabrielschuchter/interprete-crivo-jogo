# Verificação

## Automatizada

`npm run test` roda 35 testes unitários sobre progressão, missões, inventário, registro, coerência do conteúdo (toda missão aponta para regiões e alvos que existem, todo item citado está definido) e a pontuação do caso simulado.

`npm run e2e` joga a campanha em Chromium e confere 29 pontos: abertura e criação de personagem; conversa com Heloísa e Íris; lutas da trilha e da clareira; baú do selo; mecanismo errado devolvendo o selo; ponte estendida; marco aceso; conclusão da ponte e da encomenda; caso de Lia decidido, registrado e sem experiência em dobro ao refazer; missão do vento; compra com desconto; lupa ensinada; fichas ocultas sem lupa e reveladas com ela; alavanca errada e alavanca certa; Eco; lanterna; conclusão do Arquivo; progresso preservado ao recarregar a página; braseiro gastando o único frasco; Veredito vencido; tela final; páginas entregues; nenhum erro de execução registrado. Estado em 11/11/2026: 29 de 29.

O teste teleporta o jogador entre pontos de interesse e usa um jogador automático nas lutas. Ele prova que a lógica da campanha fecha. Não prova que os caminhos a pé estão desobstruídos nem que o ritmo é bom.

## Manual, feita por capturas de tela

Todas as telas de interface e as quatro regiões foram inspecionadas em capturas a 1280×720, e os defeitos encontrados foram corrigidos (cliques interceptados pelo canvas, sobreposição de faixas, enquadramentos de câmera, rastros de tinta apagados, Crivo cobrindo a tela perto de paredes). Amostras em `docs/game/capturas/`.

## Não verificado

Ninguém jogou a campanha do começo ao fim com as mãos, em tempo real. Não houve teste em placa de vídeo real, em Firefox ou Safari, em tela de toque nem com gamepad físico (o mapeamento existe e não foi exercitado). O áudio não foi ouvido, só conferido por execução sem erro. Dificuldade e duração são estimativas: o jogador automático vence o Veredito na dificuldade Padrão, às vezes na segunda tentativa.

## Roteiro para a primeira sessão humana

Jogar a chegada e o Bosque sem pressa, anotando onde o caminho não fica claro. Errar de propósito o mecanismo, a alavanca e o braseiro para sentir as consequências. Fazer o caso de Lia duas vezes com decisões diferentes. Enfrentar o Eco e o Veredito em Padrão. Fechar o navegador no meio do Arquivo e continuar. Conferir taxa de quadros nos três níveis de qualidade.

## Auditoria de controles (12/11/2026)

Teste funcional com cliques e teclas reais em Chromium headless (SwiftShader): 59 verificações de interface (atalhos Tab, L, M, P, I e Esc; equipar, guardar e usar itens; aprender habilidades do jogador e do Crivo; acompanhar missão; códice; zoom, arraste e roda do mapa; 15 ajustes e remapeamento com restauração; loja; derrota; pausa, título e continuar) e 15 verificações de ação (câmera pelo teclado, item rápido, esquiva, Pulso e Lupa, dica, descanso, queda, viagem, golpe). Todas passam, sem erro de página nem do jogo.

Correções feitas na rodada: Configurações abertas pela pausa voltam para a pausa; F escolhe o limão de Lind quando o caldo não serve; Z e C giram a câmera quando o mouse não está capturado. Limite: não há teste em GPU real, com som, nem com gamepad físico; sensação de combate e desempenho continuam dependendo de jogo humano.

## Toque e telas pequenas (12/11/2026)

Bateria com toque real emulado (Chromium, CDP): joystick parcial e corrida com histerese, olhar com o segundo dedo enquanto anda, nove botões de ação, conversa avançada só por toque, caderno com todas as abas, equipar, usar, aprender habilidade, mapa (botões e arrasto), configurações, loja, pausa, derrota. Layout sem sobreposição de botões e do HUD conferido em 320x568, 360x640, 390x844, 667x375, 844x390, 932x430, 768x1024 e 1024x768. Limite: sem aparelho físico, sem háptica, sem medida de bateria nem de fluidez em GPU móvel; a sensação do joystick precisa de mão humana.

## Teclado, controle e registro (12/11/2026, resposta à auditoria externa)

`npm run e2e:controles` confere 39 pontos com teclas reais e um controle simulado (troca de `navigator.getGamepads`): controle desde a tela de abertura, direcional e botões A e B nos menus, volta ao teclado, Tab e Shift+Tab dentro de Configurações sem abrir o Inventário, setas em barra e em seletor, valor da barra em texto, remapeamento com conflito, com botão do mouse, com Esc e com botão do controle, restauração dos padrões, reconexão com botão apertado, zona morta, analógico direito, falha de gravação avisada, cópia exportada, registro truncado recuperado, importação válida e inválida, e o dossiê de Lia (decisão compartilhada, risco de base, fontes, persistência, confirmação, horizonte). Estado: 39 de 39, com campanha (`npm run e2e`) e toque (`npm run e2e:touch`) também sem falhas depois das mudanças.

Limite: o controle é simulado. Nenhum controle físico foi ligado, nenhum leitor de tela foi usado, e o áudio continua sem escuta.
