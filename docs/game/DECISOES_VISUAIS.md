# Decisões visuais

A direção é Dark Academia gótica com luz de fim de tarde: pedra fria e céu azul-meia-noite contra janelas e lanternas em âmbar, com o carmesim da marca guardado para perigo e ação principal. Onde o atlas visual e o documento-matriz divergiam, valeu o atlas, por ser a diretriz mais recente; os requisitos funcionais do documento-matriz foram mantidos. A paleta de mundo está registrada em `DESIGN.md`, na seção "Extensão de jogo".

Cada região tem uma assinatura de luz que acompanha a história. O Pátio começa ao entardecer e termina ao amanhecer, depois do Veredito. O Bosque é esmeralda e névoa baixa. O Arquivo é interior, com luz de vela e rastros de tinta que só a lupa do Crivo revela. O Observatório é noite aberta, e a névoa engrossa de forma visível se o jogador gastou o óleo no braseiro errado.

O Crivo é uma esfera de pelo escuro com um olho só, que muda de tamanho e direção conforme o que observa. Foi a peça que mais recebeu ajuste, por ser o rosto do jogo. A interface sobre a cena é plana: painéis de carvão, fio dourado de 1px, serifa em títulos e falas. O dossiê do caso simulado é a única tela que abandona a cena e mostra papel sobre mesa.

## Situação frente ao atlas

O atlas lista 398 superfícies e marca 39 como P0. Estão implementadas as que sustentam a campanha: abertura, menu, criação de personagem, interface de jogo, diálogo com escolhas, inventário e equipamento, habilidades, mapa, diário, códice, ajustes com remapeamento, loja, dossiê de caso, pausa, derrota e tela final. Não foi feita uma conferência linha a linha das 39 P0 contra o que existe; essa conferência é pendência, e até lá não se deve afirmar cobertura completa do P0. Ficaram de fora, de forma deliberada, as superfícies de cooperativo, conta, loja com dinheiro real e as regiões além das quatro.

## Limites conhecidos

As figuras humanas são estilizadas e leem escuras quando vistas de costas contra o chão do Pátio. O topo do Crivo estoura um pouco sob luz forte. As capturas em `docs/game/capturas/` saíram de renderização por software, com sombras e pós-processamento reduzidos; numa placa de vídeo real o resultado é melhor do que elas mostram, mas isso ainda não foi verificado.

## Refino de personagens e criaturas (12/11/2026)

Humanos: toda pose passa por suavização exponencial, o que elimina saltos entre estados. Em repouso há troca de apoio, deriva do olhar, respiração no tronco e piscar; na caminhada o corpo balança o quadril e inclina nas curvas. Oito gestos novos (dar de ombros, pensar, assentir, acenar, apontar, comemorar, reverência, escuta) e uma fala em batidas, com boca e sobrancelhas animadas. NPCs cumprimentam uma vez ao se aproximar e gesticulam de tempos em tempos. Gestos sociais não bloqueiam a interação do jogador.

Criaturas: o cone de névoa deu lugar a um espectro articulado (capuz com vazio no rosto, costelas, braços de duas articulações, mão com quatro garras, manto rasgado e fitas), com pose própria por estado: antecipação com braços erguidos antes do golpe, avanço, recuperação curvada, conjuração com esfera, pancada no chão, recitação, atordoamento e colapso. O Eco ganhou máscaras orbitando; o Veredito, coroa de espinhos. A geometria continua procedural; o teto de realismo segue sendo o glTF externo (ver REGISTRO_DE_ASSETS).

## Personagens na direção PS2 (12/11/2026)

O Gabriel trocou a meta de ultrarrealismo por dark fantasy gótica de PS2 (2003 a 2006) com dark academia. Para personagens isso quer dizer proporção humana correta com pouca geometria: entre 4 e 8 mil triângulos, mãos em luva com polegar separado (o esqueleto cmu_mb tem um dedo e um polegar por mão), cabelo como casca sólida pintada em vez de mechas transparentes, roupa com a silhueta do traje original e textura pequena, granulada e levemente borrada, em cor de 15 bits. Os escaneamentos Render People que estavam na pasta de assets ficaram de fora: são realistas e retratam pessoas reais. Os espectros vestem túnica de mármore frio, como os encapuzados da referência, e a cor de cada um vem do tom do inimigo.
