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
  g.fillStyle(0xffffff, 1).fillTriangle(0, 0, 24, 0, 12, 16); g.generateTexture('seta', 24, 16); g.destroy();
}
function precarregar(cena) {
  const v = window.VJ.versao;
  Object.keys(window.VJ.DEVOTOS).forEach(k => cena.load.image('d-' + k, `assets/jogo/${k}.png?${v}`));
  ['anjo', 'larva', 'servo', 'insaciavel'].forEach(k => cena.load.image(k, `assets/jogo/${k}.png?${v}`));
  cena.load.image('mapa-r1', `assets/jogo/mapa-r1.jpg?${v}`);
  cena.load.image('chao', `assets/jogo/mapa-r1-chao.png?${v}`);
  Object.keys(window.VJ.DEVOTOS).forEach(k => cena.load.spritesheet('anda-' + k, `assets/jogo/anda-${k}.png?${v}`, { frameWidth: 96, frameHeight: 128 }));
  cena.load.image('batalha-r1', `assets/jogo/batalha-r1.jpg?${v}`);
  cena.load.image('batalha-r1-chefe', `assets/jogo/batalha-r1-chefe.jpg?${v}`);
}
function texto(cena, x, y, t, tam = 18, cor = '#ffffff', extra = {}) {
  return cena.add.text(x, y, t, { fontFamily: 'Nunito Sans, sans-serif', fontStyle: '900', fontSize: tam + 'px', color: cor, stroke: '#140f1f', strokeThickness: Math.max(3, tam / 5), align: 'center', resolution: Z, ...extra }).setOrigin(0.5);
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
  create() { texturasBase(this); this.scene.start('explorar'); }
}

// ===================== BATALHA =====================
class Batalha extends Phaser.Scene {
  constructor() { super('batalha'); }
  init(dados) { this.no = dados.no; this.fim = null; }
  create() {
    const VJ = window.VJ, p = VJ.p(), no = this.no;
    this.ocupado = true;
    this.cameras.main.setZoom(Z).centerOn(LARG / 2, ALT / 2).fadeIn(300, 15, 13, 23);
    // cenário: praça de pedra nas batalhas comuns, vinhedo com tempestade de Bruma nos chefes
    const chefe = no.t === 'chefe' || no.t === 'boss';
    const fundo = this.add.image(LARG / 2, ALT / 2, chefe ? 'batalha-r1-chefe' : 'batalha-r1'); fundo.setScale(Math.max(LARG / fundo.width, ALT / fundo.height) * 1.06);
    this.tweens.add({ targets: fundo, scale: fundo.scale * 1.03, x: LARG / 2 + 6, yoyo: true, repeat: -1, duration: 7000, ease: 'Sine.inOut' });
    // névoa da Bruma passando no meio do campo e partículas de luz no ar
    this.add.particles(0, 0, 'ponto', { x: { min: -60, max: LARG + 60 }, y: { min: 330, max: 520 }, speedX: { min: -18, max: -6 }, scale: { start: 3.2, end: 4.6 }, alpha: { start: 0.16, end: 0 }, tint: 0xb9b6c6, lifespan: 5200, frequency: 140 });
    this.add.particles(0, 0, 'ponto', { x: { min: 0, max: LARG }, y: { min: 0, max: ALT }, speedY: { min: -14, max: -4 }, speedX: { min: -6, max: 6 }, scale: { start: 0.14, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: chefe ? [0xff9a4d, 0xffd27a] : [0xfff2b0, 0xffffff], lifespan: 4000, frequency: 90, blendMode: 'ADD' }).setDepth(25);
    // vinheta: escurece as bordas e foca o centro da luta
    const vin = this.add.graphics().setDepth(24);
    for (let i = 0; i < 14; i++) { vin.lineStyle(14, 0x07060c, 0.06 + i * 0.012); vin.strokeRect(-i * 6, -i * 6, LARG + i * 12, ALT + i * 12); }
    vin.fillStyle(0x07060c, 0.35).fillRect(0, ALT - 150, LARG, 150);
    this.cor = this.cameras.main.postFX ? this.cameras.main.postFX.addColorMatrix() : null;
    this.sat = { v: -0.2 }; if (this.cor) this.cor.saturate(this.sat.v);
    this.faiscas = this.add.particles(0, 0, 'ponto', { speed: { min: 80, max: 260 }, scale: { start: 0.7, end: 0 }, lifespan: 520, emitting: false, blendMode: 'ADD' }).setDepth(30);

    // aliados
    const xs = [62, 150, 240, 328];
    this.aliados = p.equipe.filter(k => p.devotos[k]).slice(0, 4).map((k, i) => {
      const d = VJ.DEVOTOS[k], s = VJ.stats(k, p.devotos[k].lvl);
      const base = { x: xs[i], y: 700 };
      const sombra = this.add.image(base.x, base.y + 2, 'sombra').setScale(0.9).setDepth(8);
      const spr = this.add.image(base.x, base.y + 200, 'd-' + k).setOrigin(0.5, 1).setScale(0.4).setDepth(9);
      this.tweens.add({ targets: spr, y: base.y, duration: 500, delay: 200 + i * 90, ease: 'Back.out' });
      this.tweens.add({ targets: spr, scaleY: 0.408, yoyo: true, repeat: -1, duration: 1000 + i * 70, ease: 'Sine.inOut', delay: 800 });
      const a = { k, d, spr, sombra, base, hp: s.hp, max: s.hp, atk: s.atk, def: s.def || 0, crit: s.crit || 0, dom: s.dom || 0, carga: 0, cd: 0, escudo: 0, buff: 0 };
      a.barra = this.add.graphics().setDepth(12); return a;
    });
    // inimigos
    const n = no.inimigos.length, fx = n === 1 ? [LARG / 2] : n === 2 ? [125, 265] : [75, 195, 315];
    this.inimigos = no.inimigos.map((k, i) => {
      const e = VJ.INIMIGOS[k];
      const chave = k === 'copia' ? 'd-' + sorteia(Object.keys(VJ.DEVOTOS)) : k;
      const esc = k === 'insaciavel' ? 0.62 : k === 'servo' ? 0.52 : k === 'larva' ? 0.5 : 0.33;
      const base = { x: fx[i], y: k === 'insaciavel' ? 470 : 430 };
      const spr = this.add.image(base.x, -200, chave).setOrigin(0.5, 1).setScale(esc).setDepth(6);
      if (k === 'copia') spr.setTintFill(0x5a5868);
      this.tweens.add({ targets: spr, y: base.y, duration: 600, delay: 100 + i * 120, ease: 'Bounce.out' });
      this.tweens.add({ targets: spr, y: base.y - 8, yoyo: true, repeat: -1, duration: 1100 + i * 100, ease: 'Sine.inOut', delay: 900 });
      const f = { k, nome: e.nome, spr, base, hp: e.hp, max: e.hp, atk: e.atk, stun: 0, copia: k === 'copia' };
      f.barra = this.add.graphics().setDepth(12);
      spr.setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (!this.ocupado && f.hp > 0) { this.alvoI = this.inimigos.indexOf(f); this.desenhar(); } });
      return f;
    });
    this.alvoI = 0; this.vez = 0; this.ultV = null;
    this.mira = this.add.image(0, 0, 'seta').setTint(0xef6b7b).setDepth(13).setAngle(0);
    this.tweens.add({ targets: this.mira, scale: 1.25, yoyo: true, repeat: -1, duration: 400 });
    this.brilho = this.add.ellipse(0, 0, 90, 26, 0xe9c46a, 0.45).setDepth(7);
    this.tweens.add({ targets: this.brilho, alpha: 0.15, yoyo: true, repeat: -1, duration: 600 });
    this.legenda = texto(this, LARG / 2, 520, '', 16, '#ffffff', { wordWrap: { width: 360 } }).setDepth(20);
    this.criarBotoes();
    VJ.musica(no.t === 'chefe' || no.t === 'boss' ? '10-boss' : '09-batalha');
    this.abertura(no);
  }
  async abertura(no) {
    const faixa1 = this.add.rectangle(LARG / 2, -60, LARG, 120, 0x000000).setDepth(40);
    const faixa2 = this.add.rectangle(LARG / 2, ALT + 60, LARG, 120, 0x000000).setDepth(40);
    const tit = texto(this, -200, ALT / 2 - 40, no.t === 'chefe' ? 'CHEFE!' : 'ENCONTRO!', 44, '#f3d27e').setDepth(41);
    const sub = texto(this, LARG + 200, ALT / 2 + 10, no.titulo, 20).setDepth(41);
    this.tweens.add({ targets: faixa1, y: 60, duration: 300 }); this.tweens.add({ targets: faixa2, y: ALT - 60, duration: 300 });
    this.tweens.add({ targets: tit, x: LARG / 2, duration: 350, ease: 'Back.out' }); await tw(this, { targets: sub, x: LARG / 2, duration: 350, ease: 'Back.out' });
    this.cameras.main.shake(250, 0.01);
    await espera(this, 700);
    this.tweens.add({ targets: [tit, sub], alpha: 0, duration: 250 });
    this.tweens.add({ targets: faixa1, y: -60, duration: 300 }); await tw(this, { targets: faixa2, y: ALT + 60, duration: 300 });
    [faixa1, faixa2, tit, sub].forEach(o => o.destroy());
    this.ocupado = false; this.falar(`${this.aliados[0].d.nome} começa! Toque num inimigo para mirar.`); this.desenhar();
  }
  criarBotoes() {
    const mk = (x, w, rot, cor, cb) => {
      const c = this.add.container(x, 790).setDepth(25);
      const bg = this.add.graphics(); const t = texto(this, 0, 0, rot, 15, cor === 0xe9c46a ? '#1b1408' : '#ffffff');
      c.add([bg, t]); c.bg = bg; c.t = t; c.w = w; c.cor = cor; c.cb = cb;
      c.setSize(w, 52).setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (!this.ocupado && c.ativo) cb(); });
      return c;
    };
    this.bAtk = mk(70, 118, '⚔ Ataque', 0x2c2540, () => this.agir('ataque'));
    this.bDom = mk(195, 118, '✨ Dom', 0x2c2540, () => this.agir('dom'));
    this.bSup = mk(320, 118, '💥 Supremo', 0xe9c46a, () => this.agir('sup'));
    this.bPil = mk(330, 112, '💊', 0x2c2540, () => this.pilula()); this.bPil.y = 735; this.bPil.setSize(54, 40); this.bPil.w = 54; this.bPil.x = 360;
    this.bSair = mk(30, 54, '🏳', 0x2c2540, () => window.VJ.sair()); this.bSair.y = 40; this.bSair.setSize(44, 40); this.bSair.w = 44;
  }
  desenharBotao(b, ativo, rot) {
    b.ativo = ativo; const h = b === this.bPil || b === this.bSair ? 40 : 52;
    b.bg.clear().fillStyle(b.cor, ativo ? 1 : 0.35).fillRoundedRect(-b.w / 2, -h / 2, b.w, h, 12).lineStyle(2, 0xffffff, ativo ? 0.25 : 0.08).strokeRoundedRect(-b.w / 2, -h / 2, b.w, h, 12);
    if (rot) b.t.setText(rot); b.t.setAlpha(ativo ? 1 : 0.5);
  }
  desenhar() {
    const a = this.aliados[this.vez], livre = !this.ocupado && !this.fim;
    this.aliados.forEach(x => {
      x.barra.clear(); if (x.hp <= 0) { x.spr.setAlpha(0.35); return; }
      const bx = x.base.x - 38, by = x.base.y + 10;
      x.barra.fillStyle(0x000000, 0.6).fillRoundedRect(bx, by, 76, 18, 5);
      x.barra.fillStyle(0x5fd39a, 1).fillRoundedRect(bx + 2, by + 2, 72 * x.hp / x.max, 7, 3);
      x.barra.fillStyle(0xe9c46a, 1).fillRoundedRect(bx + 2, by + 11, 72 * x.carga / 100, 5, 2);
      if (x.escudo) x.barra.lineStyle(2, 0x4aa3ff, 1).strokeRoundedRect(bx - 2, by - 2, 80, 22, 6);
    });
    this.inimigos.forEach(f => {
      f.barra.clear(); if (f.hp <= 0) return;
      const w = f.k === 'insaciavel' ? 170 : 96, bx = f.base.x - w / 2, by = f.base.y + 8;
      f.barra.fillStyle(0x000000, 0.6).fillRoundedRect(bx, by, w, 10, 4).fillStyle(0xef6b7b, 1).fillRoundedRect(bx + 2, by + 2, (w - 4) * f.hp / f.max, 6, 3);
    });
    const alvo = this.inimigos[this.alvoI];
    if (alvo && alvo.hp > 0) this.mira.setPosition(alvo.base.x, alvo.spr.y - alvo.spr.displayHeight - 14).setVisible(!this.fim); else this.mira.setVisible(false);
    if (a && !this.fim) { this.brilho.setPosition(a.base.x, a.base.y).setVisible(true); } else this.brilho.setVisible(false);
    if (!a || this.fim) { [this.bAtk, this.bDom, this.bSup, this.bPil].forEach(b => b.setVisible(false)); return; }
    this.desenharBotao(this.bAtk, livre, '⚔ Ataque');
    this.desenharBotao(this.bDom, livre && !a.cd, a.cd ? `✨ ${a.cd}` : `✨ ${a.d.dom[0]}`);
    this.desenharBotao(this.bSup, livre && a.carga >= 100, a.carga >= 100 ? '💥 SUPREMO' : `💥 ${a.carga}%`);
    this.desenharBotao(this.bPil, livre && window.VJ.p().pilulas > 0, `💊${window.VJ.p().pilulas}`);
    this.desenharBotao(this.bSair, true, '🏳');
    this.bDom.t.setFontSize(a.d.dom[0].length > 12 ? 12 : 15);
  }
  falar(t) { this.legenda.setText(t).setAlpha(0); this.tweens.add({ targets: this.legenda, alpha: 1, duration: 150 }); }

  // ---- toques na hora certa ----
  tempo(x, y, defesa = false) {
    return new Promise(ok => {
      const cor = defesa ? 0x4aa3ff : 0xe9c46a;
      const dentro = this.add.circle(x, y, 24).setStrokeStyle(4, cor).setDepth(35);
      const fora = this.add.circle(x, y, 90).setStrokeStyle(4, 0xffffff, 0.9).setDepth(35);
      const dica = texto(this, x, y - 110, defesa ? 'TOQUE PARA DEFENDER!' : 'TOQUE NA HORA!', 16, defesa ? '#9cd0ff' : '#f3d27e').setDepth(35);
      const dur = defesa ? 620 : 680, t0 = this.time.now;
      let feito = false;
      const fim = res => {
        if (feito) return; feito = true; this.input.off('pointerdown', toque);
        [dentro, fora, dica].forEach(o => o.destroy()); ok(res);
      };
      const toque = () => {
        const erro = Math.abs(this.time.now - t0 - dur);
        fim(erro < 110 ? 'perfeito' : erro < 230 ? 'bom' : 'errou');
      };
      this.time.delayedCall(60, () => this.input.on('pointerdown', toque));
      this.tweens.add({ targets: fora, radius: 24, duration: dur, ease: 'Linear' });
      this.time.delayedCall(dur + 240, () => fim('nada'));
    });
  }
  popNum(x, y, txt, cor = '#ffffff', tam = 30) {
    const t = texto(this, x, y, txt, tam, cor).setDepth(36).setScale(0.2);
    this.tweens.add({ targets: t, scale: 1, duration: 180, ease: 'Back.out' });
    this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 800, delay: 450, onComplete: () => t.destroy() });
  }
  async golpe(a, f, mult, cmd = true) {
    const sx = a.spr.x, sy = a.spr.y;
    await tw(this, { targets: a.spr, x: f.base.x + (a.base.x < f.base.x ? -40 : 40), y: f.base.y + 110, scale: 0.46, duration: 230, ease: 'Quad.in' });
    let res = 'nada';
    if (cmd) res = await this.tempo(f.base.x, f.spr.y - f.spr.displayHeight / 2);
    // crítico vem da barra do herói (Foco, Ímpeto…); não soma com o PERFEITO do toque
    const crit = res !== 'perfeito' && Math.random() * 100 < (a.crit || 0);
    const bonus = { perfeito: 1.6, bom: 1.2, errou: 0.9, nada: 1 }[res] * (crit ? 1.5 : 1);
    const dano = Math.round(a.atk * (a.buff ? 1.3 : 1) * mult * bonus * (0.9 + Math.random() * 0.2));
    this.impacto(f, dano, COR_V[a.d.v], res === 'perfeito' || crit);
    if (res === 'perfeito') this.popNum(f.base.x, f.spr.y - f.spr.displayHeight - 40, 'PERFEITO!', '#f3d27e', 24);
    else if (crit) this.popNum(f.base.x, f.spr.y - f.spr.displayHeight - 40, 'CRÍTICO!', '#ff9a4d', 24);
    else if (res === 'bom') this.popNum(f.base.x, f.spr.y - f.spr.displayHeight - 40, 'BOM!', '#ffffff', 20);
    await tw(this, { targets: a.spr, x: sx, y: sy, scale: 0.4, duration: 260, ease: 'Quad.out' });
    return dano;
  }
  impacto(f, dano, cor, forte) {
    f.hp = Math.max(0, f.hp - dano);
    const cy = f.spr.y - f.spr.displayHeight / 2;
    const corte = this.add.rectangle(f.base.x, cy, 6, 150, 0xffffff).setAngle(35).setDepth(31).setBlendMode('ADD');
    this.tweens.add({ targets: corte, scaleX: 3, alpha: 0, duration: 220, onComplete: () => corte.destroy() });
    this.faiscas.setParticleTint(cor); this.faiscas.explode(forte ? 34 : 18, f.base.x, cy);
    f.spr.setTintFill(0xffffff); this.time.delayedCall(90, () => f.copia ? f.spr.setTintFill(0x5a5868) : f.spr.clearTint());
    this.tweens.add({ targets: f.spr, x: f.base.x + (forte ? 18 : 10), yoyo: true, duration: 60, repeat: 1 });
    this.cameras.main.shake(forte ? 220 : 120, forte ? 0.018 : 0.008);
    this.popNum(f.base.x, cy - 20, String(dano), forte ? '#f3d27e' : '#ffffff', forte ? 38 : 30);
    window.VJ.sfx(forte ? 'fanfarra' : 'golpe');
    if (f.hp <= 0) this.morrer(f);
    this.desenhar();
  }
  morrer(f) {
    this.tweens.killTweensOf(f.spr);
    const p = this.add.particles(f.base.x, f.base.y - f.spr.displayHeight / 2, 'ponto', { speed: { min: 30, max: 120 }, angle: { min: 230, max: 310 }, scale: { start: 0.9, end: 0 }, tint: 0xb4b1c2, lifespan: 900, emitting: false }).setDepth(30);
    p.explode(40);
    this.tweens.add({ targets: f.spr, alpha: 0, scaleY: 0.05, y: f.base.y + 10, duration: 500 });
  }
  async cutin(a, nome, grande) {
    const cor = COR_V[a.d.v];
    if (!grande) {
      const faixa = this.add.rectangle(-LARG, 260, LARG, 64, cor, 0.92).setDepth(40);
      const t = texto(this, -LARG, 260, nome, 24, '#140f1f', { stroke: '#ffffff', strokeThickness: 2 }).setDepth(41);
      await tw(this, { targets: [faixa, t], x: LARG / 2, duration: 220, ease: 'Cubic.out' });
      await espera(this, 380);
      await tw(this, { targets: [faixa, t], x: LARG * 1.6, duration: 200, ease: 'Cubic.in' });
      faixa.destroy(); t.destroy(); return;
    }
    window.VJ.sfx('fanfarra');
    const escuro = this.add.rectangle(LARG / 2, ALT / 2, LARG, ALT, 0x000000, 0).setDepth(40);
    await tw(this, { targets: escuro, fillAlpha: 0.82, duration: 180 });
    const raios = [];
    for (let i = 0; i < 6; i++) { const r = this.add.rectangle(LARG / 2, ALT / 2, 900, 26 + i * 6, cor, 0.25).setAngle(-20 + i * 8).setDepth(41).setBlendMode('ADD'); raios.push(r); this.tweens.add({ targets: r, angle: r.angle + 30, duration: 1300 }); }
    const heroi = this.add.image(LARG + 200, ALT / 2 + 220, 'd-' + a.k).setOrigin(0.5, 1).setScale(1.05).setDepth(42);
    const t1 = texto(this, LARG / 2, 140, a.d.nome.toUpperCase(), 22, '#ffffff').setDepth(43).setAlpha(0);
    const t2 = texto(this, LARG / 2, 185, nome.toUpperCase(), 32, '#f3d27e', { wordWrap: { width: 360 } }).setDepth(43).setScale(2).setAlpha(0);
    this.tweens.add({ targets: heroi, x: LARG / 2 + 30, duration: 380, ease: 'Cubic.out' });
    this.tweens.add({ targets: t1, alpha: 1, duration: 200, delay: 200 });
    await tw(this, { targets: t2, alpha: 1, scale: 1, duration: 260, delay: 260, ease: 'Back.out' });
    this.cameras.main.shake(300, 0.012);
    await espera(this, 650);
    this.cameras.main.flash(300, 255, 255, 255);
    [escuro, heroi, t1, t2, ...raios].forEach(o => o.destroy());
  }
  async efeito(a, ef, forte) {
    const vivos = this.inimigos.filter(f => f.hp > 0), al = this.aliados.filter(x => x.hp > 0), alvo = this.inimigos[this.alvoI];
    if (ef === 'sorte') ef = sorteia(['dano', 'cura', 'buff', 'escudo']);
    const pd = 1 + (a.dom || 0) / 100; // barra de Dom (Código, Oração, Luz…) fortalece Dom e Supremo
    if (ef === 'dano') return this.golpe(a, alvo, (forte ? 3 : 1.8) * pd);
    if (ef === 'atordoa') {
      if (forte) { for (const f of vivos) { this.impacto(f, Math.round(a.atk * 1.2 * pd), COR_V[a.d.v]); f.stun = 1; this.estrelas(f); } return; }
      await this.golpe(a, alvo, pd); if (alvo.hp > 0) { alvo.stun = 1; this.estrelas(alvo); } return;
    }
    if (ef === 'area') {
      await tw(this, { targets: a.spr, y: a.base.y - 90, duration: 220, ease: 'Quad.out' });
      const onda = this.add.circle(LARG / 2, 360, 20).setStrokeStyle(8, COR_V[a.d.v]).setDepth(30);
      this.tweens.add({ targets: onda, radius: 260, alpha: 0, duration: 450, onComplete: () => onda.destroy() });
      const res = await this.tempo(LARG / 2, 330);
      const b = { perfeito: 1.5, bom: 1.15, errou: 0.9, nada: 1 }[res];
      vivos.forEach(f => this.impacto(f, Math.round(a.atk * (forte ? 1.6 : 0.9) * b * pd * (0.9 + Math.random() * 0.2)), COR_V[a.d.v], res === 'perfeito'));
      await tw(this, { targets: a.spr, y: a.base.y, duration: 240, ease: 'Bounce.out' }); return;
    }
    if (ef === 'cura' || ef === 'revive') {
      this.aliados.forEach(x => {
        if (x.hp <= 0) { if (ef !== 'revive') return; x.hp = Math.round(x.max * 0.5); x.spr.setAlpha(1); }
        const c = Math.round(x.max * (forte ? 0.4 : 0.22) * pd); x.hp = Math.min(x.max, x.hp + c);
        this.faiscas.setParticleTint(0x5fd39a); this.faiscas.explode(14, x.base.x, x.base.y - 70);
        this.popNum(x.base.x, x.base.y - 150, '+' + c, '#5fd39a', 22);
      });
      window.VJ.sfx('sinos'); return;
    }
    if (ef === 'escudo') {
      al.forEach(x => { x.escudo += Math.round(x.max * (forte ? 0.35 : 0.2) * pd); const b = this.add.circle(x.base.x, x.base.y - 70, 10, 0x4aa3ff, 0.25).setStrokeStyle(3, 0x9cd0ff).setDepth(15); this.tweens.add({ targets: b, radius: 62, alpha: 0, duration: 700, onComplete: () => b.destroy() }); });
      window.VJ.sfx('sinos'); return;
    }
    if (ef === 'buff') {
      al.forEach(x => { x.buff = 2; const g = this.add.ellipse(x.base.x, x.base.y - 70, 90, 170, 0xe9c46a, 0.35).setDepth(8).setBlendMode('ADD'); this.tweens.add({ targets: g, alpha: 0, scale: 1.4, duration: 800, onComplete: () => g.destroy() }); });
      window.VJ.sfx('fanfarra');
    }
  }
  estrelas(f) {
    const t = texto(this, f.base.x, f.spr.y - f.spr.displayHeight - 10, '💫', 26).setDepth(32);
    this.tweens.add({ targets: t, angle: 360, repeat: 2, duration: 500, onComplete: () => t.destroy() });
  }
  async agir(tipo) {
    const a = this.aliados[this.vez], VJ = window.VJ;
    if (this.inimigos[this.alvoI]?.hp <= 0) this.alvoI = this.inimigos.findIndex(f => f.hp > 0);
    this.ocupado = true; this.desenhar();
    if (tipo === 'ataque') { this.falar(`${a.d.nome} ataca!`); await this.golpe(a, this.inimigos[this.alvoI], 1); a.carga = Math.min(100, a.carga + 25); }
    if (tipo === 'dom') { await this.cutin(a, a.d.dom[0], false); this.falar(`${a.d.nome}: ${a.d.dom[0]}`); await this.efeito(a, a.d.dom[1], false); a.cd = 2; a.carga = Math.min(100, a.carga + 15); }
    if (tipo === 'sup') { await this.cutin(a, a.d.sup[0], true); this.falar(`${a.d.nome}: ${a.d.sup[0]}!`); await this.efeito(a, a.d.sup[1], true); a.carga = 0; }
    const cb = this.ultV && VJ.COMBOS.find(c => (c.a === this.ultV && c.b === a.d.v) || (c.b === this.ultV && c.a === a.d.v));
    if (cb) await this.combo(cb, a);
    this.ultV = a.d.v;
    this.desenhar();
    if (await this.checarFim()) return;
    await this.proximo();
  }
  async combo(cb, a) {
    const t = texto(this, LARG / 2, 300, `COMBO\n${cb.nome}!`, 34, '#f3d27e').setDepth(45).setScale(0.3);
    this.faiscas.setParticleTint(0xe9c46a); this.faiscas.explode(40, LARG / 2, 300);
    await tw(this, { targets: t, scale: 1, duration: 250, ease: 'Back.out' });
    const al = this.aliados.filter(x => x.hp > 0), alvo = this.inimigos[this.alvoI];
    if (cb.ef === 'atordoa' && alvo?.hp > 0) { alvo.stun = 1; this.estrelas(alvo); }
    if (cb.ef === 'cura') al.forEach(x => x.hp = Math.min(x.max, x.hp + Math.round(x.max * 0.1)));
    if (cb.ef === 'carga') al.forEach(x => x.carga = Math.min(100, x.carga + 20));
    if (cb.ef === 'dano' && alvo?.hp > 0) this.impacto(alvo, Math.round(a.atk * 0.8), 0xe9c46a, true);
    if (cb.ef === 'escudo') al.forEach(x => x.escudo += Math.round(x.max * 0.1));
    await espera(this, 500); t.destroy();
  }
  async proximo() {
    let i = this.vez;
    for (let n = 0; n <= this.aliados.length; n++) {
      i++;
      if (i >= this.aliados.length) {
        await this.turnoInimigo(); if (this.fim) return;
        i = 0; this.ultV = null; this.aliados.forEach(x => { if (x.cd) x.cd--; if (x.buff) x.buff--; });
      }
      if (this.aliados[i].hp > 0) { this.vez = i; break; }
    }
    this.ocupado = false; this.falar(`Vez de ${this.aliados[this.vez].d.nome}`); this.desenhar();
  }
  async turnoInimigo() {
    for (const f of this.inimigos.filter(x => x.hp > 0)) {
      if (f.stun) { f.stun--; this.falar(`${f.nome} está atordoado!`); await espera(this, 500); continue; }
      const vivos = this.aliados.filter(x => x.hp > 0); if (!vivos.length) break;
      const alvo = sorteia(vivos);
      this.falar(`${f.nome} ataca ${alvo.d.nome}!`);
      const ex = texto(this, alvo.base.x, alvo.base.y - 190, '!', 40, '#ef6b7b').setDepth(33);
      this.tweens.add({ targets: ex, scale: 1.3, yoyo: true, repeat: 2, duration: 120 });
      const ida = tw(this, { targets: f.spr, y: f.base.y + 120, x: alvo.base.x, scaleX: f.spr.scaleX * 1.12, scaleY: f.spr.scaleY * 1.12, duration: 600, ease: 'Quad.in' });
      const res = await this.tempo(alvo.base.x, alvo.base.y - 80, true);
      await ida; ex.destroy();
      // barra de defesa do herói (Firewall, Rocha, Calma…) corta parte do golpe
      let d = Math.round(f.atk * (0.85 + Math.random() * 0.3) * (1 - (alvo.def || 0) / 100));
      if (res === 'perfeito' || res === 'bom') { d = Math.round(d * (res === 'perfeito' ? 0.3 : 0.6)); this.popNum(alvo.base.x, alvo.base.y - 230, 'DEFESA!', '#9cd0ff', 24); window.VJ.sfx('sinos'); }
      if (alvo.escudo) { const ab = Math.min(alvo.escudo, d); alvo.escudo -= ab; d -= ab; }
      alvo.hp = Math.max(0, alvo.hp - d);
      alvo.spr.setTint(0xff6b6b); this.time.delayedCall(140, () => alvo.spr.clearTint());
      this.cameras.main.shake(150, 0.01); window.VJ.sfx('golpe');
      this.popNum(alvo.base.x, alvo.base.y - 160, d ? '-' + d : '0', '#ff9a9a', 26);
      if (alvo.hp <= 0) { this.tweens.add({ targets: alvo.spr, alpha: 0.35, angle: -12, duration: 300 }); }
      await tw(this, { targets: f.spr, x: f.base.x, y: f.base.y, scaleX: f.spr.scaleX / 1.12, scaleY: f.spr.scaleY / 1.12, duration: 380, ease: 'Quad.out' });
      this.desenhar();
      if (await this.checarFim()) return;
    }
  }
  pilula() {
    const VJ = window.VJ, p = VJ.p(), a = this.aliados[this.vez]; if (p.pilulas < 1) return;
    p.pilulas--; VJ.salvar(); const c = Math.round(a.max * 0.4); a.hp = Math.min(a.max, a.hp + c);
    this.faiscas.setParticleTint(0x5fd39a); this.faiscas.explode(18, a.base.x, a.base.y - 70);
    this.popNum(a.base.x, a.base.y - 150, '+' + c, '#5fd39a', 24); VJ.sfx('sinos'); this.falar('Pílula de Frei Galvão!'); this.desenhar();
  }
  async checarFim() {
    if (this.fim) return true;
    const VJ = window.VJ;
    if (this.inimigos.every(f => f.hp <= 0)) {
      this.fim = 'vitoria'; this.desenhar();
      VJ.musica('11-vitoria'); VJ.sfx('fanfarra');
      if (this.cor) this.tweens.add({ targets: this.sat, v: 0.15, duration: 1400, onUpdate: () => this.cor.saturate(this.sat.v) });
      const r = VJ.vencer(this.no);
      const t = texto(this, LARG / 2, 300, 'VITÓRIA!', 52, '#f3d27e').setDepth(45).setScale(0.2);
      this.tweens.add({ targets: t, scale: 1, duration: 400, ease: 'Back.out' });
      this.faiscas.setParticleTint(0xe9c46a); this.faiscas.explode(60, LARG / 2, 300);
      this.aliados.filter(x => x.hp > 0).forEach((x, i) => this.tweens.add({ targets: x.spr, y: x.base.y - 40, yoyo: true, repeat: 2, duration: 220, delay: i * 80 }));
      texto(this, LARG / 2, 380, r.texto, 17, '#ffffff', { wordWrap: { width: 340 } }).setDepth(45);
      this.botaoFim('Continuar', () => r.video ? VJ.video(r.video, () => VJ.voltarMapa()) : VJ.voltarMapa());
      return true;
    }
    if (this.aliados.every(x => x.hp <= 0)) {
      this.fim = 'derrota'; this.desenhar(); VJ.perder(); VJ.sfx('toin');
      texto(this, LARG / 2, 300, 'O time caiu', 40, '#ef6b7b').setDepth(45);
      texto(this, LARG / 2, 360, 'Upe os devotos com Fragmentos (missões reais)\ne tente de novo.', 16).setDepth(45);
      this.botaoFim('Voltar ao mapa', () => VJ.voltarMapa());
      return true;
    }
    return false;
  }
  botaoFim(rot, cb) {
    const c = this.add.container(LARG / 2, 780).setDepth(46);
    const bg = this.add.graphics().fillStyle(0xe9c46a, 1).fillRoundedRect(-150, -28, 300, 56, 14);
    c.add([bg, texto(this, 0, 0, rot, 20, '#1b1408', { stroke: '#e9c46a', strokeThickness: 0 })]);
    let foi = false;
    const vai = () => { if (foi) return; foi = true; this.tweens.killTweensOf(c); cb(); };
    c.setSize(300, 56).setInteractive({ useHandCursor: true }).on('pointerdown', vai);
    // plano B: qualquer toque na tela depois de 1,5 s também continua
    this.time.delayedCall(1500, () => this.input.on('pointerdown', vai));
    this.tweens.add({ targets: c, scale: 1.05, yoyo: true, repeat: -1, duration: 600 });
  }
}

window.criarJogo = function (pai) {
  return new Phaser.Game({
    type: Phaser.AUTO, parent: pai, width: LARG * Z, height: ALT * Z, backgroundColor: '#0f0d17',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 2 }, render: { antialias: true },
    scene: [Carregar, Explorar, Batalha],
  });
};
