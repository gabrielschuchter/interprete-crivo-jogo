# Pedidos do Gabriel e estado de cada um (13/11/2026)

Levantamento feito sobre o chat do projeto e as mensagens do Gabriel dentro de cada thread, de 11/11 a 13/11/2026, conferido contra o código e o `git log` da `main`. Quando um pedido novo substitui um antigo, vale o novo, e o antigo aparece como substituído. "Feito" quer dizer que o código está na `main` e passou nos testes automáticos; nenhum item foi conferido em placa de vídeo real nem jogado à mão por esta auditoria.

## Pedidos substituídos

- 12/11, "low-poly é 100% proibido, quero ultrarrealismo" e "mega refino do procedural": substituídos em 12/11 às 20:49 pela direção PS2 dark fantasy gótica. Seguem válidos dele: proporção humana correta, combate fluido, nada de low-poly genérico.
- 12/11, Render People como NPC: descartado (pessoa real escaneada, regra do projeto e nova direção).
- 12/11, interface e render PS2 só com `?arte=ps2`: substituído em 13/11 pelo pedido de ter tudo no ar por padrão (PRs #9 e #11).

## Lista de pedidos

1. Desenvolver o jogo completo a partir do documento-matriz e do atlas (11/11). Feito parcial: campanha com quatro regiões, dois chefes, caso de Lia e epílogo (PR #1). Abertos: conferência linha a linha das 39 superfícies P0 do atlas e cooperativo (só a arquitetura está separada).
2. E abre a pausa em vez de interagir (11/11). Feito, PR #1.
3. Trocar Átrio por Pátio (11/11). Feito, PR #1 ("Pátio dos Caminhos").
4. Suporte do quadro de casos fora do lugar (11/11). Feito, PR #1.
5. Mapa que não se move (11/11). Feito, PR #1 (arrastar, aproximar, centralizar).
6. Universo PBE mais presente: grandes nomes como lendas, itens e NPCs ligados à PBE (11/11). Feito: bustos e verbetes dos mestres (PR #1), equipamentos com efeitos de PBE (PR #7), 12 moradores com ofício e falas (PR #14).
7. Roupas incoerentes na criação de personagem e chão com falhas nas transições (11/11). Feito, PRs #1 e #7.
8. Jogar e testar todas as interações, botões e rotas (11/11 e 12/11). Feito: bateria `npm run e2e:controles` (PR #1).
9. Não consigo passar da ponte, marco e estandarte (12/11). Feito, PR #1. O marco voltou a travar em 13/11: corrigido no PR #19; uma segunda causa (Interagir durante um golpe) está no PR da thread principal.
10. Versão para celular, controles sem erro de aceleração, responsividade total (12/11). Feito, PR #1 (`npm run e2e:touch`, oito tamanhos de tela). Aberto: teste em aparelho real.
11. Inventariar assets abertos, achar links, converter tudo sem passo manual e usar ao máximo o que foi enviado, sem comprar nada (12/11). Feito, PR #2 (40 props, HDRI, materiais, trilhas, ambiências, MakeHuman, captura CMU). Aberto e só do Gabriel: licença dos 10 sons do Freesound e crédito exato das 5 trilhas.
12. Responder à auditoria externa de 176 registros (12/11). Feito parcial, PR #3 (68 corrigidos, 18 parciais, 5 intencionais). O que restou está em `PENDENCIAS.md`; quatro itens foram fechados nesta auditoria (ver item 31).
13. Mesclar e pôr em produção, criar a Vercel (12/11). Feito: projeto `interprete-crivo-jogo` na Vercel com deploy automático a cada push na `main`.
14. Instalar as skills de gamedev (12/11). Feito, PR #4.
15. Pulo e mini parkour para entrar na grade com baú no Bosque, com gazua (12/11). Feito, PR #7.
16. Poder sair de toda interação, inclusive no fim; ficar preso ao examinar o mecanismo (12/11). Feito, PR #7 (Esc, B ou Sair) e PR #19 (sair da narração não prende mais a missão).
17. Performance e carregamento de mais de 10 s (12/11). Feito parcial, PR #7: texturas de cenário de 35 para 15 MB e shaders compilados na tela de carga. Aberto: medir numa placa de vídeo real; o log `[carga]` no console traz os tempos.
18. Personagens menos esquisitos: proporções, mãos, joelho, tornozelo, poses (12/11). Feito: elenco PS2 (PRs #5 e #14), expressões (#16) e movimento (#20).
19. Trocar o cajado por espada, tocha sempre na esquerda e arma de uma mão na direita (12/11). Feito, PR #7.
20. Armas e armaduras com variações, raridades, atributos e efeitos de PBE, como drop de inimigo e oferta de pessoas, com impacto visual (12/11). Feito, PR #7 (queda no chão e coleta, loja e baús).
21. Cintilação de camadas entre portal e chão, janelas, pilar e banners no portão do Observatório (12/11). Feito, PR #7. A cintilação sob a esfera armilar da fonte do Pátio foi corrigida nesta auditoria (os espelhos d'água estavam no mesmo plano da pedra).
22. Barulho de chuva em interior (12/11). Feito, PR #7.
23. Mãos dos inimigos para dentro e golpes que se atravessam (12/11). Feito: corpos novos (PR #14) e golpes com contato no quadro do dano (PR #20).
24. Descanso e impulso com animação de agachar (12/11). Feito: a esquiva usa o arranque em corrida, e o descanso não agacha mais o protagonista.
25. Câmera deslocada para a direita e câmera virada para trás ao voltar ao Pátio (12/11). Feito: câmera centrada no personagem e entradas do Pátio voltadas para dentro.
26. Pedra no meio da ponte e atravessar para as pedras com o impulso (12/11). Feito, PR #7 (vazio sob a ponte).
27. Coisas à distância e prédios em volta do Pátio (12/11). Feito: cidade em silhueta em dois anéis no Pátio e no Observatório, torres e prédios na bruma.
28. Homem e mulher na criação de personagem (12/11) e tons de pele diferentes (13/11). Feito, PR #5 (oito protagonistas) e PR #18 (cinco tons de pele próprios).
29. Sensibilidade da câmera em tela cheia e Esc tirando a tela cheia (12/11). Feito, PR #7 (filtro de picos e keyboard lock).
30. Indicar pontos pendentes do jogador e do Crivo; Lanterna da Transparência visível quando equipada; morte melhor com coisas caindo no chão (12/11). Feito, PR #7.
31. Auditoria super crítica com as skills, sem sair implementando, para tornar concreto o que existe, principalmente combate (12/11). Feito parcial: a auditoria externa (PR #3) e a bateria de controles cobriram bugs e lógica. Esta revisão fechou quatro itens de design que ninguém tinha pegado: trocar de alvo com a mira travada, sensibilidade vertical própria, distância da câmera e tamanho da interface em jogo.
32. Combate mais fluido, com contato, mais combates e variações (12/11). Feito: Focos Residuais e seis inimigos novos com mini-chefes em duas fases (PRs #7 e #14), antecipação, golpe e recuperação legíveis (PR #20).
33. Final curto demais (12/11). Feito parcial, PR #7: a tela depois do Veredito diz o que vem e a missão Focos Residuais acrescenta três combates. Ampliar a campanha com regiões ou casos novos segue como pergunta aberta ao Gabriel.
34. Mureta e vazio atrás da porta do Observatório (12/11). Feito, PR #7.
35. Refazer personagens, NPCs e mobs (12/11), agora no estilo PS2. Feito, PRs #5 e #14. Parcial: os sete NPCs da história ainda saem do `ps2_cast.py`, não da forja nova.
36. Direção de arte PS2 com dark academia, design system completo, tipografia, interface, som (12/11). Feito, PRs #6, #8 a #13, #15 e #17. Fontes e lua de olho único aprovadas em 13/11.
37. Fazer tudo o que falta da direção de arte (13/11). Feito parcial: molduras e glifos no códice, missões e loja (PR #15). Glifos no mapa, retratos de busto no diálogo e a pista sobre a lua estão no PR da thread principal, ainda não mesclado no momento deste relatório.
38. Pipeline 3D de 23 personagens jogáveis, gratuito e local (13/11). Feito, PR #14.
39. Expressões, máscara da detetive, golpe de martelo e gancho, Matriarca pairando (13/11). Feito, PRs #16 e #20.
40. Revisão completa de animações, gestos, poses e de como tudo se move (13/11). Feito, PR #20. A thread de animação ainda grava capturas de conferência.
41. Mão que não segura o item (13/11). Feito, PR #20.
42. Finalizar tudo o que estiver ocioso e deixar tudo na main e no ar (13/11). Esta auditoria.

## O que só o Gabriel resolve

Licença dos 10 sons do Freesound e crédito das 5 trilhas (tabela em `REGISTRO_DE_ASSETS.md`). As quatro perguntas do fim de `PENDENCIAS.md` (nomes, casos reais ou fictícios, contas do Interprete, ampliar ou aprofundar). Jogar a campanha numa placa de vídeo real, com som, e num celular.
