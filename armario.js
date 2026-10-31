// VITRAL — Armário: itens colecionáveis com número de série (estilo NFT, sem blockchain),
// baús e os 7 encaixes do herói. Os itens dão bônus na batalha (stats() em app.js).
// Óculos são produtos reais da VOX (fotos da loja); o resto é arte do próprio jogo, sem marcas.
'use strict';

const SLOTS = [['cabeca', 'Cabeça', '⛑️'], ['oculos', 'Óculos', '👓'], ['capa', 'Capa', '🧣'], ['reliquia', 'Relíquia', '✝️'],
  ['arma', 'Arma', '⚔️'], ['escudo', 'Escudo', '🛡️'], ['tenis', 'Tênis', '👟']];
const RARIDADES = [null, { nome: 'Comum', cor: '#a7b0c2', ed: 500, troca: 2 }, { nome: 'Raro', cor: '#5aa9e6', ed: 150, troca: 5 },
  { nome: 'Épico', cor: '#b38cff', ed: 40, troca: 12 }, { nome: 'Lendário', cor: '#f2c94c', ed: 10, troca: 30 }];
const SLOT_STAT = { cabeca: ['defesa', 'vida'], oculos: ['critico'], capa: ['vida'], reliquia: ['dom', 'vida'], arma: ['ataque'], escudo: ['defesa'], tenis: ['dom', 'critico'] };
const BONUS_RAR = { vida: [0, 20, 45, 80, 130], ataque: [0, 3, 6, 10, 16], defesa: [0, 2, 4, 6, 9], critico: [0, 2, 4, 7, 11], dom: [0, 3, 6, 10, 15] };
const STAT_NOME = { vida: 'Vida', ataque: 'Ataque', defesa: 'Defesa', critico: 'Crítico', dom: 'Dom' };
const STAT_PCT = { defesa: 1, critico: 1, dom: 1 };

const It = (k, nome, slot, rar, desc, extra = {}) => ({ k, nome, slot, rar, desc, img: `assets/itens/${k}.webp`, ...extra });
const Vox = (k, nome, rar, tipo, desc, slug) => ({ k: 'vox-' + k, nome, slot: 'oculos', rar, desc, img: `assets/itens/vox-${k}.jpg`, vox: { tipo, url: `https://usevox.com.br/produtos/${slug}/` } });
const ITENS = [
  It('espada-curta', 'Espada de Treino', 'arma', 1, 'Todo cavaleiro começou com uma dessas.'),
  It('cajado', 'Cajado do Pastor', 'arma', 1, 'O bom pastor conhece as suas ovelhas (Jo 10,14).'),
  It('espada-longa', 'Espada da Vigília', 'arma', 2, 'A gema azul brilha quando alguém precisa de ajuda.'),
  It('lanca', 'Lança da Fita Azul', 'arma', 2, 'Leve, rápida e sempre apontada para frente.'),
  It('espada-santa', 'Espada da Palavra', 'arma', 3, 'A Palavra é mais cortante que espada de dois gumes (Hb 4,12).'),
  It('arco', 'Arco Alvo', 'arma', 3, 'Mira firme, coração em paz.'),
  It('espada-luz', 'Espada da Aurora', 'arma', 4, 'Forjada na luz que a Bruma não consegue apagar.'),
  It('lanca-luz', 'Lança de Luz', 'arma', 4, 'A luz brilha nas trevas, e as trevas não a venceram (Jo 1,5).'),
  It('escudo-madeira', 'Escudo de Carvalho', 'escudo', 1, 'Simples, pesado e honesto.'),
  It('escudo-pomba', 'Escudo da Pomba', 'escudo', 2, 'Prudentes como as serpentes, simples como as pombas (Mt 10,16).'),
  It('escudo-cruz', 'Escudo da Fé', 'escudo', 3, 'Tomai o escudo da fé (Ef 6,16).'),
  It('escudo-rosacea', 'Escudo Rosácea', 'escudo', 4, 'Um vitral vivo: cada caco de luz protege.'),
  It('tenis-lona', 'Tênis de Lona', 'tenis', 1, 'Para quem anda muito e reclama pouco.'),
  It('tenis-pb', 'Tênis Preto e Branco', 'tenis', 1, 'Combina com tudo. Até com missão difícil.'),
  It('tenis-laranja', 'Tênis Brasa', 'tenis', 2, 'Cor de fogueira de acampamento.'),
  It('tenis-oliveira', 'Tênis da Oliveira', 'tenis', 3, 'Um ramo de oliveira: paz em cada passo.'),
  It('tenis-asas', 'Tênis Alado', 'tenis', 4, 'Correm e não se cansam (Is 40,31).'),
  It('capa-viajante', 'Capa do Peregrino', 'capa', 1, 'Já viu muita estrada e muita chuva.'),
  It('capa-verde', 'Capuz da Floresta', 'capa', 2, 'Para andar em silêncio pelas Colinas.'),
  It('capa-real', 'Manto Carmesim', 'capa', 3, 'Bordado à mão, com fio de ouro.'),
  It('capa-estrelas', 'Manto de Estrelas', 'capa', 4, 'Uma mulher vestida de sol, com uma coroa de doze estrelas (Ap 12,1).'),
  It('cruz-madeira', 'Cruz de Madeira', 'reliquia', 1, 'Leve no pescoço, firme no coração.'),
  It('medalha-maos', 'Medalha das Mãos', 'reliquia', 2, 'Para lembrar de rezar antes da batalha.'),
  It('terco', 'Terço do Peregrino', 'reliquia', 3, 'Cinquenta Ave-Marias de coragem.'),
  It('relicario', 'Relicário do Vitral', 'reliquia', 4, 'Guarda um pedacinho da luz da Cidade do Rei.'),
  It('bone', 'Boné de Couro', 'cabeca', 1, 'Protege do sol. E das ideias ruins? Talvez.'),
  It('elmo-cavaleiro', 'Elmo do Cavaleiro', 'cabeca', 2, 'O penacho azul assusta os capangas.'),
  It('elmo-paladino', 'Elmo da Salvação', 'cabeca', 3, 'Tomai o capacete da salvação (Ef 6,17).'),
  It('coroa-luz', 'Coroa de Luz', 'cabeca', 4, 'A coroa que não murcha (1Pd 5,4).'),
  Vox('lector', 'VOX Lector', 2, 'Óculos de grau', 'Lâmpada para os meus pés é a tua palavra (Sl 119,105). Para quem lê, estuda e não para de aprender.', 'vox-lector-1wme2'),
  Vox('laudes', 'VOX Laudes', 2, 'Óculos de grau', 'Pela manhã ouvirás a minha voz (Sl 5,3). Para quem começa o dia agradecendo.', 'vox-laudes-930s8'),
  Vox('columba', 'VOX Columba', 2, 'Óculos de grau', 'Pomba minha, mostra-me a tua face (Ct 2,14). Leveza de quem não precisa provar nada.', 'vox-columba-dk869'),
  Vox('tessera', 'VOX Tessera', 2, 'Óculos de grau', 'Vós sois pedras vivas (1Pd 2,5). Cada peça tem seu lugar no todo.', 'vox-tessera-k4f7l'),
  Vox('hortus', 'VOX Hortus', 3, 'Óculos de grau', 'Jardim fechado és tu (Ct 4,12). Para quem cultiva em silêncio o que floresce por dentro.', 'vox-hortus-1nxr0'),
  Vox('custos', 'VOX Custos', 3, 'Óculos de grau', 'Vigiai e orai (Mt 26,41). Para quem guarda o que importa.', 'vox-custos-1q3ev'),
  Vox('ardens', 'VOX Ardens', 3, 'Óculos de grau', 'Não ardia o nosso coração? (Lc 24,32). Para quem carrega um fogo que não se apaga.', 'vox-ardens-djt21'),
  Vox('duplex', 'VOX Duplex', 3, 'Grau com clip de sol', 'Uma armação, dois olhares: de grau no dia a dia, de sol com o clip.', 'vox-duplex-1nxcq'),
  Vox('dualis', 'VOX Dualis', 4, 'Grau com clip de sol', 'Um óculos, dois dias dentro dele. Preto fosco, linhas retas e clip de sol.', 'vox-dualis-16l83'),
  Vox('felis', 'VOX Felis', 4, 'Óculos de sol', 'Pequeno no tamanho, enorme na atitude. Gatinho em acetato preto.', 'vox-felis-1tr9y'),
  Vox('havana', 'VOX Havana', 4, 'Óculos de sol polarizado', 'Tradição e design contemporâneo, com lente polarizada.', 'oculos-de-sol-havana-lente-polarizada-8dsvk'),
];
const itemDe = k => ITENS.find(x => x.k === k);

const BAUS = {
  bronze: { nome: 'Baú de Bronze', odds: [0, 70, 25, 5, 0], preco: 0, onde: 'vitória em batalha (às vezes)' },
  prata: { nome: 'Baú de Prata', odds: [0, 40, 40, 17, 3], preco: 15, onde: 'missão 3 estrelas ou boss' },
  ouro: { nome: 'Baú de Ouro', odds: [0, 0, 50, 38, 12], preco: 40, onde: 'chefe do reino' },
};

function garantirArmario(p) {
  if (!p) return;
  p.armario = p.armario || []; p.equip = p.equip || {}; p.baus = Object.assign({ bronze: 0, prata: 0, ouro: 0 }, p.baus || {});
}
function ganharBau(p, tipo) { garantirArmario(p); p.baus[tipo]++; p.bauNovo = true; }
function sortearItem(tipo) {
  const odds = BAUS[tipo].odds, tot = odds.reduce((s, x) => s + x, 0);
  let x = Math.random() * tot, rar = 1;
  for (let i = 1; i < odds.length; i++) { x -= odds[i]; if (x < 0) { rar = i; break; } }
  return pick(ITENS.filter(i => i.rar === rar));
}
// cada item ganho é único: número de série dentro da edição e um código de autenticidade
function cunhar(p, k) {
  const inst = { id: uid(), k, n: 1 + Math.floor(Math.random() * RARIDADES[itemDe(k).rar].ed), em: Date.now() };
  p.armario.push(inst); return inst;
}
const codigoItem = inst => 'VTR-' + [...inst.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(16).toUpperCase().padStart(8, '0').replace(/(.{4})/, '$1-');
const serie = inst => `Nº ${String(inst.n).padStart(3, '0')}/${String(RARIDADES[itemDe(inst.k).rar].ed).padStart(3, '0')}`;
const equipado = (p, slot) => { const id = (p.equip || {})[slot]; return id ? (p.armario || []).find(i => i.id === id) : null; };

function bonusItens(p) {
  const soma = { vida: 0, ataque: 0, defesa: 0, critico: 0, dom: 0 };
  if (!p || !p.equip) return soma;
  SLOTS.forEach(([s]) => {
    const inst = equipado(p, s); if (!inst) return;
    const d = itemDe(inst.k); if (!d) return;
    SLOT_STAT[s].forEach((st, i) => { soma[st] += r(BONUS_RAR[st][d.rar] * (i ? 0.5 : 1)); });
  });
  return soma;
}
const bonusTexto = b => Object.entries(b).filter(([, v]) => v).map(([k, v]) => `+${v}${STAT_PCT[k] ? '%' : ''} ${STAT_NOME[k]}`).join(' · ');
const bonusDoItem = d => { const b = { vida: 0, ataque: 0, defesa: 0, critico: 0, dom: 0 }; SLOT_STAT[d.slot].forEach((st, i) => { b[st] += r(BONUS_RAR[st][d.rar] * (i ? 0.5 : 1)); }); return b; };

// ---------- telas ----------
function itemIcone(d, extra = '') { return `<span class="ico r${d.rar}${d.vox ? ' vox' : ''}" ${extra}><img src="${d.img}" alt="${esc(d.nome)}" loading="lazy"></span>`; }

// herói girando 360° (quadros de um vídeo giratório): gira sozinho e com o dedo
const GIROS = ['kael', 'simo', 'gio', 'guto', 'clara', 'luzia', 'tonho'], GIRO_Q = 24;
function vitrineHeroi(p, cheio) {
  const k = p.heroi, nome = esc(p.nick || DEVOTOS[k].nome), temGiro = GIROS.includes(k);
  const gala = cheio && !(temGiro && UI.armGiro);
  const troca = cheio && temGiro ? `<button class="giro-troca" data-a="armGiro">${gala ? '🔄 Girar' : '✨ Gala'}</button>` : '';
  if (gala || !temGiro) return `<div class="heroi-hd${gala ? ' gala' : ''}"><img src="assets/hd/${k}${gala ? '-gala' : ''}.jpg" alt="${esc(DEVOTOS[k].nome)}">${troca}<b>${nome}</b></div>`;
  return `<div class="heroi-hd giro-box">${troca}<div class="giro" style="background-image:url(assets/giro/${k}.jpg)"></div><span class="giro-dica">↔ arraste para girar</span><b>${nome}</b></div>`;
}
const GIRO = { q: 0, arrasto: null, parado: 0 };
function pintarGiro() { const g = document.querySelector('.giro'); if (g) g.style.backgroundPositionX = (GIRO.q / (GIRO_Q - 1) * 100) + '%'; }
setInterval(() => { if (!document.querySelector('.giro') || GIRO.arrasto || Date.now() < GIRO.parado) return; GIRO.q = (GIRO.q + 1) % GIRO_Q; pintarGiro(); }, 110);
document.addEventListener('pointerdown', e => {
  const g = e.target.closest('.giro'); if (!g) return;
  GIRO.arrasto = { x: e.clientX, q: GIRO.q };
  const mover = ev => { const d = Math.round((ev.clientX - GIRO.arrasto.x) / 10); GIRO.q = ((GIRO.arrasto.q - d) % GIRO_Q + GIRO_Q) % GIRO_Q; pintarGiro(); };
  const soltar = () => { GIRO.arrasto = null; GIRO.parado = Date.now() + 2500; document.removeEventListener('pointermove', mover); document.removeEventListener('pointerup', soltar); document.removeEventListener('pointercancel', soltar); };
  document.addEventListener('pointermove', mover); document.addEventListener('pointerup', soltar); document.addEventListener('pointercancel', soltar);
});

function telaArmario(p) {
  garantirArmario(p);
  if (!p.heroi) return `<div class="card"><h3>🎒 Armário</h3><p class="muted">Faça o Despertar primeiro: o Anjo precisa saber quem é o seu herói.</p></div>`;
  const slotBtn = ([s, nome, ic]) => {
    const inst = equipado(p, s), d = inst && itemDe(inst.k);
    return `<button class="slot ${d ? 'r' + d.rar : ''}" data-a="slot" data-k="${s}">${d ? `<img src="${d.img}" alt="">` : `<span class="vazio">${ic}</span>`}<small>${nome}</small></button>`;
  };
  const b = bonusItens(p), donos = new Set(p.armario.map(i => i.k));
  const f = UI.filtroArm || 'todos';
  const lista = ITENS.filter(d => f === 'todos' || (f === 'vox' ? d.vox : d.slot === f)).sort((a, c) => a.slot.localeCompare(c.slot) || a.rar - c.rar);
  const cheio = SLOTS.every(([s]) => equipado(p, s));
  return `<div class="vitrine">
      <div class="col">${SLOTS.slice(0, 4).map(slotBtn).join('')}</div>
      ${vitrineHeroi(p, cheio)}
      <div class="col">${SLOTS.slice(4).map(slotBtn).join('')}${cheio ? '<button class="slot ok" data-a="fotoOficial"><span class="vazio">✨</span><small>Foto oficial</small></button>' : ''}</div>
    </div>
    <p class="small" style="text-align:center;margin:-4px 0 0;color:var(--gold)">${bonusTexto(b) || 'Toque num encaixe para equipar um item.'}</p>
    ${cheio ? '' : `<p class="small muted" style="text-align:center;margin:0">Preencha os 7 encaixes para liberar a ✨ Foto Oficial do seu herói (${SLOTS.filter(([s]) => equipado(p, s)).length}/7).</p>`}
    <div class="card"><span class="sec">Baús</span><div class="baus">${Object.entries(BAUS).map(([t, x]) => `<div class="bau">
      <img src="assets/itens/bau-${t}.webp" alt="${x.nome}"><b>${x.nome}</b><small>${p.baus[t]} guardado${p.baus[t] === 1 ? '' : 's'}</small>
      <button class="btn sm gold" data-a="bauAbrir" data-k="${t}" ${p.baus[t] ? '' : 'disabled'}>Abrir</button>
      ${x.preco ? `<button class="btn sm" data-a="bauComprar" data-k="${t}" ${p.lumens < x.preco ? 'disabled' : ''}>✦${x.preco}</button>` : ''}</div>`).join('')}</div>
      <p class="small muted" style="margin:0">Bronze: às vezes depois de uma vitória. Prata: missão real com 3 estrelas ou boss. Ouro: chefe do reino.</p></div>
    <div class="card"><div class="row between"><span class="sec">Coleção</span><span class="small muted">${donos.size}/${ITENS.length}</span></div>
      <div class="chips">${[['todos', 'Tudo'], ['vox', '👓 VOX'], ...SLOTS.filter(([s]) => s !== 'oculos').map(([s, n]) => [s, n])].map(([k, n]) => `<button class="chip${f === k ? ' on' : ''}" data-a="filtroArm" data-k="${k}">${n}</button>`).join('')}</div>
      <div class="colecao">${lista.map(d => {
        const tem = p.armario.filter(i => i.k === d.k).length;
        return tem ? `<button class="peca" data-a="item" data-k="${d.k}">${itemIcone(d)}<small>${esc(d.nome)}</small>${tem > 1 ? `<span class="qt">×${tem}</span>` : ''}</button>`
          : `<div class="peca falta">${itemIcone(d)}<small>???</small></div>`;
      }).join('')}</div></div>`;
}

function overlaySlot(p, s) {
  const nome = SLOTS.find(x => x[0] === s)[1], atual = equipado(p, s);
  const meus = p.armario.filter(i => itemDe(i.k) && itemDe(i.k).slot === s).sort((a, b) => itemDe(b.k).rar - itemDe(a.k).rar);
  return `<div class="over"><div class="box"><h3>${nome}</h3>
    ${meus.length ? `<div class="colecao">${meus.map(i => { const d = itemDe(i.k); return `<button class="peca${atual && atual.id === i.id ? ' on' : ''}" data-a="equipar" data-k="${i.id}">${itemIcone(d)}<small>${esc(d.nome)}</small><small class="muted">${serie(i)}</small></button>`; }).join('')}</div>`
      : `<p class="muted">Você ainda não tem nada para ${nome.toLowerCase()}. Abra baús para ganhar!</p>`}
    ${atual ? `<button class="btn sm" data-a="desequipar" data-k="${s}">Tirar o item</button>` : ''}
    <button class="btn" data-a="fechar">Fechar</button></div></div>`;
}

function overlayItem(p, k) {
  const d = itemDe(k), R = RARIDADES[d.rar], meus = p.armario.filter(i => i.k === k).sort((a, b) => a.n - b.n), inst = meus[0];
  const usando = equipado(p, d.slot), estaUsando = usando && usando.k === k;
  return `<div class="over"><div class="box cert" style="--rc:${R.cor}">
    <div class="cert-img r${d.rar}${d.vox ? ' vox' : ''}"><img src="${d.img}" alt="${esc(d.nome)}"></div>
    <span class="cert-rar">${R.nome}${d.vox ? ' · Produto real' : ''}</span>
    <h3>${esc(d.nome)}</h3>
    ${d.vox ? `<p class="small" style="margin:0;color:var(--gold)">👓 ${d.vox.tipo} da VOX</p>` : ''}
    <p class="small" style="margin:0">${esc(d.desc)}</p>
    <p class="small" style="margin:0;color:var(--good)">${bonusTexto(bonusDoItem(d))}</p>
    <div class="cert-dados"><div><small>Série</small><b>${serie(inst)}</b></div><div><small>Dono</small><b>${esc(p.nick || p.nome)}</b></div>
      <div><small>Ganho em</small><b>${new Date(inst.em).toLocaleDateString('pt-BR')}</b></div><div><small>Autenticidade</small><b>${codigoItem(inst)}</b></div></div>
    ${meus.length > 1 ? `<p class="small muted" style="margin:0">Você tem ${meus.length}: ${meus.map(serie).join(', ')}</p>` : ''}
    <button class="btn gold" data-a="equipar" data-k="${inst.id}" ${estaUsando ? 'disabled' : ''}>${estaUsando ? '✓ Equipado' : 'Equipar'}</button>
    ${meus.length > 1 ? `<button class="btn sm" data-a="trocarRepetido" data-k="${k}">Trocar 1 repetido por ✦${R.troca}</button>` : ''}
    ${d.vox ? `<a class="btn sm" href="${d.vox.url}" target="_blank" rel="noopener">Ver o óculos na loja VOX ↗</a>` : ''}
    <button class="btn sm" data-a="fechar">Fechar</button></div></div>`;
}

function overlayBau(tipo, inst) {
  if (!inst) return `<div class="over bau-over"><button class="bau-palco" type="button" data-a="bauRevelar"><span class="raios"></span>
    <img class="bau-fechado" src="assets/itens/bau-${tipo}.webp" alt=""><p>Toque para abrir</p></button></div>`;
  const d = itemDe(inst.k), R = RARIDADES[d.rar];
  return `<div class="over bau-over" style="--rc:${R.cor}"><div class="bau-palco aberto"><div class="raios"></div>
    <div class="ganho r${d.rar}${d.vox ? ' vox' : ''}"><img src="${d.img}" alt=""></div>
    <span class="cert-rar">${R.nome}${d.vox ? ' · VOX' : ''}</span><h3>${esc(d.nome)}</h3><p class="small">${serie(inst)} · ${bonusTexto(bonusDoItem(d))}</p>
    <div class="row"><button class="btn gold" data-a="equipar" data-k="${inst.id}">Equipar agora</button><button class="btn" data-a="fechar">Guardar</button></div></div></div>`;
}

Object.assign(ACOES, {
  slot(s) { const p = pAtual(); garantirArmario(p); UI.overlay = overlaySlot(p, s); render(); },
  item(k) { const p = pAtual(); UI.overlay = overlayItem(p, k); render(); },
  filtroArm(k) { UI.filtroArm = k; render(); },
  equipar(id) {
    const p = pAtual(), inst = p.armario.find(i => i.id === id); if (!inst) return;
    const d = itemDe(inst.k); p.equip[d.slot] = id; SFX.moeda();
    // os 7 encaixes cheios pela primeira vez: mostra a Foto Oficial
    const cheio = SLOTS.every(([s]) => equipado(p, s));
    if (cheio && !p.galaVista) { p.galaVista = true; evento(p.id, 'Liberou a Foto Oficial do herói'); salvar(); SFX.fanfarra(); UI.aba = 'armario'; return ACOES.fotoOficial(); }
    salvar(); UI.overlay = null; toast(`${d.nome} equipado!`); render();
  },
  armGiro() { UI.armGiro = !UI.armGiro; render(); },
  fotoOficial() {
    const p = pAtual();
    UI.overlay = `<div class="over bau-over" style="--rc:#f2c94c"><div class="foto-oficial"><span class="cert-rar">✨ Foto Oficial</span>
      <img src="assets/hd/${p.heroi}-gala.jpg" alt="Foto oficial"><h3>${esc(p.nick || DEVOTOS[p.heroi].nome)} · Forma de Gala</h3>
      <p class="small muted">Os 7 encaixes estão cheios. A foto mostra o herói com o conjunto lendário.</p>
      <button class="btn gold" data-a="fechar">Voltar ao Armário</button></div></div>`; render();
  },
  desequipar(s) { const p = pAtual(); delete p.equip[s]; salvar(); UI.overlay = null; render(); },
  trocarRepetido(k) {
    const p = pAtual(), meus = p.armario.filter(i => i.k === k); if (meus.length < 2) return;
    const fora = meus.filter(i => !Object.values(p.equip).includes(i.id)).sort((a, b) => b.n - a.n)[0]; if (!fora) return;
    p.armario = p.armario.filter(i => i !== fora); const v = RARIDADES[itemDe(k).rar].troca; p.lumens += v; salvar();
    toast(`+${v} ✦`); UI.overlay = p.armario.some(i => i.k === k) ? overlayItem(p, k) : null; render();
  },
  bauComprar(t) {
    const p = pAtual(), x = BAUS[t]; if (!x.preco || p.lumens < x.preco) return toast('Lumens ✦ insuficientes');
    p.lumens -= x.preco; ganharBau(p, t); p.bauNovo = false; salvar(); SFX.moeda(); toast(`${x.nome} comprado!`); render();
  },
  bauAbrir(t) {
    const p = pAtual(); garantirArmario(p); if (!(p.baus[t] > 0)) return;
    UI.bau = t; UI.overlay = overlayBau(t, null); render();
  },
  bauRevelar() {
    const p = pAtual(), t = UI.bau; if (!t || !(p.baus[t] > 0)) return;
    p.baus[t]--; p.bauNovo = false;
    const inst = cunhar(p, sortearItem(t).k); salvar();
    const rar = itemDe(inst.k).rar; rar >= 3 ? SFX.fanfarra() : SFX.moeda();
    if (rar === 4) evento(p.id, `Item lendário: ${itemDe(inst.k).nome}`);
    UI.bau = null; UI.overlay = overlayBau(t, inst); render();
  },
});
