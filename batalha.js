// VITRAL — batalha em tempo real (cena Phaser). Carregado depois de game.js.
// O herói anda com o dedo e, quando para, atira raios de luz sozinho no inimigo mais perto:
// andar é desviar, parar é atacar. ⚡ Esquiva (invencível por um instante; desviar no último
// segundo deixa o tempo lento), ✨ Dom com recarga, 💥 Supremo que enche causando dano,
// e troca de herói tocando no retrato (duas virtudes que combinam disparam um Combo).
'use strict';

const ARENA = { x0: 28, x1: LARG - 28, y0: 440, y1: 720 };
const VIDA_INIMIGO = 5.5;            // a vida dos inimigos foi pensada para turnos; em tempo real dura mais
const VEL_HEROI = 0.2;               // px por ms
const profund = y => 0.8 + 0.3 * (y - ARENA.y0) / (ARENA.y1 - ARENA.y0);   // mais perto da tela = maior
const IA = {
  larva:      { jeito: 'rasteja', vel: 0.04,  esc: 0.36, raio: 34 },
  beliscao:   { jeito: 'atira',   vel: 0.075, esc: 0.3,  raio: 30 },
  copia:      { jeito: 'investe', vel: 0.09,  esc: 0.92, raio: 24 },
  servo:      { jeito: 'servo',   vel: 0.065, esc: 0.42, raio: 44 },
  insaciavel: { jeito: 'chefe',   vel: 0,     esc: 0.5,  raio: 70 },
};

function texturasLuta(cena) {
  if (cena.textures.exists('raio')) return;
  const g = cena.make.graphics({ x: 0, y: 0, add: false });
  // raio de luz: miolo branco com halo
  g.fillStyle(0xffffff, 0.25).fillEllipse(20, 8, 40, 16); g.fillStyle(0xffffff, 0.6).fillEllipse(22, 8, 30, 9); g.fillStyle(0xffffff, 1).fillEllipse(25, 8, 18, 5);
  g.generateTexture('raio', 40, 16); g.clear();
  // orbe da Bruma: bola escura com borda roxa
  g.fillStyle(0x8f6bd1, 0.35).fillCircle(14, 14, 14); g.fillStyle(0x2a2238, 1).fillCircle(14, 14, 9); g.lineStyle(2, 0xc9a7ff, 1).strokeCircle(14, 14, 9);
  g.generateTexture('orbe', 28, 28); g.destroy();
}

class Batalha extends Phaser.Scene {
  constructor() { super('batalha'); }
  init(dados) { this.no = dados.no; this.fim = null; }
  create() {
    const VJ = window.VJ, p = VJ.p(), no = this.no;
    texturasLuta(this);
    this.pausa = true;
    this.chefe = no.t === 'chefe' || no.t === 'boss';
    this.cameras.main.setZoom(Z).centerOn(LARG / 2, ALT / 2).fadeIn(300, 15, 13, 23);
    // cenário: praça de pedra nas batalhas comuns, vinhedo com tempestade de Bruma nos chefes
    const fundo = this.add.image(LARG / 2, ALT, this.chefe ? 'batalha-r1-chefe' : 'batalha-r1').setOrigin(0.5, 1);
    fundo.setScale(Math.max(LARG / fundo.width, ALT / fundo.height) * 1.12).setDepth(-10);
    this.add.particles(0, 0, 'ponto', { x: { min: -60, max: LARG + 60 }, y: { min: 380, max: 560 }, speedX: { min: -18, max: -6 }, scale: { start: 3.2, end: 4.6 }, alpha: { start: 0.14, end: 0 }, tint: 0xb9b6c6, lifespan: 5200, frequency: 160 }).setDepth(-5);
    this.add.particles(0, 0, 'ponto', { x: { min: 0, max: LARG }, y: { min: 0, max: ALT }, speedY: { min: -14, max: -4 }, scale: { start: 0.14, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: this.chefe ? [0xff9a4d, 0xffd27a] : [0xfff2b0, 0xffffff], lifespan: 4000, frequency: 110, blendMode: 'ADD' }).setDepth(1500);
    const vin = this.add.graphics().setDepth(1490);
    for (let i = 0; i < 10; i++) { vin.lineStyle(12, 0x07060c, 0.05 + i * 0.012); vin.strokeRect(-i * 6, -i * 6, LARG + i * 12, ALT + i * 12); }
    vin.fillStyle(0x07060c, 0.45).fillRect(0, ALT - 118, LARG, 118);
    this.cor = this.cameras.main.postFX ? this.cameras.main.postFX.addColorMatrix() : null;
    this.sat = { v: -0.15 }; if (this.cor) this.cor.saturate(this.sat.v);
    this.faiscas = this.add.particles(0, 0, 'ponto', { speed: { min: 80, max: 260 }, scale: { start: 0.6, end: 0 }, lifespan: 420, emitting: false, blendMode: 'ADD' }).setDepth(1400);
    this.poeira = this.add.particles(0, 0, 'ponto', { speed: { min: 10, max: 40 }, angle: { min: 200, max: 340 }, scale: { start: 0.35, end: 0 }, alpha: { start: 0.5, end: 0 }, lifespan: 380, tint: 0xd8c39a, emitting: false }).setDepth(5);

    // o time: só o herói ativo fica no campo; os outros esperam no retrato
    this.aliados = p.equipe.filter(k => p.devotos[k]).slice(0, 4).map(k => {
      const s = VJ.stats(k, p.devotos[k].lvl), d = VJ.DEVOTOS[k];
      const b = new Boneco(this, k, LARG / 2, 680, 0.95).setVisible(false);
      b.passo = () => this.poeira.emitParticleAt(b.x, b.y, 2);
      return { k, d, b, hp: s.hp, max: s.hp, atk: s.atk, def: s.def || 0, crit: s.crit || 0, dom: s.dom || 0, carga: 0, cdDom: 0, escudo: 0 };
    });
    this.sombra = this.add.ellipse(0, 0, 50, 15, 0x000000, 0.32);
    this.ativo = 0; this.heroi = this.aliados[0]; this.heroi.b.setVisible(true).olhar(0, -1);
    this.hx = LARG / 2; this.hy = 690;

    // inimigos
    const n = no.inimigos.length, xs = n === 1 ? [LARG / 2] : n === 2 ? [125, 265] : [80, 195, 310];
    this.inimigos = no.inimigos.map((k, i) => this.criarInimigo(k, xs[i], k === 'insaciavel' ? 500 : 480 + (i % 2) * 30));

    this.tiros = []; this.orbes = []; this.marcas = []; this.ajudantes = [];
    this.st = { tiro: 0, parado: 0, dash: 0, dashV: null, esqCd: 0, inv: 0, trocaCd: 0, buff: 0, lento: 0, congela: 0, combo: 0, comboT: 0, perfeita: false, fantasma: 0 };
    this.vet = { x: 0, y: 0 }; this.toque = null;
    this.barras = this.add.graphics().setDepth(1300);
    this.criarHud(); this.criarBotoes(); this.criarJoystick();
    this.teclas = this.input.keyboard ? this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,SHIFT,Q,E') : null;
    VJ.musica(this.chefe ? '10-boss' : '09-batalha');
    this.abertura(no);
  }
  criarInimigo(k, x, y) {
    const VJ = window.VJ, e = VJ.INIMIGOS[k], ia = IA[k] || IA.beliscao;
    let obj;
    if (k === 'copia') obj = new Boneco(this, sorteia(Object.keys(VJ.DEVOTOS)), x, -80, ia.esc, true).olhar(0, 1);
    else obj = this.add.image(x, -80, k).setOrigin(0.5, 1).setScale(ia.esc);
    const f = { k, ia, obj, nome: e.nome, x, y, hp: Math.round(e.hp * VIDA_INIMIGO * (ia.jeito === 'chefe' || ia.jeito === 'servo' ? 0.75 : 1)), atk: e.atk, estado: 'chega', t: 900 + Math.random() * 600, stun: 0, fase: Math.random() * 6, padrao: 0 };
    f.max = f.hp;
    this.tweens.add({ targets: obj, y, duration: 600, delay: 150 + Math.random() * 300, ease: 'Bounce.out' });
    return f;
  }
  altura(f) { return f.obj instanceof Boneco ? 110 * f.obj.esc : f.obj.displayHeight; }
  centro(f) { return { x: f.x, y: f.y - this.altura(f) * 0.5 }; }

  // ---------- abertura ----------
  async abertura(no) {
    const faixa1 = this.add.rectangle(LARG / 2, -60, LARG, 120, 0x000000).setDepth(2000);
    const faixa2 = this.add.rectangle(LARG / 2, ALT + 60, LARG, 120, 0x000000).setDepth(2000);
    const tit = texto(this, -200, ALT / 2 - 40, no.t === 'chefe' ? 'CHEFE!' : no.t === 'boss' ? 'BOSS!' : 'ENCONTRO!', 44, '#f3d27e').setDepth(2001);
    const sub = texto(this, LARG + 200, ALT / 2 + 10, no.titulo, 20).setDepth(2001);
    this.tweens.add({ targets: faixa1, y: 60, duration: 300 }); this.tweens.add({ targets: faixa2, y: ALT - 60, duration: 300 });
    this.tweens.add({ targets: tit, x: LARG / 2, duration: 350, ease: 'Back.out' }); await tw(this, { targets: sub, x: LARG / 2, duration: 350, ease: 'Back.out' });
    this.cameras.main.shake(250, 0.01);
    await espera(this, 800);
    this.tweens.add({ targets: [tit, sub], alpha: 0, duration: 250 });
    this.tweens.add({ targets: faixa1, y: -60, duration: 300 }); await tw(this, { targets: faixa2, y: ALT + 60, duration: 300 });
    [faixa1, faixa2, tit, sub].forEach(o => o.destroy());
    this.inimigos.forEach(f => { f.estado = 'anda'; });
    this.pausa = false;
    const dica = texto(this, LARG / 2, 400, 'Arraste para andar\nPARE para atirar · ⚡ desvia', 20, '#ffffff').setDepth(1600);
    this.tweens.add({ targets: dica, alpha: 0, delay: 2600, duration: 500, onComplete: () => dica.destroy() });
  }

  // ---------- interface ----------
  criarHud() {
    // retratos do time (tocar troca o herói)
    this.retratos = this.aliados.map((a, i) => {
      const c = this.add.container(36, 128 + i * 70).setDepth(1700);
      const bg = this.add.graphics();
      const rosto = this.add.image(0, 6, 'anda-' + a.k, 0).setScale(0.62);
      rosto.setCrop(14, 0, 68, 70);
      const vida = this.add.graphics();
      c.add([bg, rosto, vida]); c.bg = bg; c.vida = vida; c.rosto = rosto;
      c.setSize(60, 60).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.trocar(i));
      return c;
    });
    this.tVida = texto(this, 112, ALT - 96, '', 15, '#ffffff', { align: 'left' }).setOrigin(0, 0.5).setDepth(1700);
    this.combo = texto(this, LARG - 22, 150, '', 30, '#f3d27e', { align: 'right' }).setOrigin(1, 0.5).setDepth(1700);
    if (this.chefe) {
      const f = this.inimigos[0];
      texto(this, LARG / 2, 64, f.nome, 16, '#ffd0d6').setDepth(1700);
      this.add.rectangle(LARG / 2, 84, 244, 16, 0x000000, 0.6).setStrokeStyle(2, 0xef6b7b).setDepth(1700);
      this.vidaChefe = this.add.rectangle(LARG / 2 - 120, 84, 240, 12, 0xef6b7b).setOrigin(0, 0.5).setDepth(1701);
    }
  }
  criarBotoes() {
    const bot = (x, y, r, ic, cor, cb) => {
      const c = this.add.container(x, y).setDepth(1700);
      c.bg = this.add.graphics(); c.t = texto(this, 0, -2, ic, r > 30 ? 26 : 18); c.sub = texto(this, 0, r + 10, '', 11, '#ffffff');
      c.add([c.bg, c.t, c.sub]); c.r = r; c.cor = cor;
      c.setSize(r * 2 + 10, r * 2 + 10).setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (!this.pausa && !this.fim) cb(); });
      return c;
    };
    this.bSup = bot(LARG - 64, ALT - 172, 36, '💥', 0xe9c46a, () => this.supremo());
    this.bDom = bot(LARG - 52, ALT - 72, 34, '✨', 0x6b4fb0, () => this.usarDom());
    this.bEsq = bot(LARG - 142, ALT - 52, 28, '⚡', 0x2f6fb0, () => this.esquivar());
    this.bPil = bot(LARG - 30, 214, 20, '💊', 0x2c2540, () => this.pilula());
    this.bCar = bot(LARG - 30, 268, 20, '🃏', 0x4a2f7a, () => this.abrirCartas());
    const sair = bot(30, 40, 20, '✕', 0x2c2540, () => window.VJ.sair());
    sair.removeInteractive(); sair.setInteractive({ useHandCursor: true }).on('pointerdown', () => window.VJ.sair());
    this.bSair = sair;
  }
  pintarBotao(b, pronto, frac = 1, sub = '') {
    const g = b.bg.clear();
    g.fillStyle(0x000000, 0.45).fillCircle(0, 0, b.r + 3);
    g.fillStyle(b.cor, pronto ? 1 : 0.35).fillCircle(0, 0, b.r);
    if (!pronto && frac > 0) g.lineStyle(5, b.cor, 1).beginPath().arc(0, 0, b.r - 2, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2).strokePath();
    g.lineStyle(2, 0xffffff, pronto ? 0.6 : 0.15).strokeCircle(0, 0, b.r);
    b.t.setAlpha(pronto ? 1 : 0.55); b.sub.setText(sub);
  }
  pintarHud() {
    const a = this.heroi, p = window.VJ.p();
    this.retratos.forEach((c, i) => {
      const x = this.aliados[i], on = i === this.ativo, vivo = x.hp > 0;
      c.bg.clear().fillStyle(on ? 0x3a2f12 : 0x15121f, 0.9).fillRoundedRect(-30, -30, 60, 60, 12)
        .lineStyle(on ? 3 : 2, on ? 0xe9c46a : COR_V[x.d.v], vivo ? 1 : 0.3).strokeRoundedRect(-30, -30, 60, 60, 12);
      if (!on && this.st.trocaCd > 0 && vivo) c.bg.fillStyle(0x000000, 0.55).fillRect(-30, -30, 60, 60 * this.st.trocaCd / 2500);
      c.rosto.setAlpha(vivo ? 1 : 0.3);
      c.vida.clear().fillStyle(0x000000, 0.7).fillRect(-26, 22, 52, 6).fillStyle(0x5fd39a, 1).fillRect(-26, 22, 52 * Math.max(0, x.hp) / x.max, 6);
      c.vida.fillStyle(0xe9c46a, 1).fillRect(-26, 28, 52 * x.carga / 100, 3);
    });
    const g = this.barras.clear();
    // vida e escudo do herói ativo, embaixo à esquerda
    g.fillStyle(0x000000, 0.6).fillRoundedRect(16, ALT - 80, 190, 16, 6).fillStyle(0x5fd39a, 1).fillRoundedRect(18, ALT - 78, 186 * Math.max(0, a.hp) / a.max, 12, 5);
    if (a.escudo > 0) g.fillStyle(0x4aa3ff, 0.9).fillRoundedRect(18, ALT - 78, Math.min(186, 186 * a.escudo / a.max), 5, 2);
    g.fillStyle(0x000000, 0.6).fillRoundedRect(16, ALT - 58, 190, 9, 4).fillStyle(0xe9c46a, 1).fillRoundedRect(18, ALT - 56, 186 * a.carga / 100, 5, 2);
    this.tVida.setPosition(18, ALT - 96).setText(`${a.d.nome}  ${Math.max(0, Math.ceil(a.hp))}/${a.max}`);
    // vida dos inimigos sobre a cabeça (o chefe usa a barra grande no topo)
    this.inimigos.forEach(f => {
      if (f.hp <= 0 || f.estado === 'chega') return;
      if (this.chefe && f === this.inimigos[0]) { this.vidaChefe.width = 240 * f.hp / f.max; return; }
      const w = 64, x = f.x - w / 2, y = f.y - this.altura(f) - 14;
      g.fillStyle(0x000000, 0.6).fillRoundedRect(x, y, w, 8, 3).fillStyle(0xef6b7b, 1).fillRoundedRect(x + 1, y + 1, (w - 2) * f.hp / f.max, 6, 3);
    });
    this.pintarBotao(this.bSup, a.carga >= 100, a.carga / 100, a.carga >= 100 ? 'SUPREMO!' : Math.floor(a.carga) + '%');
    this.pintarBotao(this.bDom, a.cdDom <= 0, 1 - a.cdDom / 7000, a.cdDom > 0 ? Math.ceil(a.cdDom / 1000) + 's' : 'Dom');
    this.pintarBotao(this.bEsq, this.st.esqCd <= 0, 1 - this.st.esqCd / 1000, 'desviar');
    this.pintarBotao(this.bPil, p.pilulas > 0, 0, String(p.pilulas));
    this.pintarBotao(this.bCar, this.cartasLivres().length > 0, 0, String(this.cartasLivres().length));
    this.pintarBotao(this.bSair, true);
    this.bSup.setScale(a.carga >= 100 ? 1 + Math.sin(this.time.now / 140) * 0.06 : 1);
    if (this.st.combo >= 3) this.combo.setText(`${this.st.combo}\nHITS`).setAlpha(1); else this.combo.setAlpha(0);
  }
  criarJoystick() {
    const R = 46;
    this.jBase = this.add.circle(0, 0, R, 0xffffff, 0.1).setStrokeStyle(3, 0xffffff, 0.4).setVisible(false).setDepth(1650);
    this.jKnob = this.add.circle(0, 0, R * 0.42, 0xe9c46a, 0.8).setVisible(false).setDepth(1651);
    this.input.on('pointerdown', (ptr, sobre) => {
      if (this.pausa || this.fim || sobre.length || this.toque !== null) return;
      this.toque = ptr.id; this.jBase.setPosition(ptr.worldX, ptr.worldY).setVisible(true); this.jKnob.setPosition(ptr.worldX, ptr.worldY).setVisible(true);
    });
    this.input.on('pointermove', ptr => {
      if (ptr.id !== this.toque || !ptr.isDown) return;
      let dx = ptr.worldX - this.jBase.x, dy = ptr.worldY - this.jBase.y; const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      this.jKnob.setPosition(this.jBase.x + dx, this.jBase.y + dy);
      this.vet = d < 8 ? { x: 0, y: 0 } : { x: dx / R, y: dy / R };
    });
    const solta = ptr => { if (ptr.id !== this.toque) return; this.toque = null; this.vet = { x: 0, y: 0 }; this.jBase.setVisible(false); this.jKnob.setVisible(false); };
    this.input.on('pointerup', solta); this.input.on('pointerupoutside', solta);
  }

  // ---------- laço principal ----------
  update(_, dtReal) {
    if (this.pausa || this.fim) return;
    dtReal = Math.min(dtReal, 50);
    if (this.st.congela > 0) { this.st.congela -= dtReal; return; }   // parada de impacto
    let dt = dtReal;
    if (this.st.lento > 0) { this.st.lento -= dtReal; dt *= 0.3; if (this.st.lento <= 0 && this.cor) this.cor.saturate(this.sat.v); }
    const s = this.st;
    s.esqCd = Math.max(0, s.esqCd - dtReal); s.inv = Math.max(0, s.inv - dt); s.trocaCd = Math.max(0, s.trocaCd - dtReal); s.buff = Math.max(0, s.buff - dt);
    this.aliados.forEach(a => { a.cdDom = Math.max(0, a.cdDom - dtReal); });
    if (s.comboT > 0 && (s.comboT -= dt) <= 0) s.combo = 0;
    this.moverHeroi(dt);
    this.atirar(dt);
    this.moverTiros(dt);
    this.inimigos.forEach(f => this.pensar(f, dt));
    this.moverOrbes(dt);
    this.moverMarcas(dt);
    this.moverAjudantes(dt);
    this.pintarHud();
  }
  moverHeroi(dt) {
    const s = this.st, a = this.heroi, b = a.b;
    let vx = this.vet.x, vy = this.vet.y;
    const k = this.teclas;
    if (k) { if (k.LEFT.isDown) vx = -1; else if (k.RIGHT.isDown) vx = 1; if (k.UP.isDown) vy = -1; else if (k.DOWN.isDown) vy = 1;
      if (Phaser.Input.Keyboard.JustDown(k.SHIFT)) this.esquivar(); if (Phaser.Input.Keyboard.JustDown(k.Q)) this.usarDom(); if (Phaser.Input.Keyboard.JustDown(k.E)) this.supremo(); }
    const forca = Math.min(1, Math.hypot(vx, vy));
    this.andando = forca > 0.15;
    if (s.dash > 0) {
      s.dash -= dt;
      this.hx += s.dashV.x * 0.95 * dt; this.hy += s.dashV.y * 0.95 * dt;
      if ((s.fantasma -= dt) <= 0) { s.fantasma = 28; this.fantasma(); }
      b.andar(dt, 1.6);
    } else if (this.andando) {
      const n = Math.hypot(vx, vy), v = VEL_HEROI * (0.5 + 0.5 * forca);
      this.hx += vx / n * v * dt; this.hy += vy / n * v * dt;
      b.olhar(vx, vy).andar(dt, 0.8 + 0.5 * forca);
    } else b.andar(dt, 0);
    this.hx = Phaser.Math.Clamp(this.hx, ARENA.x0, ARENA.x1); this.hy = Phaser.Math.Clamp(this.hy, ARENA.y0, ARENA.y1);
    const pouso = s.pouso > 0 ? (s.pouso / 220) ** 2 * 140 : 0; s.pouso = Math.max(0, (s.pouso || 0) - dt);
    b.setPosition(this.hx, this.hy - pouso).tamanho(0.95 * profund(this.hy)).setDepth(this.hy);
    if (s.inv > 0 && s.dash <= 0) b.setAlpha(Math.floor(this.time.now / 70) % 2 ? 0.45 : 1); else b.setAlpha(1);
    this.sombra.setPosition(this.hx, this.hy).setScale(profund(this.hy)).setDepth(this.hy - 1);
    if (this.bolha) this.bolha.setPosition(this.hx, this.hy - 50).setDepth(this.hy + 1).setVisible(a.escudo > 0);
    if (this.aura) this.aura.setPosition(this.hx, this.hy - 45).setDepth(this.hy - 2).setVisible(s.buff > 0);
  }
  fantasma() {
    const b = this.heroi.b, cor = COR_V[this.heroi.d.v];
    const g = this.add.image(b.x, b.y + (CORTE - PE) * b.esc, `bn-${b.k}-${b.dir}-t`).setOrigin(0.5, 1).setScale(b.esc * (b.virado ? -1 : 1), b.esc)
      .setTintFill(cor).setAlpha(0.55).setBlendMode('ADD').setDepth(b.depth - 1);
    this.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
  }
  vivos() { return this.inimigos.filter(f => f.hp > 0 && f.estado !== 'chega'); }
  maisPerto(x, y) {
    let m = null, dm = 1e9;
    this.vivos().forEach(f => { const c = this.centro(f), d = Math.hypot(c.x - x, c.y - y); if (d < dm) { dm = d; m = f; } });
    return m;
  }
  // parado = atirando: um raio de luz da cor da virtude no inimigo mais perto
  atirar(dt) {
    const s = this.st;
    if (this.andando || s.dash > 0) { s.parado = 0; return; }
    s.parado += dt; s.tiro -= dt;
    if (s.parado < 80 || s.tiro > 0) return;
    const alvo = this.maisPerto(this.hx, this.hy - 50); if (!alvo) return;
    s.tiro = 330 / (s.buff > 0 ? 1.6 : 1);
    const c = this.centro(alvo), a = this.heroi;
    a.b.olhar(c.x - this.hx, c.y - this.hy);
    this.disparar(a, this.hx, this.hy - 55 * profund(this.hy), alvo, 0.55);
  }
  disparar(a, x, y, alvo, mult) {
    const c = this.centro(alvo), ang = Math.atan2(c.y - y, c.x - x), cor = COR_V[a.d.v];
    const spr = this.add.image(x, y, 'raio').setTint(cor).setBlendMode('ADD').setRotation(ang).setDepth(1200);
    const brilho = this.add.circle(x, y, 10, cor, 0.6).setBlendMode('ADD').setDepth(1200);
    this.tweens.add({ targets: brilho, scale: 2, alpha: 0, duration: 120, onComplete: () => brilho.destroy() });
    this.tiros.push({ spr, x, y, vx: Math.cos(ang) * 0.95, vy: Math.sin(ang) * 0.95, alvo, a, mult, vida: 900 });
  }
  moverTiros(dt) {
    this.tiros = this.tiros.filter(t => {
      // segue de leve o alvo (mira que ajuda), mas sem curva fechada
      if (t.alvo.hp > 0) {
        const c = this.centro(t.alvo), ang = Math.atan2(c.y - t.y, c.x - t.x), atual = Math.atan2(t.vy, t.vx);
        const novo = Phaser.Math.Angle.RotateTo(atual, ang, 0.006 * dt);
        t.vx = Math.cos(novo) * 0.95; t.vy = Math.sin(novo) * 0.95; t.spr.setRotation(novo);
      }
      t.x += t.vx * dt; t.y += t.vy * dt; t.vida -= dt; t.spr.setPosition(t.x, t.y);
      const f = this.vivos().find(f => { const c = this.centro(f); return Math.hypot(c.x - t.x, c.y - t.y) < f.ia.raio * profund(f.y); });
      if (f) {
        const crit = Math.random() * 100 < (t.a.crit || 0);
        const dano = Math.round(t.a.atk * t.mult * (this.st.buff > 0 ? 1.3 : 1) * (crit ? 1.8 : 1) * (1 + Math.min(this.st.combo, 40) * 0.01) * (0.9 + Math.random() * 0.2));
        this.ferir(f, dano, COR_V[t.a.d.v], crit, t.vx, t.vy);
        if (t.a.carga !== undefined) t.a.carga = Math.min(100, t.a.carga + 2.4);
        t.spr.destroy(); return false;
      }
      if (t.vida <= 0) { t.spr.destroy(); return false; }
      return true;
    });
  }
  // dano em inimigo: pisca branco, empurra, número, faísca, combo
  ferir(f, dano, cor, forte, vx = 0, vy = 0) {
    if (f.hp <= 0) return;
    f.hp = Math.max(0, f.hp - dano);
    const c = this.centro(f);
    this.faiscas.setParticleTint(cor); this.faiscas.explode(forte ? 22 : 7, c.x, c.y);
    f.obj.setTintFill(0xffffff); this.time.delayedCall(70, () => f.obj.active && f.obj.clearTint());
    if (f.k !== 'insaciavel') { const n = Math.hypot(vx, vy) || 1; f.x += vx / n * (forte ? 12 : 4); f.y += vy / n * (forte ? 8 : 2); this.prender(f); }
    this.popNum(c.x + Phaser.Math.Between(-14, 14), c.y - 20, String(dano), forte ? '#f3d27e' : '#ffffff', forte ? 30 : 20);
    if (forte) { this.cameras.main.shake(140, 0.01); this.st.congela = 55; this.popNum(c.x, c.y - 60, 'CRÍTICO!', '#ff9a4d', 20); window.VJ.sfx('golpe'); }
    this.st.combo++; this.st.comboT = 2200;
    if (this.st.combo % 10 === 0) { this.tweens.add({ targets: this.combo, scale: { from: 1.6, to: 1 }, duration: 220 }); window.VJ.sfx('moeda'); }
    if (f.hp <= 0) this.morrer(f);
  }
  prender(f) { f.x = Phaser.Math.Clamp(f.x, ARENA.x0, ARENA.x1); f.y = Phaser.Math.Clamp(f.y, ARENA.y0 - 20, ARENA.y1); }
  morrer(f) {
    const c = this.centro(f);
    this.tweens.killTweensOf(f.obj);
    if (f.estrelas) { f.estrelas.destroy(); f.estrelas = null; }
    const p = this.add.particles(c.x, c.y, 'ponto', { speed: { min: 40, max: 160 }, scale: { start: 0.9, end: 0 }, tint: [0xb4b1c2, 0xffffff, COR_V[this.heroi.d.v]], lifespan: 800, emitting: false, blendMode: 'ADD' }).setDepth(1400);
    p.explode(46); this.time.delayedCall(900, () => p.destroy());
    this.cameras.main.shake(200, 0.012); this.st.congela = 90; window.VJ.sfx('fanfarra');
    this.tweens.add({ targets: f.obj, alpha: 0, scaleY: 0.05, duration: 450, onComplete: () => f.obj.destroy() });
    this.time.delayedCall(500, () => this.checarFim());
  }

  // ---------- inimigos ----------
  pensar(f, dt) {
    if (f.hp <= 0 || f.estado === 'chega') return;
    const o = f.obj, c = this.centro(f), dx = this.hx - f.x, dy = this.hy - f.y, d = Math.hypot(dx, dy) || 1;
    f.fase += dt * 0.004;
    if (f.stun > 0) {
      f.stun -= dt;
      if (f.estrelas) f.estrelas.setPosition(f.x, f.y - this.altura(f) - 26);
      if (f.stun <= 0 && f.estrelas) { f.estrelas.destroy(); f.estrelas = null; }
      if (o instanceof Boneco) o.andar(dt, 0);
      return this.posicionar(f);
    }
    f.t -= dt;
    const anda = (vx, vy, v) => { const n = Math.hypot(vx, vy) || 1; f.x += vx / n * v * dt; f.y += vy / n * v * dt; this.prender(f); if (o instanceof Boneco) o.olhar(vx, vy).andar(dt, 1); };
    const ia = f.ia;
    if (ia.jeito === 'rasteja') {
      if (f.estado === 'anda') { anda(dx, dy, ia.vel); if (d < 70 && f.t <= 0) { f.estado = 'mira'; f.t = 450; this.avisar(f); } }
      else if (f.estado === 'mira' && f.t <= 0) { if (d < 80) this.ferirHeroi(f.atk * 1.2, f); this.tweens.add({ targets: o, scaleX: o.scaleX * 1.25, yoyo: true, duration: 120 }); f.estado = 'anda'; f.t = 1500; }
    } else if (ia.jeito === 'atira') {
      // fica a uma distância, anda de lado e atira bolas da Bruma
      if (f.estado === 'anda') {
        const perto = d < 170 ? -1 : d > 240 ? 1 : 0;
        anda(dx * perto + -dy * Math.sin(f.fase) * 0.8, dy * perto + dx * Math.sin(f.fase) * 0.8, ia.vel);
        if (f.t <= 0) { f.estado = 'mira'; f.t = 600; this.avisar(f); }
      } else if (f.estado === 'mira' && f.t <= 0) {
        const tres = this.inimigos.length > 1 || f.hp < f.max / 2;
        (tres ? [-0.28, 0, 0.28] : [0]).forEach(a => this.orbe(c.x, c.y, Math.atan2(this.hy - 45 - c.y, this.hx - c.x) + a, 0.2, f.atk));
        f.estado = 'anda'; f.t = 2000 + Math.random() * 900;
      }
    } else if (ia.jeito === 'investe' || (ia.jeito === 'servo' && f.padrao % 3 !== 2)) {
      // chega perto, marca a linha vermelha e avança reto: desvie para o lado
      if (f.estado === 'anda') { anda(dx, dy, ia.vel); if (d < (ia.jeito === 'servo' ? 230 : 170) && f.t <= 0) { f.estado = 'mira'; f.t = 560; f.dir = { x: dx / d, y: dy / d }; this.linha(f); } }
      else if (f.estado === 'mira') { if (o instanceof Boneco) o.andar(dt, 0); if (f.t <= 0) { f.estado = 'investe'; f.t = ia.jeito === 'servo' ? 420 : 330; f.acertou = false; } }
      else if (f.estado === 'investe') {
        const v = ia.jeito === 'servo' ? 0.85 : 0.8;
        f.x += f.dir.x * v * dt; f.y += f.dir.y * v * dt; this.prender(f); if (o instanceof Boneco) o.andar(dt, 1.6);
        if (!f.acertou && Math.hypot(this.hx - f.x, this.hy - f.y) < 40 * profund(f.y) + 14) { f.acertou = true; this.ferirHeroi(f.atk * 1.4, f); }
        if (f.t <= 0) { f.estado = 'cansa'; f.t = ia.jeito === 'servo' ? 700 : 850; f.padrao++; }
      } else if (f.estado === 'cansa') { if (o instanceof Boneco) o.andar(dt, 0); if (f.t <= 0) { f.estado = 'anda'; f.t = 400; } }
    } else if (ia.jeito === 'servo') {
      // terceiro golpe do Servo: anel de bolas; com meia vida chama dois Beliscões
      if (f.estado !== 'mira') { f.estado = 'mira'; f.t = 700; this.avisar(f); }
      else if (f.t <= 0) {
        for (let i = 0; i < 14; i++) this.orbe(c.x, c.y, i / 14 * Math.PI * 2 + f.fase, 0.17, f.atk * 0.8);
        if (!f.chamou && f.hp < f.max / 2) { f.chamou = true; [-110, 110].forEach(x => this.inimigos.push(Object.assign(this.criarInimigo('beliscao', Phaser.Math.Clamp(f.x + x, 60, LARG - 60), ARENA.y0 + 20), { estado: 'anda' }))); this.falar('O Servo chamou reforços!'); }
        f.estado = 'cansa'; f.t = 900; f.padrao++;
      }
    } else if (ia.jeito === 'chefe') this.pensarChefe(f, dt, c);
    this.posicionar(f);
  }
  pensarChefe(f, dt, c) {
    const o = f.obj;
    f.x = LARG / 2 + Math.sin(f.fase * 0.5) * 70; o.y = f.y + Math.sin(f.fase * 1.6) * 6;
    if (f.estado === 'anda') {
      if (f.t > 0) return;
      const p = ['espiral', 'pisao', 'leque', 'devorar'][f.padrao % 4]; f.padrao++;
      f.estado = p; f.t = { espiral: 2000, pisao: 1300, leque: 900, devorar: 3400 }[p]; f.sub = 0;
      if (p === 'devorar') this.anunciar('DEVORAR!', '#e9d36a');
      else this.avisar(f);
      if (p === 'pisao') for (let i = 0; i < 3; i++) this.marca(this.hx + Phaser.Math.Between(-60, 60) * (i ? 1 : 0), this.hy + Phaser.Math.Between(-30, 30) * (i ? 1 : 0), 900 + i * 220, f.atk * 1.3);
      if (p === 'devorar' && this.cor) this.tweens.add({ targets: this.sat, v: -0.85, duration: 600, onUpdate: () => this.cor.saturate(this.sat.v) });
      return;
    }
    f.sub -= dt;
    if (f.estado === 'espiral' && f.sub <= 0) { f.sub = 110; for (let i = 0; i < 3; i++) this.orbe(c.x, c.y + 40, f.fase * 3 + i * Math.PI * 2 / 3, 0.18, f.atk * 0.7); }
    if (f.estado === 'leque' && f.t < 300 && !f.foi) { f.foi = true; const a = Math.atan2(this.hy - 45 - c.y, this.hx - c.x); [-0.5, -0.25, 0, 0.25, 0.5].forEach(d => this.orbe(c.x, c.y + 40, a + d, 0.24, f.atk * 0.8)); }
    if (f.estado === 'devorar' && f.t < 2600) {
      // puxa o herói para a boca: corra para longe!
      const dx = f.x - this.hx, dy = (f.y - 40) - this.hy, d = Math.hypot(dx, dy) || 1;
      if (this.st.dash <= 0) { this.hx += dx / d * 0.1 * dt; this.hy += dy / d * 0.1 * dt; }
      if (f.sub <= 0) { f.sub = 60; this.faiscas.setParticleTint(0xb4b1c2); this.faiscas.explode(2, Phaser.Math.Between(0, LARG), ALT - 140); }
      if (d < 120 && !f.mordeu) { f.mordeu = true; this.ferirHeroi(f.atk * 2.2, f); }
    }
    if (f.t <= 0) {
      if (f.estado === 'devorar') {
        const cura = Math.round(f.max * 0.06); f.hp = Math.min(f.max, f.hp + cura); this.popNum(c.x, c.y, '+' + cura, '#5fd39a', 26);
        this.aliados.forEach(a => { a.carga = Math.max(0, a.carga - 30); });
        if (this.cor) this.tweens.add({ targets: this.sat, v: -0.15, duration: 600, onUpdate: () => this.cor.saturate(this.sat.v) });
        window.VJ.sfx('blob');
      }
      f.estado = 'anda'; f.t = 900; f.foi = false; f.mordeu = false;
    }
  }
  posicionar(f) {
    const o = f.obj;
    if (f.ia.jeito !== 'chefe') o.y = f.y;
    o.x = f.x;
    if (o instanceof Boneco) o.tamanho(f.ia.esc * profund(f.y)); else if (f.ia.jeito !== 'chefe') o.setScale(f.ia.esc * profund(f.y) * (f.estado === 'mira' ? 1 + Math.sin(this.time.now / 40) * 0.04 : 1));
    o.setDepth(f.y);
  }
  avisar(f) {
    const c = this.centro(f);
    const t = texto(this, f.x, f.y - this.altura(f) - 30, '!', 34, '#ef6b7b').setDepth(1450).setScale(0.3);
    this.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 450, duration: 150, onComplete: () => t.destroy() });
    f.obj.setTint(0xff8a8a); this.time.delayedCall(450, () => f.obj.active && f.obj.clearTint());   // o Boneco volta ao cinza sozinho
    return c;
  }
  linha(f) {
    const g = this.add.graphics().setDepth(4);
    const x2 = f.x + f.dir.x * 330, y2 = f.y + f.dir.y * 330;
    g.lineStyle(26, 0xef3b4b, 0.22).lineBetween(f.x, f.y, x2, y2).lineStyle(2, 0xff8a98, 0.9).lineBetween(f.x, f.y, x2, y2);
    this.tweens.add({ targets: g, alpha: 0.2, yoyo: true, repeat: 2, duration: 90, onComplete: () => g.destroy() });
    this.avisar(f);
  }
  orbe(x, y, ang, vel, dano) {
    const spr = this.add.image(x, y, 'orbe').setDepth(1250);
    this.tweens.add({ targets: spr, angle: 360, repeat: -1, duration: 600 });
    this.orbes.push({ spr, x, y, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel, dano, vida: 5000 });
  }
  moverOrbes(dt) {
    this.orbes = this.orbes.filter(b => {
      b.x += b.vx * dt; b.y += b.vy * dt; b.vida -= dt; b.spr.setPosition(b.x, b.y);
      if (Math.hypot(this.hx - b.x, this.hy - 42 - b.y) < 24) {
        if (this.st.inv > 0) { this.quaseAcertou(); return true; }
        this.ferirHeroi(b.dano); b.spr.destroy(); return false;
      }
      if (b.vida <= 0 || b.x < -30 || b.x > LARG + 30 || b.y < 100 || b.y > ALT + 30) { b.spr.destroy(); return false; }
      return true;
    });
  }
  // círculo vermelho no chão: sai de cima antes de estourar
  marca(x, y, t, dano) {
    x = Phaser.Math.Clamp(x, ARENA.x0, ARENA.x1); y = Phaser.Math.Clamp(y, ARENA.y0, ARENA.y1);
    const g = this.add.ellipse(x, y, 110, 46, 0xef3b4b, 0.18).setStrokeStyle(3, 0xff8a98, 0.9).setDepth(3);
    const enche = this.add.ellipse(x, y, 4, 2, 0xef3b4b, 0.45).setDepth(3);
    this.tweens.add({ targets: enche, width: 110, height: 46, duration: t });
    this.marcas.push({ x, y, t, dano, g, enche });
  }
  moverMarcas(dt) {
    this.marcas = this.marcas.filter(m => {
      m.t -= dt; if (m.t > 0) return true;
      const ex = this.add.ellipse(m.x, m.y, 110, 46, 0xffc06b, 0.8).setBlendMode('ADD').setDepth(4);
      this.tweens.add({ targets: ex, scale: 1.5, alpha: 0, duration: 300, onComplete: () => ex.destroy() });
      this.faiscas.setParticleTint(0xff9a4d); this.faiscas.explode(16, m.x, m.y);
      this.cameras.main.shake(120, 0.008);
      if (Math.hypot((this.hx - m.x) / 55, (this.hy - m.y) / 23) < 1) { if (this.st.inv > 0) this.quaseAcertou(); else this.ferirHeroi(m.dano); }
      m.g.destroy(); m.enche.destroy(); return false;
    });
  }

  // ---------- herói ----------
  ferirHeroi(dano, de) {
    const a = this.heroi, s = this.st;
    if (s.inv > 0 || a.hp <= 0) { if (s.dash > 0) this.quaseAcertou(); return; }
    let d = Math.round(dano * (0.85 + Math.random() * 0.3) * (1 - (a.def || 0) / 100));
    if (a.escudo > 0) { const ab = Math.min(a.escudo, d); a.escudo -= ab; d -= ab; if (ab) this.popNum(this.hx, this.hy - 150, 'ESCUDO', '#9cd0ff', 16); }
    a.hp = Math.max(0, a.hp - d);
    s.inv = 650; s.combo = 0;
    a.b.setTintFill(0xff5050); this.time.delayedCall(120, () => a.b.clearTint());
    if (de) { const dx = this.hx - de.x, dy = this.hy - de.y, n = Math.hypot(dx, dy) || 1; this.hx += dx / n * 26; this.hy += dy / n * 16; }
    this.cameras.main.shake(180, 0.014); window.VJ.sfx('toin');
    this.popNum(this.hx, this.hy - 120, d ? '-' + d : '0', '#ff9a9a', 26);
    if (a.hp <= 0) this.caiu();
  }
  quaseAcertou() {
    const s = this.st;
    if (s.dash <= 0 || s.perfeita) return;
    s.perfeita = true; s.lento = 650; this.heroi.carga = Math.min(100, this.heroi.carga + 12);
    if (this.cor) this.cor.saturate(-0.6);
    this.popNum(this.hx, this.hy - 150, 'ESQUIVA PERFEITA!', '#9cd0ff', 22); window.VJ.sfx('sinos');
  }
  esquivar() {
    const s = this.st; if (s.esqCd > 0 || s.dash > 0) return;
    let vx = this.vet.x, vy = this.vet.y;
    if (Math.hypot(vx, vy) < 0.15) { const f = this.maisPerto(this.hx, this.hy); if (f) { vx = this.hx - f.x; vy = this.hy - f.y; } else { vx = 0; vy = 1; } }
    const n = Math.hypot(vx, vy) || 1;
    s.dashV = { x: vx / n, y: vy / n }; s.dash = 170; s.inv = 340; s.esqCd = 1000; s.perfeita = false;
    this.heroi.b.olhar(vx, vy);
  }
  caiu() {
    const a = this.heroi;
    this.st.inv = 1200; this.soltarDedo();
    this.tweens.add({ targets: a.b, angle: a.b.virado ? 80 : -80, alpha: 0.3, duration: 300 });
    const prox = this.aliados.findIndex(x => x.hp > 0);
    if (prox < 0) return this.time.delayedCall(500, () => this.checarFim());
    this.falar(`${a.d.nome} caiu! ${this.aliados[prox].d.nome} entra!`);
    this.time.delayedCall(450, () => { a.b.setAngle(0).setAlpha(1); this.trocar(prox, true); });
  }
  trocar(i, forcado = false) {
    const novo = this.aliados[i], velho = this.heroi;
    if (!novo || novo === velho || novo.hp <= 0 || this.fim) return;
    if (!forcado && (this.st.trocaCd > 0 || this.pausa)) return;
    velho.b.setVisible(false);
    const brilho = this.add.circle(this.hx, this.hy - 50, 30, COR_V[velho.d.v], 0.6).setBlendMode('ADD').setDepth(1300);
    this.tweens.add({ targets: brilho, scale: 2.4, alpha: 0, duration: 300, onComplete: () => brilho.destroy() });
    this.ativo = i; this.heroi = novo; this.st.trocaCd = 2500; this.st.inv = 700;
    novo.b.setVisible(true).olhar(0, -1); this.st.pouso = 220;
    this.time.delayedCall(220, () => {
      // pouso: onda de luz que fere quem está perto
      const onda = this.add.ellipse(this.hx, this.hy, 40, 16).setStrokeStyle(5, COR_V[novo.d.v]).setDepth(5);
      this.tweens.add({ targets: onda, scale: 6, alpha: 0, duration: 380, onComplete: () => onda.destroy() });
      this.cameras.main.shake(120, 0.01);
      this.vivos().forEach(f => { if (Math.hypot(f.x - this.hx, f.y - this.hy) < 140) this.ferir(f, Math.round(novo.atk * 0.9), COR_V[novo.d.v], false, f.x - this.hx, f.y - this.hy); });
      const cb = window.VJ.COMBOS.find(c => (c.a === velho.d.v && c.b === novo.d.v) || (c.b === velho.d.v && c.a === novo.d.v));
      if (cb && velho.hp > 0) this.combo_(cb, novo);
    });
    this.falar(`Vai, ${novo.d.nome}!`);
  }
  combo_(cb, a) {
    this.anunciar(`COMBO\n${cb.nome}!`, '#f3d27e');
    const al = this.aliados.filter(x => x.hp > 0);
    if (cb.ef === 'atordoa') this.vivos().forEach(f => this.atordoar(f, 1800));
    if (cb.ef === 'cura') al.forEach(x => { x.hp = Math.min(x.max, x.hp + Math.round(x.max * 0.12)); });
    if (cb.ef === 'carga') al.forEach(x => { x.carga = Math.min(100, x.carga + 20); });
    if (cb.ef === 'dano') this.vivos().forEach(f => this.ferir(f, Math.round(a.atk * 1.5), 0xe9c46a, true));
    if (cb.ef === 'escudo') al.forEach(x => { x.escudo += Math.round(x.max * 0.15); });
    this.garantirBolha();
  }

  // ---------- poderes ----------
  usarDom() {
    const a = this.heroi; if (a.cdDom > 0) return;
    a.cdDom = 7000; a.carga = Math.min(100, a.carga + 10);
    this.faixa(a, a.d.dom[0]);
    this.poder(a, a.d.dom[1], false);
  }
  async supremo() {
    const a = this.heroi; if (a.carga < 100) return;
    a.carga = 0; this.pausa = true; this.soltarDedo();
    await this.cutin(a, a.d.sup[0]);
    this.pausa = false; this.st.inv = 900;
    this.poder(a, a.d.sup[1], true);
  }
  soltarDedo() { this.toque = null; this.vet = { x: 0, y: 0 }; this.jBase.setVisible(false); this.jKnob.setVisible(false); }
  poder(a, ef, forte, mult = 1) {
    const cor = COR_V[a.d.v], pd = (1 + (a.dom || 0) / 100) * mult;
    const x0 = a === this.heroi ? this.hx : a.b.x, y0 = (a === this.heroi ? this.hy : a.b.y) - 50;
    if (ef === 'sorte') ef = sorteia(['dano', 'cura', 'buff', 'escudo', 'area']);
    if (ef === 'dano') {
      // feixe que atravessa tudo na direção do inimigo mais perto
      const alvo = this.maisPerto(x0, y0); const c = alvo ? this.centro(alvo) : { x: x0, y: 0 };
      const ang = Math.atan2(c.y - y0, c.x - x0), larg = forte ? 70 : 34;
      const feixe = this.add.rectangle(x0, y0, 900, larg, cor, 0.9).setOrigin(0, 0.5).setRotation(ang).setBlendMode('ADD').setDepth(1350);
      const miolo = this.add.rectangle(x0, y0, 900, larg * 0.35, 0xffffff, 1).setOrigin(0, 0.5).setRotation(ang).setBlendMode('ADD').setDepth(1351);
      this.tweens.add({ targets: [feixe, miolo], scaleY: 0, alpha: 0, duration: forte ? 600 : 380, onComplete: () => { feixe.destroy(); miolo.destroy(); } });
      this.cameras.main.shake(forte ? 400 : 200, forte ? 0.02 : 0.01);
      this.vivos().forEach(f => {
        const q = this.centro(f), px = q.x - x0, py = q.y - y0, ao = px * Math.cos(ang) + py * Math.sin(ang), lado = Math.abs(-px * Math.sin(ang) + py * Math.cos(ang));
        if (ao > 0 && lado < larg / 2 + f.ia.raio) this.ferir(f, Math.round(a.atk * (forte ? 5 : 2.4) * pd), cor, true, Math.cos(ang), Math.sin(ang));
      });
    } else if (ef === 'atordoa') {
      const r = forte ? 600 : 190;
      const onda = this.add.circle(x0, y0 + 40, 20).setStrokeStyle(10, cor).setDepth(1350);
      this.tweens.add({ targets: onda, radius: r, alpha: 0, duration: 450, onComplete: () => onda.destroy() });
      this.cameras.main.shake(260, 0.014);
      this.vivos().forEach(f => { if (Math.hypot(f.x - x0, f.y - y0) < r) { this.ferir(f, Math.round(a.atk * (forte ? 1.8 : 1) * pd), cor, forte, f.x - x0, f.y - y0); this.atordoar(f, forte ? 3500 : 2200); } });
    } else if (ef === 'area') {
      // colunas de luz que caem do céu nos inimigos
      const alvos = []; this.vivos().forEach(f => { for (let i = 0; i < (forte ? 3 : 1); i++) alvos.push(f); });
      if (!forte) for (let i = 0; i < 2; i++) { const f = sorteia(this.vivos()); if (f) alvos.push(f); }
      alvos.forEach((f, i) => this.time.delayedCall(i * 140, () => {
        if (f.hp <= 0 || this.fim) return;
        const x = f.x + Phaser.Math.Between(-10, 10);
        const col = this.add.rectangle(x, f.y, 46, 900, cor, 0.85).setOrigin(0.5, 1).setBlendMode('ADD').setDepth(1350);
        this.tweens.add({ targets: col, scaleX: 0, alpha: 0, duration: 380, onComplete: () => col.destroy() });
        this.cameras.main.shake(100, 0.008);
        this.vivos().forEach(g => { if (Math.abs(g.x - x) < 60 + g.ia.raio * 0.5) this.ferir(g, Math.round(a.atk * (forte ? 1.7 : 1.3) * pd), cor, forte); });
      }));
    } else if (ef === 'cura' || ef === 'revive') {
      this.aliados.forEach(x => {
        if (x.hp <= 0) { if (ef !== 'revive') return; x.hp = Math.round(x.max * 0.5); }
        const c = Math.round(x.max * (forte ? 0.45 : 0.22) * pd); x.hp = Math.min(x.max, x.hp + c);
        if (x === this.heroi) this.popNum(this.hx, this.hy - 140, '+' + c, '#5fd39a', 24);
      });
      this.faiscas.setParticleTint(0x5fd39a); this.faiscas.explode(30, this.hx, this.hy - 50);
      const halo = this.add.ellipse(this.hx, this.hy, 60, 20, 0x5fd39a, 0.5).setBlendMode('ADD').setDepth(6);
      this.tweens.add({ targets: halo, scale: 4, alpha: 0, duration: 600, onComplete: () => halo.destroy() });
      if (forte) this.st.inv = 2500;
      window.VJ.sfx('sinos');
    } else if (ef === 'escudo') {
      this.aliados.filter(x => x.hp > 0).forEach(x => { x.escudo += Math.round(x.max * (forte ? 0.5 : 0.28) * pd); });
      this.garantirBolha(); window.VJ.sfx('sinos');
    } else if (ef === 'buff') {
      this.st.buff = forte ? 9000 : 6000;
      if (!this.aura) { this.aura = this.add.ellipse(0, 0, 90, 150, 0xe9c46a, 0.3).setBlendMode('ADD'); this.tweens.add({ targets: this.aura, alpha: 0.12, scaleX: 1.15, yoyo: true, repeat: -1, duration: 300 }); }
      this.popNum(this.hx, this.hy - 150, 'PODER!', '#f3d27e', 24); window.VJ.sfx('fanfarra');
    } else if (ef === 'agua') {
      this.vivos().forEach(f => { const c = this.centro(f); this.faiscas.setParticleTint(0x9cd0ff); this.faiscas.explode(20, c.x, c.y); this.ferir(f, Math.round(a.atk * 0.8 * mult * (f.k === 'copia' ? 3 : 1)), 0x9cd0ff, f.k === 'copia'); });
    } else if (ef === 'anjo') {
      const f = this.maisPerto(x0, y0); if (!f) return;
      const espada = this.add.rectangle(f.x, -100, 30, 260, 0xfff2b0, 1).setBlendMode('ADD').setDepth(1360);
      this.tweens.add({ targets: espada, y: f.y - 130, duration: 260, ease: 'Quad.in', onComplete: () => {
        this.cameras.main.flash(250, 255, 255, 255); this.cameras.main.shake(300, 0.02);
        this.ferir(f, Math.round(a.atk * 2.4 * mult), 0xfff2b0, true);
        this.tweens.add({ targets: espada, alpha: 0, scaleX: 3, duration: 300, onComplete: () => espada.destroy() });
      } });
    }
  }
  garantirBolha() {
    if (this.bolha) return;
    this.bolha = this.add.circle(0, 0, 58, 0x4aa3ff, 0.14).setStrokeStyle(3, 0x9cd0ff, 0.8);
    this.tweens.add({ targets: this.bolha, scale: 1.08, yoyo: true, repeat: -1, duration: 500 });
  }
  atordoar(f, ms) {
    if (f.hp <= 0) return;
    f.stun = Math.max(f.stun, ms);
    if (f.ia.jeito !== 'chefe') { f.estado = 'anda'; f.t = Math.max(f.t, 300); }   // o chefe só pausa o golpe
    if (!f.estrelas) { f.estrelas = texto(this, f.x, f.y - this.altura(f) - 26, '💫', 24).setDepth(1450); this.tweens.add({ targets: f.estrelas, angle: 360, repeat: -1, duration: 600 }); }
  }
  faixa(a, nome) {
    const faixa = this.add.rectangle(-LARG, 300, LARG, 52, COR_V[a.d.v], 0.9).setDepth(1800);
    const t = texto(this, -LARG, 300, `${a.d.nome}: ${nome}`, 20, '#140f1f', { stroke: '#ffffff', strokeThickness: 2 }).setDepth(1801);
    this.tweens.add({ targets: [faixa, t], x: LARG / 2, duration: 180, ease: 'Cubic.out' });
    this.tweens.add({ targets: [faixa, t], x: LARG * 1.6, duration: 180, delay: 700, ease: 'Cubic.in', onComplete: () => { faixa.destroy(); t.destroy(); } });
    window.VJ.sfx('fanfarra');
  }
  async cutin(a, nome) {
    const cor = COR_V[a.d.v];
    window.VJ.sfx('fanfarra');
    const escuro = this.add.rectangle(LARG / 2, ALT / 2, LARG, ALT, 0x000000, 0).setDepth(2000);
    await tw(this, { targets: escuro, fillAlpha: 0.82, duration: 160 });
    const raios = [];
    for (let i = 0; i < 6; i++) { const r = this.add.rectangle(LARG / 2, ALT / 2, 900, 26 + i * 6, cor, 0.25).setAngle(-20 + i * 8).setDepth(2001).setBlendMode('ADD'); raios.push(r); this.tweens.add({ targets: r, angle: r.angle + 30, duration: 1200 }); }
    const heroi = this.add.image(LARG + 200, ALT / 2 + 220, 'd-' + a.k).setOrigin(0.5, 1).setScale(1.05).setDepth(2002);
    const t1 = texto(this, LARG / 2, 140, a.d.nome.toUpperCase(), 22, '#ffffff').setDepth(2003).setAlpha(0);
    const t2 = texto(this, LARG / 2, 185, nome.toUpperCase(), 32, '#f3d27e', { wordWrap: { width: 360 } }).setDepth(2003).setScale(2).setAlpha(0);
    this.tweens.add({ targets: heroi, x: LARG / 2 + 30, duration: 340, ease: 'Cubic.out' });
    this.tweens.add({ targets: t1, alpha: 1, duration: 200, delay: 180 });
    await tw(this, { targets: t2, alpha: 1, scale: 1, duration: 240, delay: 220, ease: 'Back.out' });
    this.cameras.main.shake(300, 0.012);
    await espera(this, 550);
    this.cameras.main.flash(300, 255, 255, 255);
    [escuro, heroi, t1, t2, ...raios].forEach(o => o.destroy());
  }
  anunciar(txt, cor) {
    const t = texto(this, LARG / 2, 330, txt, 34, cor).setDepth(1800).setScale(0.3);
    this.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 900, duration: 300, onComplete: () => t.destroy() });
  }
  falar(txt) {
    const t = texto(this, LARG / 2, 380, txt, 16, '#ffffff', { wordWrap: { width: 340 } }).setDepth(1800);
    this.tweens.add({ targets: t, alpha: 0, y: 360, delay: 1300, duration: 300, onComplete: () => t.destroy() });
  }
  popNum(x, y, txt, cor = '#ffffff', tam = 24) {
    const t = texto(this, x, y, txt, tam, cor).setDepth(1460).setScale(0.3);
    this.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.out' });
    this.tweens.add({ targets: t, y: y - 46, alpha: 0, duration: 600, delay: 260, onComplete: () => t.destroy() });
  }

  // ---------- pílula, cartas e aliados ----------
  pilula() {
    const VJ = window.VJ, p = VJ.p(), a = this.heroi; if (p.pilulas < 1 || a.hp >= a.max) return;
    p.pilulas--; VJ.salvar(); const c = Math.round(a.max * 0.4); a.hp = Math.min(a.max, a.hp + c);
    this.faiscas.setParticleTint(0x5fd39a); this.faiscas.explode(18, this.hx, this.hy - 60);
    this.popNum(this.hx, this.hy - 140, '+' + c, '#5fd39a', 24); VJ.sfx('sinos');
  }
  cartasLivres() { this.usadas = this.usadas || new Set(); return (window.VJ.cartas ? window.VJ.cartas() : []).filter(c => !this.usadas.has(c.id)); }
  async abrirCartas() {
    if (!this.cartasLivres().length) return;
    this.pausa = true; this.soltarDedo();
    const id = await window.VJ.escolherCarta(this.cartasLivres());
    const c = id && this.cartasLivres().find(x => x.id === id);
    if (!c || this.fim) { this.pausa = false; return; }
    const a = this.heroi;
    this.usadas.add(c.id); window.VJ.usouCarta(c.id);
    if (c.aliado) { this.pausa = false; return this.chamarAliado(a, c); }
    if (c.ef === 'anjo') { await this.cutin(a, `${c.ic} ${c.nome}`); this.pausa = false; }
    else { this.pausa = false; this.faixa(a, `${c.ic} ${c.nome}`); }
    this.poder(a, c.ef, false, c.mult || 1);
  }
  // o Aliado entra ao lado do herói por 7 s: usa o Dom e atira junto
  chamarAliado(a, c) {
    const VJ = window.VJ, d = VJ.DEVOTOS[c.aliado];
    const b = new Boneco(this, c.aliado, Phaser.Math.Clamp(this.hx + 70, ARENA.x0, ARENA.x1), this.hy, 0.85).olhar(0, -1);
    b.passo = () => this.poeira.emitParticleAt(b.x, b.y, 2);
    const al = { k: c.aliado, d, b, atk: Math.round(a.atk * 0.8 * (c.mult || 1)), dom: a.dom, crit: a.crit, vida: 7000, tiro: 400 };
    this.ajudantes.push(al);
    this.faixa(al, d.dom[0]);
    this.poder(al, d.dom[1], false, c.mult || 1);
  }
  moverAjudantes(dt) {
    this.ajudantes = this.ajudantes.filter(al => {
      al.vida -= dt; const b = al.b;
      // acompanha o herói de lado
      const ax = Phaser.Math.Clamp(this.hx + 70, ARENA.x0, ARENA.x1), ay = this.hy + 10, dx = ax - b.x, dy = ay - b.y, d = Math.hypot(dx, dy);
      if (d > 6) { b.x += dx / d * Math.min(d, 0.22 * dt); b.y += dy / d * Math.min(d, 0.22 * dt); b.olhar(dx, dy).andar(dt, 1); } else b.andar(dt, 0);
      b.setDepth(b.y).tamanho(0.85 * profund(b.y));
      if ((al.tiro -= dt) <= 0) { al.tiro = 420; const f = this.maisPerto(b.x, b.y - 50); if (f) this.disparar(al, b.x, b.y - 52, f, 0.5); }
      if (al.vida <= 0) { this.tweens.add({ targets: b, alpha: 0, y: b.y - 40, duration: 350, onComplete: () => b.destroy() }); return false; }
      return true;
    });
  }

  // ---------- fim ----------
  checarFim() {
    if (this.fim) return true;
    const VJ = window.VJ;
    if (this.inimigos.every(f => f.hp <= 0)) {
      this.fim = 'vitoria'; this.limpar();
      VJ.musica('11-vitoria'); VJ.sfx('fanfarra');
      if (this.cor) this.tweens.add({ targets: this.sat, v: 0.15, duration: 1400, onUpdate: () => this.cor.saturate(this.sat.v) });
      const r = VJ.vencer(this.no);
      const t = texto(this, LARG / 2, 300, 'VITÓRIA!', 52, '#f3d27e').setDepth(2100).setScale(0.2);
      this.tweens.add({ targets: t, scale: 1, duration: 400, ease: 'Back.out' });
      this.faiscas.setParticleTint(0xe9c46a); this.faiscas.explode(60, LARG / 2, 300);
      const b = this.heroi.b.olhar(0, 1).andar(0, 0);
      this.tweens.add({ targets: b, y: b.y - 40, yoyo: true, repeat: 2, duration: 220 });
      texto(this, LARG / 2, 380, r.texto, 17, '#ffffff', { wordWrap: { width: 340 } }).setDepth(2100);
      this.botaoFim('Continuar', () => r.video ? VJ.video(r.video, () => VJ.voltarMapa()) : VJ.voltarMapa());
      return true;
    }
    if (this.aliados.every(x => x.hp <= 0)) {
      this.fim = 'derrota'; this.limpar(); VJ.perder(); VJ.sfx('toin');
      texto(this, LARG / 2, 300, 'O time caiu', 40, '#ef6b7b').setDepth(2100);
      texto(this, LARG / 2, 360, 'Upe os devotos com Fragmentos (missões reais)\ne tente de novo.', 16).setDepth(2100);
      this.botaoFim('Voltar ao mapa', () => VJ.voltarMapa());
      return true;
    }
    return false;
  }
  limpar() {
    this.soltarDedo();
    [...this.orbes.map(o => o.spr), ...this.tiros.map(t => t.spr), ...this.marcas.flatMap(m => [m.g, m.enche])].forEach(o => o.destroy());
    this.orbes = []; this.tiros = []; this.marcas = [];
    [this.bSup, this.bDom, this.bEsq, this.bPil, this.bCar].forEach(b => b.setVisible(false));
    this.combo.setAlpha(0); this.tVida.setVisible(false); this.barras.setVisible(false);
  }
  botaoFim(rot, cb) {
    const c = this.add.container(LARG / 2, 780).setDepth(2100);
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
