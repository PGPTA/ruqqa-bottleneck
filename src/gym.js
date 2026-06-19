import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EQUIPMENT_TYPES } from './equipment.js';
import { gym } from './config.js';

function norm2(v) {
  const len = Math.hypot(v[0], v[1]) || 1;
  return { x: v[0] / len, z: v[1] / len };
}

// --- Equipment mesh builders ----------------------------------------------
function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1, ...opts });
}

export function buildEquipmentMesh(type, color) {
  const g = new THREE.Group();
  // shared materials: brushed steel frame, dark rubber, near-black weight
  // plates, a coloured accent (pads / branding) and a glowing console screen.
  const steel = mat(0x3a3f47, { metalness: 0.65, roughness: 0.38 });
  const dark = mat(0x24282e, { metalness: 0.3, roughness: 0.7 });
  const rubber = mat(0x1c1f23, { roughness: 0.95, metalness: 0.0 });
  const plate = mat(0x141619, { metalness: 0.45, roughness: 0.5 });
  const accent = mat(color, { metalness: 0.3, roughness: 0.45, emissive: color, emissiveIntensity: 0.12 });
  const screen = mat(0x0a0e14, { emissive: 0x1d3a52, emissiveIntensity: 0.6, roughness: 0.25, metalness: 0.1 });

  const box = (w, h, d, m, y = h / 2) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.y = y;
    b.castShadow = true;
    b.receiveShadow = true;
    g.add(b);
    return b;
  };
  // cylinder helper; axis defaults to Y. pass rot to lay it down.
  const cyl = (r, h, m, pos = [0, 0, 0], rot = [0, 0, 0], rTop = r) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, rTop, h, 18), m);
    c.position.set(pos[0], pos[1], pos[2]);
    c.rotation.set(rot[0], rot[1], rot[2]);
    c.castShadow = true;
    c.receiveShadow = true;
    g.add(c);
    return c;
  };
  // a loaded barbell laid along X at height y, centred at (0,y,z)
  const barbell = (y, z, halfLen = 0.9) => {
    cyl(0.035, halfLen * 2 + 0.5, steel, [0, y, z], [0, 0, Math.PI / 2]);
    for (const sx of [-1, 1]) {
      cyl(0.22, 0.06, plate, [sx * halfLen, y, z], [0, 0, Math.PI / 2]);
      cyl(0.18, 0.05, plate, [sx * (halfLen + 0.08), y, z], [0, 0, Math.PI / 2]);
    }
  };

  switch (type) {
    case 'treadmill': {
      box(1.2, 0.16, 1.5, dark, 0.13).position.z = 0.25; // deck base
      box(0.86, 0.05, 1.35, rubber, 0.22).position.z = 0.25; // running belt
      box(0.16, 0.12, 1.35, steel, 0.22).position.set(-0.52, 0, 0.25); // side rail
      box(0.16, 0.12, 1.35, steel, 0.22).position.set(0.52, 0, 0.25);
      cyl(0.04, 1.05, steel, [-0.46, 0.6, -0.55]); // console posts
      cyl(0.04, 1.05, steel, [0.46, 0.6, -0.55]);
      box(1.0, 0.5, 0.12, steel, 1.18).position.z = -0.55; // console
      box(0.78, 0.34, 0.04, screen, 1.2).position.z = -0.49; // screen
      cyl(0.03, 1.0, steel, [0, 0.98, -0.5], [0, 0, Math.PI / 2]); // handlebar
      break;
    }
    case 'bike': {
      cyl(0.34, 0.12, steel, [0, 0.5, 0.5], [0, 0, Math.PI / 2]); // flywheel
      cyl(0.34, 0.13, plate, [0, 0.5, 0.5], [0, 0, Math.PI / 2], 0.1); // hub
      box(0.1, 0.7, 1.1, steel, 0.42).position.z = -0.05; // main frame tube
      box(0.5, 0.16, 0.12, dark, 0.06).position.z = 0.4; // front foot
      box(0.5, 0.16, 0.12, dark, 0.06).position.z = -0.5; // rear foot
      cyl(0.035, 0.45, steel, [0, 0.72, -0.5]); // seat post
      box(0.3, 0.1, 0.42, accent, 0.95).position.z = -0.5; // seat
      cyl(0.035, 0.6, steel, [0, 0.85, 0.32]); // bar post
      cyl(0.025, 0.44, steel, [0, 1.12, 0.32], [Math.PI / 2, 0, 0]); // handlebar
      cyl(0.03, 0.4, steel, [0, 0.3, 0.15], [0, 0, Math.PI / 2]); // crank
      break;
    }
    case 'rower': {
      box(0.14, 0.1, 2.2, steel, 0.16).position.z = 0.2; // monorail
      box(0.55, 0.5, 0.5, dark, 0.32).position.z = -1.0; // fan housing
      cyl(0.26, 0.16, steel, [0, 0.4, -1.0], [Math.PI / 2, 0, 0]); // fan disc
      box(0.42, 0.1, 0.34, accent, 0.34).position.z = 0.35; // seat
      box(0.5, 0.16, 0.12, dark, 0.06).position.z = -1.15; // front foot
      cyl(0.025, 0.5, steel, [0, 0.42, -0.62], [0, 0, Math.PI / 2]); // handle
      box(0.34, 0.26, 0.04, screen, 0.95).position.z = -1.1; // monitor
      break;
    }
    case 'versaClimber': {
      box(0.95, 0.16, 1.3, dark, 0.08).position.z = 0.05; // base plate
      cyl(0.09, 2.95, steel, [-0.14, 1.47, -0.22], [0.06, 0, 0]); // twin rails
      cyl(0.09, 2.95, steel, [0.14, 1.47, -0.22], [0.06, 0, 0]);
      box(0.46, 0.3, 0.16, dark, 2.78).position.z = -0.35; // console mount
      box(0.4, 0.26, 0.04, screen, 2.78).position.z = -0.26; // console screen
      box(0.42, 0.1, 0.44, accent, 0.55).position.set(-0.3, 0, 0.16); // pedals
      box(0.42, 0.1, 0.44, accent, 0.9).position.set(0.3, 0, 0.16);
      cyl(0.03, 0.5, steel, [-0.34, 2.0, 0.02], [0, 0, 0.5]); // angled grips
      cyl(0.03, 0.5, steel, [0.34, 2.3, 0.02], [0, 0, -0.5]);
      break;
    }
    case 'boxStep': {
      box(0.86, 0.5, 0.86, dark, 0.25); // box body
      box(0.9, 0.05, 0.9, accent, 0.52); // top tread
      box(0.86, 0.04, 0.04, accent, 0.16).position.z = 0.43; // front stripe
      break;
    }
    case 'crawl': {
      const m = box(1.4, 0.04, 3.4, mat(color, { roughness: 0.97 }), 0.02);
      m.receiveShadow = true;
      // low hurdles to crawl under
      for (const z of [-1.0, 1.0]) {
        cyl(0.03, 1.3, steel, [0, 0.42, z], [0, 0, Math.PI / 2]);
        cyl(0.04, 0.42, steel, [-0.6, 0.21, z]);
        cyl(0.04, 0.42, steel, [0.6, 0.21, z]);
      }
      break;
    }
    case 'squatRack': {
      box(0.5, 0.1, 1.2, dark, 0.05).position.set(-0.78, 0, 0); // base feet
      box(0.5, 0.1, 1.2, dark, 0.05).position.set(0.78, 0, 0);
      cyl(0.07, 2.2, steel, [-0.78, 1.1, 0]); // uprights
      cyl(0.07, 2.2, steel, [0.78, 1.1, 0]);
      box(1.7, 0.1, 0.1, steel, 2.15); // top crossbar
      box(0.16, 0.12, 0.16, accent, 1.55).position.set(-0.78, 0, 0.12); // J-hooks
      box(0.16, 0.12, 0.16, accent, 1.55).position.set(0.78, 0, 0.12);
      barbell(1.6, 0.18, 0.92); // racked barbell
      break;
    }
    case 'bench': {
      box(0.4, 0.45, 0.12, steel, 0.22).position.z = 0.78; // legs
      box(0.4, 0.45, 0.12, steel, 0.22).position.z = -0.78;
      box(0.5, 0.14, 1.6, accent, 0.5); // pad
      cyl(0.06, 0.7, steel, [-0.42, 0.35, -0.78]); // rack uprights
      cyl(0.06, 0.7, steel, [0.42, 0.35, -0.78]);
      barbell(0.78, -0.78, 0.78);
      break;
    }
    case 'legPress': {
      box(1.1, 0.12, 1.4, dark, 0.06); // base
      box(0.7, 0.16, 0.7, accent, 0.45).position.z = 0.55; // seat
      box(0.7, 0.6, 0.16, accent, 0.6).position.set(0, 0.6, 0.85); // backrest
      const sledFrame = box(1.0, 0.12, 1.4, steel, 0.9);
      sledFrame.position.z = -0.45;
      sledFrame.rotation.x = -0.62; // angled rail
      const plateCarriage = box(0.9, 0.7, 0.16, plate, 1.25);
      plateCarriage.position.z = -1.0;
      plateCarriage.rotation.x = -0.62;
      cyl(0.22, 0.5, plate, [0, 1.3, -1.05], [Math.PI / 2 - 0.62, 0, 0]); // weight plate
      break;
    }
    case 'cable': {
      box(0.4, 0.12, 1.0, dark, 0.06).position.x = -0.9; // base
      box(0.4, 0.12, 1.0, dark, 0.06).position.x = 0.9;
      cyl(0.07, 2.4, steel, [-0.9, 1.2, 0]); // towers
      cyl(0.07, 2.4, steel, [0.9, 1.2, 0]);
      box(2.0, 0.12, 0.12, steel, 2.4); // top beam
      box(0.34, 1.4, 0.34, plate, 0.8).position.set(-0.9, 0, -0.15); // weight stacks
      box(0.34, 1.4, 0.34, plate, 0.8).position.set(0.9, 0, -0.15);
      cyl(0.03, 0.4, accent, [-0.9, 1.0, 0.2], [Math.PI / 2, 0, 0]); // handle
      cyl(0.03, 0.4, accent, [0.9, 1.0, 0.2], [Math.PI / 2, 0, 0]);
      break;
    }
    case 'latPull': {
      box(0.5, 0.12, 1.1, dark, 0.06); // base
      cyl(0.07, 2.4, steel, [0, 1.2, -0.4]); // tower
      box(0.18, 1.5, 0.34, plate, 0.85).position.z = -0.55; // weight stack
      box(0.4, 0.16, 0.7, accent, 0.55).position.z = 0.2; // seat
      box(0.5, 0.5, 0.16, accent, 0.7).position.z = -0.05; // thigh pad
      box(0.06, 0.5, 0.12, steel, 2.05).position.z = 0.1; // pulldown arm
      cyl(0.025, 1.0, accent, [0, 2.0, 0.25], [0, 0, Math.PI / 2]); // lat bar
      break;
    }
    case 'dumbbells': {
      // A-frame rack with rows of dumbbells
      box(3.2, 0.12, 0.7, dark, 0.06); // base
      box(0.1, 0.7, 0.6, steel, 0.4).position.set(-1.5, 0, 0);
      box(0.1, 0.7, 0.6, steel, 0.4).position.set(1.5, 0, 0);
      box(3.2, 0.08, 0.5, steel, 0.55); // upper shelf
      box(3.2, 0.08, 0.5, steel, 0.32); // lower shelf
      for (let row = 0; row < 2; row++) {
        const y = 0.62 + row * 0.0;
        const yy = row === 0 ? 0.68 : 0.42;
        for (let i = 0; i < 6; i++) {
          const x = -1.25 + i * 0.5;
          cyl(0.035, 0.34, steel, [x, yy, 0], [Math.PI / 2, 0, 0]); // handle
          cyl(0.11, 0.1, plate, [x, yy, 0.16], [Math.PI / 2, 0, 0]); // bell heads
          cyl(0.11, 0.1, plate, [x, yy, -0.16], [Math.PI / 2, 0, 0]);
          void y;
        }
      }
      break;
    }
    case 'mats': {
      const pad = box(5, 0.06, 4, mat(color, { roughness: 0.97 }), 0.03);
      pad.receiveShadow = true;
      // seam lines suggesting individual mats
      for (let i = 1; i < 4; i++) box(0.03, 0.07, 4, dark, 0.035).position.x = -2.5 + i * 1.25;
      break;
    }
    case 'walkingLunge':
    case 'elephantWalk': {
      // an open floor zone with direction chevrons pointing the way (+z)
      const zw = 7.8;
      const zd = 6.8;
      const zonePad = box(zw, 0.04, zd, mat(color, { roughness: 0.97 }), 0.02);
      zonePad.receiveShadow = true;
      const border = box(zw, 0.05, 0.1, dark, 0.03);
      border.position.z = zd / 2 - 0.05;
      const border2 = box(zw, 0.05, 0.1, dark, 0.03);
      border2.position.z = -zd / 2 + 0.05;
      for (let r = 0; r < 4; r++) {
        const z = -2.4 + r * 1.6;
        const a = box(1.0, 0.05, 0.16, accent, 0.045);
        a.position.set(-0.5, 0, z);
        a.rotation.y = 0.6;
        const b = box(1.0, 0.05, 0.16, accent, 0.045);
        b.position.set(0.5, 0, z);
        b.rotation.y = -0.6;
      }
      break;
    }
    case 'track':
      // built separately in updateStationTransform (depends on lap length)
      break;
    default:
      box(1, 1, 1, accent);
  }
  return g;
}

// --- Derived geometry (use slots, queue line, pad size) -------------------
export function computeStationGeometry(type, pos, facing, capacity) {
  const f = facing; // already a normalised {x,z}
  const usePositions = [];

  // open movement zones: lay people out in a centred grid on the floor
  if (EQUIPMENT_TYPES[type]?.isZone) {
    const perp = { x: -f.z, z: f.x };
    const cols = Math.max(1, Math.ceil(Math.sqrt(capacity)));
    const rows = Math.ceil(capacity / cols);
    const sx = 1.5;
    const sz = 1.6;
    for (let i = 0; i < capacity; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const tx = (c - (cols - 1) / 2) * sx;
      const tz = (r - (rows - 1) / 2) * sz;
      usePositions.push({
        x: pos.x + perp.x * tx + f.x * tz,
        z: pos.z + perp.z * tx + f.z * tz,
      });
    }
    const queueBase = { x: pos.x + f.x * (rows * sz * 0.5 + 2.4), z: pos.z + f.z * (rows * sz * 0.5 + 2.4) };
    return {
      usePositions,
      queueBase,
      queueDir: f,
      rotationY: Math.atan2(f.x, f.z),
      padSize: cols * sx + 1,
      padDepth: rows * sz + 1,
    };
  }

  if (capacity <= 1) {
    usePositions.push({ x: pos.x + f.x * 1.1, z: pos.z + f.z * 1.1 });
  } else {
    const perp = { x: -f.z, z: f.x };
    for (let s = 0; s < capacity; s++) {
      const t = (s - (capacity - 1) / 2) * 1.2;
      usePositions.push({
        x: pos.x + f.x * 0.6 + perp.x * t,
        z: pos.z + f.z * 0.6 + perp.z * t,
      });
    }
  }
  const queueBase = { x: pos.x + f.x * 2.6, z: pos.z + f.z * 2.6 };
  const padSize = type === 'mats' ? 6 : type === 'dumbbells' ? 4.5 : 2.4;
  const padDepth = type === 'mats' ? 5 : type === 'dumbbells' ? 2.5 : 2.4;
  return { usePositions, queueBase, queueDir: f, rotationY: Math.atan2(f.x, f.z), padSize, padDepth };
}

// --- Running track --------------------------------------------------------
// A straight line track of length `trackLength`. Runners run up and down the
// line (turning at each end) until they have covered their target distance, so
// a 2 m line + 10 m goal = 5 lengths. Lanes run parallel along local x; the
// `lane` offset shifts runners apart in local z.
const LANE_SPACING = 0.7;

function makeTrackGeometry(trackLength, capacity = 1) {
  const L = Math.max(2, trackLength); // line length
  const width = Math.max(1.2, capacity * LANE_SPACING); // total lane band width

  // back-and-forth position along the line at run-distance d
  function localPointAt(d, lane = 0) {
    const period = 2 * L;
    const phase = ((d % period) + period) % period;
    const x = phase <= L ? -L / 2 + phase : L / 2 - (phase - L);
    return { x, z: lane };
  }

  return { L, width, localPointAt };
}

function rotY(p, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: p.x * c + p.z * s, z: -p.x * s + p.z * c };
}

function buildTrackLine(geom, color) {
  const group = new THREE.Group();
  const L = geom.L;
  const halfBand = geom.width / 2 + 0.4;
  const xEnd = L / 2 + 0.5;

  // surface slab
  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(L + 1, geom.width + 0.8),
    new THREE.MeshStandardMaterial({ color: 0x0e141a, roughness: 0.95, side: THREE.DoubleSide })
  );
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = 0.02;
  surface.receiveShadow = true;
  group.add(surface);
  group.userData.surface = surface;

  const lineMat = new THREE.LineBasicMaterial({ color });
  const mkLine = (ax, az, bx, bz, mat = lineMat) =>
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(ax, 0.05, az),
        new THREE.Vector3(bx, 0.05, bz),
      ]),
      mat
    );

  // side boundary lines (run along the length)
  group.add(mkLine(-L / 2, -halfBand, L / 2, -halfBand));
  group.add(mkLine(-L / 2, halfBand, L / 2, halfBand));

  // dashed centre lane markers between lanes
  // (a single dotted centreline keeps it readable)
  const dashMat = new THREE.LineDashedMaterial({ color, dashSize: 0.5, gapSize: 0.4, opacity: 0.6, transparent: true });
  const centre = mkLine(-L / 2, 0, L / 2, 0, dashMat);
  centre.computeLineDistances();
  group.add(centre);

  // start / finish lines at both ends (white)
  const endMat = new THREE.LineBasicMaterial({ color: 0xffffff });
  group.add(mkLine(-L / 2, -halfBand, -L / 2, halfBand, endMat));
  group.add(mkLine(xEnd - 0.5, -halfBand, xEnd - 0.5, halfBand, endMat));

  return group;
}

// World-space point on a station's track (uses its current position/rotation).
export function trackPointAtWorld(station, d, lane) {
  const local = station.trackGeom.localPointAt(d, lane);
  const w = rotY(local, station.trackAngle);
  return { x: w.x + station.pos.x, z: w.z + station.pos.z };
}

// --- Station factory + transform updates ----------------------------------
export function createStation(scene, def, id) {
  const meta = EQUIPMENT_TYPES[def.type];
  const capacity = def.capacity ?? meta.capacity;

  const group = new THREE.Group();
  group.add(buildEquipmentMesh(def.type, meta.color));

  const pad = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color: 0x10151b, roughness: 1, transparent: true, opacity: 0.85 })
  );
  pad.rotation.x = -Math.PI / 2;
  scene.add(pad);
  scene.add(group);

  const labelDiv = document.createElement('div');
  labelDiv.className = 'station-label';
  labelDiv.textContent = meta.label;
  const labelObj = new CSS2DObject(labelDiv);
  scene.add(labelObj);

  const station = {
    id,
    type: def.type,
    label: meta.label, // equipment category, used to group the stats table
    name: meta.label, // unique display name e.g. "Treadmill 1" (set by World)
    capacity,
    color: meta.color,
    isTrack: !!meta.isTrack,
    trackLength: def.trackLength ?? meta.trackLength ?? 24,
    pos: { x: def.x, z: def.z },
    facing: norm2(def.facing),
    mesh: group,
    pad,
    labelObj,
    labelDiv,
    // runtime (filled by simulation)
    occupants: [],
    queue: [],
    stats: { servedTotal: 0, busyAccum: 0, maxQueue: 0, waitTotal: 0, waitCount: 0 },
  };
  group.userData.station = station;
  updateStationTransform(station);
  return station;
}

export function updateStationTransform(station) {
  const angle = Math.atan2(station.facing.x, station.facing.z);
  station.mesh.position.set(station.pos.x, 0, station.pos.z);
  station.mesh.rotation.y = angle;

  if (station.isTrack) {
    updateTrackTransform(station, angle);
    return;
  }

  const geo = computeStationGeometry(station.type, station.pos, station.facing, station.capacity);
  station.usePositions = geo.usePositions;
  station.queueBase = geo.queueBase;
  station.queueDir = geo.queueDir;

  station.pad.position.set(station.pos.x, 0.015, station.pos.z);
  station.pad.scale.set(geo.padSize, geo.padDepth, 1);
  station.labelObj.position.set(station.pos.x, 2.8, station.pos.z);
}

function updateTrackTransform(station, angle) {
  station.trackAngle = angle;

  // (re)build the line mesh when the length or capacity (lane count) changes
  if (!station.trackGeom || station._builtLen !== station.trackLength || station._builtCap !== station.capacity) {
    if (station._trackLoop) {
      station.mesh.remove(station._trackLoop);
      station._trackLoop.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
    }
    station.trackGeom = makeTrackGeometry(station.trackLength, station.capacity);
    station._trackLoop = buildTrackLine(station.trackGeom, station.color);
    station.mesh.add(station._trackLoop);
    station.trackSurface = station._trackLoop.userData.surface;
    station._builtLen = station.trackLength;
    station._builtCap = station.capacity;
  }

  const geom = station.trackGeom;
  // each runner gets a parallel lane + a staggered start along the line
  station.trackSlots = [];
  for (let i = 0; i < station.capacity; i++) {
    station.trackSlots.push({
      startDist: (i / station.capacity) * geom.L,
      lane: (i - (station.capacity - 1) / 2) * LANE_SPACING,
    });
  }
  station.usePositions = station.trackSlots.map((s) => trackPointAtWorld(station, s.startDist, s.lane));

  // queue forms off to the side of the line, along the facing direction
  station.queueBase = {
    x: station.pos.x + station.facing.x * (geom.width / 2 + 2.6),
    z: station.pos.z + station.facing.z * (geom.width / 2 + 2.6),
  };
  station.queueDir = station.facing;

  // the line surface itself shows congestion, so hide the rectangular pad
  station.pad.visible = false;
  station.labelObj.position.set(station.pos.x, 2.4, station.pos.z);
}

export function disposeStation(scene, station) {
  scene.remove(station.mesh);
  scene.remove(station.pad);
  scene.remove(station.labelObj);
  if (station.labelDiv && station.labelDiv.parentNode) station.labelDiv.remove();
  station.mesh.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
  station.pad.geometry.dispose();
  station.pad.material.dispose();
}

// --- Environment (floor, walls, grid, door markers) -----------------------
// Procedural dark gym-floor texture: rubber-speckled tiles with grout lines and
// a soft sheen. Cached so it survives environment rebuilds (on resize).
let FLOOR_TEX = null;
function getFloorTexture() {
  if (FLOOR_TEX) return FLOOR_TEX;
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');

  // base — lighter, neutral speckled EPDM rubber-gym flooring
  ctx.fillStyle = '#565b61';
  ctx.fillRect(0, 0, S, S);

  // subtle large-scale mottling drawn with wrap-around copies so the texture
  // tiles seamlessly (no visible repeating "squares")
  const blob = (x, y, r, col) => {
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const gx = x + ox * S;
        const gy = y + oy * S;
        const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
        grad.addColorStop(0, col);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, S, S);
      }
    }
  };
  for (let i = 0; i < 14; i++) {
    const lighter = Math.random() > 0.5;
    blob(
      Math.random() * S,
      Math.random() * S,
      80 + Math.random() * 140,
      lighter ? 'rgba(118,124,132,0.10)' : 'rgba(28,32,36,0.12)'
    );
  }

  // dense fine rubber fleck speckle — wraps naturally since it's uniform
  for (let i = 0; i < 11000; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const r = Math.random();
    if (r > 0.62) ctx.fillStyle = `rgba(206,212,219,${0.04 + Math.random() * 0.1})`; // light fleck
    else if (r > 0.3) ctx.fillStyle = `rgba(120,128,138,${0.05 + Math.random() * 0.1})`; // mid fleck
    else ctx.fillStyle = `rgba(10,12,15,${0.06 + Math.random() * 0.12})`; // dark fleck
    const s = 0.8 + Math.random() * 1.6;
    ctx.fillRect(x, y, s, s);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  FLOOR_TEX = tex;
  return tex;
}

export function buildEnvironment(scene) {
  const container = new THREE.Group();
  const w = gym.width;
  const d = gym.depth;

  const floorTex = getFloorTexture();
  floorTex.repeat.set(w / 2.5, d / 2.5); // fine seamless speckle, no big tiles
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: floorTex, roughness: 0.88, metalness: 0.04 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.userData.isFloor = true;
  container.add(floor);

  const ent = gym.entrance;
  const ex = gym.exit;
  const markers = {};
  const mkMarker = (pos, color, key) => {
    const grp = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.05, 1.4, 32),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.7, roughness: 0.6 })
    );
    ring.rotation.x = -Math.PI / 2;
    grp.add(ring);
    // invisible disc so the marker is easy to grab in the editor
    const hit = new THREE.Mesh(
      new THREE.CircleGeometry(1.4, 24),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hit.rotation.x = -Math.PI / 2;
    hit.position.y = 0.02;
    hit.userData.marker = key;
    grp.add(hit);
    grp.position.set(pos.x, 0.03, pos.z);
    container.add(grp);
    markers[key] = grp;
  };
  mkMarker(ent, 0x36c46b, 'entrance');
  mkMarker(ex, 0xff5247, 'exit');

  scene.add(container);

  return {
    floor,
    container,
    markers,
    dispose() {
      scene.remove(container);
      container.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
    },
  };
}
