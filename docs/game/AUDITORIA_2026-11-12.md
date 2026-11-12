# Resposta à auditoria crítica de 12/11/2026

A auditoria listou 176 registros sobre a `main` no commit `2b7a337`. Este arquivo diz o que foi feito com cada um. Contagem: 68 corrigidos, 18 parciais, 5 mantidos com explicação, 85 pendentes. O que está pendente aparece agrupado em `PENDENCIAS.md`.

Como ler. "Corrigido" quer dizer que o código ou o documento mudou e que a mudança passa nos testes automatizados; onde havia como, o defeito foi reproduzido antes. Não quer dizer validado por gente: nenhuma correção desta rodada foi vista em placa de vídeo real, ouvida, tocada num celular ou usada com controle físico ou leitor de tela. "Parcial" traz na nota o que faltou. "Mantido" é comportamento intencional, agora explicado. Nenhum item foi classificado como "não reproduzido" e fechado: as hipóteses que não puderam ser testadas neste ambiente ficaram como pendentes.

Verificação desta rodada: 35 testes unitários, campanha completa (`npm run e2e`), toque em quatro tamanhos (`npm run e2e:touch`) e 39 verificações novas de teclado, controle simulado, registro e dossiê (`npm run e2e:controles`), todos sem falha em Chromium com WebGL por software.

| Nº | Estado | Nota |
| --- | --- | --- |
| 1 | Corrigido | Com painel aberto, Tab é do navegador e não dispara atalho. Reproduzido antes e conferido depois em `e2e:controles`. |
| 2 | Corrigido | Causa provável: o losango 3D sobre o NPC, com cor acima de 1 e bloom, passava a centímetros da câmera. Agora encolhe e some a menos de 1,2 m e brilha menos. O enquadramento exato do relato não foi reproduzido. |
| 3 | Parcial | Luz do cajado de 9 para 5,5 e esfera do cajado menor e menos saturada. Conferido só em captura por software; falta GPU real e outros tons de pele. |
| 4 | Parcial | Emissão do olho de 0,16 para 0,05 e branco menos puro. Sem validação em GPU real. |
| 5 | Parcial | Topo mais escuro e sem reflexo de ambiente. A malha continua um disco; refazer é trabalho de arte. |
| 6 | Pendente | Enquadramento de conversa pede direção de câmera aprovada. |
| 7 | Corrigido | Anúncio de missão espera a caixa de conversa fechar. |
| 8 | Parcial | Comprimento e opacidade variam por gota, e as distantes somem antes. Mesmo número de segmentos, custo igual. |
| 9 | Pendente | Arte. |
| 10 | Pendente | Arte: depende de novos modelos de roupa. |
| 11 | Corrigido | Mesmo conserto do item 1; Shift+Tab testado. |
| 12 | Corrigido | Setas e espaço só são cancelados com o jogo em primeiro plano; seletor e barra respondem. Reproduzido no seletor de qualidade. |
| 13 | Corrigido | Aviso na hora, aviso persistente na pausa, botão para baixar o registro, importação no menu. |
| 14 | Parcial | Cópia exportável e cópia automática da gravação anterior. Perfis múltiplos ficam para decisão de produto. |
| 15 | Corrigido | Sair, ocultar a aba e `pagehide` gravam a posição quando ela é segura. |
| 16 | Parcial | A abertura carrega só os props do Pátio; o resto desce em segundo plano. Personagens ainda vêm todos. Sem medição em rede lenta. |
| 17 | Corrigido | Falha de GLB é registrada, aparece em Configurações e não fica em cache: há nova tentativa. |
| 18 | Corrigido | Estado do controle zerado ao desconectar, reconectar ou trocar; botão já apertado não dispara. Testado com controle simulado. |
| 19 | Corrigido | Teclado e mouse desfazem a indicação de controle. |
| 20 | Corrigido | Analógico direito conta. |
| 21 | Corrigido | Conflito troca as duas ações e avisa; Esc cancela. |
| 22 | Corrigido | Botões do mouse e botões do controle podem ser escolhidos. |
| 23 | Parcial | Zona morta ajustável (radial, com reescala) e botões remapeáveis. Sem calibração por eixo nem mapa para controles fora do padrão. |
| 24 | Mantido | Regra tolerante de propósito (último fôlego). Agora está no comentário do código e numa dica de carregamento. |
| 25 | Mantido | Idem. |
| 26 | Corrigido | A tela recebe a perda real de vida. |
| 27 | Corrigido | O clique que captura o ponteiro não vira golpe. Se a captura é recusada, os cliques voltam a valer. |
| 28 | Parcial | Pausa, caderno, loja e dossiê redesenham a 15 quadros por segundo. Sem medição de bateria. |
| 29 | Corrigido | Materiais do projétil são descartados ao sair de cena. |
| 30 | Pendente | Precisa de perfil de memória antes de descartar recursos que podem ser compartilhados. |
| 31 | Mantido | O limite de 0,05 s evita atravessar paredes em quadros longos. Timestep fixo fica para depois de medir em aparelho lento. |
| 32 | Corrigido | Texto da derrota e da pausa dizem o que o jogo faz. |
| 33 | Corrigido | Interpolação por tempo. |
| 34 | Corrigido | Comentário corrigido; a lógica é a pretendida. |
| 35 | Corrigido | Escolha por direção da câmera e sem parede alta no meio; distância desempata. |
| 36 | Pendente | Sugestão de design. |
| 37 | Corrigido | Som e aviso quando a mira se solta por distância. |
| 38 | Corrigido | O botão aceso é guardado por dedo. |
| 39 | Corrigido | Soltar tudo apaga os botões. |
| 40 | Corrigido | Contador e rótulo mostram o item que será usado. |
| 41 | Corrigido | Rótulos ligados por for/id, aqui e em todas as Configurações. |
| 42 | Parcial | Avisos, dicas e um canal assertivo são regiões vivas. Não testado com leitor de tela. |
| 43 | Parcial | Medidores com valor e anúncio de vida baixa. Consulta sob demanda não feita. |
| 44 | Corrigido | Toda barra mostra o valor com unidade. |
| 45 | Pendente | Precisa de perfil. |
| 46 | Pendente | Inspeção material a material, por GLB. |
| 47 | Corrigido | Clipe ausente é registrado no Diagnóstico. |
| 48 | Corrigido | Catálogo reconciliado com o registro. |
| 49 | Pendente | Depende de clipe próprio; o Diagnóstico acusa se cair no golpe leve. |
| 50 | Corrigido | Conta só jogo e conversa. |
| 51 | Corrigido | Menus pelo controle desde a abertura: direcional ou analógico, A e B. Testado com controle simulado. |
| 52 | Corrigido | Opção "Correr sem levar o dedo à borda". |
| 53 | Mantido | Regra de design; revisar a sinalização nos precipícios fica pendente. |
| 54 | Parcial | Aviso no rótulo. Sem medição. |
| 55 | Pendente |  |
| 56 | Pendente | Sem atravessamento reproduzido; teste dirigido pendente. |
| 57 | Corrigido | `sanitizeSettings` valida tipo e faixa; teste unitário. |
| 58 | Corrigido | `migrate` valida números, posição, inventário e missões; registro ilegível é posto de lado e a cópia anterior assume; teste unitário e de navegador. |
| 59 | Corrigido | "Reduzir movimento" segue o sistema até a pessoa escolher. |
| 60 | Pendente |  |
| 61 | Corrigido | Número opcional e medidor com nome e valor. |
| 62 | Corrigido | Idem. |
| 63 | Corrigido | Texto "faltam N" opcional e valor acessível. |
| 64 | Corrigido | Medidor com nome e valor. |
| 65 | Corrigido | Instrução conforme a entrada ativa. |
| 66 | Corrigido | Duração ajustável (0,5 a 4 vezes) e histórico no Diário. |
| 67 | Corrigido |  |
| 68 | Corrigido | Tons e cores nomeados. |
| 69 | Corrigido | Telas com papel de diálogo e nome. |
| 70 | Corrigido | Foco preservado ao refazer o dossiê. |
| 71 | Corrigido | Rolagem preservada. |
| 72 | Pendente |  |
| 73 | Pendente |  |
| 74 | Corrigido | Mesmo ajuste do item 66. |
| 75 | Pendente |  |
| 76 | Corrigido | O ajuste de tamanho dos botões aparece sempre. |
| 77 | Pendente |  |
| 78 | Parcial | Marcador e mira têm rótulo; direção não é descrita. |
| 79 | Parcial | Novo tamanho 1,6, com Configurações em uma coluna. Outras telas não foram conferidas nesse tamanho. |
| 80 | Corrigido | Desfecho no horizonte dos estudos, 8 semanas; o retorno em 4 é descrito como conversa intermediária. |
| 81 | Corrigido | Risco de base de 6 em 100, 15 com tintura; o sorteio usa o total e a tela mostra os dois e a diferença. |
| 82 | Parcial | O sorteio passa por uma faixa de incerteza antes do desfecho, e isso é explicado ao jogador. A faixa simétrica é simplificação; pede revisão independente. |
| 83 | Corrigido | Figuras e frases saem das opções do caso. |
| 84 | Corrigido | "Nenhuma sonolência a mais registrada", com a ressalva nas fontes e em "o que não se sabe". |
| 85 | Corrigido | Notas de cada fonte na tela. |
| 86 | Parcial | Só é creditada depois de ouvir preferências e mostrar benefício ou dano; antes disso Lia devolve a pergunta. Continua sendo um passo, não uma conversa. |
| 87 | Pendente | Critério de pontuação pede revisão pedagógica. |
| 88 | Corrigido | A devolutiva diz que o plano de piora não foi combinado. |
| 89 | Corrigido | A devolutiva diz que a resposta dela ficou condicionada à ponte. |
| 90 | Corrigido | Passos guardados no navegador até a decisão. Reproduzido antes (perdia na recarga) e conferido depois. |
| 91 | Corrigido | Opção sem o passo que a sustenta pede segundo acionamento. |
| 92 | Pendente | Revisão clínica e pedagógica independente. |
| 93 | Parcial | Primeira conferência sem fonte primária: duas correções (Nightingale, Hill). Conferência independente pendente. |
| 94 | Corrigido | Referência por verbete, em "Onde conferir". O verbete do Cochrane Brasil ficou sem, por falta de referência confirmada. |
| 95 | Corrigido | Acertar sem as três fichas é permitido e fica dito e registrado como palpite. |
| 96 | Corrigido | Dicas ficam no Diário. |
| 97 | Pendente |  |
| 98 | Pendente | Especificação agora descreve o comportamento; mudar é decisão de design. |
| 99 | Pendente |  |
| 100 | Pendente |  |
| 101 | Pendente |  |
| 102 | Pendente | Decisão de produto. |
| 103 | Pendente |  |
| 104 | Corrigido | Pendências reescritas. |
| 105 | Corrigido | Três mecanismos, como no jogo. |
| 106 | Corrigido | Relação entre os registros explicitada. |
| 107 | Corrigido | Fluxo real descrito. |
| 108 | Pendente |  |
| 109 | Pendente |  |
| 110 | Pendente |  |
| 111 | Pendente |  |
| 112 | Pendente | Confirmado no pipeline; exige reexportar os doze personagens. |
| 113 | Pendente | Idem. |
| 114 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 115 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 116 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 117 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 118 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 119 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 120 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 121 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 122 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 123 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 124 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 125 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 126 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 127 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 128 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 129 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 130 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 131 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 132 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 133 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 134 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 135 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 136 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 137 | Pendente | A HDRI está no repositório e não é carregada pelo jogo. Integrar ou remover é decisão de arte. |
| 138 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 139 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 140 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 141 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 142 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 143 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 144 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 145 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 146 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 147 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 148 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 149 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 150 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 151 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 152 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 153 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 154 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 155 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 156 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 157 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 158 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 159 | Pendente | Arte ou animação; depende de referência aprovada e de inspeção em GPU real. |
| 160 | Corrigido | Reprodução recusada entra em fila e toca no gesto seguinte; a trilha gravada só substitui a generativa quando de fato toca. |
| 161 | Pendente | Depende de escuta. |
| 162 | Pendente | Depende de escuta. |
| 163 | Pendente | Depende de escuta. |
| 164 | Pendente | Depende de escuta. |
| 165 | Pendente | Depende de escuta. |
| 166 | Pendente | Depende de escuta. |
| 167 | Pendente | Depende de escuta. |
| 168 | Mantido | O efeito sintetizado cobre os primeiros instantes, por desenho. |
| 169 | Corrigido | Falha de download ou de decodificação vai para o Diagnóstico. |
| 170 | Pendente | Depende de escuta. |
| 171 | Pendente | Não foi possível ler nenhuma das dez páginas (rede bloqueada). Tabela pronta no registro; Gabriel decidiu manter os arquivos no ar enquanto confere. |
| 172 | Parcial | A página de licenças do site confirma CC com crédito; versão e crédito por faixa não confirmados. |
| 173 | Corrigido | Créditos com títulos, autor, licença, endereço e alterações; sons listados por número e autor, com a ressalva da licença. |
| 174 | Corrigido | Peça ou modelo ausente vai para o Diagnóstico. |
| 175 | Corrigido | Caminho por parâmetro, variável de ambiente ou pasta local. |
| 176 | Parcial | Hash por arquivo publicado (`assets-sha256.txt`). URL, versão e data por item não registradas. |
