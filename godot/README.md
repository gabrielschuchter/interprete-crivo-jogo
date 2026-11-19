# Interprete · versão Godot

Cópia do modelo [2D Survivors Roguelike](https://github.com/SummerEngine/template-2d-vampire-survivor-roguelike) da Summer Engine (licença MIT, texto em `LICENSE`), vestida com a identidade do Interprete. A mecânica, os números, as cenas e os scripts são os do modelo; o que muda é a pele e a língua.

O que foi trocado: o menu principal é o do Interprete (fundo preto, brasão e três botões: Novo jogo, Continuar jogo e Configurações), o tema da interface segue `docs/DESIGN_SYSTEM.md` (ardósia, fio de ouro, cantos retos, Cinzel e Source Serif 4, em `resources/menu_theme.tres`, aplicado ao projeto inteiro), todo texto está em português, os sprites foram recoloridos para a paleta do Interprete por `tools/survivors/preparar-godot.py`, os chãos são as texturas PS2 do jogo, e os títulos e ícones com texto foram refeitos por `tools/survivors/gerar-godot-textos.mjs`. A lista de divergências está em `docs/game/SURVIVORS.md`.

Abrir: Godot 4.7, Importar, apontar para esta pasta. A cena principal é `scenes/main_menu.tscn`. O README original do modelo está em `README-modelo-original.md`.

A mesma cópia vive na pasta `Documents\interprete-jogo` do Gabriel. A versão que vai para produção (Vercel) é a web, em `src/jogo/`.
