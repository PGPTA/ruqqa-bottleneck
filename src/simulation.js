import * as THREE from 'three';
import { NPC } from './npc.js';
import { gym } from './config.js';
import { trackPointAtWorld } from './gym.js';

const QUEUE_SPACING = 0.95;

// colours for congestion pads
const C_IDLE = new THREE.Color(0x10151b);
const C_USE = new THREE.Color(0x2fae6a);
const C_BUSY = new THREE.Color(0xff5247);
const C_TRACK_IDLE = new THREE.Color(0x0e141a);

export class Simulation {
  constructor(scene, stations = []) {
    this.scene = scene;
    this.npcs = [];
    this.waves = []; // {id, time(s), count, routine:[{type,minutes}], color, spawned}
    this.clock = 0;
    this.running = false;
    this.finished = 0;
    this.setStations(stations);
  }

  // Swap in a new set of stations (after the user edits the layout) and reset.
  setStations(stations) {
    this.stations = stations;
    this.stationsByType = {};
    for (const s of stations) {
      (this.stationsByType[s.type] ||= []).push(s);
    }
    this.reset();
  }

  // ---- configuration ------------------------------------------------------
  setWaves(waves) {
    // waves come from the UI; deep-ish copy. A wave whose time has already
    // passed is marked spawned so live edits don't retroactively re-spawn it.
    this.waves = waves.map((w) => ({
      ...w,
      routine: w.routine.map((s) => ({ ...s })),
      spawned: this.clock >= w.time && this.clock > 0,
    }));
  }

  reset() {
    for (const n of this.npcs) n.dispose(this.scene);
    this.npcs = [];
    for (const s of this.stations) {
      s.occupants = [];
      s.queue = [];
      s.stats = { servedTotal: 0, busyAccum: 0, maxQueue: 0, waitTotal: 0, waitCount: 0 };
    }
    for (const w of this.waves) w.spawned = false;
    this.clock = 0;
    this.finished = 0;
    this._refreshVisuals();
  }

  // ---- spawning -----------------------------------------------------------
  _spawnWave(wave) {
    for (let i = 0; i < wave.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 1.6;
      const ent = gym.entrance;
      const start = { x: ent.x + Math.cos(angle) * r, z: ent.z + Math.sin(angle) * r };
      const npc = new NPC(this.scene, wave.color, start, wave.id);
      npc.routine = wave.routine;
      npc.stepIndex = 0;
      this.npcs.push(npc);
      this._assignNextStep(npc);
    }
  }

  // ---- station selection --------------------------------------------------
  _chooseStation(npc, type) {
    const candidates = this.stationsByType[type] || [];
    let best = null;
    let bestScore = Infinity;
    for (const s of candidates) {
      const load = (s.occupants.length + s.queue.length) / s.capacity;
      const d = Math.hypot(s.queueBase.x - npc.pos.x, s.queueBase.z - npc.pos.y);
      const score = load * 1000 + d;
      if (score < bestScore) {
        bestScore = score;
        best = s;
      }
    }
    return best;
  }

  _queueSpot(station, index) {
    return {
      x: station.queueBase.x + station.queueDir.x * index * QUEUE_SPACING,
      z: station.queueBase.z + station.queueDir.z * index * QUEUE_SPACING,
    };
  }

  _assignNextStep(npc) {
    if (npc.stepIndex >= npc.routine.length) {
      npc.state = 'leaving';
      npc.station = null;
      npc.setTarget(gym.exit);
      return;
    }
    const step = npc.routine[npc.stepIndex];
    const station = this._chooseStation(npc, step.type);
    if (!station) {
      // no such equipment in this gym — skip the step
      npc.stepIndex++;
      this._assignNextStep(npc);
      return;
    }
    npc.station = station;
    npc.queueIndex = station.queue.length;
    station.queue.push(npc);
    npc.state = 'walking';
    npc.setTarget(this._queueSpot(station, npc.queueIndex));
  }

  _findFreeSlot(station) {
    const used = new Set(station.occupants.map((o) => o.slotIndex));
    for (let i = 0; i < station.capacity; i++) if (!used.has(i)) return i;
    return 0;
  }

  _promote() {
    for (const s of this.stations) {
      while (s.occupants.length < s.capacity && s.queue.length > 0) {
        const front = s.queue[0];
        if (front.state !== 'queued') break; // front still walking in; keep order
        s.queue.shift();
        const slot = this._findFreeSlot(s);
        front.slotIndex = slot;
        s.occupants.push(front);
        const wait = this.clock - front.waitStart;
        s.stats.waitTotal += wait;
        s.stats.waitCount++;
        front.state = 'toSlot';
        front.queueIndex = -1;
        front.setTarget(s.usePositions[slot]);
      }
    }
  }

  _updateQueueTargets() {
    for (const s of this.stations) {
      for (let i = 0; i < s.queue.length; i++) {
        const m = s.queue[i];
        if (m.queueIndex !== i) {
          m.queueIndex = i;
          m.setTarget(this._queueSpot(s, i));
        }
      }
    }
  }

  _finishExercise(npc) {
    const s = npc.station;
    if (s) {
      const idx = s.occupants.indexOf(npc);
      if (idx >= 0) s.occupants.splice(idx, 1);
      s.stats.servedTotal++;
    }
    npc.stepIndex++;
    this._assignNextStep(npc);
  }

  // ---- main step ----------------------------------------------------------
  update(dt, t) {
    if (this.running) {
      this.clock += dt;

      // spawn due waves
      for (const w of this.waves) {
        if (!w.spawned && this.clock >= w.time) {
          this._spawnWave(w);
          w.spawned = true;
        }
      }

      // accumulate utilisation / queue stats
      for (const s of this.stations) {
        s.stats.busyAccum += dt * s.occupants.length;
        if (s.queue.length > s.stats.maxQueue) s.stats.maxQueue = s.queue.length;
      }

      // finish exercises whose time is up
      for (const npc of this.npcs) {
        if (npc.state === 'exercising' && this.clock >= npc.exerciseEnd) {
          this._finishExercise(npc);
        }
      }

      this._promote();
      this._updateQueueTargets();

      // move / advance NPCs
      const survivors = [];
      for (const npc of this.npcs) {
        switch (npc.state) {
          case 'walking': {
            const arrived = npc.move(dt);
            if (arrived) {
              npc.state = 'queued';
              npc.waitStart = this.clock;
            }
            break;
          }
          case 'queued':
            npc.move(dt); // shuffle forward when the queue moves
            break;
          case 'toSlot':
            if (npc.move(dt)) {
              const step = npc.routine[npc.stepIndex];
              const station = npc.station;
              if (station && station.isTrack) {
                // start running laps until the target distance is reached
                const slot = station.trackSlots[npc.slotIndex] || { startDist: 0, lane: 0 };
                npc.state = 'running';
                npc.runTarget = step.distance ?? 200;
                npc.runDistance = 0;
                npc.lapPos = slot.startDist;
                npc.lane = slot.lane;
              } else {
                npc.state = 'exercising';
                const mins = step.minutes ?? 5;
                npc.exerciseEnd = this.clock + mins * 60;
                // face the equipment while using it
                if (station) {
                  const dx = station.pos.x - npc.pos.x;
                  const dz = station.pos.z - npc.pos.y;
                  if (dx || dz) npc.group.rotation.y = Math.atan2(dx, dz);
                }
              }
            }
            break;
          case 'running': {
            const station = npc.station;
            const d = npc.runSpeed * dt;
            npc.runDistance += d;
            npc.lapPos += d;
            const wp = trackPointAtWorld(station, npc.lapPos, npc.lane);
            const ahead = trackPointAtWorld(station, npc.lapPos + 0.2, npc.lane);
            npc.pos.set(wp.x, wp.z);
            npc.group.position.set(wp.x, npc.group.position.y, wp.z);
            npc.group.rotation.y = Math.atan2(ahead.x - wp.x, ahead.z - wp.z);
            if (npc.runDistance >= npc.runTarget) this._finishExercise(npc);
            break;
          }
          case 'leaving':
            if (npc.move(dt)) {
              npc.state = 'done';
            }
            break;
        }
        if (npc.state === 'done') {
          npc.dispose(this.scene);
          this.finished++;
        } else {
          survivors.push(npc);
        }
      }
      this.npcs = survivors;
    }

    // animations + visuals run even while paused (so it doesn't look frozen weird)
    for (const npc of this.npcs) npc.animate(t);
    this._refreshVisuals();
  }

  _refreshVisuals() {
    for (const s of this.stations) {
      const q = s.queue.length;
      const occ = s.occupants.length;
      // congestion colour
      const c = new THREE.Color();
      if (q > 0) {
        c.copy(C_USE).lerp(C_BUSY, Math.min(q / 4, 1));
      } else if (occ > 0) {
        c.copy(C_USE);
      } else {
        c.copy(C_IDLE);
      }
      if (s.isTrack && s.trackSurface) {
        s.trackSurface.material.color.copy(q > 0 || occ > 0 ? c : C_TRACK_IDLE);
      } else {
        s.pad.material.color.copy(c);
      }

      // label
      let html = `${s.name || s.label} <b>${occ}/${s.capacity}</b>`;
      if (q > 0) html += ` <span class="q">+${q}</span>`;
      if (s.labelDiv.innerHTML !== html) s.labelDiv.innerHTML = html;
    }
  }

  // ---- reporting for the UI ----------------------------------------------
  getStats() {
    const elapsed = Math.max(this.clock, 0.0001);
    return this.stations.map((s) => {
      const util = s.stats.busyAccum / (elapsed * s.capacity);
      const avgWait = s.stats.waitCount ? s.stats.waitTotal / s.stats.waitCount : 0;
      const bottleneck = s.queue.length >= 3 || avgWait > 90;
      return {
        id: s.id,
        label: s.label,
        color: s.color,
        capacity: s.capacity,
        inUse: s.occupants.length,
        queue: s.queue.length,
        maxQueue: s.stats.maxQueue,
        util: Math.min(util, 1),
        avgWait,
        bottleneck,
      };
    });
  }

  getGlobal() {
    let queuing = 0;
    for (const n of this.npcs) if (n.state === 'queued') queuing++;
    return { inGym: this.npcs.length, queuing, finished: this.finished, clock: this.clock };
  }
}
