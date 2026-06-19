import { gym, clampToFloor, defaultMarkers, STORAGE_KEY } from './config.js';
import { DEFAULT_LAYOUT, EQUIPMENT_TYPES } from './equipment.js';
import { buildEnvironment, createStation, updateStationTransform, disposeStation } from './gym.js';

// Owns the editable gym: the floor/walls environment + the list of stations.
// Persists everything to localStorage so a layout survives a page reload.

export class World {
  constructor(scene, sim) {
    this.scene = scene;
    this.sim = sim;
    this.stations = [];
    this.env = null;
    this.idSeq = 0;
    this.onChange = null;
  }

  init() {
    this.applyLayout(this.loadLayout() || DEFAULT_LAYOUT);
  }

  applyLayout(layout) {
    for (const s of this.stations) disposeStation(this.scene, s);
    this.stations = [];
    if (this.env) this.env.dispose();

    gym.width = layout.width ?? DEFAULT_LAYOUT.width;
    gym.depth = layout.depth ?? DEFAULT_LAYOUT.depth;
    const dm = defaultMarkers(gym.depth);
    gym.entrance = { ...(layout.entrance ?? dm.entrance) };
    gym.exit = { ...(layout.exit ?? dm.exit) };
    this.env = buildEnvironment(this.scene);

    this.idSeq = 0;
    for (const def of layout.stations) {
      this.stations.push(createStation(this.scene, def, this.idSeq++));
    }
    this.renumber();
    this.sim.setStations(this.stations);
  }

  // Give each station a unique display name, numbered per type when there is
  // more than one (e.g. "Treadmill 1", "Treadmill 2"). Single items keep the
  // plain category name (e.g. "Leg Press").
  renumber() {
    const totals = {};
    for (const s of this.stations) totals[s.type] = (totals[s.type] || 0) + 1;
    const idx = {};
    for (const s of this.stations) {
      idx[s.type] = (idx[s.type] || 0) + 1;
      s.name = totals[s.type] > 1 ? `${s.label} ${idx[s.type]}` : s.label;
      if (s.labelDiv) s.labelDiv.textContent = s.name;
    }
  }

  rebuildEnvironment() {
    if (this.env) this.env.dispose();
    this.env = buildEnvironment(this.scene);
  }

  setSize(width, depth) {
    gym.width = width;
    gym.depth = depth;
    // keep the start/finish points inside the resized floor
    const e = clampToFloor(gym.entrance.x, gym.entrance.z);
    gym.entrance = { x: e.x, z: e.z };
    const x = clampToFloor(gym.exit.x, gym.exit.z);
    gym.exit = { x: x.x, z: x.z };
    this.rebuildEnvironment();
    for (const s of this.stations) {
      const c = clampToFloor(s.pos.x, s.pos.z);
      s.pos.x = c.x;
      s.pos.z = c.z;
      updateStationTransform(s);
    }
    this.save();
  }

  moveMarker(which, x, z) {
    const c = clampToFloor(x, z);
    const target = which === 'entrance' ? gym.entrance : gym.exit;
    target.x = c.x;
    target.z = c.z;
    const grp = this.env?.markers?.[which];
    if (grp) grp.position.set(c.x, 0.03, c.z);
    this.save();
  }

  addStation(type, x, z, opts = {}) {
    const c = clampToFloor(x, z);
    const def = {
      type,
      x: c.x,
      z: c.z,
      facing: opts.facing || [0, 1],
      capacity: opts.capacity ?? EQUIPMENT_TYPES[type].capacity,
    };
    const s = createStation(this.scene, def, this.idSeq++);
    this.stations.push(s);
    this.renumber();
    this.sim.setStations(this.stations);
    this.save();
    return s;
  }

  duplicateStation(station) {
    return this.addStation(station.type, station.pos.x + 2.5, station.pos.z + 2.5, {
      facing: [station.facing.x, station.facing.z],
      capacity: station.capacity,
    });
  }

  removeStation(station) {
    const i = this.stations.indexOf(station);
    if (i < 0) return;
    disposeStation(this.scene, station);
    this.stations.splice(i, 1);
    this.renumber();
    this.sim.setStations(this.stations);
    this.save();
  }

  moveStation(station, x, z) {
    const c = clampToFloor(x, z);
    station.pos.x = c.x;
    station.pos.z = c.z;
    updateStationTransform(station);
  }

  rotateStation(station) {
    const f = station.facing;
    station.facing = { x: -f.z, z: f.x }; // rotate 90°
    updateStationTransform(station);
    this.save();
  }

  setCapacity(station, cap) {
    station.capacity = Math.max(1, Math.min(12, Math.round(cap)));
    updateStationTransform(station);
    this.sim.setStations(this.stations);
    this.save();
  }

  setTrackLength(station, len) {
    station.trackLength = Math.max(2, Math.min(400, Math.round(len)));
    updateStationTransform(station);
    this.sim.setStations(this.stations);
    this.save();
  }

  clearAll() {
    this.applyLayout({ width: gym.width, depth: gym.depth, stations: [] });
    this.save();
  }

  resetToDefault() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      /* ignore */
    }
    this.applyLayout(DEFAULT_LAYOUT);
    this.save();
  }

  serialize() {
    const r = (n) => Math.round(n * 100) / 100;
    return {
      width: gym.width,
      depth: gym.depth,
      entrance: { x: r(gym.entrance.x), z: r(gym.entrance.z) },
      exit: { x: r(gym.exit.x), z: r(gym.exit.z) },
      stations: this.stations.map((s) => ({
        type: s.type,
        x: r(s.pos.x),
        z: r(s.pos.z),
        facing: [r(s.facing.x), r(s.facing.z)],
        capacity: s.capacity,
        ...(s.isTrack ? { trackLength: s.trackLength } : {}),
      })),
    };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.serialize()));
    } catch (e) {
      /* ignore */
    }
    this.onChange?.();
  }

  loadLayout() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
}
