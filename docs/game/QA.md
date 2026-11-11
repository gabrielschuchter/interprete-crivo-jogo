# Verificação

## Automatizada

`npm run test` roda 27 testes unitários sobre progressão, missões, inventário, registro, coerência do conteúdo (toda missão aponta para regiões e alvos que existem, todo item citado está definido) e a pontuação do caso simulado.

`npm run e2e` joga a campanha em Chromium e confere 24 pontos: abertura e criação de personagem; conversa com Heloísa e Íris; lutas da trilha e da clareira; baú do selo; mecanismo errado devolvendo o selo; ponte estendida; marco aceso; conclusão da ponte e da encomenda; caso de Lia decidido, registrado e sem experiência em dobro ao refazer; missão do vento; compra com desconto; lupa ensinada; fichas ocultas sem lupa e reveladas com ela; alavanca errada e alavanca certa; Eco; lanterna; conclusão do Arquivo; progresso preservado ao recarregar a página; braseiro gastando o único frasco; Veredito vencido; tela final; páginas entregues; nenhum erro de execução registrado. Estado em 11/11/2026: 24 de 24.

O teste teleporta o jogador entre pontos de interesse e usa um jogador automático nas lutas. Ele prova que a lógica da campanha fecha. Não prova que os caminhos a pé estão desobstruídos nem que o ritmo é bom.

## Manual, feita por capturas de tela

Todas as telas de interface e as quatro regiões foram inspecionadas em capturas a 1280×720, e os defeitos encontrados foram corrigidos (cliques interceptados pelo canvas, sobreposição de faixas, enquadramentos de câmera, rastros de tinta apagados, Crivo cobrindo a tela perto de paredes). Amostras em `docs/game/capturas/`.

## Não verificado

Ninguém jogou a campanha do começo ao fim com as mãos, em tempo real. Não houve teste em placa de vídeo real, em Firefox ou Safari, em tela de toque nem com gamepad físico (o mapeamento existe e não foi exercitado). O áudio não foi ouvido, só conferido por execução sem erro. Dificuldade e duração são estimativas: o jogador automático vence o Veredito na dificuldade Padrão, às vezes na segunda tentativa.

## Roteiro para a primeira sessão humana

Jogar a chegada e o Bosque sem pressa, anotando onde o caminho não fica claro. Errar de propósito o mecanismo, a alavanca e o braseiro para sentir as consequências. Fazer o caso de Lia duas vezes com decisões diferentes. Enfrentar o Eco e o Veredito em Padrão. Fechar o navegador no meio do Arquivo e continuar. Conferir taxa de quadros nos três níveis de qualidade.
