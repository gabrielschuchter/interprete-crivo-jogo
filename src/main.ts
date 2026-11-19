import '../design/tokens.css';
import '../design/ps2/tokens-ps2.css';
import '../design/sistema/interprete-ds.css';
import './ui/game.css';
import './ui/ps2-ui.css';
import './jogo/jogo.css';
import { Telas } from './jogo/telas';
import { som } from './jogo/som';

try {
  const v = localStorage.getItem('interprete-sv-volume');
  if (v !== null) som.definirVolume(Number(v));
} catch {
  /* armazenamento recusado */
}
const telas = new Telas(document.getElementById('stage') as HTMLCanvasElement, document.getElementById('ui') as HTMLElement);
// exposto para os testes de ponta a ponta e para depuração
(window as unknown as { __jogo: Telas }).__jogo = telas;
const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
Promise.race([fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]).then(() => telas.iniciar());
