// VITRAL — Desafio da Ponte: corrida com tiro automático (cena Phaser). Carregado depois de explorar.js.
// O herói corre sozinho pela ponte sobre a Bruma; o dedo só move para os lados. Os raios de luz saem
// sozinhos. Vasos de barro com número guardam melhorias; no fim da ponte vem o Servo do Insaciável.
'use strict';

const PONTE = { cx: LARG / 2, hy: 190, by: ALT + 60, fHeroi: 0.84, duracao: 45000 };
const fY = f => PONTE.hy + (PONTE.by - PONTE.hy) * f * f;     // profundidade → altura na tela
const fW = f => 26 + 200 * f;                                   // meia largura da ponte
const fX = (f, l) => PONTE.cx + l * fW(f) * 0.82;
const fS = f => 0.14 + 0.86 * f;                                // escala pela distância
const MELHORIAS = {
  raio: { nome: '+1 RAIO', item: 'espada-luz', cor: 0xf2c94c },
  ritmo: { nome: 'MAIS RÁPIDO', item: 'tenis-asas', cor: 0x5aa9e6 },
  forca: { nome: 'LUZ MAIS FORTE', item: 'relicario', cor: 0xb38cff },
  escudo: { nome: '+1 CORAÇÃO', item: 'escudo-rosacea', cor: 0x5fd39a },
};

class Desafio extends Phaser.Scene {
  constructor() { super('desafio'); }
  preload() {
    const v = window.VJ.versao;
    Object.values(MELHORIAS).forEach(m => { if (!this.textures.exists('it-' + m.item)) this.load.image('it-' + m.item, `assets/itens/${m.item}.webp?${v}`); });
  }
  create() {
    const VJ = window.VJ, p = VJ.p();
    this.cameras.main.setZoom(Z).centerOn(LARG / 2, ALT / 2).fadeIn(300, 15, 13, 23);
    this.vasoTextura();
    // céu, Bruma e a ponte
    const ceu = this.add.graphics();
    ceu.fillGradientStyle(0xb9a7d8, 0xb9a7d8, 0xf3d9c4, 0xf3d9c4, 1).fillRect(0, 0, LARG, PONTE.hy + 20);
    ceu.fillGradientStyle(0x8d86a8, 0x8d86a8, 0x3b3550, 0x3b3550, 1).fillRect(0, PONTE.hy, LARG, ALT - PONTE.hy);
    this.add.particles(0, 0, 'ponto', { x: { min: -40, max: LARG + 40 }, y: { min: PONTE.hy - 10, max: ALT }, speedX: { min: -16, max: 16 }, scale: { start: 3, end: 5 }, alpha: { start: 0.18, end: 0 }, tint: 0xd8d4e6, lifespan: 4000, frequency: 90 });
    this.chao = this.add.graphics();
    this.tabuas = 0;
    // herói (de costas, correndo)
    const k = p.heroi && this.textures.exists('anda-' + p.heroi) ? p.heroi : 'kael';
    this.anim(k);
    this.heroi = this.add.sprite(fX(PONTE.fHeroi, 0), fY(PONTE.fHeroi), 'anda-' + k, 12).setOrigin(0.5, 0.96).setScale(0.95).play(k + '-cima');
    this.add.ellipse(0, 0, 50, 14, 0x000000, 0.3).setName('sombra');
    this.sombra = this.children.getByName('sombra');
    this.lane = 0; this.alvoLane = 0;
    // estado da corrida
    this.st = { vidas: 3, raios: 1, ritmo: 1, forca: 1, abates: 0, t: 0, fim: false, chefe: null };
    this.balas = []; this.inimigos = []; this.vasos = [];
    this.proxTiro = 0; this.proxInimigo = 800; this.proxVaso = 3500;
    // interface
    this.hud = texto(this, 14, 26, '', 18, '#ffffff', { align: 'left' }).setOrigin(0, 0.5).setDepth(5000);
    this.barra = this.add.rectangle(LARG / 2, 54, 0, 8, 0xf2c94c).setDepth(5000);
    this.add.rectangle(LARG / 2, 54, 220, 12).setStrokeStyle(2, 0xffffff, 0.6).setDepth(5000);
    this.dica = texto(this, LARG / 2, ALT - 70, 'Arraste para os lados', 18, '#ffffff').setDepth(5000);
    this.tweens.add({ targets: this.dica, alpha: 0, delay: 2600, duration: 600 });
    this.input.on('pointermove', ptr => { if (ptr.isDown) this.mover(ptr); });
    this.input.on('pointerdown', ptr => this.mover(ptr));
    this.teclas = this.input.keyboard ? this.input.keyboard.createCursorKeys() : null;
    VJ.musica('09-batalha');
    this.pintarHud();
  }
  anim(k) {
    if (this.anims.exists(k + '-cima')) return;
    const a = (n, ini) => this.anims.create({ key: `${k}-${n}`, frames: this.anims.generateFrameNumbers('anda-' + k, { start: ini, end: ini + 5 }), frameRate: 12, repeat: -1 });
    a('baixo', 0); a('lado', 6); a('cima', 12);
  }
  vasoTextura() {
    if (this.textures.exists('vaso')) return;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x7a4422, 1).fillEllipse(40, 62, 70, 76);
    g.fillStyle(0x9a5a2e, 1).fillEllipse(36, 56, 50, 56);
    g.fillStyle(0x7a4422, 1).fillRect(26, 6, 28, 26).fillEllipse(40, 8, 40, 12);
    g.lineStyle(7, 0x7a4422, 1).strokeCircle(14, 34, 10).strokeCircle(66, 34, 10);
    g.lineStyle(4, 0xe9c46a, 1).beginPath().moveTo(12, 70).lineTo(68, 70).strokePath();
    g.generateTexture('vaso', 80, 100); g.destroy();
  }
  mover(ptr) {
    if (this.st.fim) return;
    const wx = this.cameras.main.getWorldPoint(ptr.x, ptr.y).x;
    this.alvoLane = Phaser.Math.Clamp((wx - PONTE.cx) / (fW(PONTE.fHeroi) * 0.82), -0.9, 0.9);
  }
  pintarHud() {
    const s = this.st;
    this.hud.setText(`${'❤️'.repeat(Math.max(0, s.vidas))}   ⚔️ ${s.abates}`);
    this.barra.width = 220 * Math.min(1, s.t / PONTE.duracao);
  }
  desenharPonte(dt) {
    const g = this.chao; g.clear();
    const f0 = 0.02, f1 = 1.1;
    g.fillStyle(0xcfc6b8, 1).fillPoints([{ x: fX(f0, -1.2), y: fY(f0) }, { x: fX(f0, 1.2), y: fY(f0) }, { x: fX(f1, 1.2), y: fY(f1) }, { x: fX(f1, -1.2), y: fY(f1) }], true);
    // tábuas passando: dão a sensação de correr
    this.tabuas = (this.tabuas + dt * 0.0011) % 0.08;
    for (let f = 0.04 + this.tabuas; f < f1; f += 0.08) {
      g.lineStyle(Math.max(1, 5 * f), 0xa8998a, 0.9).beginPath().moveTo(fX(f, -1.2), fY(f)).lineTo(fX(f, 1.2), fY(f)).strokePath();
    }
    // guarda-corpos dos dois lados
    [-1.2, 1.2].forEach(l => {
      g.lineStyle(6, 0x6b4a32, 1).beginPath().moveTo(fX(f0, l), fY(f0) - 6).lineTo(fX(f1, l), fY(f1) - 70).strokePath();
      for (let f = 0.04 + this.tabuas; f < f1; f += 0.16) g.lineStyle(Math.max(2, 7 * f), 0x6b4a32, 1).beginPath().moveTo(fX(f, l), fY(f)).lineTo(fX(f, l), fY(f) - 60 * f).strokePath();
    });
    // a linha dourada no meio
    g.lineStyle(3, 0xe9c46a, 0.5).beginPath().moveTo(fX(f0, 0), fY(f0)).lineTo(fX(f1, 0), fY(f1)).strokePath();
  }
  // ---- coisas que aparecem na ponte ----
  novoInimigo() {
    const t = this.st.t, beli = Math.random() < 0.45;
    const hp = Math.round((beli ? 18 : 32) * (1 + t / 30000));
    const l = Phaser.Math.FloatBetween(-0.85, 0.85);
    let spr;
    if (beli) spr = this.add.image(0, 0, 'beliscao').setOrigin(0.5, 1);
    else { const k = sorteia(['simo', 'clara', 'tonho', 'luzia', 'gio', 'guto']); this.anim(k); spr = this.add.sprite(0, 0, 'anda-' + k, 0).setOrigin(0.5, 0.96).setTint(0x6f6c80).play(k + '-baixo'); }
    this.inimigos.push({ f: 0.02, l, hp, max: hp, spr, base: beli ? 0.32 : 1, vel: (beli ? 0.24 : 0.19) * (1 + t / 60000) });
  }
  novosVasos() {
    const tipos = Phaser.Utils.Array.Shuffle(Object.keys(MELHORIAS).filter(k => k !== 'escudo' || this.st.vidas < 5)).slice(0, 2);
    [-0.55, 0.55].forEach((l, i) => {
      const hp = Math.round(Phaser.Math.Between(6, 14) * 10 * (1 + this.st.t / 40000));
      const m = MELHORIAS[tipos[i]];
      const spr = this.add.image(0, 0, 'vaso').setOrigin(0.5, 1);
      const num = texto(this, 0, 0, String(hp), 26, '#ffffff');
      const bolha = this.add.circle(0, 0, 34, m.cor, 0.35).setStrokeStyle(3, m.cor, 0.9);
      const ico = this.add.image(0, 0, 'it-' + m.item).setDisplaySize(52, 52);
      this.vasos.push({ f: 0.02, l, hp, tipo: tipos[i], spr, num, bolha, ico, vel: 0.17 });
    });
  }
  atirar() {
    const s = this.st, n = s.raios;
    for (let i = 0; i < n; i++) {
      const l = this.lane + (i - (n - 1) / 2) * 0.14;
      const spr = this.add.ellipse(0, 0, 10, 26, 0xfff2b0, 1).setBlendMode('ADD');
      this.balas.push({ f: PONTE.fHeroi - 0.03, l, spr });
    }
    window.VJ.sfx('golpe');
  }
  posicionar(o, f, l, base = 1) {
    o.spr.setPosition(fX(f, l), fY(f)).setScale(fS(f) * base).setDepth(1000 + f * 1000);
  }
  ferido() {
    const s = this.st; s.vidas--; this.pintarHud();
    this.cameras.main.shake(220, 0.012); this.heroi.setTintFill(0xff6b6b); this.time.delayedCall(140, () => this.heroi.clearTint());
    window.VJ.sfx('toin');
    if (s.vidas <= 0) this.terminar(false);
  }
  update(_, dt) {
    const s = this.st; if (s.fim) return;
    dt = Math.min(dt, 50); s.t += dt;
    if (this.teclas) { if (this.teclas.left.isDown) this.alvoLane = Math.max(-0.9, this.alvoLane - dt * 0.003); if (this.teclas.right.isDown) this.alvoLane = Math.min(0.9, this.alvoLane + dt * 0.003); }
    this.lane += (this.alvoLane - this.lane) * Math.min(1, dt * 0.015);
    this.desenharPonte(dt);
    this.heroi.setPosition(fX(PONTE.fHeroi, this.lane), fY(PONTE.fHeroi)).setDepth(1000 + PONTE.fHeroi * 1000);
    this.sombra.setPosition(this.heroi.x, this.heroi.y).setDepth(this.heroi.depth - 1);
    // tiro automático
    this.proxTiro -= dt; if (this.proxTiro <= 0) { this.atirar(); this.proxTiro = 300 / s.ritmo; }
    // o que vem pela ponte: até o fim do tempo; depois, o Servo
    if (s.t < PONTE.duracao) {
      this.proxInimigo -= dt; if (this.proxInimigo <= 0) { this.novoInimigo(); this.proxInimigo = Math.max(380, 1100 - s.t / 60); }
      this.proxVaso -= dt; if (this.proxVaso <= 0) { this.novosVasos(); this.proxVaso = 7000; }
    } else if (!s.chefe) this.chegaChefe();
    // raios de luz
    this.balas = this.balas.filter(b => {
      b.f -= dt * 0.0011;
      // mira que ajuda: o raio puxa de leve para o inimigo mais perto na frente
      const perto = this.inimigos.filter(o => o.hp > 0 && o.f < b.f && Math.abs(o.l - b.l) < 0.45).sort((a, c) => c.f - a.f)[0];
      if (perto) b.l += (perto.l - b.l) * Math.min(1, dt * 0.006);
      if (b.f < 0.03) { b.spr.destroy(); return false; }
      b.spr.setPosition(fX(b.f, b.l), fY(b.f) - 40 * fS(b.f)).setScale(fS(b.f)).setDepth(1000 + b.f * 1000);
      const alvo = [...this.vasos, ...this.inimigos, ...(s.chefe ? [s.chefe] : [])].find(o => o.hp > 0 && Math.abs(o.f - b.f) < 0.035 && Math.abs(o.l - b.l) < (o.largura || 0.2));
      if (!alvo) return true;
      alvo.hp -= Math.round(10 * s.forca); b.spr.destroy();
      if (alvo.spr) { alvo.spr.setTintFill(0xffffff); this.time.delayedCall(60, () => { if (!alvo.spr.active) return; if (alvo.cinza) alvo.spr.setTint(0x6f6c80); else if (alvo.spr.texture.key.startsWith('anda-')) alvo.spr.setTint(0x6f6c80); else alvo.spr.clearTint(); }); }
      return false;
    });
    // inimigos
    this.inimigos = this.inimigos.filter(e => {
      if (e.hp <= 0) { s.abates++; this.estoura(e.spr.x, e.spr.y - 30, 0xb4b1c2); e.spr.destroy(); this.pintarHud(); return false; }
      e.f += dt * e.vel / 1000;
      if (e.f > PONTE.fHeroi - 0.02 && e.f < PONTE.fHeroi + 0.03 && Math.abs(e.l - this.lane) < 0.3) { e.spr.destroy(); this.ferido(); return false; }
      if (e.f > 1.08) { e.spr.destroy(); return false; }
      this.posicionar(e, e.f, e.l, e.base); return true;
    });
    // vasos com melhoria
    this.vasos = this.vasos.filter(v => {
      if (v.hp <= 0) { this.melhorar(v.tipo, v.spr.x, v.spr.y); [v.spr, v.num, v.bolha, v.ico].forEach(o => o.destroy()); return false; }
      v.f += dt * v.vel / 1000;
      if (v.f > 1.08) { [v.spr, v.num, v.bolha, v.ico].forEach(o => o.destroy()); return false; }
      this.posicionar(v, v.f, v.l, 0.9);
      const x = fX(v.f, v.l), y = fY(v.f), sc = fS(v.f), d = 1000 + v.f * 1000;
      v.num.setText(String(Math.max(0, v.hp))).setPosition(x, y - 45 * sc).setScale(sc).setDepth(d + 1);
      v.bolha.setPosition(x, y - 140 * sc).setScale(sc).setDepth(d + 1); v.ico.setPosition(x, y - 140 * sc).setScale(sc * 52 / v.ico.width).setDepth(d + 2);
      return true;
    });
    // o Servo no fim da ponte
    if (s.chefe) {
      const c = s.chefe;
      if (c.hp <= 0) return this.terminar(true);
      c.f += dt * c.vel / 1000; this.posicionar(c, c.f, 0, 0.75);
      c.vida.setPosition(LARG / 2, 84).setDepth(5000); c.vidaBar.width = 220 * Math.max(0, c.hp) / c.max;
      if (c.f > PONTE.fHeroi - 0.04) { this.st.vidas = 0; this.pintarHud(); this.terminar(false); }
    }
    this.pintarHud();
  }
  melhorar(tipo, x, y) {
    const s = this.st, m = MELHORIAS[tipo];
    if (tipo === 'raio') s.raios = Math.min(5, s.raios + 1);
    if (tipo === 'ritmo') s.ritmo = Math.min(2.6, s.ritmo * 1.3);
    if (tipo === 'forca') s.forca = Math.min(4, s.forca * 1.5);
    if (tipo === 'escudo') s.vidas = Math.min(5, s.vidas + 1);
    this.estoura(x, y - 40, m.cor);
    const t = texto(this, LARG / 2, ALT / 2 - 80, m.nome + '!', 34, '#' + m.cor.toString(16).padStart(6, '0')).setDepth(6000);
    this.tweens.add({ targets: t, y: t.y - 60, alpha: 0, scale: 1.3, duration: 1100, onComplete: () => t.destroy() });
    window.VJ.sfx('moeda');
  }
  chegaChefe() {
    const s = this.st, hp = Math.round(900 * (0.6 + 0.25 * s.raios + 0.2 * s.forca + 0.15 * s.ritmo));
    const spr = this.add.image(0, 0, 'servo').setOrigin(0.5, 1);
    const vida = this.add.rectangle(LARG / 2, 84, 224, 14, 0x000000, 0.5).setStrokeStyle(2, 0xef6b7b);
    const vidaBar = this.add.rectangle(LARG / 2 - 110, 84, 220, 10, 0xef6b7b).setOrigin(0, 0.5).setDepth(5001);
    s.chefe = { f: 0.02, l: 0, hp, max: hp, spr, vida, vidaBar, vel: 0.055, largura: 0.6 };
    const t = texto(this, LARG / 2, ALT / 2 - 120, 'O SERVO DO INSACIÁVEL!', 26, '#ff8a98').setDepth(6000);
    this.tweens.add({ targets: t, alpha: 0, delay: 1400, duration: 600, onComplete: () => t.destroy() });
    window.VJ.musica('10-boss');
  }
  estoura(x, y, cor) {
    const fx = this.add.particles(x, y, 'ponto', { speed: { min: 60, max: 200 }, scale: { start: 0.6, end: 0 }, lifespan: 500, tint: [cor, 0xffffff], blendMode: 'ADD', emitting: false }).setDepth(7000);
    fx.explode(16); this.time.delayedCall(600, () => fx.destroy());
  }
  terminar(venceu) {
    const s = this.st; if (s.fim) return; s.fim = true;
    this.heroi.anims.stop();
    const r = window.VJ.fimDesafio({ venceu, abates: s.abates });
    const caixa = this.add.rectangle(LARG / 2, ALT / 2, 320, 300, 0x15121f, 0.94).setStrokeStyle(3, venceu ? 0xf2c94c : 0xef6b7b).setDepth(9000);
    texto(this, LARG / 2, ALT / 2 - 100, venceu ? 'PONTE LIBERTADA!' : 'A Bruma venceu desta vez', venceu ? 28 : 22, venceu ? '#f3d27e' : '#ff8a98').setDepth(9001);
    texto(this, LARG / 2, ALT / 2 - 20, r.texto, 17, '#ffffff', { wordWrap: { width: 280 } }).setDepth(9001);
    const botao = (y, rotulo, cb) => {
      const b = this.add.rectangle(LARG / 2, y, 240, 48, 0xe9c46a).setDepth(9001).setInteractive({ useHandCursor: true }).on('pointerdown', cb);
      texto(this, LARG / 2, y, rotulo, 18, '#1a1426', { stroke: '#e9c46a', strokeThickness: 0 }).setDepth(9002);
      return b;
    };
    if (r.podeDeNovo) botao(ALT / 2 + 60, 'Correr de novo', () => { if (window.VJ.comecarDesafio()) this.scene.restart(); });
    botao(ALT / 2 + (r.podeDeNovo ? 118 : 70), 'Voltar', () => window.VJ.sair());
    if (venceu) window.VJ.sfx('fanfarra');
  }
}
