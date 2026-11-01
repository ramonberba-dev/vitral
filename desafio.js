// VITRAL — Desafio: Estrada dos Peregrinos (cena Phaser). Carregado depois de explorar.js.
// A via romana das Colinas Brancas rola sozinha; o dedo arrasta o grupo para os lados.
// Todos atiram luz para a frente. Portais de vitral somam peregrinos (atirar no portal aumenta o
// número; o vermelho tira gente), baús com número guardam armas, hordas da Bruma vêm correndo
// e no fim da estrada chega o Servo do Insaciável. A corrida acaba quando a horda alcança o herói.
'use strict';

const VIA = { esc: 1.04, x0: 70, x1: 318, gy: 700, vel: 0.1, duracao: 50000, max: 45 };
const MELHORIAS = {
  raio: { nome: '+1 RAIO', item: 'espada-luz', cor: 0xf2c94c },
  ritmo: { nome: 'MAIS RÁPIDO', item: 'tenis-asas', cor: 0x5aa9e6 },
  forca: { nome: 'LUZ MAIS FORTE', item: 'relicario', cor: 0xb38cff },
};
const PEREGRINOS = ['clara', 'simo', 'tonho', 'luzia', 'gio', 'guto', 'kael', 'jana', 'tessa', 'duda', 'cisco', 'avila', 'yuri', 'zeca'];

function texturasVia(cena) {
  if (cena.textures.exists('vitral-azul')) return;
  const g = cena.make.graphics({ x: 0, y: 0, add: false });
  // portal de vitral: vidro colorido com chumbo dourado em losangos
  const portal = (nome, cor, claro) => {
    g.clear().fillStyle(cor, 0.55).fillRoundedRect(0, 0, 116, 70, 8);
    g.fillStyle(claro, 0.35).fillRect(6, 6, 104, 22);
    g.lineStyle(2, 0x2a1d0e, 0.55);
    for (let x = -70; x < 116; x += 26) { g.lineBetween(x, 70, x + 70, 0); g.lineBetween(x, 0, x + 70, 70); }
    g.lineStyle(5, 0xe9c46a, 1).strokeRoundedRect(2, 2, 112, 66, 8);
    g.generateTexture(nome, 116, 70);
  };
  portal('vitral-azul', 0x3f8ff0, 0xbfe2ff); portal('vitral-vermelho', 0xe2414f, 0xffc2c8); portal('vitral-ouro', 0xf2b632, 0xfff2b0);
  g.destroy();
}

class Desafio extends Phaser.Scene {
  constructor() { super('desafio'); }
  preload() {
    const v = window.VJ.versao;
    if (!this.textures.exists('via')) this.load.image('via', `assets/jogo/via.jpg?${v}`);
    Object.values(MELHORIAS).forEach(m => { if (!this.textures.exists('it-' + m.item)) this.load.image('it-' + m.item, `assets/itens/${m.item}.webp?${v}`); });
    if (!this.textures.exists('bau-madeira')) this.load.image('bau-madeira', `assets/itens/bau-bronze.webp?${v}`);
  }
  create() {
    const VJ = window.VJ, p = VJ.p();
    texturasLuta(this); texturasVia(this);
    this.cameras.main.setZoom(Z).centerOn(LARG / 2, ALT / 2).fadeIn(300, 15, 13, 23);
    this.chao = this.add.tileSprite(LARG / 2, ALT / 2, LARG / VIA.esc, ALT / VIA.esc, 'via').setScale(VIA.esc).setDepth(-10);
    this.chao.tilePositionX = (this.textures.get('via').getSourceImage().width - LARG / VIA.esc) / 2;   // estrada no meio da tela
    this.add.particles(0, 0, 'ponto', { x: { min: -40, max: LARG + 40 }, y: { min: 0, max: ALT }, speedY: { min: 40, max: 90 }, scale: { start: 3, end: 5 }, alpha: { start: 0.1, end: 0 }, tint: 0xd8d4e6, lifespan: 4000, frequency: 260 }).setDepth(4000);
    this.faiscas = this.add.particles(0, 0, 'ponto', { speed: { min: 60, max: 200 }, scale: { start: 0.5, end: 0 }, lifespan: 420, emitting: false, blendMode: 'ADD' }).setDepth(3500);
    this.poeira = this.add.particles(0, 0, 'ponto', { speed: { min: 10, max: 30 }, angle: { min: 60, max: 120 }, scale: { start: 0.25, end: 0 }, alpha: { start: 0.4, end: 0 }, lifespan: 300, tint: 0xd8c39a, emitting: false }).setDepth(5);

    // o grupo: herói na frente e os peregrinos que entram pelos portais
    this.heroiK = p.heroi && this.textures.exists('anda-' + p.heroi) ? p.heroi : 'kael';
    this.gx = LARG / 2; this.grupo = [];
    this.entrar(0, true); this.entrar(4);
    this.st = { raios: 1, ritmo: 1, forca: 1, abates: 0, t: 0, fim: false, chefe: null, prox: 600, seg: 0, vidas: 3, inv: 0 };
    this.tiros = []; this.inimigos = []; this.portais = []; this.baus = [];

    // interface
    this.barra = this.add.rectangle(LARG / 2 - 90, 30, 0, 8, 0xf2c94c).setOrigin(0, 0.5).setDepth(5000);
    this.add.rectangle(LARG / 2 + 20, 30, 224, 12).setStrokeStyle(2, 0xffffff, 0.6).setDepth(5000);
    this.placa = this.add.container(0, 0).setDepth(4900);
    this.placaBg = this.add.graphics(); this.placaT = texto(this, 0, 0, '1', 18, '#ffffff');
    this.placa.add([this.placaBg, this.placaT]);
    this.dica = texto(this, LARG / 2, ALT - 70, 'Arraste para os lados\nAtire nos portais para aumentar o número!', 17, '#ffffff').setDepth(5000);
    this.tweens.add({ targets: this.dica, alpha: 0, delay: 3200, duration: 600 });
    this.vidas = texto(this, 18, 30, '', 18, '#ff6b7b', { align: 'left' }).setOrigin(0, 0.5).setDepth(5000); this.pintarVidas();
    this.ultX = null;
    this.input.on('pointerdown', ptr => { this.ultX = ptr.worldX; });
    this.input.on('pointermove', ptr => { if (!ptr.isDown || this.ultX === null) return; this.gx += (ptr.worldX - this.ultX) * 1.15; this.ultX = ptr.worldX; });
    this.input.on('pointerup', () => { this.ultX = null; });
    this.teclas = this.input.keyboard ? this.input.keyboard.createCursorKeys() : null;
    VJ.musica('09-batalha');
  }

  // ---------- o grupo ----------
  entrar(n, heroi = false) {
    const total = heroi ? 1 : n;
    for (let i = 0; i < total; i++) {
      if (!heroi && this.grupo.length >= VIA.max) return;
      const k = heroi ? this.heroiK : PEREGRINOS[(this.grupo.length * 5) % PEREGRINOS.length];
      const b = new Boneco(this, k, this.gx + Phaser.Math.Between(-10, 10), VIA.gy + 30, heroi ? 0.66 : 0.5).olhar(0, -1);
      b.heroi = heroi; b.tiro = Math.random() * 400;
      b.passo = () => { if (Math.random() < 0.3) this.poeira.emitParticleAt(b.x, b.y, 1); };
      this.grupo.push(b);
    }
  }
  // tira n peregrinos (o herói nunca sai por aqui); devolve false se não sobrou ninguém para cair
  perder(n, x, y) {
    for (let i = 0; i < n; i++) {
      const vivos = this.grupo.filter(b => !b.heroi); if (!vivos.length) return false;
      const b = vivos.sort((a, c) => Math.hypot(a.x - x, a.y - y) - Math.hypot(c.x - x, c.y - y))[0];
      this.grupo.splice(this.grupo.indexOf(b), 1);
      this.faiscas.setParticleTint(0xffffff); this.faiscas.explode(6, b.x, b.y - 20);
      this.tweens.add({ targets: b, alpha: 0, y: b.y + 20, duration: 220, onComplete: () => b.destroy() });
    }
    return true;
  }
  // lugar de cada um: herói na frente, os outros em espiral atrás dele
  formacao() {
    const n = this.grupo.length, raio = 9 + Math.sqrt(n) * 8.5;
    this.gx = Phaser.Math.Clamp(this.gx, VIA.x0 + raio * 0.7, VIA.x1 - raio * 0.7);
    let j = 0;
    return this.grupo.map(b => {
      if (b.heroi) return { x: this.gx, y: VIA.gy - 14 };
      j++; const a = j * 2.39996, r = 13 * Math.sqrt(j);
      return { x: this.gx + Math.cos(a) * r * 1.15, y: VIA.gy + 10 + Math.sin(a) * r * 0.75 + r * 0.25 };
    });
  }
  // sem peregrinos, o herói aguenta três golpes
  machucarHeroi() {
    const s = this.st; if (s.inv > 0) return;
    s.vidas--; s.inv = 1000; this.pintarVidas();
    const h = this.grupo[0]; this.tweens.add({ targets: h, alpha: 0.3, yoyo: true, repeat: 4, duration: 100 });
    if (s.vidas <= 0) this.terminar(false);
  }
  pintarVidas() { this.vidas.setText('❤'.repeat(Math.max(0, this.st.vidas)) + '♡'.repeat(3 - Math.max(0, this.st.vidas))); }
  ferido(quem) {
    this.cameras.main.shake(160, 0.01); window.VJ.sfx('toin');
    if (quem) { quem.setTintFill(0xff6b6b); this.time.delayedCall(120, () => quem.active && quem.clearTint()); }
  }

  // ---------- o que aparece na estrada ----------
  agenda() {
    const s = this.st, t = s.t, n = s.seg++;
    const ciclo = ['portais', 'horda', 'bau', 'horda', 'portais', 'horda', 'horda', 'bau'];
    const tipo = ciclo[n % ciclo.length];
    if (tipo === 'portais') this.novosPortais();
    if (tipo === 'bau') { this.novoBau(); this.novaHorda(Math.round(3 + t / 9000), true); }
    if (tipo === 'horda') this.novaHorda(Math.round(5 + t / 3000));
    s.prox = tipo === 'horda' ? 2300 : 2000;
  }
  novosPortais() {
    const t = this.st.t, meio = (VIA.x0 + VIA.x1) / 2, w = (VIA.x1 - VIA.x0) / 2;
    // um bom e um ruim (às vezes um dourado ×2); o ruim pode virar bom se levar muito tiro
    const bom = Math.random() < 0.18 && t > 12000 ? { mult: true, v: 2 } : { v: Phaser.Math.Between(2, 4 + Math.floor(t / 15000)) };
    const ruim = { v: -Phaser.Math.Between(2, 4 + Math.floor(t / 12000)) };
    const lados = Math.random() < 0.5 ? [bom, ruim] : [ruim, bom];
    const par = lados.map((d, i) => {
      const x = meio + (i ? 1 : -1) * w / 2;
      const img = this.add.image(x, -40, 'vitral-azul').setAlpha(0.95);
      const num = texto(this, x, -40, '', 30, '#ffffff');
      const g = { x, y: -40, w: w - 8, v: d.v, mult: !!d.mult, golpes: 0, img, num, usado: false };
      this.pintarPortal(g); return g;
    });
    par.forEach(g => { g.par = par; this.portais.push(g); });
  }
  pintarPortal(g) {
    g.img.setTexture(g.mult ? 'vitral-ouro' : g.v < 0 ? 'vitral-vermelho' : 'vitral-azul').setDisplaySize(g.w, 66);
    g.num.setText(g.mult ? '×2' : (g.v > 0 ? '+' : '') + g.v);
  }
  novoBau() {
    const tipos = Object.keys(MELHORIAS), tipo = tipos[this.st.seg % tipos.length], m = MELHORIAS[tipo];
    const x = Phaser.Math.Between(VIA.x0 + 40, VIA.x1 - 40), hp = Math.round((30 + this.st.t / 400) * (0.8 + this.grupo.length * 0.05));
    const spr = this.add.image(x, -40, 'bau-madeira').setDisplaySize(70, 60);
    const ico = this.add.image(x, -90, 'it-' + m.item).setDisplaySize(46, 46);
    const halo = this.add.circle(x, -90, 30, m.cor, 0.3).setStrokeStyle(3, m.cor, 0.9);
    const num = texto(this, x, -40, String(hp), 24, '#ffffff');
    this.tweens.add({ targets: ico, angle: { from: -8, to: 8 }, yoyo: true, repeat: -1, duration: 500 });
    this.baus.push({ x, y: -40, hp, tipo, spr, ico, halo, num });
  }
  novaHorda(n, lado) {
    const t = this.st.t, hp = 1 + Math.floor(t / 14000);
    const cx = lado ? (Math.random() < 0.5 ? VIA.x0 + 50 : VIA.x1 - 50) : Phaser.Math.Between(VIA.x0 + 50, VIA.x1 - 50);
    for (let i = 0; i < n; i++) {
      const beli = Math.random() < 0.25;
      const x = Phaser.Math.Clamp(cx + Phaser.Math.Between(-55, 55), VIA.x0 + 10, VIA.x1 - 10), y = -30 - Math.random() * 120;
      const spr = beli ? this.add.image(x, y, 'beliscao').setOrigin(0.5, 1).setScale(0.17) : new Boneco(this, sorteia(PEREGRINOS), x, y, 0.5, true).olhar(0, 1);
      this.inimigos.push({ x, y, hp: beli ? hp + 1 : hp, spr, vel: VIA.vel + 0.035 + Math.random() * 0.03 });
    }
  }
  chegaChefe() {
    const s = this.st, poder = this.grupo.length * (1000 / 420) * s.ritmo * s.forca * (1 + (s.raios - 1) * 0.6);
    const hp = Math.round(Math.max(300, poder * 13));
    const spr = this.add.image(LARG / 2, -60, 'servo').setOrigin(0.5, 1).setScale(0.8);
    texto(this, LARG / 2, 58, 'Servo do Insaciável', 15, '#ffd0d6').setDepth(5000);
    this.add.rectangle(LARG / 2, 78, 244, 16, 0x000000, 0.6).setStrokeStyle(2, 0xef6b7b).setDepth(5000);
    const vida = this.add.rectangle(LARG / 2 - 120, 78, 240, 12, 0xef6b7b).setOrigin(0, 0.5).setDepth(5001);
    const num = texto(this, LARG / 2, 78, String(hp), 13, '#ffffff').setDepth(5002);
    s.chefe = { x: LARG / 2, y: -60, hp, max: hp, spr, vida, num, vel: 0.045, chama: 2500 };
    this.anunciar('O SERVO DO INSACIÁVEL!', '#ff8a98');
    window.VJ.musica('10-boss');
  }
  anunciar(txt, cor) {
    const t = texto(this, LARG / 2, ALT / 2 - 120, txt, 28, cor, { wordWrap: { width: 340 } }).setDepth(6000).setScale(0.4);
    this.tweens.add({ targets: t, scale: 1, duration: 200, ease: 'Back.out' });
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 40, delay: 1100, duration: 400, onComplete: () => t.destroy() });
  }

  // ---------- laço ----------
  update(_, dt) {
    const s = this.st; if (s.fim) return;
    dt = Math.min(dt, 50); s.t += dt; s.inv = Math.max(0, s.inv - dt);
    const desce = VIA.vel * dt;
    this.chao.tilePositionY -= desce / VIA.esc;
    if (this.teclas) { if (this.teclas.left.isDown) this.gx -= dt * 0.3; if (this.teclas.right.isDown) this.gx += dt * 0.3; }
    // o grupo corre para o lugar de cada um
    this.formacao().forEach((q, i) => {
      const b = this.grupo[i];
      b.x += (q.x - b.x) * Math.min(1, dt * 0.012); b.y += (q.y - b.y) * Math.min(1, dt * 0.01);
      b.setDepth(b.y).andar(dt, 1.5);
    });
    this.atirar(dt);
    // agenda da estrada; no fim, o chefe
    if (s.t < VIA.duracao) { s.prox -= dt; if (s.prox <= 0) this.agenda(); }
    else if (!s.chefe) this.chegaChefe();
    this.barra.width = 220 * Math.min(1, s.t / VIA.duracao);
    this.moverTiros(dt);
    this.moverPortais(desce);
    this.moverBaus(desce);
    this.moverInimigos(dt);
    if (s.chefe && !s.fim) this.moverChefe(dt);
    // placa com o tamanho do grupo
    const n = this.grupo.length, txt = String(n);
    this.placa.setPosition(this.gx, VIA.gy + 26 + Math.sqrt(n) * 8);
    this.placaBg.clear().fillStyle(0x1b5fb8, 0.95).fillRoundedRect(-22, -14, 44, 28, 9).lineStyle(2, 0xffffff, 0.8).strokeRoundedRect(-22, -14, 44, 28, 9);
    if (this.placaT.text !== txt) { this.placaT.setText(txt); this.tweens.add({ targets: this.placa, scale: { from: 1.35, to: 1 }, duration: 160 }); }
  }
  // cada um atira um raio de luz reto para a frente
  atirar(dt) {
    const s = this.st, cad = 420 / s.ritmo;
    this.grupo.forEach(b => {
      b.tiro -= dt; if (b.tiro > 0) return;
      b.tiro += cad;
      for (let r = 0; r < s.raios; r++) {
        const dx = (r - (s.raios - 1) / 2) * 7, ang = -Math.PI / 2 + (r - (s.raios - 1) / 2) * 0.06;
        const spr = this.add.image(b.x + dx, b.y - 34, 'raio').setTint(b.heroi ? 0xfff2b0 : 0xf2c94c).setBlendMode('ADD').setRotation(ang).setScale(0.7, 0.8).setDepth(3000);
        this.tiros.push({ spr, x: b.x + dx, y: b.y - 34, vx: Math.cos(ang) * 0.95, vy: Math.sin(ang) * 0.95 });
      }
    });
    if (Math.random() < dt / 160) window.VJ.sfx('golpe');
  }
  moverTiros(dt) {
    const s = this.st;
    const pisca = o => { o.setTintFill(0xffffff); this.time.delayedCall(45, () => o.active && o.clearTint()); };
    // baú e chefe levam tiro sem parar: um tremor curto no lugar do branco (senão ficam brancos o tempo todo)
    const treme = o => { if (!o.tremendo) { o.tremendo = true; o.setTint(0xffd9a8); this.time.delayedCall(70, () => { o.tremendo = false; o.active && o.clearTint(); }); } };
    this.tiros = this.tiros.filter(t => {
      t.x += t.vx * dt; t.y += t.vy * dt; t.spr.setPosition(t.x, t.y);
      const some = () => { t.spr.destroy(); return false; };
      if (t.y < -40) return some();
      // portal: cada 3 raios aumenta 1 (mais raios quando o grupo é grande); o vermelho vai subindo até virar azul
      const g = this.portais.find(g => !g.usado && Math.abs(g.x - t.x) < g.w / 2 && Math.abs(g.y - t.y) < 32);
      if (g) {
        if (!g.mult && ++g.golpes % Math.max(3, Math.round(this.grupo.length / 4)) === 0 && g.v < 20) { g.v = g.v === -1 ? 1 : g.v + 1; this.pintarPortal(g); this.tweens.add({ targets: g.num, scale: { from: 1.4, to: 1 }, duration: 120 }); }
        return some();
      }
      const bau = this.baus.find(b => Math.abs(b.x - t.x) < 34 && Math.abs(b.y - t.y) < 30);
      if (bau) { bau.hp -= s.forca; bau.num.setText(String(Math.max(0, Math.ceil(bau.hp)))); treme(bau.spr); return some(); }
      const e = this.inimigos.find(e => e.hp > 0 && Math.abs(e.x - t.x) < 14 && t.y < e.y && t.y > e.y - 46);
      if (e) { e.hp -= s.forca; pisca(e.spr); return some(); }
      const c = s.chefe;
      if (c && c.hp > 0 && Math.abs(c.x - t.x) < 80 && t.y < c.y && t.y > c.y - 220) {
        c.hp -= s.forca; treme(c.spr);
        if (Math.random() < 0.3) { this.faiscas.setParticleTint(0xf2c94c); this.faiscas.explode(3, t.x, t.y); }
        return some();
      }
      return true;
    });
  }
  moverPortais(desce) {
    this.portais = this.portais.filter(g => {
      g.y += desce; g.img.setPosition(g.x, g.y).setDepth(g.y); g.num.setPosition(g.x, g.y).setDepth(g.y + 1);
      if (!g.usado && g.y >= VIA.gy - 20) {
        g.par.forEach(o => { o.usado = true; });
        // passa pelo portal do lado onde está o grupo
        const meu = g.par.find(o => Math.abs(this.gx - o.x) <= o.w / 2 + 2) || g;
        const antes = this.grupo.length;
        if (meu.mult) this.entrar(antes);
        else if (meu.v > 0) this.entrar(meu.v);
        else this.perder(-meu.v, this.gx, VIA.gy);
        const dif = this.grupo.length - antes;
        this.anunciar(meu.mult ? '×2 PEREGRINOS!' : dif >= 0 ? `+${dif} PEREGRINOS` : `${dif}`, dif >= 0 ? '#9cd0ff' : '#ff8a98');
        window.VJ.sfx(dif >= 0 ? 'sinos' : 'toin');
        g.par.forEach(o => { this.tweens.add({ targets: [o.img, o.num], alpha: 0, duration: 250 }); });
      }
      if (g.y > ALT + 60) { g.img.destroy(); g.num.destroy(); return false; }
      return true;
    });
  }
  moverBaus(desce) {
    this.baus = this.baus.filter(b => {
      b.y += desce;
      b.spr.setPosition(b.x, b.y).setDepth(b.y); b.num.setPosition(b.x, b.y + 4).setDepth(b.y + 1);
      b.ico.setPosition(b.x, b.y - 58).setDepth(b.y + 1); b.halo.setPosition(b.x, b.y - 58).setDepth(b.y);
      const fora = () => { [b.spr, b.ico, b.halo, b.num].forEach(o => o.destroy()); return false; };
      if (b.hp <= 0) { this.melhorar(b.tipo, b.x, b.y); return fora(); }
      // baú inteiro que bate no grupo esmaga três peregrinos (no herói sozinho, acaba a corrida)
      if (b.y > VIA.gy - 30 && Math.abs(b.x - this.gx) < 50 + Math.sqrt(this.grupo.length) * 6) {
        this.ferido(); this.estoura(b.x, b.y, 0x8a5a2b);
        if (!this.perder(3, b.x, b.y)) this.machucarHeroi();
        return fora();
      }
      if (b.y > ALT + 60) return fora();
      return true;
    });
  }
  moverInimigos(dt) {
    const s = this.st;
    this.inimigos = this.inimigos.filter(e => {
      if (e.hp <= 0) { s.abates++; this.estoura(e.x, e.y - 20, 0xb4b1c2); e.spr.destroy(); return false; }
      // correm para baixo e puxam de leve para o grupo
      e.y += e.vel * dt; if (e.y > VIA.gy - 160) e.x += Phaser.Math.Clamp(this.gx - e.x, -1, 1) * 0.04 * dt;
      e.spr.setPosition(e.x, e.y).setDepth(e.y); if (e.spr.andar) e.spr.andar(dt, 1.4);
      // encostou em alguém: os dois caem; se for o herói, cai um peregrino no lugar dele
      const alvo = this.grupo.find(b => Math.abs(b.x - e.x) < 15 && Math.abs(b.y - e.y) < 14);
      if (alvo) {
        e.spr.destroy(); this.ferido(alvo);
        if (!this.perder(1, alvo.x, alvo.y)) this.machucarHeroi();
        return false;
      }
      if (e.y > ALT + 40) { e.spr.destroy(); return false; }
      return true;
    });
  }
  moverChefe(dt) {
    const c = this.st.chefe;
    if (c.hp <= 0) return this.terminar(true);
    c.y += c.vel * dt; c.x = LARG / 2 + Math.sin(this.st.t / 900) * 40;
    c.spr.setPosition(c.x, c.y).setDepth(c.y).setScale(0.8, 0.8 + Math.sin(this.st.t / 160) * 0.02);
    c.vida.width = 240 * Math.max(0, c.hp) / c.max; c.num.setText(String(Math.max(0, Math.ceil(c.hp))));
    // chama Beliscões pelo caminho
    if ((c.chama -= dt) <= 0) { c.chama = 3000; this.novaHorda(4 + Math.floor(this.grupo.length / 6)); }
    if (c.y > VIA.gy - 20) { this.ferido(); this.terminar(false); }
  }
  melhorar(tipo, x, y) {
    const s = this.st, m = MELHORIAS[tipo];
    if (tipo === 'raio') s.raios = Math.min(3, s.raios + 1);
    if (tipo === 'ritmo') s.ritmo = Math.min(2.4, s.ritmo * 1.3);
    if (tipo === 'forca') s.forca = Math.min(4, s.forca * 1.5);
    this.estoura(x, y - 40, m.cor);
    this.anunciar(m.nome + '!', '#' + m.cor.toString(16).padStart(6, '0'));
    window.VJ.sfx('moeda');
  }
  estoura(x, y, cor) { this.faiscas.setParticleTint(cor); this.faiscas.explode(12, x, y); }
  terminar(venceu) {
    const s = this.st; if (s.fim) return; s.fim = true;
    this.grupo.forEach(b => b.andar(0, 0));
    if (venceu && s.chefe) { this.estoura(s.chefe.x, s.chefe.y - 100, 0xf2c94c); this.tweens.add({ targets: s.chefe.spr, alpha: 0, scaleY: 0.1, duration: 500 }); }
    const r = window.VJ.fimDesafio({ venceu, abates: s.abates });
    this.add.rectangle(LARG / 2, ALT / 2, 320, 300, 0x15121f, 0.94).setStrokeStyle(3, venceu ? 0xf2c94c : 0xef6b7b).setDepth(9000);
    texto(this, LARG / 2, ALT / 2 - 100, venceu ? 'ESTRADA LIBERTADA!' : 'A horda alcançou o grupo', venceu ? 26 : 21, venceu ? '#f3d27e' : '#ff8a98').setDepth(9001);
    texto(this, LARG / 2, ALT / 2 - 20, `${this.grupo.length} peregrinos na estrada\n` + r.texto, 16, '#ffffff', { wordWrap: { width: 280 } }).setDepth(9001);
    const botao = (y, rotulo, cb) => {
      const b = this.add.rectangle(LARG / 2, y, 240, 48, 0xe9c46a).setDepth(9001).setInteractive({ useHandCursor: true }).on('pointerdown', cb);
      texto(this, LARG / 2, y, rotulo, 18, '#1a1426', { stroke: '#e9c46a', strokeThickness: 0 }).setDepth(9002);
      return b;
    };
    if (r.podeDeNovo) botao(ALT / 2 + 70, 'Correr de novo', () => { if (window.VJ.comecarDesafio()) this.scene.restart(); });
    botao(ALT / 2 + (r.podeDeNovo ? 126 : 80), 'Voltar', () => window.VJ.sair());
    if (venceu) window.VJ.sfx('fanfarra');
  }
}
