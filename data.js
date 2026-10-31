// VITRAL — dados fixos do jogo (Bíblia: https://claude.ai/artifact/FmTzWaYF1TCzNXeTMQRACz)

const VIRTUDES = {
  fe:  { nome: 'Fé',         cor: '#e9c46a' },
  esp: { nome: 'Esperança',  cor: '#4cc38a' },
  car: { nome: 'Caridade',   cor: '#e5546b' },
  tem: { nome: 'Temperança', cor: '#5aa9e6' },
  pru: { nome: 'Prudência',  cor: '#a77bf3' },
  for: { nome: 'Fortaleza',  cor: '#f08a3c' },
  jus: { nome: 'Justiça',    cor: '#c9d1dc' },
};

// efeito: dano | area | cura | escudo | buff | atordoa | revive | sorte
const DEVOTOS = {
  jana:  { nome: 'Jana',  est: 5, v: 'fe',  santo: 'Santa Joana d\'Arc',      dom: ['As Vozes', 'buff'],          sup: ['Avante!', 'area'],              fala: 'Não tenho medo. Nasci pra isso.' },
  simo:  { nome: 'Simo',  est: 4, v: 'fe',  santo: 'São Pedro',               dom: ['Rede Cheia', 'atordoa'],     sup: ['Sobre as Águas', 'area'],       fala: 'Eu vou primeiro! …alguém me segura?' },
  tessa: { nome: 'Tessa', est: 5, v: 'esp', santo: 'Santa Teresinha',         dom: ['Pequeno Caminho', 'cura'],   sup: ['Chuva de Rosas', 'cura'],       fala: 'Não precisa ser grande. Só precisa ser com amor.' },
  gio:   { nome: 'Gio',   est: 4, v: 'esp', santo: 'São Padre Pio',           dom: ['Bilocação', 'dano'],         sup: ['Reza, Espera e Não se Preocupa', 'escudo'], fala: 'Reza, espera e não se preocupa. O resto é comigo.' },
  duda:  { nome: 'Duda',  est: 5, v: 'car', santo: 'Santa Dulce dos Pobres',  dom: ['O Galinheiro', 'cura'],      sup: ['Anjo Bom', 'revive'],           fala: 'Tem sempre lugar pra mais um.' },
  guto:  { nome: 'Guto',  est: 4, v: 'car', santo: 'Santo Agostinho',         dom: ['Tolle Lege', 'sorte'],       sup: ['Coração Inquieto', 'dano'],     fala: 'Já procurei felicidade em todo lugar.' },
  cisco: { nome: 'Cisco', est: 5, v: 'tem', santo: 'São Francisco de Assis',  dom: ['Irmãos Animais', 'area'],    sup: ['Cântico das Criaturas', 'area'], fala: 'Menos é mais. Muito mais.' },
  clara: { nome: 'Clara', est: 4, v: 'tem', santo: 'Santa Clara',             dom: ['Luz que Afasta', 'escudo'],  sup: ['Escudo do Sol', 'escudo'],      fala: 'Fica atrás de mim.' },
  kael:  { nome: 'Kael',  est: 5, v: 'pru', santo: 'São Carlo Acutis',        dom: ['Mapa dos Milagres', 'atordoa'], sup: ['Autoestrada pro Céu', 'dano'], fala: 'Original. Nunca cópia.' },
  avila: { nome: 'Ávila', est: 4, v: 'pru', santo: 'Santa Teresa d\'Ávila',   dom: ['Castelo Interior', 'escudo'], sup: ['Flecha de Fogo', 'dano'],      fala: 'Só Deus basta. E um bom plano também ajuda.' },
  yuri:  { nome: 'Yuri',  est: 5, v: 'for', santo: 'São Jorge',               dom: ['Investida', 'dano'],         sup: ['Lança do Dragão', 'dano'],      fala: 'Quanto maior o dragão, melhor.' },
  luzia: { nome: 'Luzia', est: 4, v: 'for', santo: 'Santa Luzia',             dom: ['Inabalável', 'escudo'],      sup: ['Olhos de Luz', 'atordoa'],      fala: 'Pode empurrar. Eu não saio daqui.' },
  zeca:  { nome: 'Zeca',  est: 5, v: 'jus', santo: 'São José',                dom: ['Construir', 'escudo'],       sup: ['O Sonho', 'dano'],              fala: '…Deixa comigo.' },
  tonho: { nome: 'Tonho', est: 4, v: 'jus', santo: 'Santo Antônio',           dom: ['Achados e Perdidos', 'area'], sup: ['Sermão aos Peixes', 'area'],   fala: 'Perdeu? Relaxa, eu acho.' },
};
const FEM = new Set(['jana', 'tessa', 'duda', 'clara', 'avila', 'luzia']);
const DEVOTOS_INICIAIS =['clara', 'simo', 'tonho', 'luzia'];

// Evolução do herói: level por XP (missões e batalhas) e estágios que mudam a armadura
const NIVEL_MAX = 50;
const xpProNivel = n => 50 + 25 * n;          // XP para ir do nível n para o n+1
const ESTAGIOS = [
  { nv: 1, nome: 'Peregrino' }, { nv: 10, nome: 'Escudeiro' }, { nv: 20, nome: 'Cavaleiro' },
  { nv: 35, nome: 'Guardião' }, { nv: 50, nome: 'Forma Lendária' },
];
// Cada ponto numa barra vale isto na batalha
const BARRA_EFEITO = {
  vida:    { por: 15,  txt: '+15 de vida' },
  ataque:  { por: 3,   txt: '+3 de ataque' },
  defesa:  { por: 2.5, txt: '-2,5% de dano recebido', max: 50 },
  critico: { por: 3,   txt: '+3% de chance de crítico', max: 60 },
  dom:     { por: 6,   txt: '+6% de força no Dom e no Supremo' },
};
// Barras próprias de cada herói inicial (a Vida é comum a todos): [chave, nome, efeito]
const BARRAS = {
  simo:  [['rocha', 'Rocha', 'defesa'], ['rede', 'Rede', 'dom'], ['impeto', 'Ímpeto', 'ataque']],
  gio:   [['oracao', 'Oração', 'dom'], ['discern', 'Discernimento', 'critico'], ['paz', 'Paz', 'defesa']],
  guto:  [['coracao', 'Coração', 'dom'], ['melodia', 'Melodia', 'ataque'], ['ritmo', 'Ritmo', 'critico']],
  clara: [['luz', 'Luz', 'dom'], ['calma', 'Calma', 'defesa'], ['firmeza', 'Firmeza', 'ataque']],
  kael:  [['foco', 'Foco', 'critico'], ['codigo', 'Código', 'dom'], ['firewall', 'Firewall', 'defesa']],
  luzia: [['forca', 'Força', 'ataque'], ['coragem', 'Coragem', 'defesa'], ['visao', 'Visão', 'critico']],
  tonho: [['palavra', 'Palavra', 'ataque'], ['achado', 'Achado', 'critico'], ['pao', 'Pão', 'dom']],
};
// Cartas de poder: o herói leva até DECK_MAX para a luta e cada uma vale uma vez por batalha.
// ef: dano | cura | escudo | area | buff | agua (forte contra Cópias) | anjo; mult multiplica o efeito.
// Com o uso, a carta sobe de nível (+15% por nível).
const DECK_MAX = 6;
const CARTAS = {
  luz:    { nome: 'Golpe de Luz',      ic: '✦',  ef: 'dano',   mult: 1,   txt: 'Golpe forte num inimigo' },
  oracao: { nome: 'Oração Rápida',     ic: '🙏', ef: 'cura',   mult: 1.1, txt: 'Recupera a vida' },
  escudo: { nome: 'Escudo da Fé',      ic: '🛡', ef: 'escudo', mult: 1.3, txt: 'Escudo que segura os golpes (Ef 6,16)' },
  chama:  { nome: 'Chama do Espírito', ic: '🔥', ef: 'area',   mult: 1.2, txt: 'Fogo em todos os inimigos' },
  bencao: { nome: 'Bênção',            ic: '✨', ef: 'buff',   mult: 1,   txt: '+30% de dano por 2 turnos' },
  agua:   { nome: 'Água Benta',        ic: '💧', ef: 'agua',   mult: 1.2, txt: 'Atinge todos; dano triplo nas Cópias cinzentas' },
  anjo:   { nome: 'Santo Anjo',        ic: '🪽', ef: 'anjo',   mult: 2.4, txt: 'Seu Anjo da Guarda desce com a espada' },
};
const CARTAS_POR_NIVEL = { 1: ['luz', 'oracao'], 3: ['escudo'], 5: ['chama'], 8: ['bencao'], 12: ['agua'] };
const nivelCarta = usos => usos >= 20 ? 3 : usos >= 8 ? 2 : 1;

const barrasDe = k => [['vida', 'Vida', 'vida'], ...(BARRAS[k] || [['forca', 'Força', 'ataque'], ['defesa', 'Defesa', 'defesa'], ['foco', 'Foco', 'critico']])];

// Duas virtudes seguidas no mesmo turno disparam um combo
const COMBOS = [
  { a: 'fe',  b: 'for', nome: 'Cruzada',         ef: 'atordoa' },
  { a: 'car', b: 'esp', nome: 'Coração Aberto',  ef: 'cura' },
  { a: 'tem', b: 'pru', nome: 'Mente Serena',    ef: 'carga' },
  { a: 'jus', b: 'for', nome: 'Martelo Justo',   ef: 'dano' },
  { a: 'fe',  b: 'esp', nome: 'Âncora',          ef: 'escudo' },
  { a: 'car', b: 'jus', nome: 'Reparação',       ef: 'cura' },
  { a: 'tem', b: 'car', nome: 'Partilha',        ef: 'carga' },
];

// Valores base por tipo de missão (Bíblia, seção Economia e Jogabilidade)
const TIPOS = {
  diaria: { nome: 'Diária',       xp: 10,  frag: 1,  tal: 0,  chama: 1, lum: 2 },
  casa:   { nome: 'Casa',         xp: 20,  frag: 2,  tal: 0,  chama: 1, lum: 2 },
  escola: { nome: 'Escola',       xp: 25,  frag: 2,  tal: 0,  chama: 1, lum: 2 },
  boss:   { nome: 'Boss semanal', xp: 100, frag: 5,  tal: 3,  chama: 3, lum: 5 },
  epica:  { nome: 'Épica',        xp: 250, frag: 10, tal: 10, chama: 5, lum: 10 },
};
const ESTRELAS = { 1: 1, 2: 1.5, 3: 2 };

const RANKS = [
  { nome: 'Peregrino', xp: 0 }, { nome: 'Explorador', xp: 4000 }, { nome: 'Escudeiro', xp: 10000 },
  { nome: 'Cavaleiro', xp: 17000 }, { nome: 'Guardião', xp: 25000 }, { nome: 'Sal da Terra', xp: 34000 },
  { nome: 'Luz do Mundo', xp: 44000 }, { nome: 'Original', xp: 55000 },
];

const CHAMA_MAX = 20;
const CUSTO_INVOCACAO = 10;
const PITY_5 = 40;

// Exemplos de missões recorrentes (os pais editam no painel)
const MISSOES_EXEMPLO = [
  { titulo: 'Tomar o remédio na hora', tipo: 'diaria', v: 'tem', rec: 'diaria' },
  { titulo: 'Arrumar a cama',          tipo: 'diaria', v: 'tem', rec: 'diaria' },
  { titulo: 'Dever de casa',           tipo: 'escola', v: 'pru', rec: 'diaria' },
  { titulo: 'Lavar a louça do almoço', tipo: 'casa',   v: 'car', rec: 'diaria' },
  { titulo: 'Guardar a roupa lavada',  tipo: 'casa',   v: 'car', rec: 'unica' },
  { titulo: 'Faxina completa do quarto', tipo: 'boss', v: 'for', rec: 'semanal' },
];

const LARVAS = {
  copo:  'Copo ou prato largado',
  roupa: 'Roupa pelo chão',
  bagunca: 'Bagunça deixada',
  combinado: 'Combinado não cumprido',
};

// Reino I — Colinas Brancas (Temperança). Selo: 3 missões de Temperança aprovadas.
const REINO1 = {
  nome: 'Colinas Brancas', v: 'tem', vitral: 'r1', musica: '02-colinas-brancas',
  nos: [
    { t: 'historia', titulo: 'O chamado', txt: ['Aí, finalmente! Sou o seu Anjo da Guarda. Antes que você pergunte: sim, a espada é de luz de verdade.', 'Tá vendo aquele cinza descendo as colinas? É a Bruma. Ela apaga a cor das coisas e deixa as pessoas iguaizinhas, umas cópias sem graça.', 'A gente vai devolver a cor, peça por peça. Bora?'] },
    { t: 'batalha',  titulo: 'Beliscões na estrada', inimigos: ['beliscao', 'beliscao'] },
    { t: 'bau',      titulo: 'Baú do vinhedo' },
    { t: 'batalha',  titulo: 'Cópias no olival', inimigos: ['copia', 'beliscao', 'copia'] },
    { t: 'bruma',    titulo: 'Portão das Oliveiras', selos: 1 },
    { t: 'historia', titulo: 'O garoto do lobo', ganha: 'cisco', txt: ['Ó, um lobo gigante! Calma… ele tá abanando o rabo.', 'Esse é o Cisco. Largou tudo o que tinha e anda descalço por aí. O lobo é o Gúbio, melhor amigo dele.', 'O Cisco entrou pro seu time. Menos é mais, né?'] },
    { t: 'santuario', titulo: 'Capela de pedra' },
    { t: 'batalha',  titulo: 'Emboscada da Bruma', inimigos: ['copia', 'copia', 'copia'] },
    { t: 'bruma',    titulo: 'Portão do Moinho', selos: 2 },
    { t: 'bau',      titulo: 'Baú da torre' },
    { t: 'boss',     titulo: 'Servo do Insaciável', semanal: true, inimigos: ['servo'] },
    { t: 'batalha',  titulo: 'Última trincheira', inimigos: ['copia', 'servo', 'copia'] },
    { t: 'chefe',    titulo: 'O Insaciável', inimigos: ['insaciavel'], lenda: 'São Francisco de Assis' },
  ],
};

// o que os peregrinos do mapa contam (um por peregrino, na ordem em que são achados)
const FALAS_PEREGRINO = [
  'Dizem que o vitral da Cidade do Rei se quebrou e os cacos caíram aqui nas Colinas. Ache todos!',
  'São Francisco conversou com um lobo em Gúbio. E o lobo obedeceu. Respeito, né?',
  'Tem baú escondido onde ninguém anda. Não fui eu que te contei.',
  'O Insaciável come tudo e nunca fica feliz. Comer devagar também é Temperança.',
  'A Bruma odeia gente que agradece. Experimenta agradecer alguém hoje.',
  'São Carlo Acutis fazia sites e amava a Eucaristia. Santo de moletom existe sim.',
];

const INIMIGOS = {
  larva:      { nome: 'Larva da Preguiça', hp: 60,  atk: 9,  arte: 'larva' },
  beliscao:   { nome: 'Beliscão',          hp: 55,  atk: 9,  arte: 'beliscao' },
  copia:      { nome: 'Cópia cinzenta',    hp: 90,  atk: 13, arte: 'copia' },
  servo:      { nome: 'Servo do Insaciável', hp: 260, atk: 17, arte: 'servo' },
  insaciavel: { nome: 'O Insaciável',      hp: 620, atk: 22, arte: 'insaciavel' },
};

// Falas do Anjo por situação: [expressão, texto]
const ANJO = {
  oi:        [['rindo', 'E aí, sumido! Bora devolver umas cores hoje?'], ['orgulhoso', 'Chegou o herói. Ou quase herói. Vamos ver.']],
  semChama:  [['testa', 'Seu time tá sem Chama, hein. Missão de verdade primeiro, aí a gente joga.'], ['bravo', 'Sem Chama não rola. Vai lá cumprir uma missão que eu espero aqui.']],
  aprovada3: [['chocado', 'TRÊS ESTRELAS. Seu pai ficou impressionado. Até eu tô.'], ['orgulhoso', 'Três estrelas! Isso aí é nível lenda.']],
  aprovada:  [['orgulhoso', 'Missão aprovada. Chama no bolso, bora!'], ['rindo', 'Aprovada! Viu como nem doeu?']],
  refazer:   [['testa', 'Pediram pra refazer. Acontece, campeão. Dá uma olhada no comentário.']],
  larva:     [['bravo', 'Ô, campeão. Larva nova na área. Eu carrego espada de luz e tô aqui recolhendo copo? Resolve isso aí.'], ['testa', 'Mano… nasceu uma Larva. Ela tá te olhando.']],
  reparou:   [['rindo', 'Larva eliminada. Errar é normal, reparar é coisa de lenda.']],
  secreta:   [['emocionado', 'Ninguém pediu, você foi lá e fez. Isso é Fé, a moeda mais rara do jogo.']],
  comunhao:  [['emocionado', 'Revigorado. Agora sim, bora.']],
  graca:     [['rindo', 'Sua Graça de hoje. De graça mesmo, é presente.']],
  rank:      [['emocionado', 'RANK NOVO! Eu não tô chorando, é a luz da espada.']],
  vitoria:   [['rindo', 'Ganhamos! Quero ver a Bruma se recuperar dessa.']],
  derrota:   [['testa', 'Perdemos essa. Time mais forte = Fragmentos = missões. Você sabe o caminho.']],
};

// Diário do Anjo: os Sete Apagados (chefes de cada reino), O Molde e os capangas.
// Cada chefe é uma pessoa agarrada por um Apagado; vencer liberta a pessoa.
const DIARIO = [
  { k: 'insaciavel', tipo: 'chefe', reino: 'I', v: 'tem', vicio: 'Gula', nome: 'O Insaciável', pessoa: 'Bartô',
    era: 'Bartô, o cozinheiro da festa da vila. Cozinhava pra todo mundo, mas um dia não conseguiu mais dizer "chega".',
    biblia: 'Esaú troca a primogenitura por um prato de lentilhas', ref: 'Gn 25,29-34',
    vida: 'Scroll infinito, doce sem parar, "só mais um episódio".',
    golpe: 'Devorar: suga a cor do campo e se cura.',
    licao: 'Não é o doce, é o "só mais um" que nunca acaba. Quem sabe parar manda no próprio prato e na própria tela.' },
  { k: 'sonolento', tipo: 'chefe', reino: 'II', v: 'for', vicio: 'Preguiça', nome: 'O Sonolento', pessoa: 'Teo',
    era: 'Teo, o vigia da torre. Dormiu no posto "só cinco minutinhos" e virou um dragão que boceja névoa.',
    biblia: 'Os discípulos dormem no Getsêmani: "nem uma hora pudestes vigiar comigo?"', ref: 'Mt 26,40',
    vida: '"Depois eu faço", despertador ignorado, tarefa empurrada.',
    golpe: 'Bocejo: põe o herói pra dormir e ele perde a vez.',
    licao: 'Adiar parece descanso, mas cansa mais. Fazer agora é o que liberta o resto do dia.' },
  { k: 'espelho', tipo: 'chefe', reino: 'III', v: 'pru', vicio: 'Vanglória', nome: 'O Espelho', pessoa: 'Lia',
    era: 'Lia, a artista mais talentosa da cidade, que passou a pintar só o próprio rosto.',
    biblia: 'O fariseu que reza se exibindo no templo', ref: 'Lc 18,9-14',
    vida: 'Viver para a foto, contar curtidas, parecer em vez de ser.',
    golpe: 'Reflexo: copia o seu último golpe e devolve.',
    licao: 'Quem vive pra foto some da própria vida. Você vale sem curtida nenhuma.' },
  { k: 'cofre', tipo: 'chefe', reino: 'IV', v: 'car', vicio: 'Avareza', nome: 'O Cofre', pessoa: 'Seu Abner',
    era: 'Seu Abner, o mercador que trancou o poço da cidade para vender a água.',
    biblia: 'O jovem rico vai embora triste porque tinha muitos bens', ref: 'Mt 19,16-22',
    vida: '"É meu", não emprestar, não dividir nada.',
    golpe: 'Tranca: rouba seus bônus e guarda no peito.',
    licao: 'O que você tranca acaba te trancando. Dividir abre espaço por dentro.' },
  { k: 'furia', tipo: 'chefe', reino: 'V', v: 'jus', vicio: 'Ira', nome: 'A Fúria', pessoa: 'Caio',
    era: 'Caio, o ferreiro que nunca perdoou o irmão e foi esquentando junto com a forja.',
    biblia: 'Caim e Abel: "o pecado está à porta, mas tu deves dominá-lo"', ref: 'Gn 4,7',
    vida: 'Explodir com o irmão, responder atravessado, bater a porta.',
    golpe: 'Estopim: fica mais forte cada vez que leva dano.',
    licao: 'Raiva todo mundo sente. O que você faz com ela é escolha sua.' },
  { k: 'olhoverde', tipo: 'chefe', reino: 'VI', v: 'esp', vicio: 'Inveja', nome: 'O Olho Verde', pessoa: 'Jade',
    era: 'Jade, que media tudo pela régua da irmã até não enxergar mais nada de bom em si.',
    biblia: 'Os irmãos vendem José por inveja', ref: 'Gn 37',
    vida: 'Comparar tudo: "por que ele tem e eu não?".',
    golpe: 'Cobiça: rouba o seu Dom por 2 turnos.',
    licao: 'Comparar rouba a alegria. A sua história não é a do outro, e é boa.' },
  { k: 'coroado', tipo: 'chefe', reino: 'VII', v: 'fe', vicio: 'Soberba', nome: 'O Coroado', pessoa: 'o antigo Rei da Torre',
    era: 'O antigo Rei da Torre, que quis construir até o céu para não precisar de ninguém.',
    biblia: 'A Torre de Babel', ref: 'Gn 11,1-9',
    vida: '"Não preciso de ninguém, nem de Deus."',
    golpe: 'Babel: embaralha os comandos da batalha.',
    licao: 'Quem acha que não precisa de ninguém fica sozinho no alto de uma torre que cai.' },
  { k: 'molde', tipo: 'oculto', reino: '?', v: null, vicio: 'Conformismo', nome: 'O Molde', pessoa: null,
    era: 'O Portador da Luz que caiu e apagou. Sem poder criar, só copia, e quer todo mundo igual a ele.',
    biblia: '"Não vos conformeis com este mundo"', ref: 'Rm 12,2',
    vida: 'Ser igual a todo mundo só para caber.',
    golpe: 'Transforma pessoas em cópias cinzentas.',
    licao: 'Você é peça única do vitral. Original, nunca cópia.' },
  { k: 'beliscao', tipo: 'capanga', reino: 'I', v: 'tem', vicio: 'Gula', nome: 'Beliscão',
    era: 'Traças de migalha que nascem de cada "só um pedacinho".',
    vida: 'Beliscar o dia todo sem nem perceber.', golpe: 'Mordiscada.',
    licao: 'Um pedacinho não faz mal. Vinte pedacinhos viram um Beliscão.' },
  { k: 'copia', tipo: 'capanga', reino: 'I', v: null, vicio: 'Conformismo', nome: 'Cópia cinzenta', arte: 'assets/jogo/simo.png', cinza: true,
    era: 'Gente da vila que o Molde transformou em cópia. Por baixo do cinza, ainda tem alguém.',
    vida: 'Fazer o que todo mundo faz sem pensar.', golpe: 'Pancada sem graça.',
    licao: 'Água Benta desfaz o cinza. Ser você mesmo também.' },
  { k: 'servo', tipo: 'capanga', reino: 'I', v: 'tem', vicio: 'Gula', nome: 'Servo do Insaciável',
    era: 'O ajudante de cozinha do Bartô, que provava tudo e nunca parava de provar.',
    vida: 'Comer escondido, repetir sem fome.', golpe: 'Concha pesada.',
    licao: 'Fome de verdade passa com comida. A outra fome passa com Deus e com gente.' },
];
