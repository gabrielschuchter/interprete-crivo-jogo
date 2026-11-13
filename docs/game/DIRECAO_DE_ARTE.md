# Direção de arte

Decisão do Gabriel em 12/11/2026: dark fantasy gótica de PS2 (2003 a 2006) com dark academia, direção "Luz de estudo". Substitui a regra anterior ("low-poly proibido, tudo ultrarrealista"). O documento completo, com referências, tokens, interface, som e predefinições, é `docs/game/DIRECAO_DE_ARTE_PS2.md`. Este arquivo só registra o que já está no motor.

Desde 13/11/2026 a camada PS2 (`src/core/ps2.ts`, predefinição `ps2` de `design/ps2/ps2.tokens.json`) é o padrão: 448 linhas internas, névoa linear, vértices presos a uma grade de meio pixel, cor quantizada com dither ordenado e texturas com filtro linear sem mapa de normal. Ajustes, Imagem, Aparência oferece "Limpa", que desliga a camada (vale ao recarregar; a troca grava e recarrega). Com a camada ligada, o `GradeShader` não quantiza de novo. `?arte=a|b|c|off` continua servindo para comparar.

As regiões recebem a pele de época de `src/world/ps2skin.ts`: pisos e paredes trocam para as texturas indexadas de 128 px de `public/textures/ps2/` (ardósia no Pátio e no Observatório, musgo no Bosque, madeira no Arquivo). Personagens, NPCs e espectros mantêm os ossos `RightHand` e `LeftHand` (arma na direita, tocha na esquerda).
