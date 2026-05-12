const LANES = [-3.2, 0, 3.2];
const KEY = "catSubwayRunnerSave";
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

class Store {
  constructor() {
    this.defaults = {
      highScore: 0,
      totalCoins: 1000,
      welcomeGiftClaimed: true,
      welcomeGiftVersion: 3,
      bought: { skins: ["hoodie"], accessories: ["pawCap"], boards: ["kitty"] },
      equipped: { skin: "hoodie", accessory: "pawCap", board: "kitty" },
      settings: { music: true, sfx: true, volume: .55 },
      missions: {},
      claimed: []
    };
    this.data = this.load();
    this.gifted = false;
    if (this.data.welcomeGiftVersion !== 3) {
      this.data.totalCoins += 1000;
      this.data.welcomeGiftClaimed = true;
      this.data.welcomeGiftVersion = 3;
      this.gifted = true;
      this.save();
    }
  }
  load() {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!raw) return structuredClone(this.defaults);
    const merged = structuredClone(this.defaults);
    Object.assign(merged, raw);
    merged.bought = Object.assign(merged.bought, raw.bought || {});
    merged.equipped = Object.assign(merged.equipped, raw.equipped || {});
    merged.settings = Object.assign(merged.settings, raw.settings || {});
    if (raw.welcomeGiftClaimed !== true) merged.welcomeGiftClaimed = false;
    if (raw.welcomeGiftVersion !== 3) merged.welcomeGiftVersion = raw.welcomeGiftVersion || 0;
    return merged;
  }
  save() { localStorage.setItem(KEY, JSON.stringify(this.data)); }
  reset() { localStorage.removeItem(KEY); this.data = this.load(); this.save(); }
}

class Sound {
  constructor(store) {
    this.store = store;
    this.ctx = null;
    this.music = null;
    this.audio = null;
    this.losingAudio = null;
    this.musicPath = "assets/sounds/background-music.mp3";
    this.fallbackMusicPath = "assets/sounds/background-music.mp3.mp3";
    this.losingPath = "assets/sounds/losing-sound.mp3";
  }
  ctxReady() {
    this.ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === "suspended") this.ctx.resume();
  }
  tone(f, d = .1, type = "sine", g = .09) {
    if (!this.store.data.settings.sfx) return;
    this.ctxReady();
    const o = this.ctx.createOscillator();
    const a = this.ctx.createGain();
    o.type = type; o.frequency.value = f;
    a.gain.value = g * this.store.data.settings.volume;
    a.gain.exponentialRampToValueAtTime(.001, this.ctx.currentTime + d);
    o.connect(a).connect(this.ctx.destination);
    o.start(); o.stop(this.ctx.currentTime + d);
  }
  play(name) {
    const map = {
      coin: [900, 1200], jump: [520], slide: [220], crash: [120, 75],
      power: [680, 980], click: [560], buy: [720, 1040], over: [280, 180]
    };
    (map[name] || map.click).forEach((f, i) => setTimeout(() => this.tone(f, .11, i ? "triangle" : "sine"), i * 70));
  }
  startMusic() {
    if (this.music || !this.store.data.settings.music) return;
    if (!this.audio) {
      this.audio = new Audio(this.musicPath);
      this.audio.loop = true;
      this.audio.addEventListener("error", () => {
        if (!this.audio.dataset.triedFallback) {
          this.audio.dataset.triedFallback = "true";
          this.audio.src = this.fallbackMusicPath;
          this.audio.play().then(() => {
            this.music = "audio";
          }).catch(() => this.startSynthLoop());
          return;
        }
        this.startSynthLoop();
      });
    }
    this.audio.volume = this.store.data.settings.volume * .55;
    this.audio.muted = false;
    this.audio.play().then(() => {
      this.music = "audio";
    }).catch(() => this.startSynthLoop());
  }
  startSynthLoop() {
    if (this.music && this.music !== "audio") return;
    const notes = [392, 494, 587, 659, 587, 494];
    let i = 0;
    this.music = setInterval(() => {
      if (this.store.data.settings.music) this.tone(notes[i++ % notes.length], .12, "sine", .028);
    }, 430);
  }
  stopMusic() {
    if (this.audio) this.audio.pause();
    if (this.music !== "audio") clearInterval(this.music);
    this.music = null;
  }
  playLosing() {
    if (!this.store.data.settings.sfx) return;
    this.losingAudio ||= new Audio(this.losingPath);
    this.losingAudio.currentTime = 0;
    this.losingAudio.volume = this.store.data.settings.volume;
    this.losingAudio.play().catch(() => this.play("over"));
  }
}

class Shop {
  constructor(store) {
    this.store = store;
    this.catalog = {
      skins: [
        ["hoodie", "Hoodie Cat", 0, "#d7a47a"], ["strawberry", "Strawberry Cat", 220, "#ff91bc"],
        ["midnight", "Midnight Cat", 360, "#293044"], ["snow", "Snow Cat", 420, "#fffaf0"],
        ["mango", "Mango Cat", 520, "#ff9f43"], ["robot", "Robot Cat", 760, "#a9e4f5"], ["royal", "Royal Cat", 980, "#c694ff"]
      ],
      accessories: [
        ["pawCap", "Paw Cap", 0, "#e94f5f"], ["bow", "Pink Bow", 140, "#ff7eb6"],
        ["glasses", "Star Glasses", 250, "#31405a"], ["scarf", "Berry Scarf", 300, "#8f68ff"],
        ["backpack", "Fish Backpack", 420, "#60ddae"], ["crown", "Cupcake Crown", 650, "#ffd76f"]
      ],
      boards: [
        ["kitty", "Kitty Board", 0, "#ff9cc0"], ["cookie", "Cookie Board", 260, "#c8874a"],
        ["neon", "Neon Board", 430, "#60f1ff"], ["rainbow", "Rainbow Board", 620, "#ff7eb6"], ["gold", "Golden Board", 900, "#ffd76f"]
      ]
    };
    this.normalizeSavedItems();
  }
  normalizeSavedItems() {
    const keys = { skins: "skin", accessories: "accessory", boards: "board" };
    for (const category of Object.keys(keys)) {
      const validIds = this.catalog[category].map(item => item[0]);
      const equippedKey = keys[category];
      if (!validIds.includes(this.store.data.equipped[equippedKey])) {
        this.store.data.equipped[equippedKey] = validIds[0];
      }
      if (!this.store.data.bought[category].includes(validIds[0])) {
        this.store.data.bought[category].push(validIds[0]);
      }
    }
    this.store.save();
  }
  item(cat, id) {
    const x = this.catalog[cat].find(i => i[0] === id) || this.catalog[cat][0];
    return { id: x[0], name: x[1], price: x[2], color: x[3] };
  }
  owned(cat, id) { return this.store.data.bought[cat].includes(id); }
  buy(cat, id) {
    const item = this.item(cat, id);
    if (this.owned(cat, id)) return "owned";
    if (this.store.data.totalCoins < item.price) return "coins";
    this.store.data.totalCoins -= item.price;
    this.store.data.bought[cat].push(id);
    this.store.save();
    return "ok";
  }
  equip(cat, id) {
    if (!this.owned(cat, id)) return;
    const key = cat === "skins" ? "skin" : cat === "accessories" ? "accessory" : "board";
    this.store.data.equipped[key] = id;
    this.store.save();
  }
}

class Missions {
  constructor(store) {
    this.store = store;
    this.list = [
      ["coins", "Collect 50 paw coins", 50, 120],
      ["score", "Reach 1000 score", 1000, 180],
      ["jump", "Jump 20 times", 20, 100],
      ["slide", "Slide 10 times", 10, 100],
      ["power", "Use 3 power-ups", 3, 150],
      ["round", "Play 3 rounds", 3, 140]
    ];
    if (!Array.isArray(this.store.data.claimed)) this.store.data.claimed = [];
    if (!this.store.data.missions || typeof this.store.data.missions !== "object") this.store.data.missions = {};
    this.list.forEach(m => this.store.data.missions[m[0]] ??= 0);
    this.list.forEach(m => this.store.data.missions[m[0]] = clamp(Number(this.store.data.missions[m[0]]) || 0, 0, m[2]));
    this.store.save();
  }
  add(id, n = 1) {
    const m = this.list.find(x => x[0] === id);
    if (!m) return;
    this.store.data.missions[id] = clamp((Number(this.store.data.missions[id]) || 0) + n, 0, m[2]);
    this.store.save();
  }
  max(id, n) {
    const m = this.list.find(x => x[0] === id);
    if (!m) return;
    this.store.data.missions[id] = clamp(Math.max(Number(this.store.data.missions[id]) || 0, n), 0, m[2]);
    this.store.save();
  }
  claim(id) {
    const m = this.list.find(x => x[0] === id);
    if (!Array.isArray(this.store.data.claimed)) this.store.data.claimed = [];
    if (!m || this.store.data.claimed.includes(id) || (this.store.data.missions[id] || 0) < m[2]) return 0;
    this.store.data.claimed.push(id);
    this.store.data.totalCoins += m[3];
    this.store.save();
    return m[3];
  }
}

class Game {
  constructor() {
    this.store = new Store();
    this.sound = new Sound(this.store);
    this.shop = new Shop(this.store);
    this.missions = new Missions(this.store);
    this.state = "menu";
    this.objects = [];
    this.power = {};
    this.previewChoice = {};
    this.last = performance.now();
    this.init3D();
    this.bind();
    this.renderShop("skins");
    this.renderMissions();
    this.refresh();
    if (this.store.gifted) this.toast("Welcome gift received: 1000 paw coins!");
    this.updateWelcomeGift();
    requestAnimationFrame(t => this.loop(t));
  }
  init3D() {
    this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("game"), antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x75d8ff);
    this.scene.fog = new THREE.Fog(0x75d8ff, 28, 86);
    this.camera = new THREE.PerspectiveCamera(64, innerWidth / innerHeight, .1, 130);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x5fc978, 2.2));
    const sun = new THREE.DirectionalLight(0xfff1c8, 2.4);
    sun.position.set(-5, 10, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    this.scene.add(sun);
    this.makePlayer();
    this.makeOfficer();
    this.makeWorld();
    addEventListener("resize", () => this.resize());
    this.resize();
  }
  mat(c, e = 0) { return new THREE.MeshStandardMaterial({ color: c, roughness: .72, emissive: e }); }
  makePlayer() {
    this.player = new THREE.Group();
    this.scene.add(this.player);
    this.rebuildCat();
    this.lane = 1; this.x = 0; this.y = 0; this.vy = 0; this.slide = 0;
  }
  rebuildCat() {
    this.player.clear();
    const skin = this.shop.item("skins", this.store.data.equipped.skin);
    const board = this.shop.item("boards", this.store.data.equipped.board);
    const acc = this.shop.item("accessories", this.store.data.equipped.accessory);
    const fur = this.mat(skin.color), cream = this.mat(0xfff7dc), dark = this.mat(0x31405a);
    const body = new THREE.Mesh(new THREE.SphereGeometry(.55, 14, 10), fur); body.scale.set(.85, 1.05, 1.1); body.position.y = .78; body.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(.47, 14, 10), fur); head.position.y = 1.48; head.position.z = -.08; head.castShadow = true;
    this.player.add(body, head);
    const hoodieMat = this.mat(0xe94f5f);
    const hoodie = new THREE.Mesh(new THREE.SphereGeometry(.51, 14, 10), hoodieMat);
    hoodie.scale.set(.9, .78, .92);
    hoodie.position.set(0, .82, -.04);
    hoodie.castShadow = true;
    this.player.add(hoodie);
    [-.48, .48].forEach(x => {
      const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(.11, .34, 3, 7), hoodieMat);
      sleeve.position.set(x, .92, -.1);
      sleeve.rotation.z = x > 0 ? -.8 : .8;
      sleeve.castShadow = true;
      this.player.add(sleeve);
    });
    [-.28, .28].forEach(x => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(.18, .38, 4), fur); ear.position.set(x, 1.94, -.08); ear.rotation.y = .8; ear.castShadow = true; this.player.add(ear);
      const innerEar = new THREE.Mesh(new THREE.ConeGeometry(.105, .22, 4), this.mat(0xff9fba));
      innerEar.position.set(x, 1.92, -.105);
      innerEar.rotation.y = .8;
      this.player.add(innerEar);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(.09, 16, 10), dark);
      eye.scale.set(.78, 1.12, .32);
      eye.position.set(x * .62, 1.56, -.445);
      this.player.add(eye);
      const sparkle = new THREE.Mesh(new THREE.SphereGeometry(.022, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      sparkle.position.set(x * .62 - .018, 1.595, -.505);
      this.player.add(sparkle);
      const brow = new THREE.Mesh(new THREE.BoxGeometry(.14, .025, .018), this.mat(0x5b463d));
      brow.position.set(x * .62, 1.72, -.5);
      brow.rotation.z = x > 0 ? -.28 : .28;
      this.player.add(brow);
    });
    const nose = new THREE.Mesh(new THREE.SphereGeometry(.17, 10, 8), cream); nose.scale.set(1.2, .7, .55); nose.position.set(0, 1.38, -.46); this.player.add(nose);
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(.09, .012, 6, 16, Math.PI), this.mat(0x8f3e4a));
    mouth.position.set(0, 1.31, -.51);
    mouth.rotation.z = Math.PI;
    this.player.add(mouth);
    const tongue = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), this.mat(0xff6f8c));
    tongue.scale.set(1, .8, .2);
    tongue.position.set(0, 1.27, -.525);
    this.player.add(tongue);
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xff9fba, transparent: true, opacity: .65 });
    [-.28, .28].forEach(x => {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(.055, 8, 6), cheekMat);
      cheek.scale.set(1.35, .7, .18);
      cheek.position.set(x, 1.38, -.505);
      this.player.add(cheek);
    });
    [-.22, -.12, .12, .22].forEach((x, i) => {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(.05, .18, .025), this.mat(0x5b463d));
      stripe.position.set(x, 1.78 - Math.abs(x) * .18, -.49);
      stripe.rotation.z = x < 0 ? -.38 : .38;
      this.player.add(stripe);
    });
    [-.43, .43].forEach(side => {
      for (let i = 0; i < 3; i++) {
        const whisker = new THREE.Mesh(new THREE.BoxGeometry(.28, .012, .012), this.mat(0xfff4df));
        whisker.position.set(side, 1.39 - i * .045, -.52);
        whisker.rotation.z = (side > 0 ? 1 : -1) * (.08 - i * .08);
        this.player.add(whisker);
      }
    });
    this.legs = [];
    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.08, .34, 3, 7), fur);
      leg.position.set(i < 2 ? -.28 : .28, .3, i % 2 ? .25 : -.25); leg.castShadow = true; this.legs.push(leg); this.player.add(leg);
    }
    [-.28, .28].forEach(x => {
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(.26, .13, .32), this.mat(0xf4eee6));
      shoe.position.set(x, .12, -.32);
      shoe.castShadow = true;
      this.player.add(shoe);
    });
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(.07, .72, 4, 8), fur); tail.position.set(.5, .9, .5); tail.rotation.set(.7, 0, -.8); tail.castShadow = true; this.player.add(tail);
    const boardMesh = new THREE.Mesh(new THREE.BoxGeometry(1.25, .12, 1.05), this.mat(board.color, board.id === "neon" ? 0x116677 : 0)); boardMesh.position.y = .08; boardMesh.castShadow = true; this.player.add(boardMesh);
    const hat = new THREE.Mesh(acc.id === "crown" ? new THREE.ConeGeometry(.25, .32, 5) : new THREE.BoxGeometry(.62, .16, .34), this.mat(acc.color));
    hat.position.set(0, acc.id === "scarf" ? 1.08 : acc.id === "backpack" ? 1.05 : 1.92, acc.id === "scarf" ? -.44 : acc.id === "backpack" ? .56 : -.05);
    hat.castShadow = true;
    this.player.add(hat);
    if (acc.id === "pawCap") {
      const capFront = new THREE.Mesh(new THREE.BoxGeometry(.48, .07, .36), this.mat(0xfff3df));
      capFront.position.set(0, 1.91, -.31);
      capFront.castShadow = true;
      this.player.add(capFront);
      const brim = new THREE.Mesh(new THREE.BoxGeometry(.5, .06, .3), this.mat(0xe94f5f));
      brim.position.set(0, 1.82, -.55);
      brim.rotation.x = -.22;
      brim.castShadow = true;
      this.player.add(brim);
      const pawPatch = new THREE.Mesh(new THREE.SphereGeometry(.055, 8, 6), this.mat(0xe94f5f));
      pawPatch.scale.set(1.2, .85, .2);
      pawPatch.position.set(0, 1.925, -.505);
      this.player.add(pawPatch);
    }
    this.shield = new THREE.Mesh(new THREE.SphereGeometry(.95, 18, 12), new THREE.MeshBasicMaterial({ color: 0x8ff7ff, wireframe: true, transparent: true, opacity: .24 }));
    this.player.add(this.shield);
    this.magnetAura = new THREE.Group();
    const auraMat = new THREE.MeshBasicMaterial({ color: 0xff4f66, transparent: true, opacity: .38 });
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.05, .035, 8, 42), auraMat);
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(.72, .03, 8, 42), auraMat.clone());
    ringA.rotation.x = Math.PI / 2;
    ringB.rotation.y = Math.PI / 2;
    this.magnetAura.add(ringA, ringB);
    this.magnetAura.position.y = 1.05;
    this.magnetAura.visible = false;
    this.player.add(this.magnetAura);
  }
  makeOfficer() {
    this.officer = new THREE.Group();
    const blue = this.mat(0x315f96), skin = this.mat(0xffc79e), gold = this.mat(0xffd76f);
    const body = new THREE.Mesh(new THREE.BoxGeometry(.7, 1.1, .42), blue); body.position.y = .9; body.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(.28, 10, 8), skin); head.position.y = 1.62; head.castShadow = true;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(.6, .15, .44), gold); cap.position.y = 1.9; cap.castShadow = true;
    this.officer.add(body, head, cap); this.scene.add(this.officer); this.officerDist = 7;
  }
  makeWorld() {
    this.tracks = [];
    for (let s = 0; s < 8; s++) {
      const g = new THREE.Group(); g.position.z = -s * 24;
      const grass = new THREE.Mesh(new THREE.BoxGeometry(21, .2, 24), this.mat(0x72d77b)); grass.position.y = -.12; grass.receiveShadow = true; g.add(grass);
      LANES.forEach(x => {
        const bed = new THREE.Mesh(new THREE.BoxGeometry(2.1, .08, 24), this.mat(0xe7c97b)); bed.position.set(x, .02, 0); bed.receiveShadow = true; g.add(bed);
        [-.65, .65].forEach(r => { const rail = new THREE.Mesh(new THREE.BoxGeometry(.12, .12, 24), this.mat(0x596a70)); rail.position.set(x + r, .15, 0); rail.castShadow = true; g.add(rail); });
        for (let z = -10; z <= 10; z += 2) { const sl = new THREE.Mesh(new THREE.BoxGeometry(1.7, .12, .18), this.mat(0x8b5b33)); sl.position.set(x, .1, z); sl.castShadow = true; g.add(sl); }
      });
      for (let i = 0; i < 6; i++) this.tree(g, (i % 2 ? -1 : 1) * rnd(6, 10), rnd(-10, 10));
      for (let i = 0; i < 4; i++) this.building(g, (i % 2 ? -1 : 1) * rnd(10, 13), rnd(-11, 10));
      for (let i = 0; i < 3; i++) this.lamp(g, (i % 2 ? -1 : 1) * 5.5, rnd(-10, 10));
      this.stationSign(g, rnd(-8, 8));
      this.scene.add(g); this.tracks.push(g);
    }
    for (let i = 0; i < 7; i++) {
      const mountain = new THREE.Mesh(new THREE.ConeGeometry(rnd(2.5, 5), rnd(3, 7), 5), this.mat(0x4d9c83));
      mountain.position.set(rnd(-24, 24), 1.2, rnd(-58, -88));
      this.scene.add(mountain);
    }
    for (let i = 0; i < 10; i++) {
      const c = new THREE.Group();
      for (let p = 0; p < 3; p++) { const puff = new THREE.Mesh(new THREE.SphereGeometry(rnd(.35, .8), 10, 7), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .82 })); puff.position.x = p * .55; puff.scale.y = .55; c.add(puff); }
      c.position.set(rnd(-18, 18), rnd(7, 13), rnd(-18, -70)); this.scene.add(c);
    }
  }
  tree(g, x, z) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.12, .18, 1.4, 6), this.mat(0x8a5a2b)); trunk.position.set(x, .65, z);
    const blossom = Math.random() > .48;
    const leaf = new THREE.Mesh(
      blossom ? new THREE.SphereGeometry(.8, 10, 8) : new THREE.ConeGeometry(.8, 1.65, 7),
      this.mat(blossom ? 0xff8fbe : 0x4fc978)
    );
    leaf.position.set(x, 1.75, z);
    if (blossom) leaf.scale.set(1.15, .75, 1.05);
    trunk.castShadow = true; leaf.castShadow = true;
    g.add(trunk, leaf);
  }
  building(g, x, z) {
    const colors = [0xffb267, 0xff7eb6, 0x75d8ff, 0xffd76f, 0x8f68ff];
    const h = rnd(1.4, 3.2);
    const body = new THREE.Mesh(new THREE.BoxGeometry(rnd(1.1, 1.9), h, rnd(1.1, 2.2)), this.mat(colors[Math.floor(rnd(0, colors.length))]));
    body.position.set(x, h / 2 - .05, z);
    body.castShadow = true;
    body.receiveShadow = true;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(.95, .55, 4), this.mat(0x31405a));
    roof.position.set(x, h + .25, z);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    g.add(body, roof);
  }
  lamp(g, x, z) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 1.8, 6), this.mat(0x31405a));
    post.position.set(x, .9, z);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff0a8 }));
    bulb.position.set(x, 1.86, z);
    g.add(post, bulb);
  }
  stationSign(g, z) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.4, .55, .14), this.mat(0xfff8e8));
    board.position.set(0, 2.35, z);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(2.55, .08, .18), this.mat(0xff7eb6));
    trim.position.set(0, 2.67, z);
    const poster = new THREE.Mesh(new THREE.BoxGeometry(.42, .36, .16), this.mat(0xff9cc0));
    poster.position.set(.72, 2.35, z - .03);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), this.mat(0xfff3df));
    paw.scale.set(1.25, .8, .22);
    paw.position.set(.72, 2.35, z - .13);
    board.castShadow = true;
    trim.castShadow = true;
    g.add(board, trim, poster, paw);
  }
  resize() { this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); this.renderer.setSize(innerWidth, innerHeight); this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); }
  bind() {
    document.body.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      this.sound.play("click");
      if (b.dataset.screen) this.show(b.dataset.screen);
      if (b.dataset.action) this.action(b.dataset.action);
    });
    document.querySelectorAll("[data-control]").forEach(btn => {
      btn.addEventListener("pointerdown", e => {
        e.preventDefault();
        this.control(btn.dataset.control);
      });
    });
    let touchStart = null;
    const canvas = document.getElementById("game");
    canvas.addEventListener("pointerdown", e => {
      if (e.pointerType === "mouse") return;
      touchStart = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    canvas.addEventListener("pointerup", e => {
      if (!touchStart || e.pointerType === "mouse") return;
      const dx = e.clientX - touchStart.x;
      const dy = e.clientY - touchStart.y;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      const quickTap = ax < 18 && ay < 18 && performance.now() - touchStart.t < 260;
      touchStart = null;
      if (quickTap && this.state !== "running") return this.start();
      if (Math.max(ax, ay) < 28) return;
      this.control(ax > ay ? (dx < 0 ? "left" : "right") : (dy < 0 ? "jump" : "slide"));
    });
    addEventListener("keydown", e => {
      const k = e.key.toLowerCase();
      if (["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "s", " ", "p"].includes(k)) e.preventDefault();
      if (k === " " && this.state !== "running") return this.start();
      if (k === "p") return this.state === "running" ? this.pause() : this.resume();
      if (k === "arrowleft" || k === "a") this.control("left");
      if (k === "arrowright" || k === "d") this.control("right");
      if (k === "arrowup" || k === "w") this.control("jump");
      if (k === "arrowdown" || k === "s") this.control("slide");
    });
    document.getElementById("pauseBtn").onclick = () => this.pause();
    document.getElementById("music").onchange = e => { this.store.data.settings.music = e.target.checked; this.store.save(); e.target.checked ? this.sound.startMusic() : this.sound.stopMusic(); };
    document.getElementById("sfx").onchange = e => { this.store.data.settings.sfx = e.target.checked; this.store.save(); };
    document.getElementById("volume").oninput = e => {
      this.store.data.settings.volume = +e.target.value;
      if (this.sound.audio) this.sound.audio.volume = this.store.data.settings.volume * .55;
      this.store.save();
    };
    document.getElementById("resetBest").onclick = () => { this.store.data.highScore = 0; this.store.save(); this.refresh(); this.toast("High score reset."); };
    document.getElementById("resetAll").onclick = () => { localStorage.removeItem(KEY); location.reload(); };
  }
  action(a) { if (a === "play") this.start(); if (a === "resume") this.resume(); if (a === "menu") this.menu(); }
  control(type) {
    if (this.state !== "running") return;
    if (type === "left") this.lane = Math.max(0, this.lane - 1);
    if (type === "right") this.lane = Math.min(2, this.lane + 1);
    if (type === "jump" && this.y <= .02) {
      this.vy = this.power.jump || this.power.jetpack ? 16 : 13;
      this.sound.play("jump");
      this.missions.add("jump");
    }
    if (type === "slide") {
      this.slide = .72;
      this.sound.play("slide");
      this.missions.add("slide");
    }
  }
  show(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.toggle("active", s.id === id));
    document.getElementById("hud").classList.toggle("hidden", id !== "game");
    document.getElementById("touchControls").classList.toggle("hidden", id !== "game");
    this.refresh();
    this.updateWelcomeGift();
    if (id === "missions") this.renderMissions();
    if (id === "shop") this.renderShop("skins");
  }
  updateWelcomeGift() {
    const gift = document.getElementById("welcomeGift");
    if (gift) gift.classList.toggle("hidden", this.store.data.welcomeGiftClaimed);
  }
  menu() { this.state = "menu"; this.show("menu"); }
  pause() { if (this.state === "running") { this.state = "pause"; this.show("pause"); } }
  resume() { if (this.state === "pause") { this.state = "running"; this.last = performance.now(); this.show("game"); } }
  start() {
    this.sound.ctxReady(); this.sound.stopMusic(); this.sound.startMusic(); this.state = "intro"; this.show("game");
    this.score = 0; this.runCoins = 0; this.distance = 0; this.speed = 9; this.spawnT = .5; this.coinT = .2; this.powerT = 5;
    this.objects.forEach(o => this.scene.remove(o.mesh)); this.objects = [];
    this.lane = 1; this.y = 0; this.vy = 0; this.slide = 0; this.officerDist = 1.65; this.power = {};
    this.introTimer = 2.2;
    this.player.position.set(0, 0, 0);
    this.officer.position.set(0, 0, 1.65);
    this.toast("Caught! Wiggle free and run!");
    this.missions.add("round");
  }
  spawn(type, lane, z, y = .6) {
    let mesh, box = { w: 1, h: 1, d: 1 };
    if (type === "coin") { mesh = this.pawCoinMesh(); box = { w: .7, h: .7, d: .4 }; }
    if (type === "low") { mesh = new THREE.Mesh(new THREE.BoxGeometry(1.75, .62, .42), this.mat(0xff7eb6)); box = { w: 1.75, h: .62, d: .55 }; y = .32; }
    if (type === "high") { mesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.75, .38), this.mat(0x8f68ff)); box = { w: 1.8, h: 1.75, d: .5 }; y = 1.25; }
    if (type === "crate") { mesh = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.05, 1.05), this.mat(0xc8874a)); box = { w: 1.15, h: 1.05, d: 1.05 }; y = .53; }
    if (type === "train") { mesh = this.trainMesh(); box = { w: 2.1, h: 2.15, d: 5.8 }; y = 1.08; }
    if (type === "power") {
      const powerName = ["magnet","shield","double","jetpack","jump"][Math.floor(rnd(0,5))];
      mesh = this.powerMesh(powerName);
      box = { w: .8, h: .8, d: .8 };
      y = 1.15;
      mesh.userData.power = powerName;
    }
    if (mesh.traverse) mesh.traverse(part => {
      if (part.isMesh) {
        part.castShadow = true;
        part.receiveShadow = true;
      }
    });
    mesh.position.set(LANES[lane], y, z); this.scene.add(mesh); this.objects.push({ type, mesh, lane, box, hit: false });
  }
  pawCoinMesh() {
    const coin = new THREE.Group();
    const gold = this.mat(0xffcf4b, 0x6b4300);
    const face = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .09, 24), gold);
    face.rotation.x = Math.PI / 2;
    coin.add(face);
    const pawMat = this.mat(0xfff3bd, 0x332000);
    const pad = new THREE.Mesh(new THREE.SphereGeometry(.095, 8, 6), pawMat);
    pad.scale.set(1.25, .8, .22);
    pad.position.set(0, 0, .06);
    coin.add(pad);
    [[-.13,.12],[0,.18],[.13,.12]].forEach(([x, y]) => {
      const toe = new THREE.Mesh(new THREE.SphereGeometry(.052, 8, 6), pawMat);
      toe.scale.set(1, 1, .22);
      toe.position.set(x, y, .065);
      coin.add(toe);
    });
    return coin;
  }
  powerMesh(powerName) {
    if (powerName === "magnet") {
      const magnet = new THREE.Group();
      const red = this.mat(0xe94f5f, 0x4b1118);
      const left = new THREE.Mesh(new THREE.BoxGeometry(.16, .58, .16), red);
      const right = left.clone();
      left.position.x = -.22; right.position.x = .22;
      const top = new THREE.Mesh(new THREE.BoxGeometry(.6, .16, .16), red);
      top.position.y = .22;
      const tipMat = this.mat(0xfff3df);
      const t1 = new THREE.Mesh(new THREE.BoxGeometry(.18, .12, .18), tipMat);
      const t2 = t1.clone();
      t1.position.set(-.22, -.34, 0); t2.position.set(.22, -.34, 0);
      magnet.add(left, right, top, t1, t2);
      return magnet;
    }
    if (powerName === "jetpack") {
      const pack = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(.52, .62, .26), this.mat(0xff9cc0));
      const l = new THREE.Mesh(new THREE.CylinderGeometry(.1, .13, .42, 10), this.mat(0xfff3df));
      const r = l.clone();
      l.position.set(-.22, -.18, 0); r.position.set(.22, -.18, 0);
      const flame1 = new THREE.Mesh(new THREE.ConeGeometry(.12, .45, 10), this.mat(0xffb13b, 0x6a2600));
      const flame2 = flame1.clone();
      flame1.position.set(-.22, -.58, 0); flame2.position.set(.22, -.58, 0);
      flame1.rotation.x = Math.PI; flame2.rotation.x = Math.PI;
      pack.add(body, l, r, flame1, flame2);
      return pack;
    }
    const color = powerName === "shield" ? 0x90a8c7 : powerName === "double" ? 0xffcf4b : 0xff9cc0;
    return new THREE.Mesh(new THREE.IcosahedronGeometry(.45), this.mat(color, 0x332200));
  }
  trainMesh() {
    const train = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.9, 6), this.mat(0x45b7d1));
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.85, .28, 5.7), this.mat(0xffd76f));
    roof.position.y = 1.08;
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.6, .45, .16), this.mat(0xff7eb6));
    nose.position.set(0, .35, 3.08);
    train.add(body, roof, nose);
    for (let z = -2; z <= 2; z += 1.35) {
      [-.62, .62].forEach(x => {
        const win = new THREE.Mesh(new THREE.BoxGeometry(.42, .32, .08), new THREE.MeshBasicMaterial({ color: 0xd7fbff }));
        win.position.set(x, .35, z);
        train.add(win);
      });
    }
    [-.72, .72].forEach(x => [-2.2, 2.2].forEach(z => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .16, 12), this.mat(0x31405a));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, -.95, z);
      train.add(wheel);
    }));
    return train;
  }
  spawnCoinPattern() {
    const lane = Math.floor(rnd(0, 3));
    const pattern = ["line", "arc", "zigzag", "stair", "wave", "spread"][Math.floor(rnd(0, 6))];
    if (this.power.jetpack && Math.random() < .75) {
      this.spawnSkyCoins();
      return;
    }
    if (pattern === "line") {
      for (let i = 0; i < 8; i++) this.spawn("coin", lane, -24 - i * 1.55, 1.05);
    } else if (pattern === "arc") {
      for (let i = 0; i < 9; i++) this.spawn("coin", lane, -24 - i * 1.35, 1 + Math.sin(i / 8 * Math.PI) * 2.15);
    } else if (pattern === "zigzag") {
      for (let i = 0; i < 10; i++) this.spawn("coin", i % 2 ? 0 : 2, -24 - i * 1.35, 1.1 + (i % 3) * .25);
    } else if (pattern === "stair") {
      for (let i = 0; i < 9; i++) this.spawn("coin", clamp(Math.floor(i / 3), 0, 2), -24 - i * 1.35, 1 + i * .18);
    } else if (pattern === "wave") {
      for (let i = 0; i < 12; i++) this.spawn("coin", i % 3, -24 - i * 1.15, 1.3 + Math.sin(i * .9) * .7);
    } else {
      for (let l = 0; l < 3; l++) for (let i = 0; i < 4; i++) this.spawn("coin", l, -24 - i * 1.55, 1.05 + l * .28);
    }
  }
  spawnSkyCoins() {
    for (let i = 0; i < 12; i++) {
      const lane = i % 3;
      const y = 3.05 + Math.sin(i * .75) * .45;
      this.spawn("coin", lane, -24 - i * 1.25, y);
    }
  }
  update(dt, t) {
    if (this.state === "caught") {
      this.updateCaught(dt, t);
      return;
    }
    if (this.state === "intro") {
      this.updateIntro(dt, t);
      return;
    }
    if (this.state !== "running") {
      this.updateMenuScene(dt, t);
      return;
    }
    Object.keys(this.power).forEach(k => { this.power[k] -= dt; if (this.power[k] <= 0) delete this.power[k]; });
    this.speed = clamp(9 + this.score / 800 + (this.power.jetpack ? 3.5 : 0), 9, 22);
    this.score += dt * this.speed * 10 * (this.power.double ? 2 : 1);
    this.distance += dt * this.speed * 1.8;
    this.store.data.highScore = Math.max(this.store.data.highScore, Math.floor(this.score));
    this.spawnT -= dt; this.coinT -= dt; this.powerT -= dt;
    if (this.coinT <= 0) { this.spawnCoinPattern(); this.coinT = this.power.jetpack ? rnd(.85, 1.25) : rnd(1.25, 2.15); }
    if (this.spawnT <= 0) { const lane = Math.floor(rnd(0, 3)); this.spawn(["low","high","crate","train"][Math.floor(rnd(0,4))], lane, -38); this.spawnT = clamp(1.2 - this.score / 4200, .52, 1.2); }
    if (this.powerT <= 0) { this.spawn("power", Math.floor(rnd(0, 3)), -34); this.powerT = rnd(8, 13); }
    this.tracks.forEach(g => { g.position.z += this.speed * dt; if (g.position.z > 24) g.position.z = Math.min(...this.tracks.map(x => x.position.z)) - 24; });
    if (this.power.jetpack) {
      this.vy = 0;
      this.y += (2.75 - this.y) * Math.min(1, dt * 5);
      if (Math.random() < .35) this.spawnJetpackSpark();
    } else {
      this.vy -= 31 * dt;
      this.y = Math.max(0, this.y + this.vy * dt);
      if (this.y === 0 && this.vy < 0) this.vy = 0;
    }
    this.slide = Math.max(0, this.slide - dt);
    this.x += (LANES[this.lane] - this.x) * Math.min(1, dt * 13);
    this.player.position.set(this.x, this.y, 0);
    this.player.scale.y += ((this.slide ? .55 : 1) - this.player.scale.y) * Math.min(1, dt * 12);
    this.legs.forEach((l, i) => l.rotation.x = Math.sin(t * .012 + i * Math.PI) * .75);
    this.shield.visible = !!this.power.shield;
    this.magnetAura.visible = !!this.power.magnet;
    if (this.power.magnet) {
      this.magnetAura.rotation.y += dt * 5;
      this.magnetAura.rotation.z -= dt * 3;
      const pulse = 1 + Math.sin(t * .012) * .08;
      this.magnetAura.scale.setScalar(pulse);
    }
    this.officerDist = clamp(this.officerDist + dt * .25, 2.2, 8);
    this.officer.position.set(this.x, Math.sin(t * .012) * .05, this.officerDist);
    this.camera.position.lerp(new THREE.Vector3(this.x * .35, 4.6 + this.y * .2, 9 + (this.power.jetpack ? 1.2 : 0)), dt * 4);
    this.camera.lookAt(this.x * .25, 1.2, -8);
    this.objects.forEach(o => {
      if (o.visualOnly) {
        o.mesh.position.z += this.speed * dt;
        o.mesh.userData.life -= dt;
        if (o.mesh.material) o.mesh.material.opacity = Math.max(0, o.mesh.userData.life * 2);
        if (o.mesh.userData.life <= 0) o.hit = true;
        return;
      }
      o.mesh.position.z += (this.speed + (o.type === "train" ? 3.6 : 0)) * dt;
      o.mesh.rotation.y += (o.type === "coin" || o.type === "power" ? 6 : 0) * dt;
      if (this.power.magnet && (o.type === "coin" || o.type === "power")) this.applyMagnet(o, dt, t);
      if (!o.hit && this.collide(o)) this.hit(o);
    });
    this.objects = this.objects.filter(o => { const keep = o.mesh.position.z < 10 && !o.hit; if (!keep) this.scene.remove(o.mesh); return keep; });
    this.refreshHud();
  }
  collide(o) {
    const ph = this.slide ? .8 : 1.55, py = this.y + ph / 2;
    return Math.abs(this.x - o.mesh.position.x) < (.9 + o.box.w) / 2 && Math.abs(py - o.mesh.position.y) < (ph + o.box.h) / 2 && Math.abs(o.mesh.position.z) < (.9 + o.box.d) / 2;
  }
  applyMagnet(o, dt, t) {
    const target = new THREE.Vector3(this.x, 1.15 + this.y, 0);
    const distance = o.mesh.position.distanceTo(target);
    if (distance > 12) return;
    o.magnetized = true;
    const strength = distance < 3 ? 13 : 6.5;
    o.mesh.position.lerp(target, Math.min(1, dt * strength));
    const glow = 1 + Math.sin(t * .02) * .18;
    o.mesh.scale.setScalar(glow);
    o.mesh.traverse?.(part => {
      if (part.isMesh && part.material?.emissive) part.material.emissive.setHex(o.type === "coin" ? 0xaa7200 : 0x661c3a);
    });
    if (distance < .72 && !o.hit) this.hit(o);
  }
  hit(o) {
    if (o.type === "coin") { o.hit = true; this.runCoins++; this.store.data.totalCoins++; this.missions.add("coins"); this.sound.play("coin"); return; }
    if (o.type === "power") {
      o.hit = true;
      this.power[o.mesh.userData.power] = o.mesh.userData.power === "shield" ? 14 : o.mesh.userData.power === "jetpack" ? 7 : 9;
      this.missions.add("power");
      this.sound.play("power");
      if (o.mesh.userData.power === "magnet") this.toast("Magnet on! Paw coins fly to you.");
      return;
    }
    const ok = (o.type === "low" && this.y > .68) || (o.type === "high" && this.slide > 0);
    if (ok) return;
    if (this.power.shield) { delete this.power.shield; o.hit = true; this.flash(); this.sound.play("crash"); return; }
    this.officerDist -= o.type === "low" ? 1.4 : 4;
    this.flash(); this.sound.play("crash");
    if (o.type !== "low" || this.officerDist <= 2.4) this.over();
  }
  over() {
    if (this.state === "caught" || this.state === "over") return;
    this.state = "caught";
    this.caughtTimer = 2.1;
    this.toast("Caught!");
    this.sound.stopMusic();
    this.missions.max("score", Math.floor(this.score));
    this.store.save();
    document.getElementById("finalScore").textContent = Math.floor(this.score);
    document.getElementById("finalCoins").textContent = this.runCoins;
    document.getElementById("finalDistance").textContent = `${Math.floor(this.distance)} m`;
    document.getElementById("finalBest").textContent = this.store.data.highScore;
  }
  refreshHud() {
    score.textContent = Math.floor(this.score); runCoins.textContent = this.runCoins; totalCoins.textContent = this.store.data.totalCoins; bestHud.textContent = this.store.data.highScore;
    powerups.innerHTML = Object.entries(this.power).map(([k,v]) => `<span>${k === "jetpack" ? "jetpack" : k} ${Math.ceil(v)}s</span>`).join("");
  }
  refresh() {
    coinsMenu.textContent = shopCoins.textContent = missionCoins.textContent = this.store.data.totalCoins;
    bestMenu.textContent = bestHud.textContent = this.store.data.highScore;
    const skin = this.shop.item("skins", this.store.data.equipped.skin), acc = this.shop.item("accessories", this.store.data.equipped.accessory), board = this.shop.item("boards", this.store.data.equipped.board);
    previewName.textContent = skin.name; previewGear.textContent = `${acc.name} - ${board.name}`; skinPreview.style.background = skin.color;
    music.checked = this.store.data.settings.music; sfx.checked = this.store.data.settings.sfx; volume.value = this.store.data.settings.volume;
  }
  renderShop(cat) {
    this.previewChoice[cat] ??= this.store.data.equipped[cat === "skins" ? "skin" : cat === "accessories" ? "accessory" : "board"];
    shopTabs.innerHTML = Object.keys(this.shop.catalog).map(k => `<button class="${k === cat ? "active" : ""}" data-tab="${k}">${k}</button>`).join("");
    shopTabs.querySelectorAll("button").forEach(b => b.onclick = () => this.renderShop(b.dataset.tab));
    const key = cat === "skins" ? "skin" : cat === "accessories" ? "accessory" : "board";
    this.renderShopPreview(cat, this.previewChoice[cat]);
    shopGrid.innerHTML = this.shop.catalog[cat].map(raw => {
      const it = this.shop.item(cat, raw[0]), own = this.shop.owned(cat, it.id), eq = this.store.data.equipped[key] === it.id;
      return `<article class="item ${this.previewChoice[cat] === it.id ? "previewing" : ""}" data-preview-cat="${cat}" data-preview-id="${it.id}"><div class="item-art"><div class="mini ${cat === "boards" ? "board" : cat === "accessories" ? "accessory" : ""}" style="background:${it.color}"></div></div><h3>${it.name}</h3><p>${own ? "Purchased" : `${it.price} paw coins`}</p><button data-cat="${cat}" data-id="${it.id}" data-mode="${own ? "equip" : "buy"}" ${eq ? "disabled" : ""}>${eq ? "Equipped" : own ? "Equip" : "Buy"}</button></article>`;
    }).join("");
    shopGrid.querySelectorAll("[data-preview-id]").forEach(card => {
      card.onclick = event => {
        if (event.target.closest("button")) return;
        this.previewChoice[cat] = card.dataset.previewId;
        this.renderShop(cat);
      };
    });
    shopGrid.querySelectorAll("button").forEach(b => b.onclick = () => {
      this.previewChoice[b.dataset.cat] = b.dataset.id;
      if (b.dataset.mode === "buy") {
        const r = this.shop.buy(b.dataset.cat, b.dataset.id);
        if (r !== "ok") return this.toast(r === "coins" ? "Not enough paw coins yet." : "Already owned.");
        this.sound.play("buy"); this.toast("Cute upgrade purchased!");
      } else { this.shop.equip(b.dataset.cat, b.dataset.id); this.rebuildCat(); this.toast("Equipped!"); }
      this.refresh(); this.renderShop(b.dataset.cat);
    });
  }
  renderShopPreview(cat, id) {
    const item = this.shop.item(cat, id);
    const skin = cat === "skins" ? item : this.shop.item("skins", this.store.data.equipped.skin);
    const accessory = cat === "accessories" ? item : this.shop.item("accessories", this.store.data.equipped.accessory);
    const board = cat === "boards" ? item : this.shop.item("boards", this.store.data.equipped.board);
    const owned = this.shop.owned(cat, item.id);
    shopPreview.innerHTML = `
      <div class="preview-stage">
        <div class="custom-cat" style="--fur:${skin.color};--accent:${accessory.color};--board:${board.color}">
          <div class="tail"></div>
          <div class="body"></div>
          <div class="head"><span class="stripe s1"></span><span class="stripe s2"></span><span class="stripe s3"></span><span class="eyes"></span><span class="smile"></span></div>
          <div class="cap"></div>
          <div class="board"></div>
        </div>
      </div>
      <div class="preview-info">
        <h3>${item.name}</h3>
        <p>${owned ? "Owned item. Try it on and equip anytime." : `Preview before buying for ${item.price} paw coins.`}</p>
        <div class="preview-tags">
          <span>${skin.name}</span>
          <span>${accessory.name}</span>
          <span>${board.name}</span>
        </div>
      </div>`;
  }
  renderMissions() {
    missionList.innerHTML = this.missions.list.map(m => {
      const p = this.store.data.missions[m[0]] || 0, done = p >= m[2], claimed = this.store.data.claimed.includes(m[0]);
      return `<article class="mission"><h3>${m[1]}</h3><p>Reward: ${m[3]} paw coins</p><div class="bar"><span style="width:${Math.min(100, p / m[2] * 100)}%"></span></div><button data-claim="${m[0]}" ${!done || claimed ? "disabled" : ""}>${claimed ? "Claimed" : done ? "Claim Reward" : `${Math.min(p,m[2])}/${m[2]}`}</button></article>`;
    }).join("");
    missionList.querySelectorAll("button").forEach(b => b.onclick = () => { const r = this.missions.claim(b.dataset.claim); if (r) { this.sound.play("buy"); this.toast(`Reward claimed: ${r} paw coins!`); this.refresh(); this.renderMissions(); } });
  }
  flash() { flash.className = ""; void flash.offsetWidth; flash.classList.add("hit"); }
  toast(msg) { toast.textContent = msg; toast.classList.add("show"); clearTimeout(this.toastT); this.toastT = setTimeout(() => toast.classList.remove("show"), 1900); }
  updateMenuScene(dt, t) {
    const time = t * .001;
    this.player.position.set(Math.sin(time * .8) * .35, Math.sin(time * 2) * .05, 0);
    this.player.rotation.y = Math.sin(time * .6) * .35;
    this.legs?.forEach((leg, i) => leg.rotation.x = Math.sin(time * 5 + i * Math.PI) * .25);
    this.camera.position.lerp(new THREE.Vector3(Math.sin(time * .28) * 1.6, 4.2, 9.6), dt * 2);
    this.camera.lookAt(0, 1.25, -6);
  }
  updateIntro(dt, t) {
    this.introTimer -= dt;
    this.player.position.x = Math.sin(t * .02) * .12;
    this.player.position.y = Math.max(0, Math.sin(t * .018) * .04);
    this.player.rotation.z = Math.sin(t * .025) * .08;
    this.officerDist += (1.15 - this.officerDist) * Math.min(1, dt * 4);
    this.officer.position.set(this.player.position.x * .6, Math.sin(t * .016) * .04, this.officerDist);
    this.officer.rotation.y = Math.sin(t * .012) * .18;
    this.camera.position.lerp(new THREE.Vector3(0, 3.8, 7.1), dt * 4);
    this.camera.lookAt(0, 1.2, 0);
    if (this.introTimer <= 0) {
      this.state = "running";
      this.last = performance.now();
      this.officerDist = 7;
      this.player.rotation.set(0, 0, 0);
      this.player.position.set(0, 0, 0);
      this.toast("Run!");
    }
  }
  updateCaught(dt, t) {
    this.caughtTimer -= dt;
    this.power = {};
    this.vy = 0;
    this.y += (0 - this.y) * Math.min(1, dt * 6);
    this.player.position.set(this.x + Math.sin(t * .026) * .09, this.y, 0);
    this.player.rotation.z = Math.sin(t * .03) * .12;
    this.officerDist += (1.05 - this.officerDist) * Math.min(1, dt * 6);
    this.officer.position.set(this.player.position.x * .7, Math.sin(t * .018) * .04, this.officerDist);
    this.officer.rotation.y = Math.sin(t * .014) * .18;
    this.camera.position.lerp(new THREE.Vector3(this.player.position.x * .25, 3.6, 7.2), dt * 5);
    this.camera.lookAt(this.player.position.x * .2, 1.2, 0);
    if (this.caughtTimer <= 0) {
      this.state = "over";
      this.player.rotation.set(0, 0, 0);
      this.sound.playLosing();
      this.show("over");
    }
  }
  spawnJetpackSpark() {
    const spark = new THREE.Mesh(
      new THREE.ConeGeometry(.07, .32, 8),
      new THREE.MeshBasicMaterial({ color: Math.random() > .5 ? 0xffb13b : 0xfff0a8, transparent: true, opacity: .85 })
    );
    spark.position.set(this.player.position.x + rnd(-.35, .35), this.player.position.y + .15, .4);
    spark.rotation.x = Math.PI;
    spark.userData.life = .45;
    this.scene.add(spark);
    this.objects.push({ type: "spark", mesh: spark, lane: this.lane, box: { w: 0, h: 0, d: 0 }, hit: false, visualOnly: true });
  }
  loop(t) { const dt = Math.min(.033, (t - this.last) / 1000 || .016); this.last = t; this.update(dt, t); this.renderer.render(this.scene, this.camera); requestAnimationFrame(n => this.loop(n)); }
}

if (!window.THREE) document.body.innerHTML = "<div class='screen active'><div class='panel'><h2>Three.js missing</h2><p>Keep assets/three.min.js in the project folder.</p></div></div>";
else new Game();
