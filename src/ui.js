import { EQUIPMENT_TYPES, typeColorHex } from './equipment.js';

const WAVE_COLORS = [
  0x4fa3ff, 0xff7a59, 0x59d98e, 0xffd24f, 0xb06bff, 0xff6bb0, 0x4fd1ff, 0xff5d5d, 0x9be15d,
];

function hexStr(num) {
  return '#' + num.toString(16).padStart(6, '0');
}

function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function fmtWait(sec) {
  if (sec < 1) return '–';
  if (sec < 60) return `${Math.round(sec)}s`;
  return `${(sec / 60).toFixed(1)}m`;
}

export function initUI(sim) {
  // ---- default state ----
  let routines = {
    'Full circuit': { name: 'Full circuit', steps: [
      { type: 'versaClimber', minutes: 4 },
      { type: 'bench', minutes: 4 },
      { type: 'boxStep', minutes: 4 },
      { type: 'walkingLunge', minutes: 3 },
      { type: 'elephantWalk', minutes: 3 },
      { type: 'track', distance: 400 },
    ] },
    'Climb & step': { name: 'Climb & step', steps: [
      { type: 'versaClimber', minutes: 5 },
      { type: 'boxStep', minutes: 5 },
      { type: 'track', distance: 400 },
    ] },
    'Strength flow': { name: 'Strength flow', steps: [
      { type: 'bench', minutes: 6 },
      { type: 'walkingLunge', minutes: 4 },
      { type: 'elephantWalk', minutes: 4 },
    ] },
    'Running club': { name: 'Running club', steps: [
      { type: 'track', distance: 800 },
      { type: 'walkingLunge', minutes: 4 },
    ] },
  };

  let waveSeq = 0;
  // Race-style waves: each wave starts a set gap (minutes) AFTER the previous
  // one. The first wave's gap is measured from the race start (0:00).
  let waves = [
    { id: ++waveSeq, gapMin: 0, count: 12, routineName: 'Full circuit', color: WAVE_COLORS[0] },
    { id: ++waveSeq, gapMin: 2, count: 12, routineName: 'Full circuit', color: WAVE_COLORS[1] },
    { id: ++waveSeq, gapMin: 2, count: 12, routineName: 'Full circuit', color: WAVE_COLORS[2] },
    { id: ++waveSeq, gapMin: 2, count: 12, routineName: 'Full circuit', color: WAVE_COLORS[3] },
  ];

  // cumulative start time (in minutes) for each wave, given the gaps before it
  function waveStartMin(index) {
    let acc = 0;
    for (let i = 0; i <= index; i++) acc += waves[i].gapMin;
    return acc;
  }

  const isTrackType = (t) => !!EQUIPMENT_TYPES[t].isTrack;
  const stepText = (s) => (isTrackType(s.type) ? `${s.distance} m` : `${s.minutes} min`);

  // ---- DOM refs ----
  const $ = (id) => document.getElementById(id);
  const waveListEl = $('waveList');
  const routineListEl = $('routineList');
  const statsBody = $('statsBody');

  // ---- apply config to sim ----
  function routineSteps(name) {
    return (routines[name] || Object.values(routines)[0]).steps;
  }
  function applyWaves() {
    sim.setWaves(
      waves.map((w, i) => ({
        id: w.id,
        time: waveStartMin(i) * 60,
        count: w.count,
        routine: routineSteps(w.routineName),
        color: w.color,
      }))
    );
  }

  // ---- render waves ----
  function moveWave(index, dir) {
    const j = index + dir;
    if (j < 0 || j >= waves.length) return;
    [waves[index], waves[j]] = [waves[j], waves[index]];
    renderWaves();
    applyWaves();
  }

  function renderWaves() {
    waveListEl.innerHTML = '';
    const routineNames = Object.keys(routines);
    waves.forEach((w, i) => {
      const card = document.createElement('div');
      card.className = 'card';
      const startLabel = fmtTime(waveStartMin(i) * 60);
      card.innerHTML = `
        <div class="card-head">
          <span class="swatch" style="background:${hexStr(w.color)}"></span>
          <span class="title">Wave ${i + 1} · starts ${startLabel}</span>
          <button class="btn tiny" data-act="up" title="Move earlier">▲</button>
          <button class="btn tiny" data-act="down" title="Move later">▼</button>
          <button class="btn tiny danger" data-act="del">✕</button>
        </div>
        <div class="card-row">
          <label>${i === 0 ? 'Start at' : 'Gap after prev'}</label>
          <input type="number" min="0" max="180" step="0.5" data-f="gapMin" value="${w.gapMin}" /> <span style="font-size:11px;color:var(--muted)">min</span>
        </div>
        <div class="card-row">
          <label>People</label>
          <input type="number" min="1" max="80" data-f="count" value="${w.count}" />
        </div>
        <div class="card-row">
          <label>Flow</label>
          <select data-f="routineName">
            ${routineNames.map((n) => `<option ${n === w.routineName ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>`;

      card.querySelector('[data-act="up"]').onclick = () => moveWave(i, -1);
      card.querySelector('[data-act="down"]').onclick = () => moveWave(i, 1);
      card.querySelector('[data-act="del"]').onclick = () => {
        waves = waves.filter((x) => x.id !== w.id);
        renderWaves();
        applyWaves();
      };
      card.querySelectorAll('[data-f]').forEach((el) => {
        el.onchange = () => {
          const f = el.dataset.f;
          w[f] = f === 'routineName' ? el.value : Number(el.value);
          renderWaves(); // refresh computed start times
          applyWaves();
        };
      });
      waveListEl.appendChild(card);
    });
  }

  $('btnAddWave').onclick = () => {
    waves.push({
      id: ++waveSeq,
      gapMin: waves.length ? 2 : 0,
      count: 8,
      routineName: Object.keys(routines)[0],
      color: WAVE_COLORS[waveSeq % WAVE_COLORS.length],
    });
    renderWaves();
    applyWaves();
  };

  // ---- render routines ----
  function renderRoutines() {
    routineListEl.innerHTML = '';
    Object.values(routines).forEach((r) => {
      const card = document.createElement('div');
      card.className = 'card';
      const totalMin = r.steps.reduce((a, s) => a + (isTrackType(s.type) ? 0 : s.minutes), 0);
      const totalDist = r.steps.reduce((a, s) => a + (isTrackType(s.type) ? s.distance : 0), 0);
      const totalParts = [];
      if (totalMin) totalParts.push(`${totalMin} min`);
      if (totalDist) totalParts.push(`${totalDist} m run`);
      const summary = r.steps
        .map((s) => `${EQUIPMENT_TYPES[s.type].label} ${stepText(s)}`)
        .join(' → ');
      card.innerHTML = `
        <div class="card-head">
          <span class="title">${r.name}</span>
          <button class="btn tiny" data-act="edit">Edit</button>
          <button class="btn tiny danger" data-act="del">✕</button>
        </div>
        <div class="routine-summary">${summary || 'No steps'} <br><b>${totalParts.join(' · ') || '—'}</b> total</div>`;
      card.querySelector('[data-act="edit"]').onclick = () => openRoutineModal(r.name);
      card.querySelector('[data-act="del"]').onclick = () => {
        if (Object.keys(routines).length <= 1) return;
        delete routines[r.name];
        // fix waves pointing at it
        const fallback = Object.keys(routines)[0];
        waves.forEach((w) => { if (w.routineName === r.name) w.routineName = fallback; });
        renderRoutines();
        renderWaves();
        applyWaves();
      };
      routineListEl.appendChild(card);
    });
  }

  $('btnAddRoutine').onclick = () => openRoutineModal(null);

  // ---- routine modal ----
  const modal = $('routineModal');
  let editingName = null;
  let draftSteps = [];

  // populate equipment dropdown
  $('stepEquip').innerHTML = Object.entries(EQUIPMENT_TYPES)
    .map(([key, v]) => `<option value="${key}">${v.label}</option>`)
    .join('');

  // switch the step unit between minutes and metres depending on the kit
  function syncStepUnit() {
    const track = isTrackType($('stepEquip').value);
    $('stepUnit').textContent = track ? 'm' : 'min';
    const input = $('stepMins');
    input.max = track ? 5000 : 60;
    if (track && Number(input.value) <= 60) input.value = 400;
    if (!track && Number(input.value) > 60) input.value = 8;
  }
  $('stepEquip').onchange = syncStepUnit;

  function renderDraftSteps() {
    const el = $('routineSteps');
    el.innerHTML = '';
    draftSteps.forEach((s, i) => {
      const row = document.createElement('div');
      row.className = 'step-row';
      row.innerHTML = `
        <span class="step-num">${i + 1}</span>
        <span class="swatch" style="background:${typeColorHex(s.type)}"></span>
        <span class="step-name">${EQUIPMENT_TYPES[s.type].label}</span>
        <span class="step-dur">${stepText(s)}</span>
        <button class="btn tiny danger">✕</button>`;
      row.querySelector('button').onclick = () => {
        draftSteps.splice(i, 1);
        renderDraftSteps();
      };
      el.appendChild(row);
    });
  }

  function openRoutineModal(name) {
    editingName = name;
    if (name) {
      $('routineModalTitle').textContent = 'Edit flow';
      $('routineName').value = name;
      draftSteps = routines[name].steps.map((s) => ({ ...s }));
    } else {
      $('routineModalTitle').textContent = 'New flow';
      $('routineName').value = '';
      draftSteps = [];
    }
    renderDraftSteps();
    syncStepUnit();
    modal.classList.remove('hidden');
  }

  $('btnAddStep').onclick = () => {
    const type = $('stepEquip').value;
    const val = Math.max(1, Number($('stepMins').value) || 5);
    if (isTrackType(type)) {
      draftSteps.push({ type, distance: val });
    } else {
      draftSteps.push({ type, minutes: val });
    }
    renderDraftSteps();
  };

  $('btnRoutineCancel').onclick = () => modal.classList.add('hidden');

  $('btnRoutineSave').onclick = () => {
    const name = ($('routineName').value || '').trim() || 'Routine';
    if (draftSteps.length === 0) {
      modal.classList.add('hidden');
      return;
    }
    // if renamed, remove the old key
    if (editingName && editingName !== name) delete routines[editingName];
    routines[name] = { name, steps: draftSteps.map((s) => ({ ...s })) };
    modal.classList.add('hidden');
    renderRoutines();
    renderWaves();
    applyWaves();
  };

  // ---- stats: group identical labels (e.g. 4 treadmills) into one line ----
  function groupStats() {
    const grouped = {};
    for (const r of sim.getStats()) {
      const g = (grouped[r.label] ||= {
        label: r.label, color: r.color, capacity: 0, inUse: 0, queue: 0,
        maxQueue: 0, util: 0, n: 0, avgWait: 0, bottleneck: false,
      });
      g.capacity += r.capacity;
      g.inUse += r.inUse;
      g.queue += r.queue;
      g.maxQueue = Math.max(g.maxQueue, r.maxQueue);
      g.util += r.util;
      g.avgWait = Math.max(g.avgWait, r.avgWait);
      g.bottleneck = g.bottleneck || r.bottleneck;
      g.n++;
    }
    return Object.values(grouped).map((g) => ({
      label: g.label,
      color: g.color,
      capacity: g.capacity,
      inUse: g.inUse,
      queue: g.queue,
      maxQueue: g.maxQueue,
      util: g.util / g.n,
      avgWait: g.avgWait,
      bottleneck: g.bottleneck,
    }));
  }

  // ---- equipment-load time log (for CSV download) ----
  let loadLog = []; // {tSec, label, inUse, capacity, queue, maxQueue, utilPct, avgWaitSec, bottleneck}
  let lastLogBucket = -1;
  function maybeLog() {
    if (!sim.running) return;
    const clock = sim.getGlobal().clock;
    const bucket = Math.floor(clock / 5); // sample every 5 gym-seconds
    if (bucket === lastLogBucket) return;
    lastLogBucket = bucket;
    const tSec = bucket * 5;
    for (const g of groupStats()) {
      loadLog.push({
        tSec,
        label: g.label,
        inUse: g.inUse,
        capacity: g.capacity,
        queue: g.queue,
        maxQueue: g.maxQueue,
        utilPct: Math.round(g.util * 100),
        avgWaitSec: Math.round(g.avgWait),
        bottleneck: g.bottleneck ? 1 : 0,
      });
    }
  }
  function clearLog() {
    loadLog = [];
    lastLogBucket = -1;
  }
  function downloadLog() {
    const header = ['time_mmss', 'time_sec', 'equipment', 'in_use', 'capacity', 'queue', 'max_queue', 'utilisation_pct', 'avg_wait_sec', 'bottleneck'];
    const lines = [header.join(',')];
    // always include a final current snapshot row set so the file isn't empty
    const rows = loadLog.length ? loadLog : snapshotRows();
    for (const r of rows) {
      lines.push([fmtTime(r.tSec), r.tSec, `"${r.label}"`, r.inUse, r.capacity, r.queue, r.maxQueue, r.utilPct, r.avgWaitSec, r.bottleneck].join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `equipment-load_${fmtTime(sim.getGlobal().clock).replace(':', 'm')}s.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function snapshotRows() {
    const tSec = Math.round(sim.getGlobal().clock);
    return groupStats().map((g) => ({
      tSec, label: g.label, inUse: g.inUse, capacity: g.capacity, queue: g.queue,
      maxQueue: g.maxQueue, utilPct: Math.round(g.util * 100), avgWaitSec: Math.round(g.avgWait),
      bottleneck: g.bottleneck ? 1 : 0,
    }));
  }

  // ---- stats table ----
  let lastStatsUpdate = 0;
  function updateStats(now) {
    if (now - lastStatsUpdate < 250) return;
    lastStatsUpdate = now;

    statsBody.innerHTML = '';
    groupStats().forEach((g) => {
      const util = Math.round(g.util * 100);
      const tr = document.createElement('tr');
      if (g.bottleneck) tr.className = 'bottleneck';
      tr.innerHTML = `
        <td><span class="eq-name"><span class="swatch" style="background:${hexStr(g.color)}"></span>${g.label}</span></td>
        <td><span class="bar" style="width:${Math.max(2, util * 0.5)}px;background:${util > 75 ? 'var(--bad)' : util > 45 ? 'var(--warn)' : 'var(--good)'}"></span> ${util}%</td>
        <td>${g.inUse}/${g.capacity}${g.queue ? ` <span style="color:var(--bad)">+${g.queue}</span>` : ''}</td>
        <td>${g.maxQueue}</td>
        <td>${fmtWait(g.avgWait)}</td>`;
      statsBody.appendChild(tr);
    });
  }

  // ---- global stats + clock ----
  function updateGlobals() {
    const g = sim.getGlobal();
    $('clock').textContent = fmtTime(g.clock);
    $('statIn').textContent = g.inGym;
    $('statQueue').textContent = g.queuing;
    $('statDone').textContent = g.finished;
  }

  // ---- transport ----
  const btnPlay = $('btnPlay');
  function setPlay(running) {
    sim.running = running;
    btnPlay.textContent = running ? '❚❚ Pause' : '▶ Start';
    btnPlay.classList.toggle('primary', !running);
  }
  btnPlay.onclick = () => setPlay(!sim.running);
  $('btnReset').onclick = () => {
    setPlay(false);
    applyWaves();
    sim.reset();
    clearLog();
    updateGlobals();
    lastStatsUpdate = 0;
    updateStats(performance.now() + 1000);
  };

  const btnExport = $('btnExport');
  if (btnExport) btnExport.onclick = downloadLog;

  const speed = $('speed');
  const speedVal = $('speedVal');
  speed.oninput = () => {
    speedVal.textContent = speed.value + '×';
  };

  // ---- initial render ----
  renderWaves();
  renderRoutines();
  applyWaves();
  sim.reset();
  updateGlobals();

  return {
    getSpeed: () => Number(speed.value),
    pause: () => setPlay(false),
    applyWaves,
    tick: (now) => {
      updateGlobals();
      updateStats(now);
      maybeLog();
    },
  };
}
