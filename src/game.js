const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const state = {
  cash: 620000,
  debt: 0,
  loanPayments: 0,
  month: 1,
  selected: null,
  chip: {
    clock: 3.2,
    voltage: 0.92,
    cache: 32,
    cores: 16,
    memory: 8,
    node: 7,
    ai: false,
    ecc: true,
    optimizedPower: false, // power_grid: on-chip power delivery network, +reliability
    cache3d: false,        // 3d_cache: vertically stacked cache, +cache perf, +heat
    optical: false,        // optical_interconnect: photonic links, -heat
    perf: 0,
    heat: 0,
    reliability: 0,
    cost: 0,
    months: 0,
    monthlyCost: 0
  },
  activeChip: {
    name: "Gen 0",
    perf: 42,
    heat: 2.4,
    reliability: 91
  },
  chipProject: null,
  designExperience: 0, // completed chip programs; tightens the design estimator
  unlockedTechs: [],
  researchAssignments: {}, // { techId: number of researchers }
  techProgress: {}, // { techId: researcher-months completed; retained when researchers are pulled off }
  licensing: {}, // { techId: { enabled, price } }
  licenseIncome: 0,
  chipCatalog: [
    { name: "Gen 0", perf: 42, heat: 2.4, reliability: 91, clock: 3.2, cores: 16, cache: 32, memory: 8, node: 7, ai: false, ecc: true }
  ],
  siliconOffers: [
    { id: "sil_seed_1", company: "Aurora Motors", application: "autonomous driving perception", requirement: { type: "benchmark", benchmark: "AI inference", minScore: 52 }, pay: 560000, penalty: 120000, goodwill: 1, cacheNeed: 0.62, memoryNeed: 0.48, aiNeed: 0.7, requestedTech: "thermal_analysis", deadline: 72, expiresIn: 5 },
    { id: "sil_seed_2", company: "PlayForge Entertainment", application: "next-gen console gaming", requirement: { type: "benchmark", benchmark: "Gaming", minScore: 58 }, pay: 640000, penalty: 140000, goodwill: 2, cacheNeed: 0.7, memoryNeed: 0.5, aiNeed: 0.3, requestedTech: null, deadline: 84, expiresIn: 6 }
  ],
  activeSilicon: [],
  researchQueue: [], // ordered techIds; idle researchers auto-start the first available entry
  selectedTech: null, // tech shown in the research detail box
  rivals: [
    // speed = researcher-months of progress per month, i.e. team size
    { id: "helios", name: "Helios Microsystems", researchers: 18, speed: 18, completed: ["cloud_modeling", "thermal_analysis"], progress: { high_fidelity_sim: 130 }, current: "high_fidelity_sim" },
    { id: "quanta", name: "Quanta Forge Labs", researchers: 26, speed: 26, completed: ["cloud_modeling", "high_fidelity_sim"], progress: { monte_carlo_analysis: 190 }, current: "monte_carlo_analysis" },
    { id: "vector", name: "Vector Photonics", researchers: 14, speed: 14, completed: ["legacy_silicon"], progress: { fpga_prototyping: 150 }, current: "fpga_prototyping" }
  ],
  wholesale: { price: 950, sold: 0, revenue: 0 }, // on-demand compute: player-set $/PFLOP per month
  contractRule: "revenue_per_pflop", // Options: revenue_per_pflop (default), max_revenue, most_profitable
  staff: {
    researchers: 1,
    ops: 1,
    community: 0,
    sales: 0
  },
  activeContracts: [],
  financials: [],
  logs: []
};

const sites = [
  { id: 1, name: "North Ridge", x: 0.16, y: 0.22, land: 65000, grid: 38, community: 86, water: 54, built: null },
  { id: 2, name: "Riverbend", x: 0.42, y: 0.31, land: 90000, grid: 68, community: 58, water: 90, built: null },
  { id: 3, name: "Old Mill", x: 0.70, y: 0.26, land: 120000, grid: 72, community: 42, water: 66, built: null },
  { id: 4, name: "Pine Flats", x: 0.25, y: 0.62, land: 82000, grid: 52, community: 74, water: 48, built: null },
  { id: 5, name: "Rail Junction", x: 0.55, y: 0.62, land: 150000, grid: 88, community: 35, water: 40, built: null },
  { id: 6, name: "Sunset Mesa", x: 0.82, y: 0.70, land: 70000, grid: 45, community: 92, water: 30, built: null }
];

const buildTypes = {
  small: { name: "Small DC", cost: 160000, power: 8, baseCapacity: 48 },
  medium: { name: "Modular DC", cost: 420000, power: 24, baseCapacity: 150 },
  large: { name: "Hyperscale DC", cost: 950000, power: 58, baseCapacity: 410 }
};

let contractDeck = [
  { name: "City Records Backup", cap: 18, pay: 19000, months: 10, goodwill: 3 },
  { name: "University HPC Lab", cap: 28, pay: 33000, months: 8, goodwill: 1 },
  { name: "Medical Research Cloud", cap: 40, pay: 51000, months: 12, goodwill: 2 },
  { name: "Streaming Cache Region", cap: 66, pay: 85000, months: 10, goodwill: -1 }
];

const siliconCompanyPool = [
  ["Aurora Motors", "autonomous driving perception"],
  ["PlayForge Entertainment", "next-gen console gaming"],
  ["Helix Biosystems", "genome alignment batches"],
  ["Northwind Cloud", "dense virtualization hosts"],
  ["Sentinel Defense", "radar signal processing"],
  ["Cascade Telecom", "packet inspection at line rate"],
  ["Ionia Robotics", "factory motion planning"],
  ["Vantage Capital", "microsecond risk scoring"],
  ["Prism Studios", "render farm acceleration"]
];

const benchmarkNames = ["Gaming", "Virtual machines", "AI inference", "Databases", "Scientific HPC", "Video rendering"];

function requirementLabel(requirement) {
  return requirement.type === "benchmark"
    ? `${requirement.benchmark} benchmark ≥ ${requirement.minScore}`
    : `≥ ${requirement.minPerf} PFLOPS/node`;
}

// baseDuration is in researcher-months (person-months): total effort the
// tech takes, calibrated against real-world EDA/silicon program sizes
// (e.g. basic simulation tools ≈ 10-20 engineers × 1 year ≈ 180 pm;
// quantum-inspired simulation ≈ large research teams over 10+ years ≈ 30,000 pm).
// Two researchers assigned finish in half the calendar time.
// requires lists prerequisite tech ids — a tech cannot be researched until
// every prerequisite is unlocked.
//
// design (optional): only on techs that are physical/architectural features
// of the chip — they change the CPU Lab controls when unlocked. Simulation
// and design-software techs deliberately have no `design` field; they only
// tighten estimates (simAccuracyBonus) and speed up programs (timeBonus).
//   { type: "slider", target, max }        widens a slider's range
//   { type: "node", value, label }         adds a process-node option
//   { type: "checkbox", key, label }        adds an on-chip feature toggle (state.chip[key])
const techTree = [
  // Roots — foundational tooling (10-20 engineers × ~1 year)
  { id: "cloud_modeling", name: "Cloud Simulation Model", category: "common", requires: [], baseDuration: 180, timeBonus: 0.15, desc: "Basic cloud simulation tools for initial estimates" },
  { id: "legacy_silicon", name: "Legacy Silicon Library", category: "common", requires: [], baseDuration: 120, timeBonus: 0.08, desc: "Reference designs from previous generations" },

  // Second tier — serious engineering programs (20-50 engineers × ~2 years)
  { id: "thermal_analysis", name: "Thermal Analysis Suite", category: "advanced", requires: ["cloud_modeling"], baseDuration: 600, timeBonus: 0.12, desc: "Improved thermal simulation reduces heat overruns" },
  { id: "power_grid", name: "Power Grid Optimization", category: "advanced", requires: ["legacy_silicon"], baseDuration: 480, timeBonus: 0.1, desc: "Optimized power delivery improves reliability", design: [{ type: "checkbox", key: "optimizedPower", label: "Optimized power delivery" }] },
  { id: "statistical_timing", name: "Statistical Timing Analysis", category: "advanced", requires: ["legacy_silicon"], baseDuration: 720, timeBonus: 0.18, desc: "Better timing analysis reduces voltage headroom issues" },
  { id: "high_fidelity_sim", name: "High-Fidelity Simulator", category: "simulation", requires: ["cloud_modeling"], baseDuration: 840, timeBonus: 0.25, desc: "More accurate pre-design simulation" },
  { id: "fpga_prototyping", name: "FPGA Prototyping Platform", category: "hardware", requires: ["legacy_silicon"], baseDuration: 900, timeBonus: 0.3, desc: "Hardware-assisted design verification" },

  // Third tier — multi-year programs building on earlier work (40-60 engineers × ~3 years)
  { id: "monte_carlo_analysis", name: "Monte Carlo Analysis", category: "simulation", requires: ["high_fidelity_sim"], baseDuration: 1080, timeBonus: 0.22, desc: "Statistical variation analysis improves yield predictions" },
  { id: "multi_corner_analysis", name: "Multi-Corner Analysis", category: "simulation", requires: ["monte_carlo_analysis", "statistical_timing"], baseDuration: 960, timeBonus: 0.18, desc: "Process variation analysis across operating conditions" },
  { id: "formal_verification", name: "Formal Verification", category: "simulation", requires: ["statistical_timing", "high_fidelity_sim"], baseDuration: 1800, timeBonus: 0.28, desc: "Mathematically proves design correctness, avoiding late respins" },
  { id: "ml_prediction", name: "ML Performance Predictor", category: "experimental", requires: ["high_fidelity_sim", "monte_carlo_analysis"], baseDuration: 2400, timeBonus: 0.35, desc: "Machine learning model for highly accurate predictions" },
  { id: "emulation_cluster", name: "Emulation Cluster", category: "hardware", requires: ["fpga_prototyping"], baseDuration: 2700, timeBonus: 0.4, desc: "Full-chip emulation significantly reduces iterations" },
  { id: "finfet_model", name: "FinFET Modeling", category: "advanced", requires: ["statistical_timing", "thermal_analysis"], baseDuration: 3600, timeBonus: 0.2, desc: "Advanced transistor modeling for better predictions" },

  // Frontier — flagship programs (100-250 engineers × ~4 years)
  { id: "chiplet_architecture", name: "Chiplet Architecture", category: "hardware", requires: ["finfet_model", "emulation_cluster"], baseDuration: 7200, timeBonus: 0.35, desc: "Modular multi-die designs reuse proven silicon blocks — pack far more cores", design: [{ type: "slider", target: "cores", max: 192 }] },
  { id: "3d_cache", name: "3D Cache Integration", category: "hardware", requires: ["chiplet_architecture"], baseDuration: 9600, timeBonus: 0.4, desc: "Vertically stacked cache dies multiply on-chip memory", design: [{ type: "slider", target: "cache", max: 256 }, { type: "checkbox", key: "cache3d", label: "3D stacked cache" }] },
  { id: "optical_interconnect", name: "Optical Interconnect Design", category: "experimental", requires: ["finfet_model"], baseDuration: 12000, timeBonus: 0.25, desc: "Reduces power consumption and heat generation", design: [{ type: "checkbox", key: "optical", label: "Optical interconnect" }] },

  // Moonshots — decade-scale research bets (hundreds of engineers × 5-10+ years)
  { id: "gaa_modeling", name: "Gate-All-Around Modeling", category: "experimental", requires: ["finfet_model", "formal_verification"], baseDuration: 24000, timeBonus: 0.45, desc: "Next-generation transistor structure beyond FinFET — unlocks the 2 nm node", design: [{ type: "node", value: 2, label: "2 nm" }] },
  { id: "quantum_sim", name: "Quantum-Inspired Simulation", category: "experimental", requires: ["ml_prediction"], baseDuration: 30000, timeBonus: 0.5, desc: "Cutting-edge simulation reduces design risk dramatically" }
];

function techById(id) {
  return techTree.find(t => t.id === id);
}

function prereqsMet(tech, completed = state.unlockedTechs) {
  return tech.requires.every(id => completed.includes(id));
}

function techTier(tech) {
  if (!tech.requires.length) return 0;
  return 1 + Math.max(...tech.requires.map(id => techTier(techById(id))));
}

function techValue(tech) {
  // Roughly a third of the payroll it would cost to research the tech
  // in-house ($18k per researcher-month), so licensing/acquiring is a
  // real shortcut but never free.
  return tech.baseDuration * 6000;
}

function rivalAskPrice(rival) {
  let value = 160000 + rival.researchers * 60000;
  for (const techId of rival.completed) {
    const tech = techTree.find(t => t.id === techId);
    if (tech) value += techValue(tech);
  }
  for (const techId in rival.progress) {
    if (rival.completed.includes(techId)) continue;
    const tech = techTree.find(t => t.id === techId);
    if (tech) value += Math.round(techValue(tech) * Math.min(0.8, rival.progress[techId] / tech.baseDuration));
  }
  return Math.round(value);
}

function pickNextRivalTech(rival) {
  const candidates = techTree.filter(t => !rival.completed.includes(t.id) && prereqsMet(t, rival.completed));
  rival.current = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)].id : null;
}

function advanceRivals() {
  for (const rival of state.rivals) {
    if (!rival.current || rival.completed.includes(rival.current)) pickNextRivalTech(rival);
    if (!rival.current) continue;
    const tech = techTree.find(t => t.id === rival.current);
    if (!tech) { pickNextRivalTech(rival); continue; }
    rival.progress[rival.current] = (rival.progress[rival.current] || 0) + rival.speed;
    if (rival.progress[rival.current] >= tech.baseDuration) {
      rival.completed.push(rival.current);
      log(`${rival.name} completed ${tech.name}. Their asking price just went up.`);
      pickNextRivalTech(rival);
    }
  }
}

const rivalNamePool = ["Northcell Systems", "Bluewire Semiconductor", "Aster Compute", "Kestrel EDA", "Praxis Silicon", "Meridian Logic"];

function spawnRival() {
  const name = rivalNamePool[Math.floor(Math.random() * rivalNamePool.length)];
  const roots = techTree.filter(t => !t.requires.length);
  const completed = [roots[Math.floor(Math.random() * roots.length)].id];
  if (Math.random() < 0.5) {
    const second = techTree.filter(t => !completed.includes(t.id) && prereqsMet(t, completed));
    if (second.length) completed.push(second[Math.floor(Math.random() * second.length)].id);
  }
  const available = techTree.filter(t => !completed.includes(t.id) && prereqsMet(t, completed));
  const startTech = available[Math.floor(Math.random() * available.length)];
  const teamSize = 8 + Math.floor(Math.random() * 20);
  state.rivals.push({
    id: `rival_${Date.now()}`,
    name,
    researchers: teamSize,
    speed: teamSize,
    completed,
    progress: { [startTech.id]: Math.floor(Math.random() * startTech.baseDuration * 0.4) },
    current: startTech.id
  });
  log(`${name} just opened a research lab in the region.`);
}

function acquireRival(rivalId) {
  const index = state.rivals.findIndex(r => r.id === rivalId);
  if (index < 0) return;
  const rival = state.rivals[index];
  const price = rivalAskPrice(rival);
  if (state.cash < price) return log(`Acquiring ${rival.name} needs ${money.format(price)}.`);
  state.cash -= price;
  const gained = [];
  for (const techId of rival.completed) {
    if (!state.unlockedTechs.includes(techId)) {
      state.unlockedTechs.push(techId);
      const tech = techTree.find(t => t.id === techId);
      if (tech) gained.push(tech.name);
    }
  }
  for (const techId in rival.progress) {
    if (state.unlockedTechs.includes(techId)) continue;
    state.techProgress[techId] = Math.max(state.techProgress[techId] || 0, rival.progress[techId]);
  }
  state.staff.researchers += rival.researchers;
  state.rivals.splice(index, 1);
  log(`Acquired ${rival.name} for ${money.format(price)}: gained ${gained.length ? gained.join(", ") : "their in-progress research"} and ${rival.researchers} researcher${rival.researchers > 1 ? "s" : ""}.`);
  if (state.rivals.length < 3 && Math.random() < 0.6) spawnRival();
  renderResearchTree();
  updateUI();
}

function processLicensing() {
  for (const techId in state.licensing) {
    const lic = state.licensing[techId];
    if (!lic.enabled || !state.unlockedTechs.includes(techId)) continue;
    const tech = techTree.find(t => t.id === techId);
    if (!tech) continue;
    const fairValue = techValue(tech);
    const ratio = clamp(fairValue / Math.max(1, lic.price), 0.1, 2.5);
    for (const rival of state.rivals) {
      if (rival.completed.includes(techId)) continue;
      if (Math.random() < Math.min(0.4, 0.16 * ratio)) {
        state.cash += lic.price;
        state.licenseIncome += lic.price;
        rival.completed.push(techId);
        log(`${rival.name} licensed ${tech.name} for ${money.format(lic.price)}.`);
      }
    }
    if (Math.random() < Math.min(0.2, 0.08 * ratio)) {
      state.cash += lic.price;
      state.licenseIncome += lic.price;
      log(`An OEM licensed ${tech.name} for ${money.format(lic.price)}.`);
    }
  }
}

let gameScene;

let MapScene;

let initializationComplete = false;

function createMapScene() {
  if (typeof Phaser === "undefined") return null;

  return class extends Phaser.Scene {
    constructor() {
      super("map");
    }

    create() {
      this.graphics = this.add.graphics();
      this.labels = [];
      this.input.on("pointerdown", pointer => selectSiteAt(pointer.x, pointer.y));
      this.scale.on("resize", size => {
        this.cameras.main.setViewport(0, 0, size.width, size.height);
        this.redraw();
      });
      gameScene = this;
      this.redraw();
    }

    redraw() {
      if (!this.graphics) return;
      const w = this.scale.width;
      const h = this.scale.height;
      this.graphics.clear();
      this.labels.forEach(label => label.destroy());
      this.labels = [];
      this.drawBackground(w, h);
      this.drawRoutes(w, h);
      sites.forEach(site => this.drawSite(site, w, h));
      this.labels.push(this.add.text(18, h - 26, "Click a parcel, choose a facility, then run the month.", {
        fontFamily: "system-ui",
        fontSize: "13px",
        fontStyle: "600",
        color: "#f0f3f1"
      }).setAlpha(0.86));
    }

    drawBackground(w, h) {
      const g = this.graphics;
      g.fillGradientStyle(0x1f372d, 0x263136, 0x263136, 0x3b3424, 1);
      g.fillRect(0, 0, w, h);

      g.lineStyle(18, 0x78b1c4, 0.26);
      g.beginPath();
      drawCubicLine(
        g,
        w * 0.05, h * 0.42,
        w * 0.28, h * 0.28,
        w * 0.45, h * 0.52,
        w * 0.66, h * 0.42
      );
      drawCubicLine(
        g,
        w * 0.66, h * 0.42,
        w * 0.78, h * 0.36,
        w * 0.92, h * 0.46,
        w, h * 0.38
      );
      g.strokePath();

      g.lineStyle(1, 0xffffff, 0.06);
      for (let x = 0; x < w; x += 52) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x + w * 0.12, h);
        g.strokePath();
      }
    }

    drawRoutes(w, h) {
      const g = this.graphics;
      g.lineStyle(4, 0xdbc37a, 0.58);
      g.beginPath();
      g.moveTo(w * 0.08, h * 0.78);
      g.lineTo(w * 0.28, h * 0.62);
      g.lineTo(w * 0.55, h * 0.62);
      g.lineTo(w * 0.86, h * 0.72);
      g.strokePath();

      g.lineStyle(3, 0xe6e6e6, 0.28);
      g.beginPath();
      g.moveTo(w * 0.12, h * 0.2);
      g.lineTo(w * 0.42, h * 0.31);
      g.lineTo(w * 0.7, h * 0.26);
      g.lineTo(w * 0.9, h * 0.16);
      g.strokePath();
    }

    drawSite(site, w, h) {
      const g = this.graphics;
      const x = site.x * w;
      const y = site.y * h;
      const selected = state.selected === site.id;
      const r = selected ? 34 : 29;

      g.fillStyle(selected ? 0x54a7d7 : 0x000000, selected ? 0.22 : 0.22);
      g.lineStyle(selected ? 3 : 1.5, selected ? 0x8ed2f4 : 0xffffff, selected ? 1 : 0.35);
      g.fillRoundedRect(x - r, y - r, r * 2, r * 2, 8);
      g.strokeRoundedRect(x - r, y - r, r * 2, r * 2, 8);

      if (site.built) {
        g.fillStyle(0x95c979, 1);
        g.fillRect(x - 14, y - 10, 28, 22);
        g.fillStyle(0x344047, 1);
        for (let i = 0; i < site.built.level; i += 1) {
          g.fillRect(x - 10 + i * 7, y - 5, 4, 12);
        }
      } else {
        g.fillStyle(0xc8ad68, 1);
        g.beginPath();
        g.moveTo(x, y - 12);
        g.lineTo(x + 14, y + 8);
        g.lineTo(x - 14, y + 8);
        g.closePath();
        g.fillPath();
      }

      const title = this.add.text(x, y + 48, site.name, {
        fontFamily: "system-ui",
        fontSize: "12px",
        fontStyle: "700",
        color: "#f0f3f1"
      }).setOrigin(0.5, 0);
      const sub = this.add.text(x, y + 63, site.built ? `${site.built.name} L${site.built.level}` : money.format(site.land), {
        fontFamily: "system-ui",
        fontSize: "11px",
        color: "#d7ddd9"
      }).setOrigin(0.5, 0).setAlpha(0.78);
      this.labels.push(title, sub);
    }
  };
}

function drawCubicLine(g, x0, y0, x1, y1, x2, y2, x3, y3, steps = 24) {
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const inv = 1 - t;
    const x = inv ** 3 * x0 + 3 * inv ** 2 * t * x1 + 3 * inv * t ** 2 * x2 + t ** 3 * x3;
    const y = inv ** 3 * y0 + 3 * inv ** 2 * t * y1 + 3 * inv * t ** 2 * y2 + t ** 3 * y3;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
}

function bootGame() {
  MapScene = createMapScene();
  if (!MapScene) {
    bootCanvasFallback();
    log("Phaser CDN unavailable, running the built-in canvas fallback.");
    initializationComplete = true;
    return;
  }

  const wrap = document.querySelector("#canvas-wrap");
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game-stage",
    backgroundColor: "#151a1d",
    width: wrap.clientWidth,
    height: wrap.clientHeight,
    scene: MapScene,
    scale: {
      mode: Phaser.Scale.RESIZE,
      parent: "game-stage",
      width: "100%",
      height: "100%"
    }
  });
  initializationComplete = true;
}

function bootCanvasFallback() {
  const stage = document.querySelector("#game-stage");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  stage.appendChild(canvas);

  const resize = () => {
    const rect = stage.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  };

  const roundedRect = (x, y, width, height, radius) => {
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, width, height, radius);
      return;
    }
    const r = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  };

  const draw = () => {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);
    const grd = ctx.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, "#1f372d");
    grd.addColorStop(0.5, "#263136");
    grd.addColorStop(1, "#3b3424");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(120, 177, 196, 0.26)";
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(w * 0.05, h * 0.42);
    ctx.bezierCurveTo(w * 0.28, h * 0.28, w * 0.45, h * 0.52, w * 0.66, h * 0.42);
    ctx.bezierCurveTo(w * 0.78, h * 0.36, w * 0.92, h * 0.46, w, h * 0.38);
    ctx.stroke();

    ctx.strokeStyle = "rgba(219, 195, 122, 0.58)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(w * 0.08, h * 0.78);
    ctx.lineTo(w * 0.28, h * 0.62);
    ctx.lineTo(w * 0.55, h * 0.62);
    ctx.lineTo(w * 0.86, h * 0.72);
    ctx.stroke();

    for (const site of sites) {
      const x = site.x * w;
      const y = site.y * h;
      const selected = state.selected === site.id;
      const r = selected ? 34 : 29;
      ctx.fillStyle = selected ? "rgba(84,167,215,0.22)" : "rgba(0,0,0,0.22)";
      ctx.strokeStyle = selected ? "#8ed2f4" : "rgba(255,255,255,0.35)";
      ctx.lineWidth = selected ? 3 : 1.5;
      ctx.beginPath();
      roundedRect(x - r, y - r, r * 2, r * 2, 8);
      ctx.fill();
      ctx.stroke();

      if (site.built) {
        ctx.fillStyle = "#95c979";
        ctx.fillRect(x - 14, y - 10, 28, 22);
        ctx.fillStyle = "#344047";
        for (let i = 0; i < site.built.level; i += 1) ctx.fillRect(x - 10 + i * 7, y - 5, 4, 12);
      } else {
        ctx.fillStyle = "#c8ad68";
        ctx.beginPath();
        ctx.moveTo(x, y - 12);
        ctx.lineTo(x + 14, y + 8);
        ctx.lineTo(x - 14, y + 8);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = "#f0f3f1";
      ctx.font = "700 12px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(site.name, x, y + 48);
      ctx.font = "11px system-ui";
      ctx.fillStyle = "rgba(240,243,241,0.74)";
      ctx.fillText(site.built ? `${site.built.name} L${site.built.level}` : money.format(site.land), x, y + 63);
    }

    ctx.textAlign = "start";
    ctx.fillStyle = "rgba(240,243,241,0.82)";
    ctx.font = "600 13px system-ui";
    ctx.fillText("Click a parcel, choose a facility, then run the month.", 18, h - 18);
  };

  canvas.addEventListener("click", event => {
    const rect = canvas.getBoundingClientRect();
    let chosen = null;
    let best = Infinity;
    for (const site of sites) {
      const dist = Math.hypot(event.clientX - rect.left - site.x * rect.width, event.clientY - rect.top - site.y * rect.height);
      if (dist < 48 && dist < best) {
        chosen = site;
        best = dist;
      }
    }
    state.selected = chosen ? chosen.id : null;
    updateUI();
    draw();
  });

  window.addEventListener("resize", resize);
  gameScene = { redraw: draw };
  resize();
}

function computeChip() {
  const { clock, voltage, cache, cores, memory, node, ai, ecc, optimizedPower, cache3d, optical } = state.chip;
  const nodeScale = { 14: 0.72, 7: 1, 5: 1.18, 3: 1.34, 2: 1.5 }[node];
  const leakageScale = { 14: 0.7, 7: 1, 5: 1.28, 3: 1.68, 2: 2.05 }[node];
  // 3D stacking gives the design far more effective cache for its die area.
  const cacheEff = cache * (cache3d ? 1.5 : 1);
  const complexity = cores / 16 + cache / 48 + memory / 8 + (ai ? 1.4 : 0) + (ecc ? 0.35 : 0);
  const activityCap = cores * (1 + cacheEff / 220 + memory / 32 + (ai ? 0.42 : 0));
  const dynamicPower = activityCap * Math.pow(voltage / 0.9, 2) * (clock / 3.2) * 0.105;
  const leakagePower = complexity * leakageScale * Math.pow(voltage / 0.9, 1.35) * 0.36;
  const perf = cores * clock * (1 + cacheEff / 180) * (1 + memory / 80) * (ai ? 1.55 : 1) * nodeScale * 0.62;
  // Stacked dies trap heat; optical interconnects cut interconnect power.
  const heat = (dynamicPower + leakagePower) * (cache3d ? 1.14 : 1) * (optical ? 0.82 : 1);
  const voltageMargin = voltage < 0.82 + clock * 0.018 ? -9 : voltage > 1.08 ? -4 : 2;
  const reliability = Math.max(35, Math.min(99, 90 + voltageMargin - Math.max(0, clock - 3.4) * 7 + (ecc ? 8 : -7) - (ai ? 2 : 0) - (node <= 5 ? 3 : 0) + (optimizedPower ? 6 : 0)));
  // Mature nodes are dramatically cheaper to tape out on than leading-edge ones.
  const nodeNre = { 14: 30000, 7: 140000, 5: 320000, 3: 700000, 2: 1200000 }[node];
  const cost = Math.round((90000 + complexity * 65000 + nodeNre) * (ai ? 1.28 : 1) * (ecc ? 1.08 : 1) * (cache3d ? 1.2 : 1) * (optical ? 1.15 : 1));
  let baseMonths = Math.max(10, Math.ceil((2 + complexity * 1.2 + (14 / node) * 1.6 + (ai ? 1.5 : 0)) * 5));

  // Apply tech time reductions based on researcher assignments and progress
  const bonuses = getResearchBonuses();
  state.chip.months = Math.max(1, Math.ceil(baseMonths * (1 - bonuses.timeReduction)));
  state.chip.perf = perf;
  state.chip.heat = heat;
  state.chip.reliability = reliability;
  state.chip.cost = cost;
  state.chip.monthlyCost = Math.round(cost / state.chip.months);
}

function getTotalResearchProgress() {
  // Calculate time reduction from unlocked techs that have timeBonus
  let totalTimeReduction = 0;
  for (const techId of state.unlockedTechs) {
    const tech = techTree.find(t => t.id === techId);
    if (tech && tech.timeBonus > 0) {
      totalTimeReduction += tech.timeBonus;
    }
  }

  // Calculate simulation accuracy bonus from unlocked simulation techs
  const simTechs = ["high_fidelity_sim", "monte_carlo_analysis", "multi_corner_analysis"];
  let simAccuracyBonus = 0;
  for (const techId of simTechs) {
    if (state.unlockedTechs.includes(techId)) {
      if (techId === "high_fidelity_sim") simAccuracyBonus += 0.12;
      else if (techId === "monte_carlo_analysis") simAccuracyBonus += 0.1;
      else if (techId === "multi_corner_analysis") simAccuracyBonus += 0.08;
    }
  }

  return { simAccuracyBonus, timeReduction: totalTimeReduction };
}

// Going market rate for on-demand compute; rises over time and with sales reach.
function wholesaleMarketPrice() {
  return 950 + state.month * 25 + state.staff.sales * 40;
}

// How appealing the listed price is: 1 at half the market rate or below,
// 0 at 1.5x the market rate or above.
function wholesaleAppeal() {
  const market = wholesaleMarketPrice();
  return clamp((market * 1.5 - state.wholesale.price) / market, 0, 1);
}

// Any unclaimed PFLOPS (capacity minus contracted use) sell without a
// contract at the player's listed price, billed monthly like a subscription.
// Subscribers join and churn gradually toward price-driven demand, so an
// overpriced listing leaves flops unsold.
function tickWholesale() {
  const unclaimed = Math.max(0, Math.round(totals().capacity - totals().used));
  const target = Math.round(unclaimed * wholesaleAppeal() * (0.92 + Math.random() * 0.16));
  const previous = state.wholesale.sold;
  const sold = clamp(Math.round(previous + (target - previous) * 0.4), 0, unclaimed);
  state.wholesale.sold = sold;
  state.wholesale.revenue = sold * state.wholesale.price;
  state.cash += state.wholesale.revenue;
  if (sold > previous) log(`${sold - previous} PFLOPS of new on-demand subscriptions at ${money.format(state.wholesale.price)}/PFLOP/mo (${sold} total).`);
  else if (sold < previous) log(`${previous - sold} PFLOPS of on-demand subscriptions churned (${sold} remain).`);
}

function activeChipSpecs() {
  return {
    clock: state.chip.clock,
    voltage: state.chip.voltage,
    cache: state.chip.cache,
    cores: state.chip.cores,
    memory: state.chip.memory,
    node: state.chip.node,
    ai: state.chip.ai,
    ecc: state.chip.ecc,
    optimizedPower: state.chip.optimizedPower,
    cache3d: state.chip.cache3d,
    optical: state.chip.optical,
    perf: state.chip.perf,
    heat: state.chip.heat,
    reliability: state.chip.reliability
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function designExperienceLevel() {
  const xp = state.designExperience;
  if (xp >= 12) return "Elite";
  if (xp >= 8) return "Veteran";
  if (xp >= 5) return "Seasoned";
  if (xp >= 2) return "Junior";
  return "Novice";
}

// Fraction of the outcome spread removed by know-how: every completed chip
// program adds 3% (cap 30%) and simulation techs add their accuracy bonus,
// so estimates tighten with both experience and research.
function designEstimateAccuracy() {
  const experienceControl = Math.min(0.3, state.designExperience * 0.03);
  return Math.min(0.6, experienceControl + getResearchBonuses().simAccuracyBonus);
}

function designOutcomeProfile(specs = activeChipSpecs(), threshold = 0, contract = null) {
  const engineers = state.staff.researchers;
  const nodeRisk = { 14: 0.02, 7: 0.04, 5: 0.065, 3: 0.095, 2: 0.13 }[specs.node] || 0.05;
  const requiredVoltage = 0.69 + specs.clock * 0.06 + nodeRisk * 0.8 + (specs.ai ? 0.025 : 0);
  const voltageHeadroom = specs.voltage - requiredVoltage;
  const timingRisk = voltageHeadroom < 0
    ? Math.min(0.26, Math.abs(voltageHeadroom) * 0.9)
    : Math.max(0, 0.075 - voltageHeadroom * 0.32);
  const thermalRisk = Math.max(0, specs.voltage - 1.08) * 0.2 + Math.max(0, specs.clock - 4.6) * 0.035;
  const cacheFit = contract ? clamp((specs.cache - 24) / 104, 0, 1) : clamp((specs.cache - 16) / 96, 0, 1);
  const memoryFit = contract ? clamp((specs.memory - 4) / 12, 0, 1) : clamp((specs.memory - 4) / 10, 0, 1);
  const workloadFit = contract
    ? (cacheFit * contract.cacheNeed + memoryFit * contract.memoryNeed + (specs.ai ? contract.aiNeed : 1 - contract.aiNeed * 0.6)) / (contract.cacheNeed + contract.memoryNeed + 1)
    : (cacheFit + memoryFit + (specs.ai ? 0.8 : 0.5)) / 3;
  const largeDieRisk = Math.max(0, specs.cores - 48) * 0.0013 + Math.max(0, specs.cache - 64) * 0.0007 + Math.max(0, specs.memory - 10) * 0.008;
  const engineerControl = Math.min(0.17, engineers * 0.024);
  const eccControl = specs.ecc ? 0.025 : -0.025;
  const fitControl = (workloadFit - 0.5) * 0.12;
  const accuracy = designEstimateAccuracy();
  const downside = clamp(0.2 + timingRisk + thermalRisk + nodeRisk + largeDieRisk - engineerControl - eccControl - fitControl, 0.07, 0.52) * (1 - accuracy);
  const upside = clamp(0.12 + Math.max(0, voltageHeadroom) * 0.08 + engineerControl * 0.72 + fitControl * 0.9 - largeDieRisk * 0.35, 0.06, 0.38) * (1 - accuracy);
  const effectivePerf = specs.perf * (contract ? 0.88 + workloadFit * 0.24 : 1);
  const low = effectivePerf * (1 - downside);
  const high = effectivePerf * (1 + upside);
  const rawOdds = high === low ? (effectivePerf >= threshold ? 1 : 0) : (high - threshold) / (high - low);
  const techRequestBonus = contract && contract.requestedTech && state.unlockedTechs.includes(contract.requestedTech) ? 0.06 : 0;
  const odds = clamp(rawOdds + engineerControl * 0.35 + fitControl * 0.45 + techRequestBonus - Math.max(0, -voltageHeadroom) * 0.3, 0.03, 0.97);
  return { low, high, odds, effectivePerf, workloadFit, voltageHeadroom };
}
function getResearchBonuses() {
  // Calculate simulation accuracy bonus from unlocked simulation techs
  const simulationTechs = ["high_fidelity_sim", "monte_carlo_analysis", "multi_corner_analysis", "formal_verification"];
  let simAccuracyBonus = 0;
  for (const techId of simulationTechs) {
    if (state.unlockedTechs.includes(techId)) {
      if (techId === "high_fidelity_sim") simAccuracyBonus += 0.12;
      else if (techId === "monte_carlo_analysis") simAccuracyBonus += 0.1;
      else if (techId === "multi_corner_analysis") simAccuracyBonus += 0.08;
      else if (techId === "formal_verification") simAccuracyBonus += 0.1;
    }
  }

  // Calculate time reduction from unlocked techs that have timeBonus.
  // Capped so a fully researched tree still leaves chip programs multi-year.
  let totalTimeReduction = 0;
  for (const techId of state.unlockedTechs) {
    const tech = techTree.find(t => t.id === techId);
    if (tech && tech.timeBonus > 0) totalTimeReduction += tech.timeBonus;
  }

  return { simAccuracyBonus, timeReduction: Math.min(0.7, totalTimeReduction) };
}

function totalAssignedResearchers() {
  let total = 0;
  for (const techId in state.researchAssignments) {
    if (!state.unlockedTechs.includes(techId)) total += state.researchAssignments[techId] || 0;
  }
  return total;
}

function computeResearchProgress() {
  // Each assigned researcher contributes one researcher-month of work per month.
  // Progress accumulates against the tech's baseDuration and is never lost.
  for (const techId in state.researchAssignments) {
    const count = state.researchAssignments[techId];
    if (count <= 0 || state.unlockedTechs.includes(techId)) continue;
    const tech = techTree.find(t => t.id === techId);
    if (!tech) continue;
    const progress = (state.techProgress[techId] || 0) + count;
    state.techProgress[techId] = progress;
    if (progress >= tech.baseDuration) {
      state.unlockedTechs.push(techId);
      state.researchAssignments[techId] = 0;
      state.licensing[techId] = state.licensing[techId] || { enabled: false, price: techValue(tech) };
      log(`Research complete: ${tech.name}. Researchers on the project are now idle.`);
    }
  }
  processResearchQueue();
}

function rollDesignedPerformance(specs, contract = null) {
  const profile = designOutcomeProfile(specs, 0, contract);
  const engineers = state.staff.researchers;
  const bonuses = getResearchBonuses();
  // Tech tree simulation accuracy boost from unlocked technologies
  const skillBias = Math.min(0.24, engineers * 0.02) + (profile.workloadFit - 0.5) * 0.08 + Math.max(0, profile.voltageHeadroom) * 0.03 + bonuses.simAccuracyBonus;
  const sample = (Math.random() + Math.random() + Math.random()) / 3;
  const shifted = clamp(sample + skillBias - 0.04, 0, 1);
  return profile.low + shifted * (profile.high - profile.low);
}

function siteCapacity(site) {
  if (!site.built) return 0;
  const opsBoost = 1 + state.staff.ops * 0.035;
  const researchBoost = 1 + state.staff.researchers * 0.025;
  const chipBoost = Math.max(0.75, state.activeChip.perf / 42);
  return site.built.baseCapacity * site.built.level * opsBoost * researchBoost * chipBoost;
}

function sitePower(site) {
  if (!site.built) return 0;
  return site.built.power * site.built.level + state.activeChip.heat * site.built.level * 0.9;
}

function totals() {
  const capacity = sites.reduce((sum, site) => sum + siteCapacity(site), 0);
  const power = sites.reduce((sum, site) => sum + sitePower(site), 0);
  const used = state.activeContracts.reduce((sum, contract) => sum + contract.cap, 0);
  const revenue = state.activeContracts.reduce((sum, contract) => sum + contract.pay, 0);
  const payroll = state.staff.researchers * 18000 + state.staff.ops * 14000 + state.staff.community * 12000 + state.staff.sales * 15000;
  const chipRd = state.chipProject ? state.chipProject.monthlyCost : 0;
  const goodwill = Math.round(Math.max(0, Math.min(100, averageGoodwill())));
  return { capacity, power, used, revenue, payroll, chipRd, goodwill };
}

function averageGoodwill() {
  let pressure = 0;
  let builtCount = 0;
  for (const site of sites) {
    if (!site.built) continue;
    builtCount += 1;
    const localPowerStress = Math.max(0, sitePower(site) - site.grid * 0.72);
    const localConcern = (100 - site.community) * 0.14 + localPowerStress * 0.9;
    pressure += localConcern;
  }
  const contractEffect = state.activeContracts.reduce((sum, c) => sum + c.goodwill, 0);
  return 100 - pressure - builtCount * 1.5 + state.staff.community * 7 + contractEffect;
}

function log(message) {
  state.logs.unshift({ month: state.month, message });
  state.logs = state.logs.slice(0, 6);
  renderLog();
}

function formatMw(value) {
  return `${value.toFixed(value < 10 ? 1 : 0)} MW`;
}

function redrawMap() {
  if (gameScene) gameScene.redraw();
}

function selectSiteAt(x, y) {
  const w = gameScene.scale.width;
  const h = gameScene.scale.height;
  let chosen = null;
  let best = Infinity;
  for (const site of sites) {
    const dx = x - site.x * w;
    const dy = y - site.y * h;
    const dist = Math.hypot(dx, dy);
    if (dist < 48 && dist < best) {
      chosen = site;
      best = dist;
    }
  }
  state.selected = chosen ? chosen.id : null;
  updateUI();
  redrawMap();
}

function getSelectedSite() {
  return sites.find(site => site.id === state.selected);
}

function build(typeKey) {
  const site = getSelectedSite();
  if (!site) return log("Select a parcel before building.");
  if (site.built) return log(`${site.name} already has a facility.`);
  const type = buildTypes[typeKey];
  const totalCost = type.cost + site.land;
  if (state.cash < totalCost) return log(`Need ${money.format(totalCost)} to build at ${site.name}.`);
  state.cash -= totalCost;
  site.built = { ...type, level: 1 };
  log(`Opened ${type.name} at ${site.name}.`);
  updateUI();
  redrawMap();
}

function upgradeSite() {
  const site = getSelectedSite();
  if (!site || !site.built) return log("Select a built data center to upgrade.");
  const cost = Math.round(site.built.cost * 0.58 * site.built.level);
  if (site.built.level >= 4) return log(`${site.name} is already at max buildout.`);
  if (state.cash < cost) return log(`Upgrade needs ${money.format(cost)}.`);
  state.cash -= cost;
  site.built.level += 1;
  log(`${site.name} upgraded to level ${site.built.level}.`);
  updateUI();
  redrawMap();
}

function prototypeChip() {
  computeChip();
  if (state.chipProject) return log("A chip program is already in development.");
  const upfront = Math.round(state.chip.cost * 0.22);
  if (state.cash < upfront) return log(`Starting development needs ${money.format(upfront)} up front.`);
  state.cash -= upfront;
  state.chipProject = {
    name: `Gen ${Number(state.activeChip.name.replace("Gen ", "")) + 1}`,
    monthsTotal: state.chip.months,
    monthsLeft: state.chip.months,
    monthlyCost: Math.max(12000, Math.round((state.chip.cost - upfront) / state.chip.months)),
    spent: upfront,
    type: "internal",
    specs: activeChipSpecs()
  };
  log(`${state.chipProject.name} development started: ${state.chip.months} months, ${money.format(state.chip.cost)} NRE.`);
  updateUI();
}

const SIGNING_COSTS = { researchers: 24000, ops: 18000, community: 16000, sales: 20000 };
const STAFF_LABELS = {
  researchers: "chip researcher",
  ops: "ops manager",
  community: "community liaison",
  sales: "contract sales lead"
};

function hireQty() {
  const slider = document.querySelector("#hire-qty");
  return slider ? Math.max(1, Math.floor(Number(slider.value) || 1)) : 1;
}

function renderHireCosts() {
  const qty = hireQty();
  const label = document.querySelector("#hire-qty-label");
  if (label) label.textContent = qty;
  document.querySelectorAll(".hire-cost").forEach(span => {
    const total = SIGNING_COSTS[span.dataset.role] * qty;
    span.textContent = qty > 1 ? `${money.format(total)} (×${qty})` : money.format(total);
  });
}

function hire(role, count = 1) {
  const qty = Math.max(1, Math.floor(count));
  const label = STAFF_LABELS[role];
  const total = SIGNING_COSTS[role] * qty;
  const plural = qty > 1 ? "s" : "";
  if (state.cash < total) return log(`Hiring ${qty} ${label}${plural} needs ${money.format(total)}.`);
  state.cash -= total;
  state.staff[role] += qty;
  log(`Hired ${qty} ${label}${plural} for ${money.format(total)}.`);
  refreshContracts();
  updateUI();
}

function selectBestContract(availableCapacity) {
  let best = null;
  let bestValue = -Infinity;

  contractDeck.forEach((contract, index) => {
    if (contract.cap > availableCapacity) return; // Skip contracts we can't fit

    const revenuePerPflop = contract.pay / contract.cap;

    let value;
    switch (state.contractRule) {
      case "revenue_per_pflop":
        value = revenuePerPflop;
        break;
      case "max_revenue":
        value = contract.pay;
        break;
      case "most_profitable":
        // Monthly profit: pay * months - overhead考虑
        value = contract.pay * contract.months;
        break;
      default:
        value = revenuePerPflop; // Default to revenue per PFLOP
    }

    if (value > bestValue) {
      bestValue = value;
      best = { index, ...contract };
    }
  });

  return best;
}

function setContractRule(rule) {
  const validRules = ["revenue_per_pflop", "max_revenue"];
  if (!validRules.includes(rule)) return log(`Invalid contract rule: ${rule}`);
  state.contractRule = rule;

  const labels = {
    "revenue_per_pflop": "Revenue per PFLOP (lower cost = better)",
    "max_revenue": "Max Total Revenue"
  };

  document.querySelector("#contract-rule-label").textContent = `Rule: ${labels[rule]}`;
  log(`Contract selection rule changed to: ${rule.replace(/_/g, " ")}`);
  renderContracts();
}

function assignResearchersToTech(techId) {
  const tech = techTree.find(t => t.id === techId);
  if (!tech) return;

  if (state.unlockedTechs.includes(techId)) {
    return log(`${tech.name} is already researched.`);
  }

  if (!prereqsMet(tech)) {
    const missing = tech.requires.filter(id => !state.unlockedTechs.includes(id)).map(id => techById(id).name).join(", ");
    return log(`${tech.name} requires ${missing} first. Queue it to start automatically when ready.`);
  }

  const idle = state.staff.researchers - totalAssignedResearchers();
  if (idle <= 0) {
    return log("All researchers are assigned. Pull one off another project or hire more.");
  }

  const newCount = (state.researchAssignments[techId] || 0) + 1;
  state.researchAssignments[techId] = newCount;

  const remaining = tech.baseDuration - (state.techProgress[techId] || 0);
  log(`Assigned a researcher to ${tech.name} (${newCount} on project, ~${Math.ceil(remaining / newCount)} mo remaining).`);
  renderResearchTree();
}

function unassignResearcherFromTech(techId) {
  const tech = techTree.find(t => t.id === techId);
  const assigned = state.researchAssignments[techId] || 0;
  if (!tech || assigned <= 0) return;
  state.researchAssignments[techId] = assigned - 1;
  log(`Pulled a researcher off ${tech.name}. Progress is retained.`);
  renderResearchTree();
}

// Every unresearched prerequisite of techId, deepest-first so each tech comes
// before the ones that depend on it. Skips already-unlocked prereqs.
function collectPrereqChain(techId, acc = []) {
  const tech = techById(techId);
  if (!tech) return acc;
  for (const reqId of tech.requires) {
    if (state.unlockedTechs.includes(reqId) || acc.includes(reqId)) continue;
    collectPrereqChain(reqId, acc);
    if (!acc.includes(reqId)) acc.push(reqId);
  }
  return acc;
}

function toggleQueueTech(techId) {
  const tech = techById(techId);
  if (!tech || state.unlockedTechs.includes(techId)) return;
  const position = state.researchQueue.indexOf(techId);
  if (position >= 0) {
    state.researchQueue.splice(position, 1);
    log(`${tech.name} removed from the research queue.`);
  } else {
    // Queue the tech plus every prerequisite it still needs, prereqs first,
    // skipping ones already unlocked, queued, or actively being researched.
    const chain = [...collectPrereqChain(techId), techId];
    const added = chain.filter(id =>
      !state.unlockedTechs.includes(id) &&
      !state.researchQueue.includes(id) &&
      !(state.researchAssignments[id] > 0)
    );
    state.researchQueue.push(...added);
    const prereqCount = added.length - (added.includes(techId) ? 1 : 0);
    if (prereqCount > 0) {
      log(`${tech.name} queued with ${prereqCount} prerequisite tech${prereqCount > 1 ? "s" : ""}. Idle researchers work through them in order.`);
    } else {
      log(`${tech.name} queued (#${state.researchQueue.length}). Idle researchers start it once prerequisites are done.`);
    }
  }
  renderResearchTree();
}

function processResearchQueue() {
  state.researchQueue = state.researchQueue.filter(id => !state.unlockedTechs.includes(id));
  let idle = state.staff.researchers - totalAssignedResearchers();
  for (const techId of [...state.researchQueue]) {
    if (idle <= 0) break;
    const tech = techById(techId);
    if (!tech || !prereqsMet(tech)) continue;
    state.researchAssignments[techId] = (state.researchAssignments[techId] || 0) + idle;
    state.researchQueue = state.researchQueue.filter(id => id !== techId);
    log(`Queued research started: ${tech.name} with ${idle} researcher${idle > 1 ? "s" : ""}.`);
    idle = 0;
  }
}

function acceptContract(index) {
  const contract = contractDeck[index];
  const { capacity, used } = totals();
  if (used + contract.cap > capacity) return log("Not enough compute capacity for that contract.");
  state.activeContracts.push({ ...contract });
  contractDeck.splice(index, 1);
  log(`Signed ${contract.name}.`);
  refreshContracts();
  updateUI();
}

function autoAcceptBestContract() {
  // Don't auto-select during initial startup (before map is ready)
  if (!initializationComplete) return;

  const { capacity, used } = totals();
  let available = Math.max(0, capacity - used);
  let acceptedCount = 0;
  let best;

  while ((best = selectBestContract(available))) {
    state.activeContracts.push({ ...best });
    contractDeck.splice(best.index, 1);
    acceptedCount++;
    log(`Auto-accepted ${best.name} (${best.cap} PFLOPS) - rule: ${state.contractRule === "revenue_per_pflop" ? "lower cost per PFLOP" : "highest total revenue"}.`);
    available = Math.max(0, capacity - used);
  }

  if (acceptedCount > 0) {
    log(`Auto-selected ${acceptedCount} contract${acceptedCount > 1 ? 's' : ''}.`);
    refreshContracts();
    updateUI();
  } else {
    log("No contracts fit your available compute capacity.");
  }
}

function refreshContracts() {
  while (contractDeck.length < 4) {
    const ageScale = 0.75 + Math.min(1.9, state.month * 0.035);
    const salesScale = 1 + state.staff.sales * 0.045;
    const cap = Math.round((16 + Math.random() * (42 + state.month * 4.5)) * ageScale * salesScale);
    const pay = Math.round(cap * (880 + Math.random() * 470) * (1 + state.staff.sales * 0.025));
    const names = ["Edge AI Inference", "Retail Forecasting", "Genomics Batch", "Regional CDN", "Bank Risk Models", "Factory Vision"];
    contractDeck.push({
      name: names[Math.floor(Math.random() * names.length)],
      cap,
      pay,
      months: 6 + Math.floor(Math.random() * 10),
      goodwill: Math.round(Math.random() * 4 - 2)
    });
  }
  renderContracts();
}

function checkAutoSelect() {
  // Don't auto-select during initial startup
  if (!initializationComplete) return;

  const autoSelectToggle = document.querySelector("#auto-select-contract-toggle");
  if (autoSelectToggle && autoSelectToggle.checked) {
    setTimeout(() => autoAcceptBestContract(), 50);
  }
}

function generateSiliconOffer() {
  if (state.siliconOffers.length >= 3) return;
  if (Math.random() > 0.3 + state.staff.sales * 0.06) return;
  const [company, application] = siliconCompanyPool[Math.floor(Math.random() * siliconCompanyPool.length)];
  if (state.siliconOffers.some(o => o.company === company) || state.activeSilicon.some(c => c.company === company)) return;
  // Every customer cares about exactly one application benchmark — the
  // chip only has to score well on that workload, nothing else.
  const requirement = {
    type: "benchmark",
    benchmark: benchmarkNames[Math.floor(Math.random() * benchmarkNames.length)],
    minScore: 40 + Math.round(Math.random() * 45)
  };
  const deadline = 55 + Math.round(Math.random() * 45);
  const difficulty = requirement.minScore / 60;
  const pay = Math.round((420000 + Math.random() * 280000) * (0.8 + difficulty * 0.8) * (1 + state.staff.sales * 0.03));
  const offer = {
    id: `sil_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    company,
    application,
    requirement,
    pay,
    penalty: Math.round(pay * 0.22),
    goodwill: Math.round(Math.random() * 3 - 1),
    cacheNeed: 0.25 + Math.random() * 0.7,
    memoryNeed: 0.25 + Math.random() * 0.7,
    aiNeed: Math.random(),
    requestedTech: Math.random() < 0.4 ? techTree[Math.floor(Math.random() * techTree.length)].id : null,
    deadline,
    expiresIn: 3 + Math.floor(Math.random() * 3)
  };
  state.siliconOffers.push(offer);
  log(`${company} approached you for custom silicon (${application}): ${requirementLabel(requirement)}, ${money.format(pay)} on delivery, ${deadline}-month window.`);
}

function tickSiliconMarket() {
  for (const offer of [...state.siliconOffers]) {
    offer.expiresIn -= 1;
    if (offer.expiresIn <= 0) {
      state.siliconOffers = state.siliconOffers.filter(o => o !== offer);
      log(`${offer.company} withdrew their custom silicon request.`);
    }
  }
  for (const contract of [...state.activeSilicon]) {
    contract.monthsLeft -= 1;
    if (contract.monthsLeft <= 0) {
      state.activeSilicon = state.activeSilicon.filter(c => c !== contract);
      state.cash -= contract.penalty;
      if (state.chipProject && state.chipProject.contractId === contract.id) state.chipProject = null;
      log(`${contract.company} deadline missed — contract cancelled. Penalty: ${money.format(contract.penalty)}.`);
    }
  }
  generateSiliconOffer();
}

function acceptSiliconOffer(offerId) {
  const index = state.siliconOffers.findIndex(o => o.id === offerId);
  if (index < 0) return;
  const offer = state.siliconOffers.splice(index, 1)[0];
  state.activeSilicon.push({ ...offer, monthsLeft: offer.deadline, attempts: 0, lastResult: null });
  log(`Signed with ${offer.company}: deliver ${requirementLabel(offer.requirement)} within ${offer.deadline} months.`);
  updateUI();
}

function declineSiliconOffer(offerId) {
  const index = state.siliconOffers.findIndex(o => o.id === offerId);
  if (index < 0) return;
  const offer = state.siliconOffers.splice(index, 1)[0];
  log(`Declined ${offer.company}'s request.`);
  updateUI();
}

function startSiliconIteration(contractId) {
  const contract = state.activeSilicon.find(c => c.id === contractId);
  if (!contract) return;
  if (state.chipProject) return log("R&D is busy with another chip program.");
  computeChip();
  const upfront = Math.round(state.chip.cost * 0.18);
  if (state.cash < upfront) return log(`Starting this iteration needs ${money.format(upfront)} up front.`);
  if (state.chip.months > contract.monthsLeft) {
    log(`Warning: this design needs ${state.chip.months} months but only ${contract.monthsLeft} remain on the ${contract.company} deal.`);
  }
  state.cash -= upfront;
  contract.attempts += 1;
  state.chipProject = {
    name: `${contract.company} custom`,
    monthsTotal: state.chip.months,
    monthsLeft: state.chip.months,
    monthlyCost: Math.max(10000, Math.round((state.chip.cost - upfront) / state.chip.months)),
    spent: upfront,
    type: "iteration",
    contractId: contract.id,
    specs: activeChipSpecs()
  };
  log(`Design iteration #${contract.attempts} started for ${contract.company}: ${state.chip.months} months, ${money.format(state.chip.cost)} NRE.`);
  updateUI();
}

function evaluateAgainstRequirement(chipLike, contract, isNewDesign) {
  const requirement = contract.requirement;
  if (requirement.type === "benchmark") {
    const base = benchmarkScores(chipLike).find(b => b.name === requirement.benchmark).score;
    const rolled = Math.round(base * (0.92 + Math.random() * 0.16));
    return {
      success: rolled >= requirement.minScore,
      resultText: `${requirement.benchmark} scored ${rolled} (needs ${requirement.minScore})`
    };
  }
  const perf = isNewDesign
    ? rollDesignedPerformance(chipLike, contract)
    : chipLike.perf * (0.94 + Math.random() * 0.12);
  return {
    success: perf >= requirement.minPerf,
    resultText: `${perf.toFixed(0)} PFLOPS/node (needs ${requirement.minPerf})`,
    perf
  };
}

function takeLoan(amount, payment) {
  state.cash += amount;
  state.debt += amount;
  state.loanPayments += payment;
  log(`Loan funded: ${money.format(amount)}.`);
  updateUI();
}

function payLoan() {
  const amount = Math.min(100000, state.cash, state.debt);
  if (amount <= 0) return log("No available cash or debt to pay down.");
  state.cash -= amount;
  state.debt -= amount;
  state.loanPayments = state.debt === 0 ? 0 : Math.max(0, state.loanPayments - Math.round(amount * 0.035));
  log(`Paid ${money.format(amount)} toward loans.`);
  updateUI();
}

function nextMonth() {
  const t = totals();
  const operatingPowerCost = Math.round(t.power * 5600);
  const expenses = operatingPowerCost + t.payroll + state.loanPayments + t.chipRd;
  state.cash += t.revenue - expenses;
  state.month += 1;

  if (state.chipProject) {
    state.chipProject.spent += state.chipProject.monthlyCost;
    state.chipProject.monthsLeft -= 1;
    if (state.chipProject.monthsLeft <= 0) {
      const specs = state.chipProject.specs;
      const finalPerf = rollDesignedPerformance(specs, state.chipProject.contract);
      if (state.chipProject.type === "iteration") {
        const contract = state.activeSilicon.find(c => c.id === state.chipProject.contractId);
        if (!contract) {
          log(`${state.chipProject.name} finished, but the customer program had already ended.`);
        } else {
          const result = evaluateAgainstRequirement(specs, contract, true);
          const hasRequestedTech = contract.requestedTech && state.unlockedTechs.includes(contract.requestedTech);
          if (result.success) {
            const payout = hasRequestedTech ? Math.round(contract.pay * 1.15) : contract.pay;
            state.cash += payout;
            state.activeSilicon = state.activeSilicon.filter(c => c !== contract);
            state.chipCatalog.push({
              name: `${contract.company} ASIC`,
              perf: result.perf || specs.perf,
              heat: specs.heat,
              reliability: Math.min(99, specs.reliability + state.staff.researchers),
              clock: specs.clock,
              cores: specs.cores,
              cache: specs.cache,
              memory: specs.memory,
              node: specs.node,
              ai: specs.ai,
              ecc: specs.ecc,
              optimizedPower: specs.optimizedPower,
              cache3d: specs.cache3d,
              optical: specs.optical
            });
            log(`${contract.company} accepted the design — ${result.resultText}. Paid ${money.format(payout)}${hasRequestedTech ? " (includes licensed-tech premium)" : ""}.`);
          } else {
            contract.lastResult = result.resultText;
            log(`Iteration for ${contract.company} missed spec: ${result.resultText}. ${contract.monthsLeft} months left to iterate.`);
          }
        }
      } else {
        state.activeChip = {
          name: state.chipProject.name,
          perf: finalPerf,
          heat: specs.heat,
          reliability: Math.min(99, specs.reliability + state.staff.researchers)
        };
        state.chipCatalog.push({
          name: state.activeChip.name,
          perf: finalPerf,
          heat: specs.heat,
          reliability: state.activeChip.reliability,
          clock: specs.clock,
          cores: specs.cores,
          cache: specs.cache,
          memory: specs.memory,
          node: specs.node,
          ai: specs.ai,
          ecc: specs.ecc,
          optimizedPower: specs.optimizedPower,
          cache3d: specs.cache3d,
          optical: specs.optical
        });
        log(`${state.activeChip.name} taped out at ${finalPerf.toFixed(0)} PFLOPS/node and entered production.`);
      }
      const previousLevel = designExperienceLevel();
      state.designExperience += 1;
      if (designExperienceLevel() !== previousLevel) {
        log(`Design team promoted to ${designExperienceLevel()} — performance estimates just got tighter.`);
      }
      state.chipProject = null;
    }
  }

  for (const contract of state.activeContracts) contract.months -= 1;
  const completed = state.activeContracts.filter(contract => contract.months <= 0);
  state.activeContracts = state.activeContracts.filter(contract => contract.months > 0);
  for (const contract of completed) {
    state.cash += Math.round(contract.pay * 0.35);
    log(`${contract.name} completed with a success bonus.`);
  }

  const goodwill = totals().goodwill;
  if (goodwill < 25) {
    const fine = Math.round((25 - goodwill) * 6500);
    state.cash -= fine;
    log(`Regulators fined the company ${money.format(fine)} for grid and community impact.`);
  }
  if (goodwill < 10 && Math.random() < 0.28) {
    const built = sites.filter(site => site.built);
    if (built.length) {
      const site = built[Math.floor(Math.random() * built.length)];
      site.built.level = Math.max(1, site.built.level - 1);
      log(`${site.name} was forced to curtail operations after a hearing.`);
    }
  }
  if (state.cash < -250000) {
    log("Bankruptcy warning: raise capital or sign higher-margin contracts.");
  }
  // On-demand subscribers rent whatever contracts left unclaimed this month
  tickWholesale();
  recordFinancials(t.revenue + state.wholesale.revenue, expenses, operatingPowerCost);
  refreshContracts();
  tickSiliconMarket();

  // Research progress for assigned researchers
  computeResearchProgress();

  // Rival labs advance their own programs, then buyers shop your licensed tech
  advanceRivals();
  processLicensing();

  updateUI();
  redrawMap();

  // Auto-select best contracts if toggle is on (after month ends)
  checkAutoSelect();
}

function recordFinancials(revenue, expenses, powerCost) {
  state.financials.push({
    month: state.month,
    cash: state.cash,
    revenue,
    expenses,
    powerCost,
    debt: state.debt,
    net: revenue - expenses
  });
  state.financials = state.financials.slice(-18);
}

function renderContracts() {
  const list = document.querySelector("#contract-list");
  const { capacity, used } = totals();
  const available = Math.max(0, capacity - used);
  const best = selectBestContract(available);

  list.innerHTML = "";
  contractDeck.forEach((contract, index) => {
    const canAccept = contract.cap <= available;
    const isBest = best && best.index === index;
    const item = document.createElement("article");
    item.className = `contract ${canAccept ? "can-accept" : "blocked"}${isBest ? " best-contract" : ""}`;
    item.innerHTML = `
      <h3>${contract.name}${isBest ? ' <span class="best-badge">Best match</span>' : ''}</h3>
      <p>${contract.cap} PFLOPS for ${contract.months} months<br>${money.format(contract.pay)}/mo, goodwill ${contract.goodwill >= 0 ? "+" : ""}${contract.goodwill}<br><small>Value: ${(state.contractRule === "revenue_per_pflop" ? (contract.pay / contract.cap).toFixed(2) : state.contractRule === "max_revenue" ? money.format(contract.pay) : money.format(contract.pay * contract.months))}</small></p>
      <button data-contract="${index}" class="${canAccept ? "accept-ready" : "accept-blocked"}">${canAccept ? "Accept" : "Need compute"}</button>
    `;
    list.appendChild(item);
  });
}

// Application benchmark scores (0-100) derived from chip specs: clock-heavy
// designs shine in gaming, core/memory-heavy ones in VMs, and so on.
// Each benchmark is dominated by one or two stats and the blend runs through
// a steep response curve, so design choices swing scores hard both ways —
// a middle-of-the-road chip scores poorly everywhere, a specialised one
// tops its target workload.
function benchmarkScores(chip) {
  const nodeScale = { 14: 0.72, 7: 1, 5: 1.18, 3: 1.34, 2: 1.5 }[chip.node] || 1;
  const cacheVal = chip.cache * (chip.cache3d ? 1.5 : 1);
  const n = {
    clock: (chip.clock - 1.6) / 4.4,
    cache: (cacheVal - 8) / 120,
    cores: (chip.cores - 4) / 92,
    memory: (chip.memory - 2) / 14,
    ai: chip.ai ? 1 : 0,
    ecc: chip.ecc ? 1 : 0,
    node: (nodeScale - 0.72) / 0.62
  };
  const pct = value => Math.round(clamp(0.5 + (clamp(value, 0, 1) - 0.5) * 2, 0.02, 1) * 100);
  return [
    { name: "Gaming", score: pct(n.clock * 0.62 + n.cache * 0.2 + n.node * 0.13 + n.ai * 0.05) },
    { name: "Virtual machines", score: pct(n.cores * 0.6 + n.memory * 0.25 + n.ecc * 0.15) },
    { name: "AI inference", score: pct(n.ai * 0.5 + n.memory * 0.22 + n.cache * 0.16 + n.node * 0.12) },
    { name: "Databases", score: pct(n.memory * 0.45 + n.cache * 0.3 + n.ecc * 0.25) },
    { name: "Scientific HPC", score: pct(n.cores * 0.45 + n.clock * 0.3 + n.memory * 0.25) },
    { name: "Video rendering", score: pct(n.cores * 0.5 + n.cache * 0.28 + n.clock * 0.22) }
  ];
}

// targets: optional { benchmarkName: neededScore } — draws a threshold marker
// on those rows and turns them green once the design clears the bar, so you
// can watch a customer's one benchmark cross its target as you tune sliders.
function benchmarkRowsHtml(chip, targets = null) {
  return benchmarkScores(chip).map(bench => {
    const need = targets ? targets[bench.name] : undefined;
    const targeted = need != null;
    const met = targeted && bench.score >= need;
    const rowClass = `bench-row${targeted ? " target" : ""}${met ? " met" : ""}`;
    const marker = targeted ? `<span class="bench-target" style="left:${Math.min(100, need)}%"></span>` : "";
    const needLabel = targeted ? ` <em>needs ${need}${met ? " ✓" : ""}</em>` : "";
    return `
    <div class="${rowClass}"><span>${bench.name}${needLabel}</span><div class="bench-track">${marker}<div class="bench-fill" style="width:${bench.score}%"></div></div><strong>${bench.score}</strong></div>
  `;
  }).join("");
}

// Benchmarks any current customer (active program or open offer) cares about,
// keyed to the highest score demanded across them.
function designBenchmarkTargets() {
  const targets = {};
  const consider = deal => {
    const req = deal.requirement;
    if (req && req.type === "benchmark") targets[req.benchmark] = Math.max(targets[req.benchmark] || 0, req.minScore);
  };
  state.activeSilicon.forEach(consider);
  state.siliconOffers.forEach(consider);
  return targets;
}

function chipContractScore(chip, contract) {
  const margin = chip.perf / contract.requirement.minPerf;
  const odds = clamp(0.65 + (margin - 1) * 4, 0.03, 0.96);
  const cacheFit = clamp((chip.cache - 16) / 96, 0, 1);
  const memoryFit = clamp((chip.memory - 4) / 12, 0, 1);
  const aiFit = chip.ai ? contract.aiNeed : 1 - contract.aiNeed * 0.6;
  const workloadFit = (cacheFit * contract.cacheNeed + memoryFit * contract.memoryNeed + aiFit) / (contract.cacheNeed + contract.memoryNeed + 1);
  return { score: odds * (0.7 + workloadFit * 0.6), odds, workloadFit };
}

function bestChipIndexForContract(contract) {
  let best = 0;
  let bestScore = -Infinity;
  state.chipCatalog.forEach((chip, index) => {
    let score;
    if (contract.requirement.type === "benchmark") {
      score = benchmarkScores(chip).find(b => b.name === contract.requirement.benchmark).score / contract.requirement.minScore;
    } else {
      score = chipContractScore(chip, contract).score;
    }
    if (score > bestScore) {
      bestScore = score;
      best = index;
    }
  });
  return best;
}

function chipMeetsRequirement(chip, requirement) {
  if (requirement.type === "benchmark") {
    return benchmarkScores(chip).find(b => b.name === requirement.benchmark).score >= requirement.minScore;
  }
  return chip.perf >= requirement.minPerf;
}

function deliverExistingChip(contractId, chipIndex) {
  const contract = state.activeSilicon.find(c => c.id === contractId);
  const chip = state.chipCatalog[chipIndex];
  if (!contract || !chip) return;
  const adaptationCost = Math.round(contract.pay * 0.12);
  if (state.cash < adaptationCost) return log(`Adapting ${chip.name} for ${contract.company} needs ${money.format(adaptationCost)}.`);
  state.cash -= adaptationCost;
  contract.attempts += 1;
  const hasRequestedTech = contract.requestedTech && state.unlockedTechs.includes(contract.requestedTech);
  const result = evaluateAgainstRequirement(chip, contract, false);
  if (result.success) {
    const payout = hasRequestedTech ? Math.round(contract.pay * 1.15) : contract.pay;
    state.cash += payout;
    state.activeSilicon = state.activeSilicon.filter(c => c !== contract);
    log(`${contract.company} accepted ${chip.name} — ${result.resultText}. Paid ${money.format(payout)}${hasRequestedTech ? " with licensed-tech premium" : ""}.`);
  } else {
    contract.lastResult = result.resultText;
    log(`${chip.name} failed qualification for ${contract.company}: ${result.resultText}. ${contract.monthsLeft} months left to iterate.`);
  }
  updateUI();
}

// Readiness of the current CPU Lab design against a contract's requirement.
function designReadiness(contract) {
  const requirement = contract.requirement;
  if (requirement.type === "benchmark") {
    const score = benchmarkScores(state.chip).find(b => b.name === requirement.benchmark).score;
    return `Current lab design: ${requirement.benchmark} ~${score} (needs ${requirement.minScore})`;
  }
  const profile = designOutcomeProfile(activeChipSpecs(), requirement.minPerf, contract);
  return `Current lab design: expected ${profile.low.toFixed(0)}-${profile.high.toFixed(0)} PFLOPS (needs ${requirement.minPerf}), ${Math.round(profile.odds * 100)}% odds`;
}

function requestedTechLine(contract) {
  const requestedTech = contract.requestedTech ? techById(contract.requestedTech) : null;
  if (!requestedTech) return "";
  const owned = state.unlockedTechs.includes(requestedTech.id);
  return `<br>Requests ${requestedTech.name}: ${owned ? '<span class="req-owned">owned — +15% payout</span>' : '<span class="req-missing">not researched</span>'}`;
}

function renderSiliconMarket() {
  const offerList = document.querySelector("#silicon-offer-list");
  const activeList = document.querySelector("#silicon-active-list");
  if (!offerList || !activeList) return;
  computeChip();

  offerList.innerHTML = "";
  if (!state.siliconOffers.length) {
    offerList.innerHTML = `<p class="tech-subtitle">No incoming requests right now — companies approach you as months pass. Sales staff attract more.</p>`;
  }
  state.siliconOffers.forEach(offer => {
    const item = document.createElement("article");
    item.className = "contract can-accept";
    item.innerHTML = `
      <h3>${offer.company}</h3>
      <p>${offer.application}${requestedTechLine(offer)}<br>Wants: ${requirementLabel(offer.requirement)}<br>${money.format(offer.pay)} on delivery, ${money.format(offer.penalty)} penalty if the ${offer.deadline}-month deadline slips<br><small>${designReadiness(offer)} • Offer expires in ${offer.expiresIn} mo</small></p>
      <div class="deliver-row">
        <button data-accept-offer="${offer.id}" class="accept-ready">Accept</button>
        <button data-decline-offer="${offer.id}">Decline</button>
      </div>
    `;
    offerList.appendChild(item);
  });

  activeList.innerHTML = "";
  if (!state.activeSilicon.length) {
    activeList.innerHTML = `<p class="tech-subtitle">No active programs. Accept a request above, then iterate on designs until it passes.</p>`;
  }
  state.activeSilicon.forEach(contract => {
    const iterating = state.chipProject && state.chipProject.contractId === contract.id;
    const rdBusy = state.chipProject && !iterating;
    const bestIndex = bestChipIndexForContract(contract);
    if (contract.selectedChip == null) contract.selectedChip = bestIndex;
    const chipOptions = state.chipCatalog.map((chip, chipIndex) =>
      `<option value="${chipIndex}" ${chipIndex === contract.selectedChip ? "selected" : ""}>${chip.name}${chipMeetsRequirement(chip, contract.requirement) ? " ✓" : ""}${chipIndex === bestIndex ? " ★ best match" : ""}</option>`
    ).join("");
    const statusLine = iterating
      ? `Iteration #${contract.attempts} in progress: ${state.chipProject.monthsLeft}/${state.chipProject.monthsTotal} months left`
      : contract.lastResult
        ? `Last attempt: ${contract.lastResult}`
        : "No design attempt yet";
    const urgent = contract.monthsLeft <= 12;
    const item = document.createElement("article");
    item.className = `contract ${urgent ? "blocked" : "can-accept"}`;
    item.innerHTML = `
      <h3>${contract.company}</h3>
      <p>${contract.application}${requestedTechLine(contract)}<br>Target: ${requirementLabel(contract.requirement)} • ${money.format(contract.pay)} on delivery<br><strong>${contract.monthsLeft} months to deadline</strong> (${money.format(contract.penalty)} penalty)<br>${statusLine}<br><small>${designReadiness(contract)}</small></p>
      <button data-start-iteration="${contract.id}" class="${iterating || rdBusy ? "accept-blocked" : "accept-ready"} wide" ${iterating || rdBusy ? "disabled" : ""}>${iterating ? "Iterating…" : rdBusy ? "R&D busy" : `Start design iteration (uses CPU Lab design, ~${state.chip.months} mo)`}</button>
      <div class="deliver-row">
        <select data-deliver-select="${contract.id}" aria-label="Existing chip design">${chipOptions}</select>
        <button data-deliver="${contract.id}">Deliver existing (${money.format(Math.round(contract.pay * 0.12))})</button>
      </div>
    `;
    activeList.appendChild(item);
  });
}

function renderLog() {
  const logEl = document.querySelector("#event-log");
  logEl.innerHTML = state.logs.map(entry => `
    <div class="log-entry"><span>Month ${entry.month}</span><div>${entry.message}</div></div>
  `).join("");
}

function renderFinanceChart() {
  const canvas = document.querySelector("#finance-chart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width = rect.width;
  const height = rect.height;
  const history = state.financials.length ? state.financials : [{ month: state.month, cash: state.cash, revenue: 0, expenses: 0, net: 0 }];
  const maxValue = Math.max(...history.flatMap(row => [Math.abs(row.cash), row.revenue, row.expenses, Math.abs(row.net)]), 1);
  const pad = 34;
  const plotW = width - pad * 1.5;
  const plotH = height - pad * 1.7;
  const xFor = index => pad + (history.length === 1 ? 0 : index * (plotW / (history.length - 1)));
  const yFor = value => pad + plotH / 2 - (value / maxValue) * (plotH / 2);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#151a1d";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, pad + plotH / 2);
  ctx.lineTo(width - pad / 2, pad + plotH / 2);
  ctx.stroke();

  const drawLine = (key, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    history.forEach((row, index) => {
      const x = xFor(index);
      const y = yFor(row[key]);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  };

  drawLine("cash", "#62c76b");
  drawLine("revenue", "#54a7d7");
  drawLine("expenses", "#e0bc51");
  drawLine("net", "#e35e5e");

  ctx.fillStyle = "#d7ddd9";
  ctx.font = "12px system-ui";
  ctx.fillText("Cash", pad, height - 12);
  ctx.fillStyle = "#54a7d7";
  ctx.fillText("Revenue", pad + 58, height - 12);
  ctx.fillStyle = "#e0bc51";
  ctx.fillText("Expenses", pad + 134, height - 12);
  ctx.fillStyle = "#e35e5e";
  ctx.fillText("Net", pad + 224, height - 12);

  const latest = history[history.length - 1];
  const burn = Math.max(0, latest.expenses - latest.revenue);
  document.querySelector("#monthly-burn").textContent = `${money.format(burn)}/mo`;
  document.querySelector("#net-income").textContent = `${money.format(latest.net)}/mo`;
  document.querySelector("#runway").textContent = burn <= 0 ? "Profitable" : `${Math.max(0, Math.floor(state.cash / burn))} mo`;
  document.querySelector("#valuation").textContent = money.format(Math.max(0, latest.revenue * 24 + totals().capacity * 1800 - state.debt));
}

function renderResearchTree() {
  const container = document.querySelector("#research-tree");
  if (!container) return;

  const bonuses = getResearchBonuses();
  const idle = state.staff.researchers - totalAssignedResearchers();

  const tiers = [];
  techTree.forEach(tech => {
    const tier = techTier(tech);
    (tiers[tier] = tiers[tier] || []).push(tech);
  });

  container.innerHTML = "";
  const tierNames = ["Foundations", "Programs", "Advanced programs", "Frontier", "Moonshots"];

  tiers.forEach((techs, tierIndex) => {
    const column = document.createElement("div");
    column.className = "tech-tier";
    column.innerHTML = `<div class="tier-label">${tierNames[tierIndex] || `Tier ${tierIndex + 1}`}</div>`;

    techs.forEach(tech => {
      const isUnlocked = state.unlockedTechs.includes(tech.id);
      const available = prereqsMet(tech);
      const assigned = state.researchAssignments[tech.id] || 0;
      const progress = isUnlocked ? tech.baseDuration : Math.min(state.techProgress[tech.id] || 0, tech.baseDuration);
      const percent = Math.round((progress / tech.baseDuration) * 100);
      const queuePosition = state.researchQueue.indexOf(tech.id);
      const lic = state.licensing[tech.id];

      let statusText;
      if (isUnlocked) statusText = lic && lic.enabled ? "Complete • licensed" : "Complete";
      else if (assigned > 0) statusText = `${assigned} assigned • ${progress}/${tech.baseDuration}`;
      else if (queuePosition >= 0) statusText = `Queued #${queuePosition + 1}`;
      else if (!available) statusText = "Locked";
      else statusText = progress > 0 ? `Paused • ${progress}/${tech.baseDuration}` : "Available";

      const node = document.createElement("div");
      node.className = `tech-node${isUnlocked ? " unlocked" : ""}${!available && !isUnlocked ? " locked" : ""}${queuePosition >= 0 ? " queued" : ""}${state.selectedTech === tech.id ? " selected" : ""}`;
      node.dataset.techSelect = tech.id;
      const queueButton = isUnlocked
        ? ""
        : `<button class="node-queue" data-queue="${tech.id}" title="${queuePosition >= 0 ? "Remove from research queue" : "Add to research queue"}">${queuePosition >= 0 ? `Queued #${queuePosition + 1} ✕` : "+ Queue"}</button>`;
      node.innerHTML = `
        <div class="node-name">${tech.name}</div>
        <div class="mini-progress"><div class="mini-fill" style="width:${percent}%"></div></div>
        <div class="node-meta">${statusText}</div>
        ${queueButton}
      `;
      column.appendChild(node);
    });

    container.appendChild(column);
  });

  document.querySelector("#idle-researchers").textContent = idle;
  document.querySelector("#tech-count").textContent = state.unlockedTechs.length;
  document.querySelector("#rd-efficiency").textContent = `${Math.round(bonuses.timeReduction * 100)}% faster`;
  document.querySelector("#license-income").textContent = money.format(state.licenseIncome);
  document.querySelector("#queue-count").textContent = state.researchQueue.length;
  renderTechDetail();
  renderRivals();
  const modal = document.querySelector("#research-modal");
  if (modal && !modal.classList.contains("hidden")) drawTreeLines();
}

function renderTechDetail() {
  const box = document.querySelector("#tech-detail");
  if (!box) return;
  const tech = state.selectedTech ? techById(state.selectedTech) : null;
  if (!tech) {
    box.innerHTML = `<p class="detail-hint">Click a technology in the tree to see its dependencies, staffing, and licensing.</p>`;
    return;
  }

  const isUnlocked = state.unlockedTechs.includes(tech.id);
  const available = prereqsMet(tech);
  const assigned = state.researchAssignments[tech.id] || 0;
  const idle = state.staff.researchers - totalAssignedResearchers();
  const progress = isUnlocked ? tech.baseDuration : Math.min(state.techProgress[tech.id] || 0, tech.baseDuration);
  const percent = Math.round((progress / tech.baseDuration) * 100);
  const remaining = tech.baseDuration - progress;
  const queuePosition = state.researchQueue.indexOf(tech.id);

  const requiresLine = tech.requires.length
    ? tech.requires.map(id => {
        const req = techById(id);
        return `<span class="${state.unlockedTechs.includes(id) ? "req-owned" : "req-missing"}">${req.name}</span>`;
      }).join(", ")
    : "None — foundational tech";
  const dependents = techTree.filter(t => t.requires.includes(tech.id)).map(t => t.name).join(", ") || "Nothing further";

  let statusLine;
  if (isUnlocked) statusLine = "Research complete";
  else if (assigned > 0) statusLine = `${assigned} researcher${assigned > 1 ? "s" : ""} assigned • ~${Math.ceil(remaining / assigned)} months left`;
  else if (progress > 0) statusLine = "Paused — progress kept";
  else if (!available) statusLine = "Locked — finish prerequisites or queue it";
  else statusLine = "Not started";

  let controls = "";
  if (isUnlocked) {
    const lic = state.licensing[tech.id] || (state.licensing[tech.id] = { enabled: false, price: techValue(tech) });
    controls = `
      <div class="license-row">
        <label class="check"><input type="checkbox" data-license-toggle="${tech.id}" ${lic.enabled ? "checked" : ""}> License out</label>
        <input type="number" data-license-price="${tech.id}" value="${lic.price}" min="10000" step="10000" ${lic.enabled ? "" : "disabled"} aria-label="License price">
      </div>`;
  } else {
    if (available) {
      controls = `
        <div class="assign-controls">
          <button data-tech-remove="${tech.id}" ${assigned <= 0 ? "disabled" : ""} aria-label="Remove researcher">−</button>
          <span class="assign-count">${assigned} assigned</span>
          <button data-tech-add="${tech.id}" ${idle <= 0 ? "disabled" : ""} aria-label="Assign researcher">+</button>
        </div>`;
    }
    controls += `<button data-queue="${tech.id}" class="queue-btn">${queuePosition >= 0 ? `Queued #${queuePosition + 1} — remove from queue` : "Add to queue"}</button>`;
  }

  box.innerHTML = `
    <div class="detail-grid">
      <div class="detail-info">
        <div class="tech-header">
          <strong>${tech.name}</strong>
          <span class="category ${tech.category}">${tech.category}</span>
        </div>
        <div class="tech-benefit">${tech.desc}</div>
        <div class="requires-line">Requires: ${requiresLine}</div>
        <div class="requires-line">Unlocks: ${dependents}</div>
      </div>
      <div class="detail-controls">
        <div class="research-info">${statusLine}</div>
        <div class="research-info">${progress}/${tech.baseDuration} researcher-months (${percent}%)</div>
        <div class="progress-track"><div class="progress-fill${isUnlocked ? " done" : ""}" style="width:${percent}%"></div></div>
        ${controls}
      </div>
    </div>
  `;
}

function drawTreeLines() {
  const canvas = document.querySelector(".tree-canvas");
  const svg = document.querySelector("#tree-lines");
  if (!canvas || !svg) return;
  const canvasRect = canvas.getBoundingClientRect();
  if (canvasRect.width === 0) return;
  svg.setAttribute("width", canvas.scrollWidth);
  svg.setAttribute("height", canvas.scrollHeight);
  let paths = "";
  techTree.forEach(tech => {
    const toEl = canvas.querySelector(`[data-tech-select="${tech.id}"]`);
    if (!toEl) return;
    const toRect = toEl.getBoundingClientRect();
    tech.requires.forEach(reqId => {
      const fromEl = canvas.querySelector(`[data-tech-select="${reqId}"]`);
      if (!fromEl) return;
      const fromRect = fromEl.getBoundingClientRect();
      const x1 = fromRect.right - canvasRect.left;
      const y1 = fromRect.top + fromRect.height / 2 - canvasRect.top;
      const x2 = toRect.left - canvasRect.left;
      const y2 = toRect.top + toRect.height / 2 - canvasRect.top;
      const midX = (x1 + x2) / 2;
      const owned = state.unlockedTechs.includes(reqId);
      const highlighted = state.selectedTech === tech.id || state.selectedTech === reqId;
      const stroke = highlighted ? "rgba(84,167,215,0.9)" : owned ? "rgba(98,199,107,0.5)" : "rgba(156,168,162,0.28)";
      paths += `<path d="M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}" fill="none" stroke="${stroke}" stroke-width="${highlighted ? 2 : 1.5}"/>`;
    });
  });
  svg.innerHTML = paths;
}

function openResearchModal() {
  document.querySelector("#research-modal").classList.remove("hidden");
  renderResearchTree();
}

function closeResearchModal() {
  document.querySelector("#research-modal").classList.add("hidden");
}

function renderRivals() {
  const list = document.querySelector("#rival-list");
  if (!list) return;
  list.innerHTML = "";
  if (!state.rivals.length) {
    list.innerHTML = `<p class="tech-subtitle">No rival labs are operating right now.</p>`;
    return;
  }
  state.rivals.forEach(rival => {
    const price = rivalAskPrice(rival);
    const currentTech = techTree.find(t => t.id === rival.current);
    const currentProgress = currentTech ? Math.min(rival.progress[rival.current] || 0, currentTech.baseDuration) : 0;
    const percent = currentTech ? Math.round((currentProgress / currentTech.baseDuration) * 100) : 0;
    const completedNames = rival.completed
      .map(id => { const t = techTree.find(tech => tech.id === id); return t ? t.name : null; })
      .filter(Boolean).join(", ") || "None yet";
    const canAfford = state.cash >= price;
    const item = document.createElement("div");
    item.className = "tech-item rival";
    item.innerHTML = `
      <div class="tech-header">
        <strong>${rival.name}</strong>
        <span class="category">${rival.researchers} researchers</span>
      </div>
      <div class="tech-benefit">Completed: ${completedNames}</div>
      ${currentTech ? `
        <div class="research-info">Working on ${currentTech.name} • ${currentProgress}/${currentTech.baseDuration} researcher-months</div>
        <div class="progress-track"><div class="progress-fill rival-fill" style="width:${percent}%"></div></div>
      ` : `<div class="research-info">No active project</div>`}
      <button data-buy-rival="${rival.id}" class="${canAfford ? "accept-ready" : "accept-blocked"} wide">Acquire for ${money.format(price)}</button>
    `;
    list.appendChild(item);
  });
}

function renderChipCatalog() {
  const list = document.querySelector("#chip-catalog");
  if (!list) return;
  list.innerHTML = "";
  [...state.chipCatalog].reverse().forEach(chip => {
    const item = document.createElement("article");
    item.className = "catalog-chip";
    item.innerHTML = `
      <div class="tech-header"><strong>${chip.name}</strong><span class="category">${chip.node} nm</span></div>
      <div class="chip-specs">${Math.round(chip.perf)} PFLOPS/node • ${chip.heat.toFixed(2)} MW/node • ${Math.round(chip.reliability)}% reliable<br>
      ${chip.cores} cores @ ${chip.clock.toFixed(1)} GHz • ${chip.cache} MB cache • ${chip.memory} mem channels${chip.ai ? " • AI accel" : ""}${chip.ecc ? " • ECC" : ""}</div>
      <div class="benchmarks">${benchmarkRowsHtml(chip)}</div>
    `;
    list.appendChild(item);
  });
}

function renderDesignBenchmarks() {
  const box = document.querySelector("#design-benchmarks");
  if (!box) return;
  box.innerHTML = benchmarkRowsHtml(state.chip, designBenchmarkTargets());
}

// Reflects unlocked physical techs into the CPU Lab controls: widens sliders,
// adds process nodes, and injects on-chip feature checkboxes. Idempotent —
// safe to call on every UI refresh; existing controls are left untouched.
function applyDesignUnlocks() {
  const nodeSelect = document.querySelector("#node");
  const featureBox = document.querySelector("#tech-design-options");
  for (const techId of state.unlockedTechs) {
    const tech = techById(techId);
    if (!tech || !tech.design) continue;
    for (const mod of tech.design) {
      if (mod.type === "slider") {
        const slider = document.querySelector(`#${mod.target}`);
        if (slider && Number(slider.max) < mod.max) slider.max = mod.max;
      } else if (mod.type === "node") {
        if (nodeSelect && !nodeSelect.querySelector(`option[value="${mod.value}"]`)) {
          const opt = document.createElement("option");
          opt.value = mod.value;
          opt.textContent = mod.label;
          nodeSelect.appendChild(opt);
        }
      } else if (mod.type === "checkbox") {
        if (featureBox && !featureBox.querySelector(`[data-chip-flag="${mod.key}"]`)) {
          const label = document.createElement("label");
          label.className = "check";
          label.innerHTML = `<input type="checkbox" data-chip-flag="${mod.key}"${state.chip[mod.key] ? " checked" : ""}> ${mod.label} <span class="tech-tag">${tech.name}</span>`;
          featureBox.appendChild(label);
        }
      }
    }
  }
}

function updateUI() {
  computeChip();
  const t = totals();
  document.querySelector("#cash").textContent = money.format(state.cash);
  document.querySelector("#revenue").textContent = `${money.format(t.revenue + state.wholesale.revenue)}/mo`;
  document.querySelector("#debt").textContent = money.format(state.debt);
  document.querySelector("#power").textContent = formatMw(t.power);
  document.querySelector("#goodwill").textContent = `${t.goodwill}%`;
  document.querySelector("#month").textContent = state.month;
  document.querySelector("#capacity").textContent = `${Math.round(t.capacity)} PFLOPS`;
  document.querySelector("#used-capacity").textContent = `${t.used} PFLOPS`;
  document.querySelector("#available-compute").textContent = `${Math.max(0, Math.round(t.capacity - t.used))} PFLOPS`;
  document.querySelector("#contract-capacity").textContent = `${Math.round(t.capacity)} PFLOPS`;
  const appeal = wholesaleAppeal();
  document.querySelector("#wholesale-price-label").textContent = `${money.format(state.wholesale.price)}`;
  const priceSlider = document.querySelector("#wholesale-price");
  if (document.activeElement !== priceSlider) priceSlider.value = state.wholesale.price;
  document.querySelector("#wholesale-market").textContent = `~${money.format(wholesaleMarketPrice())}`;
  document.querySelector("#wholesale-demand").textContent = appeal > 0.75 ? "Strong" : appeal > 0.45 ? "Moderate" : appeal > 0.15 ? "Weak" : appeal > 0 ? "Minimal" : "None";
  document.querySelector("#wholesale-sold").textContent = `${state.wholesale.sold} PFLOPS`;
  document.querySelector("#wholesale-income").textContent = `${money.format(state.wholesale.revenue)}/mo`;
  document.querySelector("#payroll").textContent = `${money.format(t.payroll)}/mo`;
  document.querySelector("#loan-payments").textContent = `${money.format(state.loanPayments)}/mo`;
  document.querySelector("#chip-rd").textContent = `${money.format(t.chipRd)}/mo`;
  document.querySelector("#risk").textContent = t.goodwill < 20 ? "Shutdown" : t.goodwill < 45 ? "High" : t.goodwill < 70 ? "Medium" : "Low";

  const site = getSelectedSite();
  document.querySelector("#selected-site").textContent = site
    ? `${site.name}: land ${money.format(site.land)}, grid ${site.grid} MW, community tolerance ${site.community}%, water ${site.water}%.`
    : "Select a map parcel.";

  document.querySelector("#clock-label").textContent = `${state.chip.clock.toFixed(1)} GHz`;
  document.querySelector("#voltage-label").textContent = `${state.chip.voltage.toFixed(2)} V`;
  document.querySelector("#cache-label").textContent = `${state.chip.cache} MB`;
  document.querySelector("#cores-label").textContent = state.chip.cores;
  document.querySelector("#memory-label").textContent = state.chip.memory;
  document.querySelector("#node-label").textContent = `${state.chip.node} nm`;
  document.querySelector("#active-chip").textContent = `${state.activeChip.name} (${state.activeChip.perf.toFixed(0)} PFLOPS/node)`;
  document.querySelector("#chip-perf").textContent = `${state.chip.perf.toFixed(1)} PFLOPS/node`;
  const chipProfile = designOutcomeProfile(activeChipSpecs());
  document.querySelector("#chip-range").textContent = `${chipProfile.low.toFixed(0)}-${chipProfile.high.toFixed(0)} PFLOPS/node`;
  const experienceLabel = `${designExperienceLevel()} (${state.designExperience} chip${state.designExperience === 1 ? "" : "s"} • estimates ${Math.round(designEstimateAccuracy() * 100)}% tighter)`;
  document.querySelector("#chip-experience").textContent = experienceLabel;
  document.querySelector("#chip-heat").textContent = `${state.chip.heat.toFixed(2)} MW/node`;
  document.querySelector("#chip-reliability").textContent = `${Math.round(state.chip.reliability)}%`;
  document.querySelector("#chip-cost").textContent = money.format(state.chip.cost);
  document.querySelector("#chip-time").textContent = `${state.chip.months} mo`;
  document.querySelector("#chip-status").textContent = state.chipProject
    ? `${state.chipProject.name}: ${state.chipProject.monthsLeft}/${state.chipProject.monthsTotal} mo left`
    : "Idle";
  document.querySelector("#researchers").textContent = state.staff.researchers;
  document.querySelector("#ops").textContent = state.staff.ops;
  document.querySelector("#community").textContent = state.staff.community;
  document.querySelector("#sales").textContent = state.staff.sales;
  const siliconProfile = chipProfile;
  document.querySelector("#silicon-design-estimate").textContent = `${state.chip.perf.toFixed(0)} PFLOPS/node`;
  document.querySelector("#silicon-outcome-range").textContent = `${siliconProfile.low.toFixed(0)}-${siliconProfile.high.toFixed(0)} PFLOPS/node`;
  document.querySelector("#silicon-engineers").textContent = state.staff.researchers;
  document.querySelector("#silicon-experience").textContent = experienceLabel;
  applyDesignUnlocks();
  renderSiliconMarket();
  renderChipCatalog();
  renderDesignBenchmarks();
  renderResearchTree();
  renderFinanceChart();
}

function bind() {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      if (tab.dataset.tab === "research") {
        openResearchModal();
        return;
      }
      document.querySelectorAll(".tab").forEach(item => item.classList.remove("active"));
      document.querySelectorAll(".panel").forEach(item => item.classList.remove("active"));
      tab.classList.add("active");
      document.querySelector(`#panel-${tab.dataset.tab}`).classList.add("active");
      if (tab.dataset.tab === "reports") renderFinanceChart();
    });
  });

  document.querySelector("#research-close").addEventListener("click", closeResearchModal);
  document.querySelector("#research-modal").addEventListener("click", event => {
    if (event.target === event.currentTarget) closeResearchModal();
  });

  window.addEventListener("keydown", event => {
    if (event.key === "F5") {
      event.preventDefault();
      nextMonth();
      return;
    }
    if (event.key === "Escape") closeResearchModal();
  });

  document.querySelectorAll(".subtab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".subtab").forEach(item => item.classList.remove("active"));
      document.querySelectorAll(".contract-page").forEach(item => item.classList.remove("active"));
      tab.classList.add("active");
      document.querySelector(`#contracts-${tab.dataset.contractPage}`).classList.add("active");
    });
  });

  document.querySelector("#build-small").addEventListener("click", () => build("small"));
  document.querySelector("#build-medium").addEventListener("click", () => build("medium"));
  document.querySelector("#build-large").addEventListener("click", () => build("large"));
  document.querySelector("#upgrade-site").addEventListener("click", upgradeSite);
  document.querySelector("#prototype-chip").addEventListener("click", prototypeChip);
  document.querySelector("#hire-research").addEventListener("click", () => hire("researchers", hireQty()));
  document.querySelector("#hire-ops").addEventListener("click", () => hire("ops", hireQty()));
  document.querySelector("#hire-community").addEventListener("click", () => hire("community", hireQty()));
  document.querySelector("#hire-sales").addEventListener("click", () => hire("sales", hireQty()));
  document.querySelector("#hire-qty").addEventListener("input", renderHireCosts);
  document.querySelector("#contract-rule-toggle").addEventListener("change", event => {
    if (event.target.checked) {
      state.contractRule = "revenue_per_pflop";
      setContractRule("revenue_per_pflop");
    } else {
      state.contractRule = "max_revenue";
      setContractRule("max_revenue");
    }
  });
  document.querySelector("#auto-select-contract-toggle").addEventListener("change", event => {
    // Toggle state is just for enabling/disabling auto-selection
  });
  document.querySelector("#loan-small").addEventListener("click", () => takeLoan(250000, 9000));
  document.querySelector("#loan-large").addEventListener("click", () => takeLoan(1000000, 42000));
  document.querySelector("#pay-loan").addEventListener("click", payLoan);
  document.querySelector("#next-month-hud").addEventListener("click", nextMonth);

  document.querySelector("#contract-list").addEventListener("click", event => {
    const button = event.target.closest("button[data-contract]");
    if (button) acceptContract(Number(button.dataset.contract));
  });
  document.querySelector("#silicon-offer-list").addEventListener("click", event => {
    const accept = event.target.closest("button[data-accept-offer]");
    if (accept) return acceptSiliconOffer(accept.dataset.acceptOffer);
    const decline = event.target.closest("button[data-decline-offer]");
    if (decline) declineSiliconOffer(decline.dataset.declineOffer);
  });
  document.querySelector("#silicon-active-list").addEventListener("click", event => {
    const iterate = event.target.closest("button[data-start-iteration]");
    if (iterate) return startSiliconIteration(iterate.dataset.startIteration);
    const deliver = event.target.closest("button[data-deliver]");
    if (deliver) {
      const contract = state.activeSilicon.find(c => c.id === deliver.dataset.deliver);
      if (contract) deliverExistingChip(contract.id, contract.selectedChip != null ? contract.selectedChip : 0);
    }
  });
  document.querySelector("#silicon-active-list").addEventListener("change", event => {
    const select = event.target.closest("select[data-deliver-select]");
    if (select) {
      const contract = state.activeSilicon.find(c => c.id === select.dataset.deliverSelect);
      if (contract) contract.selectedChip = Number(select.value);
    }
  });

  document.querySelector("#research-tree").addEventListener("click", event => {
    const queue = event.target.closest("button[data-queue]");
    if (queue) return toggleQueueTech(queue.dataset.queue);
    const node = event.target.closest("[data-tech-select]");
    if (node) {
      state.selectedTech = node.dataset.techSelect;
      renderResearchTree();
    }
  });
  document.querySelector("#tech-detail").addEventListener("click", event => {
    const add = event.target.closest("button[data-tech-add]");
    if (add) return assignResearchersToTech(add.dataset.techAdd);
    const remove = event.target.closest("button[data-tech-remove]");
    if (remove) return unassignResearcherFromTech(remove.dataset.techRemove);
    const queue = event.target.closest("button[data-queue]");
    if (queue) toggleQueueTech(queue.dataset.queue);
  });
  document.querySelector("#tech-detail").addEventListener("change", event => {
    const toggle = event.target.closest("input[data-license-toggle]");
    if (toggle) {
      const tech = techTree.find(t => t.id === toggle.dataset.licenseToggle);
      const lic = state.licensing[toggle.dataset.licenseToggle] || (state.licensing[toggle.dataset.licenseToggle] = { enabled: false, price: tech ? techValue(tech) : 100000 });
      lic.enabled = toggle.checked;
      log(lic.enabled ? `${tech.name} is now available for licensing at ${money.format(lic.price)}.` : `${tech.name} licensing withdrawn.`);
      renderResearchTree();
      return;
    }
    const price = event.target.closest("input[data-license-price]");
    if (price) {
      const lic = state.licensing[price.dataset.licensePrice];
      if (lic) lic.price = Math.max(10000, Math.round(Number(price.value) || 0));
    }
  });
  document.querySelector("#rival-list").addEventListener("click", event => {
    const buy = event.target.closest("button[data-buy-rival]");
    if (buy) acquireRival(buy.dataset.buyRival);
  });

  document.querySelector("#wholesale-price").addEventListener("input", event => {
    state.wholesale.price = Math.max(0, Math.round(Number(event.target.value) || 0));
    updateUI();
  });

  for (const id of ["clock", "voltage", "cache", "cores", "memory"]) {
    document.querySelector(`#${id}`).addEventListener("input", event => {
      state.chip[id] = Number(event.target.value);
      updateUI();
      redrawMap();
    });
  }
  document.querySelector("#node").addEventListener("change", event => {
    state.chip.node = Number(event.target.value);
    updateUI();
  });
  document.querySelector("#ai-accel").addEventListener("change", event => {
    state.chip.ai = event.target.checked;
    updateUI();
  });
  document.querySelector("#ecc").addEventListener("change", event => {
    state.chip.ecc = event.target.checked;
    updateUI();
  });
  document.querySelector("#tech-design-options").addEventListener("change", event => {
    const cb = event.target.closest("input[data-chip-flag]");
    if (!cb) return;
    state.chip[cb.dataset.chipFlag] = cb.checked;
    updateUI();
    redrawMap();
  });

  window.addEventListener("resize", () => {
    renderFinanceChart();
    const modal = document.querySelector("#research-modal");
    if (modal && !modal.classList.contains("hidden")) drawTreeLines();
  });
}

bind();
computeChip();
recordFinancials(0, 0, 0);
refreshContracts();
renderHireCosts();
log("Seed funding secured. Pick a parcel and start building.");
updateUI();
bootGame();
