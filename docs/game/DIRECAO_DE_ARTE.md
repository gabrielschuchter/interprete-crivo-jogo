# Direção de arte

Decisão do Gabriel em 12/11/2026: dark fantasy gótica de PS2 (2003 a 2006) com dark academia, direção "Luz de estudo". Substitui a regra anterior ("low-poly proibido, tudo ultrarrealista"). O documento completo, com referências, tokens, interface, som e predefinições, é `docs/game/DIRECAO_DE_ARTE_PS2.md`. Este arquivo só registra o que já está no motor.

Desde 13/11/2026 a imagem é uma só, a PS2 tardia (`src/core/ps2.ts`, `render.imagem` de `design/ps2/ps2.tokens.json`): 576, 512 ou 448 linhas internas conforme a qualidade automática, névoa linear com camada rasteira, vértices presos a uma grade de um quarto de pixel, texturas trilineares com anisotropia e filtro linear sem mapa de normal, anti-serrilhado leve por luma e cor quantizada com dither ordenado. O `GradeShader` não quantiza de novo e aplica o Brilho dos Ajustes como gama. As predefinições de estudo, a Era PS2 crua, a Limpa e o `?arte=` saíram do jogo (ver `docs/game/AJUSTES.md`).

As regiões recebem a pele de época de `src/world/ps2skin.ts`: pisos e paredes trocam para as texturas indexadas de 128 px de `public/textures/ps2/` (ardósia no Pátio e no Observatório, musgo no Bosque, madeira no Arquivo). Personagens, NPCs e espectros mantêm os ossos `RightHand` e `LeftHand` (arma na direita, tocha na esquerda).
