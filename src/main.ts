import '../design/tokens.css';
import '../design/ps2/tokens-ps2.css';
import './ui/game.css';
import './ui/ps2-ui.css';
import { Game } from './game';
import { UI } from './ui/ui';
import { CRIVO_SKILLS, ITEMS, PLAYER_SKILLS, SHOP } from './content/data';
import { GEAR } from './domain/gear';
import { DIFFICULTIES } from './domain/difficulty';

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const ui = new UI(document.getElementById('ui') as HTMLElement);
const game = new Game(canvas, ui);
// exposto para os testes de ponta a ponta e para depuração
(window as unknown as { __game: Game; __data: unknown }).__game = game;
(window as unknown as { __data: unknown }).__data = { PLAYER_SKILLS, CRIVO_SKILLS, ITEMS, SHOP, GEAR, DIFFICULTIES };
if (new URLSearchParams(location.search).has('teste')) ui.instant = true;
const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
Promise.race([fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]).then(() => game.boot());
