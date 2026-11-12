# Registro de assets

Todo asset do jogo, com origem e licença. Um asset que não está aqui não entra no repositório.

| Asset | Onde | Origem | Licença |
| --- | --- | --- | --- |
| Texturas de pedra, madeira, pergaminho, tecido, metal, vitral, chão e céu | `src/world/textures.ts` | Geradas em canvas por código escrito para este projeto | Autoral, do projeto |
| Arquitetura, mobiliário, vegetação e adereços | `src/world/kit.ts` e arquivos de região | Geometria paramétrica escrita para este projeto | Autoral, do projeto |
| Figuras humanas, Crivo e inimigos | `src/entities/` | Geometria e animação procedurais escritas para este projeto | Autoral, do projeto |
| Música ambiente e efeitos sonoros | `src/core/audio.ts` | Síntese em WebAudio escrita para este projeto | Autoral, do projeto |
| Ícones da interface | `src/ui/icons.ts` | Glifos SVG desenhados para este projeto | Autoral, do projeto |
| Source Serif 4, Inter, IBM Plex Mono | `design/fonts/` | Já presentes no repositório, vindas do design system do Interprete | SIL Open Font License 1.1 |
| Three.js | dependência npm | three.js authors | MIT |

As cinco imagens góticas e o atlas visual enviados ao projeto foram usados como referência de direção de arte. Nenhuma delas foi copiada para o repositório nem usada como textura.

Nenhum personagem representa pessoa real. Heloísa, Íris, Anselmo, Dalva, Lia, Noêmia e Tomé são inventados, assim como a Academia.

## Modelos glTF externos (opcional)

O jogo carrega modelos de alta resolução de `public/models/`, listados em `manifest.json` por chave (`player` e o id de cada NPC). Sem entrada, vale o corpo procedural. Nenhum modelo externo está incluído; cada arquivo adicionado entra aqui com origem, autor e licença. Detalhes de formato e nomes de animação em `public/models/LEIA-ME.md`.
