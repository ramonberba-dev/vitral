// VITRAL — motor do jogo (Phaser 3): exploração do reino e batalha animada.
// Conversa com o app pela ponte window.VJ (definida em app.js).
'use strict';

const LARG = 390, ALT = 844;
const Z = Math.min(3, Math.max(2, Math.round(window.devicePixelRatio || 2)));   // nitidez: canvas em Z vezes
const MUNDO = 1.5;                       // mapa 768x1376 exibido 1,5x
const POS_R1 = [                         // posição de cada ponto do Reino I no mapa (coordenadas 768x1376)
  [330, 1290], [500, 1130], [610, 1030], [300, 905], [290, 835], [420, 735], [610, 700],
  [400, 595], [255, 505], [215, 425], [300, 335], [380, 245], [390, 175],
];
const COR_V = { fe: 0xe9c46a, esp: 0x4cc38a, car: 0xe5546b, tem: 0x5aa9e6, pru: 0xa77bf3, for: 0xf08a3c, jus: 0xc9d1dc };

const espera = (cena, ms) => new Promise(ok => cena.time.delayedCall(ms, ok));
const tw = (cena, cfg) => new Promise(ok => cena.tweens.add({ ...cfg, onComplete: ok }));
const sorteia = a => a[Math.floor(Math.random() * a.length)];

function texturasBase(cena) {
  const g = cena.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xffffff, 1).fillCircle(8, 8, 8); g.generateTexture('ponto', 16, 16); g.clear();
  g.fillStyle(0xffffff, 1).fillRect(0, 0, 4, 14); g.generateTexture('faisca', 4, 14); g.clear();
  g.fillStyle(0x7a4a22, 1).fillRoundedRect(0, 14, 64, 40, 6); g.fillStyle(0x9a6230, 1).fillRoundedRect(0, 0, 64, 22, { tl: 14, tr: 14, bl: 0, br: 0 });
  g.fillStyle(0xe9c46a, 1).fillRect(0, 18, 64, 6).fillRect(28, 12, 8, 18); g.generateTexture('bau', 64, 54); g.clear();
  g.fillStyle(0x000000, 0.35).fillEllipse(40, 10, 80, 20); g.generateTexture('sombra', 80, 20); g.clear();
  g.fillStyle(0xffffff, 1).fillTriangle(0, 0, 24, 0, 12, 16); g.generateTexture('seta', 24, 16); g.clear();
  g.fillStyle(0xffffff, 1).fillTriangle(9, 0, 18, 11, 0, 11).fillTriangle(0, 11, 18, 11, 9, 26); g.generateTexture('caco', 18, 26); g.destroy();
}
function precarregar(cena) {
  const v = window.VJ.versao;
  Object.keys(window.VJ.DEVOTOS).forEach(k => cena.load.image('d-' + k, `assets/jogo/${k}.png?${v}`));
  ['anjo', 'larva', 'beliscao', 'servo', 'insaciavel'].forEach(k => cena.load.image(k, `assets/jogo/${k}.png?${v}`));
  cena.load.image('mapa-r1', `assets/jogo/mapa-r1.jpg?${v}`);
  cena.load.image('chao', `assets/jogo/mapa-r1-chao.png?${v}`);
  Object.keys(window.VJ.DEVOTOS).forEach(k => cena.load.spritesheet('anda-' + k, `assets/jogo/anda-${k}.png?${v}`, { frameWidth: 96, frameHeight: 128 }));
  cena.load.image('batalha-r1', `assets/jogo/batalha-r1.jpg?${v}`);
  cena.load.image('batalha-r1-chefe', `assets/jogo/batalha-r1-chefe.jpg?${v}`);
}
function texto(cena, x, y, t, tam = 18, cor = '#ffffff', extra = {}) {
  return cena.add.text(x, y, t, { fontFamily: 'Nunito Sans, sans-serif', fontStyle: '900', fontSize: tam + 'px', color: cor, stroke: '#140f1f', strokeThickness: Math.max(3, tam / 5), align: 'center', resolution: Z, ...extra }).setOrigin(0.5);
}

// ===================== BONECO ARTICULADO =====================
// Nas folhas anda-*.png os 6 quadros de cada linha são quase iguais (as pernas não mexem).
// Por isso o boneco é montado em três peças, tronco e duas pernas, e o passo é feito aqui no código:
// a perna sobe e balança, o corpo sobe e desce e inclina para a frente.
const CORTE = 105, PE = 123;                 // linha do quadril (abaixo das mãos) e da sola no quadro 96x128
const LINHA_DIR = { baixo: 0, lado: 1, cima: 2 };
// cinza = Cópia cinzenta da Bruma: as mesmas peças sem cor, escuras e puxando para o roxo
function pecasBoneco(cena, k, cinza = false) {
  const pref = cinza ? 'bc' : 'bn';
  if (cena.textures.exists(`${pref}-${k}-baixo-t`)) return;
  const src = cena.textures.get('anda-' + k).getSourceImage();
  Object.entries(LINHA_DIR).forEach(([dir, r]) => {
    const recorta = (nome, x, y, w, h) => {
      const c = cena.textures.createCanvas(`${pref}-${k}-${dir}-${nome}`, w, h);
      c.context.drawImage(src, x, r * 128 + y, w, h, 0, 0, w, h);
      if (cinza) {
        const d = c.context.getImageData(0, 0, w, h), px = d.data;
        for (let i = 0; i < px.length; i += 4) { const l = (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11) * 0.62 + 18; px[i] = l * 0.92; px[i + 1] = l * 0.9; px[i + 2] = l * 1.08 + 6; }
        c.context.putImageData(d, 0, 0);
      }
      c.refresh();
    };
    recorta('t', 0, 0, 96, CORTE);
    recorta('e', 0, CORTE - 3, 48, 128 - CORTE + 3);
    recorta('d', 48, CORTE - 3, 48, 128 - CORTE + 3);
  });
}
class Boneco extends Phaser.GameObjects.Container {
  constructor(cena, k, x, y, esc = 1, cinza = false) {
    super(cena, x, y); pecasBoneco(cena, k, cinza);
    this.k = k; this.pref = cinza ? 'bc' : 'bn'; this.esc = esc; this.dir = 'baixo'; this.virado = false; this.fase = 0; this.respira = Math.random() * 3000; this.passo = null;
    const yp = CORTE - 3 - PE;
    this.pE = cena.add.image(0, yp, `${this.pref}-${k}-baixo-e`).setOrigin(1, 0);
    this.pD = cena.add.image(0, yp, `${this.pref}-${k}-baixo-d`).setOrigin(0, 0);
    this.tronco = cena.add.image(0, CORTE - PE, `${this.pref}-${k}-baixo-t`).setOrigin(0.5, 1);
    this.add([this.pE, this.pD, this.tronco]); this.tamanho(esc); cena.add.existing(this);
  }
  get flipX() { return this.virado; }
  get pecas() { return [this.pE, this.pD, this.tronco]; }
  tamanho(esc) { this.esc = esc; return this.setScale(esc * (this.virado ? -1 : 1), esc); }
  // pintar: cor fixa (as Cópias cinzentas); setTint/setTintFill: piscadas que somem com clearTint
  pintar(c) { this.cor = c; return this.setTint(c); }
  setTint(c) { this.pecas.forEach(p => p.setTint(c)); return this; }
  setTintFill(c) { this.pecas.forEach(p => p.setTintFill(c)); return this; }
  clearTint() { this.pecas.forEach(p => p.clearTint()); if (this.cor) this.setTint(this.cor); return this; }
  // vira para onde está indo: lado (espelhado para a direita), frente ou costas
  olhar(dx, dy) {
    let dir = this.dir, vir = this.virado;
    if (Math.abs(dx) > 0.01 && Math.abs(dx) > Math.abs(dy) * 0.8) { dir = 'lado'; vir = dx > 0; }
    else if (Math.abs(dy) > 0.01) { dir = dy < 0 ? 'cima' : 'baixo'; vir = false; }
    if (dir !== this.dir) { this.dir = dir; ['e', 'd', 't'].forEach((n, i) => this.pecas[i].setTexture(`${this.pref}-${this.k}-${dir}-${n}`)); }
    if (vir !== this.virado) { this.virado = vir; this.tamanho(this.esc); }
    return this;
  }
  // vel: 0 parado, 1 andando, 1,5 correndo
  andar(dt, vel) {
    const T = this.tronco, y0 = CORTE - PE, yp = CORTE - 3 - PE;
    if (vel > 0.05) {
      const antes = Math.sin(this.fase);
      this.fase += dt * 0.0105 * (0.55 + 0.6 * vel);
      const s = Math.sin(this.fase), c = Math.cos(this.fase);
      if (antes * s <= 0 && this.passo) this.passo(this);       // o pé tocou o chão
      T.y = y0 - Math.abs(s) * 3.2; T.scaleY = 1 + Math.abs(c) * 0.02;
      if (this.dir === 'lado') {
        T.angle = -6 * Math.min(1, vel);                         // inclina para a frente
        this.pE.setPosition(0, yp - Math.max(0, -c) * 3).setAngle(s * 22);
        this.pD.setPosition(0, yp - Math.max(0, c) * 3).setAngle(-s * 22);
      } else {
        T.angle = s * 3.5;
        this.pE.setPosition(0, yp - Math.max(0, s) * 6).setAngle(0);
        this.pD.setPosition(0, yp - Math.max(0, -s) * 6).setAngle(0);
      }
    } else {
      this.fase = 0; this.respira += dt;
      T.angle = 0; T.y = y0; T.scaleY = 1 + Math.sin(this.respira / 420) * 0.015;
      this.pE.setPosition(0, yp).setAngle(0); this.pD.setPosition(0, yp).setAngle(0);
    }
    return this;
  }
}

// ===================== CARREGAMENTO (uma vez só) =====================
class Carregar extends Phaser.Scene {
  constructor() { super('carregar'); }
  preload() {
    this.cameras.main.setZoom(Z).centerOn(LARG / 2, ALT / 2);
    const barra = this.add.rectangle(LARG / 2 - 140, ALT / 2, 0, 14, 0xe9c46a).setOrigin(0, 0.5);
    this.add.rectangle(LARG / 2, ALT / 2, 284, 20).setStrokeStyle(2, 0xe9c46a);
    texto(this, LARG / 2, ALT / 2 - 40, 'Abrindo o reino…', 20, '#f3d27e');
    this.load.on('progress', v => barra.width = 280 * v);
    precarregar(this);
  }
  create() { texturasBase(this); this.scene.start(window.VJ.cena || 'explorar'); }
}

window.criarJogo = function (pai) {
  return new Phaser.Game({
    type: Phaser.AUTO, parent: pai, width: LARG * Z, height: ALT * Z, backgroundColor: '#0f0d17',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 2 }, render: { antialias: true },
    scene: [Carregar, Explorar, Batalha, Desafio],
  });
};
