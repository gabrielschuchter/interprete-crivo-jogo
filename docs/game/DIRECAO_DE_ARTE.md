# Direção de arte

Decisão do Gabriel em 12/11/2026: dark fantasy gótica de PS2 (2003 a 2006) com dark academia. Substitui a regra anterior ("low-poly proibido, tudo ultrarrealista"). O documento completo, com referências, tokens, interface, som e predefinições, é `docs/game/DIRECAO_DE_ARTE_PS2.md`. Este arquivo só registra o que já está no motor.

No motor hoje: resolução interna de 540, 480 ou 400 linhas conforme a qualidade, ampliada com filtro bilinear; cor quantizada em 15 bits com Bayer 4x4 no `GradeShader` de `src/core/engine.ts`; sombras `PCFShadowMap` com mapa de 1024 ou 512; interiores escuros de propósito, com a tocha da mão esquerda como luz principal. Personagens, NPCs e espectros mantêm os ossos `RightHand` e `LeftHand` (arma na direita, tocha na esquerda).
