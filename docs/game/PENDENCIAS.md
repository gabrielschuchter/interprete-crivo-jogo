# Pendências e perguntas em aberto

Atualizado em 12/11/2026, depois da auditoria externa de 176 registros. A resposta item a item está em `AUDITORIA_2026-11-12.md`; aqui fica só o que continua aberto, agrupado por quem pode fechar.

Estado de base, para não partir de premissa antiga: o jogo está publicado em https://interprete-crivo-jogo.vercel.app, com deploy automático a cada push na `main` (não foi conferido, nesta data, que o deploy corresponde ao último commit). Controles de toque existem (`src/ui/touch.ts`) e têm bateria própria. Cenário, personagens e áudio usam assets externos convertidos, com reserva procedural.

## Depende do Gabriel

Licença dos dez sons do Freesound. A rede do ambiente de desenvolvimento não alcança o site. A tabela de `REGISTRO_DE_ASSETS.md` tem o link de cada som e duas colunas em branco, licença e data. Decisão de 12/11/2026: os arquivos ficam publicados enquanto a conferência não é feita. Um som CC BY-NC precisa sair, e o jogo já cai no efeito sintetizado sem ele.

Crédito exato das cinco músicas. Abrir a página de cada faixa no incompetech.com, copiar o crédito que o site gera e anotar link e data no registro.

Referência visual aprovada. A meta ultrarrealista pede uma imagem de referência por assunto (personagem, Crivo, luz noturna do Pátio, interior do Arquivo, animação de conversa e de golpe) contra a qual cada mudança possa ser julgada. Sem ela, ajustes de luz e material são tentativa. Os itens 3 a 10 e 109 a 159 da auditoria dependem disso.

Perfis de registro. Hoje há um registro por navegador, com cópia exportável. Vários perfis no mesmo navegador é decisão de produto.

Nomes e universo, casos baseados em evidência real, contas do Interprete e próxima etapa (conteúdo novo ou aprofundamento): as quatro perguntas antigas continuam sem resposta e estão no fim deste arquivo.

## Depende de revisão independente

Caso de Lia. A versão 0.2.0 alinhou o horizonte (8 semanas), separou risco de base e risco acrescentado, passou a sortear o desfecho dentro de uma faixa de incerteza e mostra as notas de cada fonte. Isso foi feito por quem escreveu o jogo. Falta uma leitura por pessoa de fora, com formação em epidemiologia clínica ou educação em saúde, com três perguntas: a faixa simétrica em torno da estimativa é uma simplificação aceitável para o estudo sem sorteio, cujo viés provável é para cima? A pontuação por passos acionados (item 87) premia clicar em tudo? A decisão compartilhada, hoje condicionada a duas perguntas anteriores, ainda é rasa demais (item 86)?

Verbetes de mestres e obras. Houve uma primeira conferência sem fonte primária, com duas correções e referências acrescentadas. Falta conferir datas, títulos e atribuições contra as obras citadas e registrar quem conferiu e quando. O verbete do Centro Cochrane do Brasil ficou sem referência porque nenhuma foi confirmada.

## Depende de equipamento ou de gente

Campanha jogada à mão, do começo ao fim, em placa de vídeo real, com som. Nada substitui isso, e quase todas as hipóteses da auditoria sobre animação, luz e áudio (118 a 129, 132, 133, 136, 141 a 149, 151 a 157, 160 a 162, 168) só se resolvem olhando e ouvindo.

Controle físico. A lógica foi testada com controle simulado: primeiro uso, menus, remapeamento, reconexão, zona morta. Falta ligar um controle de verdade, de preferência dois modelos, e conferir o mapa de botões fora do padrão "standard".

Celulares e tablets reais: fluidez, bateria, háptica, sensação do analógico, pelagem do Crivo em GPU móvel (item 133).

Leitor de tela. As telas ganharam nome, os medidores ganharam valor, avisos e dicas são regiões vivas e a vida baixa é anunciada. Falta ouvir isso com NVDA ou VoiceOver.

Medições: tempo de abertura em rede lenta (item 16), memória de GPU ao longo de muitas trocas de região e de aparência (itens 30 e 45), custo da troca de qualidade (54), simulação abaixo de 20 quadros por segundo (31).

Firefox e Safari.

## Trabalho de arte e animação ainda não feito

Expressão facial: os doze personagens não têm morph targets, e o pipeline remove as shape keys (itens 112, 113, 124). Clipes próprios para pensar, assentir, comemorar, reverenciar e para o golpe firme (49, 114 a 117); hoje esses gestos reusam clipes vizinhos, e o painel de Diagnóstico lista os que caírem em reserva. Capa e laço do Crivo com volume (130, 131, 136), olho com córnea (134), posturas por humor (135). Enquadramento de câmera nas conversas (6). Piso do Pátio (9), roupa do protagonista (10), HDRI de interior e de crepúsculo, com a decisão sobre a HDRI que está no repositório e não é usada (137 a 139), vidro e transparência por asset (140, 141), sombra de contato na qualidade baixa (144), chuva sob coberturas e respingos (145, 146), geometria do observatório (153), névoa da ravina (154).

## Trabalho de design e acessibilidade ainda não feito

Trocar de alvo travado (36). Dificuldade por componente (72). Paleta para daltonismo e avisos de ataque que não dependam de cor (73, 77). Sensibilidade por eixo (75). Escala própria da HUD (60). Distância e ombro da câmera, colisão contínua de câmera (55, 56). Queda ao andar em borda (53). Consulta sob demanda do estado de combate para leitor de tela (43). Enigmas: calibragem da ponte, erro repetido, braseiro e névoa, explicações menos imediatas (97 a 101). Nó cooperativo visível na árvore (102). Mais opções na criação (103). Matriz das 39 superfícies P0 do atlas (108). Perfis de reverberação, mais superfícies de passo, som posicional, voz do Crivo (163 a 167, 170).

## Técnicas, sem bloqueio

Dividir o pacote de JavaScript. Caminhos a pé no Arquivo, onde o jogador automático prende em estantes. Cooperativo não está implementado; a arquitetura separa o que um servidor precisaria. O zip `Interprete_RPG_Documentacao_v0_1.zip` nunca chegou à biblioteca do projeto.

## Perguntas para o Gabriel

Os nomes (Academia, Heloísa, Íris, Anselmo, Dalva, Lia, Noêmia, Tomé, Fiapo, Vulto, Eco, Veredito) foram criados aqui. Algum deles conflita com o universo já imaginado para o Interprete?

O caso de Lia usa condição e números inventados para não ensinar clínica falsa como verdadeira. Os próximos casos devem seguir assim, ou há interesse em casos baseados em evidência real, revisados por você, com fonte citada na tela?

O registro fica só no navegador. Quando, e sob quais regras, o jogo deve conversar com as contas do Interprete?

A próxima etapa deve ampliar conteúdo (novas regiões e casos) ou aprofundar o que existe (modelos esculpidos, voz, trilha composta)?
