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

let siliconContractDeck = [
  { name: "Warehouse Vision ASIC", application: "low-latency image classification", minPerf: 72, pay: 420000, penalty: 95000, goodwill: 1, cacheNeed: 0.62, memoryNeed: 0.48, aiNeed: 0.7 },
  { name: "Bioinformatics Accelerator", application: "genome alignment batches", minPerf: 96, pay: 580000, penalty: 125000, goodwill: 2, cacheNeed: 0.42, memoryNeed: 0.82, aiNeed: 0.25 },
  { name: "Inference Edge Module", application: "compact LLM inference", minPerf: 128, pay: 760000, penalty: 170000, goodwill: -1, cacheNeed: 0.76, memoryNeed: 0.72, aiNeed: 0.9 }
];

let gameScene;

let MapScene;

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
  const { clock, voltage, cache, cores, memory, node, ai, ecc } = state.chip;
  const nodeScale = { 14: 0.72, 7: 1, 5: 1.18, 3: 1.34 }[node];
  const leakageScale = { 14: 0.7, 7: 1, 5: 1.28, 3: 1.68 }[node];
  const complexity = cores / 16 + cache / 48 + memory / 8 + (ai ? 1.4 : 0) + (ecc ? 0.35 : 0);
  const activityCap = cores * (1 + cache / 220 + memory / 32 + (ai ? 0.42 : 0));
  const dynamicPower = activityCap * Math.pow(voltage / 0.9, 2) * (clock / 3.2) * 0.105;
  const leakagePower = complexity * leakageScale * Math.pow(voltage / 0.9, 1.35) * 0.36;
  const perf = cores * clock * (1 + cache / 180) * (1 + memory / 80) * (ai ? 1.55 : 1) * nodeScale * 0.62;
  const heat = dynamicPower + leakagePower;
  const voltageMargin = voltage < 0.82 + clock * 0.018 ? -9 : voltage > 1.08 ? -4 : 2;
  const reliability = Math.max(35, Math.min(99, 90 + voltageMargin - Math.max(0, clock - 3.4) * 7 + (ecc ? 8 : -7) - (ai ? 2 : 0) - (node <= 5 ? 3 : 0)));
  const cost = Math.round((120000 + complexity * 65000 + Math.pow(nodeScale, 2.2) * 90000) * (ai ? 1.28 : 1) * (ecc ? 1.08 : 1));
  const months = Math.max(2, Math.ceil(2 + complexity * 1.2 + (14 / node) * 1.6 + (ai ? 1.5 : 0)));
  state.chip.perf = perf;
  state.chip.heat = heat;
  state.chip.reliability = reliability;
  state.chip.cost = cost;
  state.chip.months = months;
  state.chip.monthlyCost = Math.round(cost / months);
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
    perf: state.chip.perf,
    heat: state.chip.heat,
    reliability: state.chip.reliability
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function designOutcomeProfile(specs = activeChipSpecs(), threshold = 0, contract = null) {
  const engineers = state.staff.researchers;
  const nodeRisk = { 14: 0.02, 7: 0.04, 5: 0.065, 3: 0.095 }[specs.node] || 0.05;
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
  const downside = clamp(0.2 + timingRisk + thermalRisk + nodeRisk + largeDieRisk - engineerControl - eccControl - fitControl, 0.07, 0.52);
  const upside = clamp(0.12 + Math.max(0, voltageHeadroom) * 0.08 + engineerControl * 0.72 + fitControl * 0.9 - largeDieRisk * 0.35, 0.06, 0.38);
  const effectivePerf = specs.perf * (contract ? 0.88 + workloadFit * 0.24 : 1);
  const low = effectivePerf * (1 - downside);
  const high = effectivePerf * (1 + upside);
  const rawOdds = high === low ? (effectivePerf >= threshold ? 1 : 0) : (high - threshold) / (high - low);
  const odds = clamp(rawOdds + engineerControl * 0.35 + fitControl * 0.45 - Math.max(0, -voltageHeadroom) * 0.3, 0.03, 0.97);
  return { low, high, odds, effectivePerf, workloadFit, voltageHeadroom };
}

function rollDesignedPerformance(specs, contract = null) {
  const profile = designOutcomeProfile(specs, 0, contract);
  const engineers = state.staff.researchers;
  const skillBias = Math.min(0.16, engineers * 0.018) + (profile.workloadFit - 0.5) * 0.08 + Math.max(0, profile.voltageHeadroom) * 0.03;
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

function acceptSiliconContract(index) {
  computeChip();
  if (state.chipProject) return log("Finish the active chip program before signing a custom silicon deal.");
  const contract = siliconContractDeck[index];
  const upfront = Math.round(state.chip.cost * 0.18);
  if (state.cash < upfront) return log(`Starting the custom silicon program needs ${money.format(upfront)} up front.`);
  state.cash -= upfront;
  state.chipProject = {
    name: contract.name,
    monthsTotal: state.chip.months,
    monthsLeft: state.chip.months,
    monthlyCost: Math.max(10000, Math.round((state.chip.cost - upfront) / state.chip.months)),
    spent: upfront,
    type: "customer",
    contract: { ...contract },
    specs: activeChipSpecs()
  };
  siliconContractDeck.splice(index, 1);
  refreshSiliconContracts();
  log(`${contract.name} signed. Minimum target: ${contract.minPerf} PFLOPS/node.`);
  updateUI();
}

function hire(role) {
  const labels = {
    researchers: "chip researcher",
    ops: "ops manager",
    community: "community liaison",
    sales: "contract sales lead"
  };
  const signingCost = { researchers: 24000, ops: 18000, community: 16000, sales: 20000 }[role];
  if (state.cash < signingCost) return log(`Hiring a ${labels[role]} needs ${money.format(signingCost)}.`);
  state.cash -= signingCost;
  state.staff[role] += 1;
  log(`Hired a ${labels[role]}.`);
  refreshContracts();
  updateUI();
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

function refreshSiliconContracts() {
  while (siliconContractDeck.length < 3) {
    const names = [
      ["Trading Signal ASIC", "microsecond risk scoring"],
      ["Robotics Control SoC", "factory motion planning"],
      ["Climate Solver Tile", "weather simulation kernels"],
      ["Fraud Graph Engine", "large-scale graph traversal"],
      ["Medical Imaging Chip", "3D scan reconstruction"]
    ];
    const picked = names[Math.floor(Math.random() * names.length)];
    const cacheNeed = 0.25 + Math.random() * 0.7;
    const memoryNeed = 0.25 + Math.random() * 0.7;
    const aiNeed = Math.random();
    const threshold = Math.round((64 + state.month * 4 + Math.random() * 90) * (1 + state.staff.sales * 0.03));
    siliconContractDeck.push({
      name: picked[0],
      application: picked[1],
      minPerf: threshold,
      pay: Math.round(threshold * (5200 + Math.random() * 1800)),
      penalty: Math.round(threshold * (950 + Math.random() * 650)),
      goodwill: Math.round(Math.random() * 4 - 1),
      cacheNeed,
      memoryNeed,
      aiNeed
    });
  }
  renderSiliconContracts();
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
      if (state.chipProject.type === "customer") {
        const contract = state.chipProject.contract;
        if (finalPerf >= contract.minPerf) {
          state.cash += contract.pay;
          log(`${contract.name} delivered at ${finalPerf.toFixed(0)} PFLOPS/node. Customer paid ${money.format(contract.pay)}.`);
        } else {
          state.cash -= contract.penalty;
          log(`${contract.name} missed target at ${finalPerf.toFixed(0)} PFLOPS/node. Penalty: ${money.format(contract.penalty)}.`);
        }
      } else {
        state.activeChip = {
          name: state.chipProject.name,
          perf: finalPerf,
          heat: specs.heat,
          reliability: Math.min(99, specs.reliability + state.staff.researchers)
        };
        log(`${state.activeChip.name} taped out at ${finalPerf.toFixed(0)} PFLOPS/node and entered production.`);
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
  recordFinancials(t.revenue, expenses, operatingPowerCost);
  refreshContracts();
  refreshSiliconContracts();
  updateUI();
  redrawMap();
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
  list.innerHTML = "";
  contractDeck.forEach((contract, index) => {
    const canAccept = contract.cap <= available;
    const item = document.createElement("article");
    item.className = `contract ${canAccept ? "can-accept" : "blocked"}`;
    item.innerHTML = `
      <h3>${contract.name}</h3>
      <p>${contract.cap} PFLOPS for ${contract.months} months<br>${money.format(contract.pay)}/mo, goodwill ${contract.goodwill >= 0 ? "+" : ""}${contract.goodwill}</p>
      <button data-contract="${index}" class="${canAccept ? "accept-ready" : "accept-blocked"}">${canAccept ? "Accept" : "Need compute"}</button>
    `;
    list.appendChild(item);
  });
}

function renderSiliconContracts() {
  const list = document.querySelector("#silicon-contract-list");
  if (!list) return;
  computeChip();
  list.innerHTML = "";
  siliconContractDeck.forEach((contract, index) => {
    const profile = designOutcomeProfile(activeChipSpecs(), contract.minPerf, contract);
    const canStart = !state.chipProject;
    const likely = profile.odds >= 0.55;
    const item = document.createElement("article");
    item.className = `contract ${likely && canStart ? "can-accept" : "blocked"}`;
    item.innerHTML = `
      <h3>${contract.name}</h3>
      <p>${contract.application}<br>Minimum ${contract.minPerf} PFLOPS/node, expected ${profile.low.toFixed(0)}-${profile.high.toFixed(0)} PFLOPS/node<br>Fit ${Math.round(profile.workloadFit * 100)}%, ${money.format(contract.pay)} delivery fee, ${money.format(contract.penalty)} miss penalty, ${Math.round(profile.odds * 100)}% success odds</p>
      <button data-silicon-contract="${index}" class="${canStart ? "accept-ready" : "accept-blocked"}">${canStart ? "Sign and start design" : "R&D busy"}</button>
    `;
    list.appendChild(item);
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

function updateUI() {
  computeChip();
  const t = totals();
  document.querySelector("#cash").textContent = money.format(state.cash);
  document.querySelector("#revenue").textContent = `${money.format(t.revenue)}/mo`;
  document.querySelector("#debt").textContent = money.format(state.debt);
  document.querySelector("#power").textContent = formatMw(t.power);
  document.querySelector("#goodwill").textContent = `${t.goodwill}%`;
  document.querySelector("#month").textContent = state.month;
  document.querySelector("#capacity").textContent = `${Math.round(t.capacity)} PFLOPS`;
  document.querySelector("#used-capacity").textContent = `${t.used} PFLOPS`;
  document.querySelector("#available-compute").textContent = `${Math.max(0, Math.round(t.capacity - t.used))} PFLOPS`;
  document.querySelector("#contract-capacity").textContent = `${Math.round(t.capacity)} PFLOPS`;
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
  document.querySelector("#silicon-success-odds").textContent = siliconContractDeck.length
    ? `${Math.round(designOutcomeProfile(activeChipSpecs(), siliconContractDeck[0].minPerf, siliconContractDeck[0]).odds * 100)}% vs first deal`
    : "No deals";
  document.querySelector("#silicon-engineers").textContent = state.staff.researchers;
  renderSiliconContracts();
  renderFinanceChart();
}

function bind() {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(item => item.classList.remove("active"));
      document.querySelectorAll(".panel").forEach(item => item.classList.remove("active"));
      tab.classList.add("active");
      document.querySelector(`#panel-${tab.dataset.tab}`).classList.add("active");
      if (tab.dataset.tab === "reports") renderFinanceChart();
    });
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
  document.querySelector("#hire-research").addEventListener("click", () => hire("researchers"));
  document.querySelector("#hire-ops").addEventListener("click", () => hire("ops"));
  document.querySelector("#hire-community").addEventListener("click", () => hire("community"));
  document.querySelector("#hire-sales").addEventListener("click", () => hire("sales"));
  document.querySelector("#loan-small").addEventListener("click", () => takeLoan(250000, 9000));
  document.querySelector("#loan-large").addEventListener("click", () => takeLoan(1000000, 42000));
  document.querySelector("#pay-loan").addEventListener("click", payLoan);
  document.querySelector("#next-month-hud").addEventListener("click", nextMonth);

  document.querySelector("#contract-list").addEventListener("click", event => {
    const button = event.target.closest("button[data-contract]");
    if (button) acceptContract(Number(button.dataset.contract));
  });
  document.querySelector("#silicon-contract-list").addEventListener("click", event => {
    const button = event.target.closest("button[data-silicon-contract]");
    if (button) acceptSiliconContract(Number(button.dataset.siliconContract));
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

  window.addEventListener("resize", renderFinanceChart);
}

bind();
computeChip();
recordFinancials(0, 0, 0);
refreshContracts();
refreshSiliconContracts();
log("Seed funding secured. Pick a parcel and start building.");
updateUI();
bootGame();
