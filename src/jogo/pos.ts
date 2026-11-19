/**
 * Passo final da imagem PS2 (docs/game/DIRECAO_DE_ARTE_PS2.md, render.imagem de ps2.tokens.json):
 * o mundo é desenhado numa tela interna de poucas linhas e ampliado com filtro suave; aqui entram
 * saturação 0,8, contraste 1,14, esmagamento de pretos 0,025, 64 níveis por canal com pontilhado
 * ordenado de 0,45 na grade da tela interna, e a névoa de ardósia nas bordas, centrada no jogador.
 * Sem WebGL, a tela interna é só ampliada.
 */
const VS = `attribute vec2 p; varying vec2 uv; void main(){ uv = p * 0.5 + 0.5; uv.y = 1.0 - uv.y; gl_Position = vec4(p, 0.0, 1.0); }`;
const FS = `precision mediump float;
varying vec2 uv;
uniform sampler2D t;
uniform vec2 interna;
uniform vec2 foco;
uniform float raioNevoa;
uniform float brilho;
float bayer(vec2 p){
  vec2 q = mod(floor(p), 4.0);
  float i = q.x + q.y * 4.0;
  float b = 0.0;
  if (i < 0.5) b = 0.0; else if (i < 1.5) b = 8.0; else if (i < 2.5) b = 2.0; else if (i < 3.5) b = 10.0;
  else if (i < 4.5) b = 12.0; else if (i < 5.5) b = 4.0; else if (i < 6.5) b = 14.0; else if (i < 7.5) b = 6.0;
  else if (i < 8.5) b = 3.0; else if (i < 9.5) b = 11.0; else if (i < 10.5) b = 1.0; else if (i < 11.5) b = 9.0;
  else if (i < 12.5) b = 15.0; else if (i < 13.5) b = 7.0; else if (i < 14.5) b = 13.0; else b = 5.0;
  return b / 16.0 - 0.5;
}
void main(){
  vec3 c = texture2D(t, uv).rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, 0.8);
  c = (c - 0.5) * 1.14 + 0.5;
  c = max(c - 0.025, 0.0) / 0.975;
  c *= brilho;
  vec2 px = uv * interna;
  float d = length((px - foco) / interna.y);
  float n = smoothstep(raioNevoa, raioNevoa + 0.55, d);
  c = mix(c, vec3(0.133, 0.169, 0.235) * 0.55, n * 0.62);
  c += bayer(px) * 0.45 / 63.0;
  c = floor(c * 63.0 + 0.5) / 63.0;
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

export class Pos {
  private gl: WebGLRenderingContext | null = null;
  private g2: CanvasRenderingContext2D | null = null;
  private tex: WebGLTexture | null = null;
  private u: Record<string, WebGLUniformLocation | null> = {};
  brilho = 1;

  constructor(private tela: HTMLCanvasElement) {
    const gl = tela.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: true });
    if (gl && this.montar(gl)) this.gl = gl;
    else this.g2 = tela.getContext('2d');
  }

  private montar(gl: WebGLRenderingContext): boolean {
    const sh = (tipo: number, src: string) => {
      const s = gl.createShader(tipo) as WebGLShader;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const v = sh(gl.VERTEX_SHADER, VS), f = sh(gl.FRAGMENT_SHADER, FS);
    if (!v || !f) return false;
    const p = gl.createProgram() as WebGLProgram;
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return false;
    gl.useProgram(p);
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    for (const n of ['interna', 'foco', 'raioNevoa', 'brilho', 't']) this.u[n] = gl.getUniformLocation(p, n);
    return true;
  }

  /** foco em pixels da tela interna; raioNevoa em alturas de tela a partir do foco */
  apresentar(interna: HTMLCanvasElement, focoX: number, focoY: number, raioNevoa: number): void {
    const W = this.tela.width, H = this.tela.height;
    if (this.gl) {
      const gl = this.gl;
      gl.viewport(0, 0, W, H);
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, interna);
      gl.uniform2f(this.u.interna, interna.width, interna.height);
      gl.uniform2f(this.u.foco, focoX, focoY);
      gl.uniform1f(this.u.raioNevoa, raioNevoa);
      gl.uniform1f(this.u.brilho, this.brilho);
      gl.uniform1i(this.u.t, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    } else if (this.g2) {
      this.g2.imageSmoothingEnabled = true;
      this.g2.drawImage(interna, 0, 0, W, H);
    }
  }
}
