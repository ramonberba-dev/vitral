// VITRAL — exploração do reino (cena Phaser). Carregado depois de game.js.
// Mapa visto de cima: o líder anda com joystick (ou setas), o resto do time segue em fila,
// o Anjo voa ao lado. Só dá para pisar onde a máscara mapa-r1-chao.png é branca.
'use strict';

const ESC_MAPA = 0.75;          // mapa HD 1536x2752 → mundo 1152x2064
const ESC_BONECO = 0.72;        // quadro 96x128 → ~92 px de altura
const VEL = 0.21;               // px por ms
const ANDA = ['kael', 'clara', 'simo', 'tonho', 'luzia', 'cisco', 'jana', 'tessa', 'gio', 'duda', 'guto', 'avila', 'yuri', 'zeca'];

// 23 cacos de vitral, 4 baús escondidos e 3 peregrinos por reino
const EXTRAS = Array.from({ length: 30 }, (_, i) => i % 8 === 3 ? 'bau' : i % 8 === 7 ? 'peregrino' : 'caco');
function semente(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const sorteiaCom = (rnd, a) => a[Math.floor(rnd() * a.length)];

class Explorar extends Phaser.Scene {
  constructor() { super('explorar'); }
  create() {
    const VJ = window.VJ, p = VJ.p();
    this.ocupado = false; this.perto = -1; this.t = 0; this.toque = null; this.vet = { x: 0, y: 0 };
    this.mapa = this.add.image(0, 0, 'mapa-r1').setOrigin(0).setScale(ESC_MAPA).setDepth(-10);
    this.W = this.mapa.displayWidth; this.H = this.mapa.displayHeight;
    this.lerChao();
    this.pos = POS_R1.map(([x, y]) => ({ x: x * MUNDO, y: y * MUNDO }));
    this.montarPontos();
    this.montarTime(p);
    this.montarAmbiente();
    this.montarExtras(p);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.W, this.H).setZoom(Z).startFollow(this.lider, true, 0.1, 0.1);
    cam.fadeIn(350, 15, 13, 23);
    // câmera da interface (sem zoom e sem rolar) só para o joystick e a dica
    this.ui = this.add.container(0, 0).setDepth(100000);
    cam.ignore(this.ui);
    this.camUI = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.camUI.ignore(this.children.list.filter(o => o !== this.ui));
    this.montarJoystick();
    this.contador = texto(this, 14 * Z, 18 * Z, '', 14 * Z, '#f3d27e', { align: 'left' }).setOrigin(0, 0.5); this.ui.add(this.contador); this.cameras.main.ignore(this.contador); this.pintarContador();
    this.teclas = this.input.keyboard ? this.input.keyboard.createCursorKeys() : null;
    VJ.musica(VJ.reino.musica);
  }
  // tudo que for criado depois do create precisa ficar fora da câmera da interface
  add_(o) { if (this.camUI) this.camUI.ignore(o); return o; }
  lerChao() {
    const img = this.textures.get('chao').getSourceImage();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    this.chao = { w: img.width, h: img.height, d: g.getImageData(0, 0, img.width, img.height).data, k: img.width / this.W };
  }
  pisavel(x, y) {
    if (x < 20 || y < 20 || x > this.W - 20 || y > this.H - 6) return false;
    if (this.barreiraY && y < this.barreiraY + 34) return false;
    const c = this.chao, px = Math.floor(x * c.k), py = Math.floor(y * c.k);
    return c.d[(py * c.w + px) * 4] > 127;
  }
  criarAnims(k) {
    if (this.anims.exists(k + '-baixo')) return;
    const a = (n, ini) => this.anims.create({ key: `${k}-${n}`, frames: this.anims.generateFrameNumbers('anda-' + k, { start: ini, end: ini + 5 }), frameRate: 10, repeat: -1 });
    a('baixo', 0); a('lado', 6); a('cima', 12);
  }
  boneco(k, x, y) {
    this.criarAnims(k);
    const s = this.add.sprite(x, y, 'anda-' + k, 0).setOrigin(0.5, 0.96).setScale(ESC_BONECO);
    s.sombra = this.add.ellipse(x, y, 46, 14, 0x000000, 0.28);
    s.k = k; s.dir = 'baixo';
    return s;
  }
  virar(s, dx, dy, andando) {
    let dir = s.dir;
    if (Math.abs(dx) > 0.01 && Math.abs(dx) > Math.abs(dy) * 0.8) { dir = 'lado'; s.setFlipX(dx > 0); }
    else if (Math.abs(dy) > 0.01) { dir = dy < 0 ? 'cima' : 'baixo'; s.setFlipX(false); }
    if (andando) { if (!s.anims.isPlaying || s.anims.currentAnim.key !== `${s.k}-${dir}`) s.play(`${s.k}-${dir}`, true); }
    else if (s.anims.isPlaying || s.dir !== dir) { s.anims.stop(); s.setFrame({ baixo: 0, lado: 6, cima: 12 }[dir]); }
    s.dir = dir;
  }
  montarTime(p) {
    const time = p.equipe.filter(k => p.devotos[k] && ANDA.includes(k)).slice(0, 4);
    if (!time.length) time.push('clara');
    const no = Math.min(p.reino.no, this.pos.length);
    const ini = no > 0 ? this.pos[no - 1] : { x: 330 * MUNDO, y: 1340 * MUNDO };
    this.lider = this.boneco(time[0], ini.x, ini.y);
    this.seguidores = time.slice(1).map((k, i) => this.boneco(k, ini.x, ini.y + 22 * (i + 1)));
    this.rastro = Array.from({ length: 60 }, (_, i) => ({ x: ini.x, y: ini.y + i * 1.7 }));
    this.anjoBrilho = this.add.circle(ini.x + 50, ini.y - 90, 26, 0xfff2b0, 0.25).setBlendMode('ADD');
    this.anjo = this.add.image(ini.x + 50, ini.y - 90, 'anjo').setScale(0.13);
    this.poeira = this.add.particles(0, 0, 'ponto', { speed: { min: 8, max: 30 }, angle: { min: 200, max: 340 }, scale: { start: 0.3, end: 0 }, alpha: { start: 0.45, end: 0 }, lifespan: 380, tint: 0xd8c39a, emitting: false });
  }
  montarAmbiente() {
    // pétalas e brilhos no ar: dão vida ao mapa
    this.add.particles(0, 0, 'ponto', { x: { min: 0, max: this.W }, y: { min: 0, max: this.H }, lifespan: 6000, speedX: { min: 6, max: 22 }, speedY: { min: -4, max: 10 }, scale: { min: 0.08, max: 0.18 }, alpha: { start: 0.9, end: 0 }, tint: [0xffffff, 0xffd6e8, 0xfff2b0], frequency: 120 }).setDepth(50000);
  }
  montarJoystick() {
    const R = 31 * Z;
    this.base = this.add.circle(0, 0, R, 0xffffff, 0.12).setStrokeStyle(3, 0xffffff, 0.45).setVisible(false);
    this.knob = this.add.circle(0, 0, R * 0.45, 0xe9c46a, 0.85).setVisible(false);
    this.dica = texto(this, this.scale.width / 2, this.scale.height - 36 * Z, 'Arraste o dedo para andar', 15 * Z, '#ffffff');
    this.dica.setResolution(1);
    this.ui.add([this.base, this.knob, this.dica]);
    this.cameras.main.ignore([this.base, this.knob, this.dica]);
    this.input.on('pointerdown', ptr => {
      if (this.ocupado) return;
      this.toque = ptr.id; this.base.setPosition(ptr.x, ptr.y).setVisible(true); this.knob.setPosition(ptr.x, ptr.y).setVisible(true);
      if (this.dica.visible) this.tweens.add({ targets: this.dica, alpha: 0, duration: 400, onComplete: () => this.dica.setVisible(false) });
    });
    this.input.on('pointermove', ptr => {
      if (ptr.id !== this.toque || !ptr.isDown) return;
      let dx = ptr.x - this.base.x, dy = ptr.y - this.base.y; const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      this.knob.setPosition(this.base.x + dx, this.base.y + dy);
      this.vet = d < 8 ? { x: 0, y: 0 } : { x: dx / R, y: dy / R };
    });
    const solta = ptr => { if (ptr.id !== this.toque) return; this.toque = null; this.vet = { x: 0, y: 0 }; this.base.setVisible(false); this.knob.setVisible(false); };
    this.input.on('pointerup', solta); this.input.on('pointerupoutside', solta);
  }
  montarPontos() {
    const p = window.VJ.p(), R = window.VJ.reino, no = p.reino.no;
    this.barreiraY = 0;
    R.nos.forEach((n, i) => {
      const { x, y } = this.pos[i], atual = i === no;
      if (i < no) { texto(this, x, y - 10, '✓', 22, '#5fd39a').setAlpha(0.7).setDepth(y); return; }
      const c = this.add.container(x, y).setDepth(y);
      if (n.t === 'historia') { const a = this.add.image(0, -10, 'anjo').setOrigin(0.5, 1).setScale(0.15); c.add(a); this.tweens.add({ targets: a, y: -22, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.inOut' }); }
      if (n.t === 'bau') { const b = this.add.image(0, -18, 'bau').setScale(0.7); c.add(b); this.tweens.add({ targets: b, angle: { from: -4, to: 4 }, yoyo: true, repeat: -1, duration: 500 }); }
      if (n.t === 'santuario') { const l = this.add.ellipse(0, -10, 90, 40, 0xfff2b0, 0.35).setBlendMode('ADD'); c.add(l); this.tweens.add({ targets: l, alpha: 0.08, scale: 1.3, yoyo: true, repeat: -1, duration: 1100 }); }
      if (n.t === 'batalha') n.inimigos.forEach((k, j) => {
        let s;
        if (k === 'larva') s = this.add.image(0, 0, 'larva').setScale(0.24).setOrigin(0.5, 1);
        else { const dk = sorteia(ANDA); this.criarAnims(dk); s = this.add.sprite(0, 0, 'anda-' + dk, 6).setOrigin(0.5, 0.96).setScale(ESC_BONECO * 0.95).setTint(0x6f6c80); s.play(dk + '-lado'); }
        s.x = (j - (n.inimigos.length - 1) / 2) * 50; c.add(s);
        if (s.setFlipX) s.setFlipX(true);
        this.tweens.add({ targets: s, x: s.x + 36, yoyo: true, repeat: -1, duration: Phaser.Math.Between(1600, 2400), ease: 'Sine.inOut', onYoyo: () => s.setFlipX && s.setFlipX(false), onRepeat: () => s.setFlipX && s.setFlipX(true) });
      });
      if (n.t === 'boss') { const s = this.add.image(0, 0, 'servo').setOrigin(0.5, 1).setScale(0.36); c.add(s); this.tweens.add({ targets: s, scaleY: 0.38, yoyo: true, repeat: -1, duration: 800 }); }
      if (n.t === 'chefe') { const s = this.add.image(0, 0, 'insaciavel').setOrigin(0.5, 1).setScale(0.5); c.add(s); this.tweens.add({ targets: s, y: -10, yoyo: true, repeat: -1, duration: 1300, ease: 'Sine.inOut' }); }
      if (n.t === 'bruma') {
        c.add(this.add.particles(0, 0, 'ponto', { x: { min: -x, max: this.W - x }, y: { min: -26, max: 26 }, speedX: { min: -14, max: 14 }, scale: { start: 2.6, end: 3.8 }, alpha: { start: 0.5, end: 0 }, tint: 0xa9a7b6, lifespan: 2600, frequency: 30 }));
        c.add(texto(this, 0, -46, `🌫 ${n.titulo}\n${n.selos} Selo${n.selos > 1 ? 's' : ''} de Temperança`, 15, '#ffffff'));
        this.barreiraY = Math.max(this.barreiraY, y);
      }
      if (atual && window.VJ.larvas() > 0) {
        c.add(this.add.image(0, 10, 'larva').setOrigin(0.5, 1).setScale(0.5));
        c.add(texto(this, 0, -130, 'Larva bloqueando!\nRepare na vida real', 15, '#ff8a98'));
        this.barreiraY = Math.max(this.barreiraY, y);
      }
      if (atual) {
        const aro = this.add.ellipse(0, 4, 110, 40).setStrokeStyle(3, 0xe9c46a, 0.9); c.addAt(aro, 0);
        this.tweens.add({ targets: aro, scale: 1.25, alpha: 0.2, yoyo: true, repeat: -1, duration: 800 });
        const seta = this.add.image(0, -112, 'seta').setTint(0xe9c46a); c.add(seta);
        this.tweens.add({ targets: seta, y: -96, yoyo: true, repeat: -1, duration: 500 });
        c.add(texto(this, 0, -138, n.titulo, 15, '#f3d27e'));
      }
    });
  }
  update(_, dt) {
    if (!this.lider) return;
    let vx = this.vet.x, vy = this.vet.y;
    if (this.teclas) {
      const k = this.teclas;
      if (k.left.isDown) vx = -1; else if (k.right.isDown) vx = 1;
      if (k.up.isDown) vy = -1; else if (k.down.isDown) vy = 1;
    }
    const L = this.lider, forca = Math.min(1, Math.hypot(vx, vy));
    if (!this.ocupado && forca > 0.15) {
      const n = Math.hypot(vx, vy), passo = VEL * dt * (0.45 + 0.55 * forca);
      const dx = vx / n * passo, dy = vy / n * passo;
      let andou = false;
      // desliza nas bordas: tenta o movimento inteiro, depois só em x, depois só em y
      if (this.pisavel(L.x + dx, L.y + dy)) { L.x += dx; L.y += dy; andou = true; }
      else if (this.pisavel(L.x + dx, L.y)) { L.x += dx; andou = true; }
      else if (this.pisavel(L.x, L.y + dy)) { L.y += dy; andou = true; }
      this.virar(L, dx, dy, andou);
      L.anims.timeScale = 0.7 + 0.5 * forca;
      if (andou) {
        this.rastro.unshift({ x: L.x, y: L.y }); this.rastro.length = 60;
        if (Math.random() < 0.25) this.add_(this.poeira).emitParticleAt(L.x, L.y);
      }
    } else this.virar(L, 0, 0, false);
    this.seguidores.forEach((s, i) => {
      const alvo = this.rastro[Math.min(this.rastro.length - 1, (i + 1) * 13)];
      const dx = alvo.x - s.x, dy = alvo.y - s.y, d = Math.hypot(dx, dy);
      if (d > 2) { const k = Math.min(1, (VEL * dt * 1.1) / d); s.x += dx * k; s.y += dy * k; this.virar(s, dx, dy, true); }
      else this.virar(s, 0, 0, false);
    });
    this.t += dt;
    const ax = L.x + (L.flipX ? -46 : 46), ay = L.y - 96 + Math.sin(this.t / 400) * 7;
    this.anjo.x += (ax - this.anjo.x) * 0.08; this.anjo.y += (ay - this.anjo.y) * 0.08; this.anjo.setFlipX(L.flipX);
    this.anjoBrilho.setPosition(this.anjo.x, this.anjo.y);
    [L, ...this.seguidores].forEach(s => { s.setDepth(s.y); s.sombra.setPosition(s.x, s.y).setDepth(s.y - 1); });
    this.anjo.setDepth(L.y + 200); this.anjoBrilho.setDepth(L.y + 199);
    this.checarExtras();
    this.checarPontos();
  }
  // exploração livre: cacos de vitral, baús escondidos e peregrinos espalhados nas partes andáveis do mapa.
  // As posições saem de um sorteio com semente fixa: são as mesmas toda vez e em todo aparelho.
  montarExtras(p) {
    const ex = window.VJ.explora(), rnd = semente(7719), pos = [];
    const longeDe = (x, y, lista, d) => lista.every(q => Math.hypot(q.x - x, q.y - y) > d);
    for (let t = 0; t < 9000 && pos.length < EXTRAS.length; t++) {
      const x = 40 + rnd() * (this.W - 80), y = 40 + rnd() * (this.H - 80);
      const c = this.chao, px = Math.floor(x * c.k), py = Math.floor(y * c.k);
      if (c.d[(py * c.w + px) * 4] <= 127) continue;
      if (!longeDe(x, y, this.pos, 70) || !longeDe(x, y, pos, 72)) continue;
      pos.push({ x, y });
    }
    this.extras = pos.map((q, i) => ({ ...q, i, t: EXTRAS[i] }));
    this.extras.forEach(e => {
      if (ex.pegos.includes(e.i)) return;
      if (e.t === 'caco') {
        const cor = sorteiaCom(rnd, [0xe5546b, 0x5aa9e6, 0x5fd39a, 0xe9c46a, 0xa77bf3, 0xf08a3c]);
        e.obj = this.add.image(e.x, e.y - 16, 'caco').setTint(cor).setScale(0.9).setDepth(e.y).setBlendMode('ADD');
        e.brilho = this.add.circle(e.x, e.y - 16, 16, cor, 0.25).setBlendMode('ADD').setDepth(e.y - 1);
        this.tweens.add({ targets: e.obj, y: e.y - 24, angle: 12, yoyo: true, repeat: -1, duration: 900 + rnd() * 500, ease: 'Sine.inOut' });
        this.tweens.add({ targets: e.brilho, scale: 1.5, alpha: 0.05, yoyo: true, repeat: -1, duration: 1100 });
      } else if (e.t === 'bau') {
        e.obj = this.add.image(e.x, e.y, 'bau').setOrigin(0.5, 1).setScale(0.55).setDepth(e.y).setTint(0xd9d9ff);
        this.tweens.add({ targets: e.obj, angle: { from: -3, to: 3 }, yoyo: true, repeat: -1, duration: 700 });
      } else {
        const k = ANDA[(e.i * 5) % ANDA.length]; this.criarAnims(k);
        e.obj = this.add.sprite(e.x, e.y, 'anda-' + k, 0).setOrigin(0.5, 0.96).setScale(ESC_BONECO * 0.9).setDepth(e.y);
        e.balao = texto(this, e.x, e.y - 104, '💬', 22).setDepth(e.y + 1);
        this.tweens.add({ targets: e.balao, y: e.y - 112, yoyo: true, repeat: -1, duration: 600 });
      }
    });
  }
  pintarContador() {
    const ex = window.VJ.explora(), n = ex.pegos.filter(i => EXTRAS[i] === 'caco').length, tot = EXTRAS.filter(t => t === 'caco').length;
    this.contador.setText(`💎 ${n}/${tot} cacos`);
  }
  checarExtras() {
    if (this.ocupado || !this.extras) return;
    const L = this.lider;
    this.extras.forEach(e => {
      if (!e.obj || e.pego) return;
      if (Math.hypot(e.x - L.x, e.y - L.y) > (e.t === 'peregrino' ? 70 : 42)) return;
      e.pego = true;
      const r = window.VJ.pegarExtra(e.i, e.t);
      if (e.t === 'peregrino') {
        e.balao.destroy();
        const b = this.add_(texto(this, e.x, e.y - 120, r.fala, 15, '#ffffff', { wordWrap: { width: 230 }, align: 'center', backgroundColor: 'rgba(20,15,32,.85)', padding: { x: 10, y: 8 } })).setDepth(90000);
        this.time.delayedCall(4200, () => this.tweens.add({ targets: b, alpha: 0, duration: 500, onComplete: () => b.destroy() }));
        return;
      }
      const fx = this.add_(this.add.particles(e.x, e.y - 16, 'ponto', { speed: { min: 60, max: 180 }, scale: { start: 0.5, end: 0 }, lifespan: 600, tint: [0xfff2b0, 0xffffff], blendMode: 'ADD', emitting: false })).setDepth(90000);
      fx.explode(18); this.time.delayedCall(700, () => fx.destroy());
      this.tweens.add({ targets: [e.obj, e.brilho].filter(Boolean), y: '-=40', alpha: 0, scale: 1.4, duration: 450, onComplete: () => { e.obj.destroy(); e.brilho && e.brilho.destroy(); } });
      this.pintarContador();
    });
  }
  checarPontos() {
    const VJ = window.VJ, p = VJ.p(), i = p.reino.no;
    if (i >= this.pos.length || this.ocupado) return;
    const alvo = this.pos[i], d = Math.hypot(alvo.x - this.lider.x, alvo.y - this.lider.y);
    if (d > 60) { this.perto = -1; return; }
    if (this.perto === i) return;
    this.perto = i; this.vet = { x: 0, y: 0 };
    const r = VJ.interagir(i);
    if (r.tipo === 'batalha') {
      this.ocupado = true;
      const vai = () => this.transicao(() => this.scene.start('batalha', { no: VJ.reino.nos[i] }));
      if (r.video) VJ.video(r.video, vai); else vai();
    } else if (r.tipo === 'historia') this.ocupado = true;
    else if (r.tipo === 'ok') this.time.delayedCall(250, () => this.scene.restart());
  }
  transicao(fim) {
    const cam = this.cameras.main;
    cam.flash(250, 255, 255, 255);
    this.tweens.add({ targets: cam, zoom: Z * 1.8, rotation: 0.14, duration: 520, ease: 'Cubic.in' });
    cam.fadeOut(520, 15, 13, 23);
    this.time.delayedCall(540, fim);
  }
}
