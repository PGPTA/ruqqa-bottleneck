// Equipment catalogue + the default gym layout.
// Each "type" describes a category of kit; the default layout lists individual
// stations (one treadmill, one squat rack, etc.) which the user can then
// rearrange, add to, or delete in the layout editor.

export const EQUIPMENT_TYPES = {
  treadmill: { label: 'Treadmill', color: 0x4fa3ff, capacity: 1 },
  bike: { label: 'Exercise Bike', color: 0x4fd1ff, capacity: 1 },
  rower: { label: 'Rowing Machine', color: 0x47e0c0, capacity: 1 },
  versaClimber: { label: 'Versa Climber', color: 0x35c4e0, capacity: 1 },
  // The track is distance-based: people run up and down a straight line until
  // they hit a target distance. `trackLength` is the line length (m); they turn
  // around at each end. `capacity` = runners at once (parallel lanes).
  track: { label: 'Running Track', color: 0x5be0a0, capacity: 6, trackLength: 24, isTrack: true },
  squatRack: { label: 'Squat Rack', color: 0xff8a4f, capacity: 1 },
  bench: { label: 'Bench Squat', color: 0xffb84f, capacity: 1 },
  legPress: { label: 'Leg Press', color: 0xc06bff, capacity: 1 },
  cable: { label: 'Cable Machine', color: 0xff6bd1, capacity: 1 },
  latPull: { label: 'Lat Pulldown', color: 0x9b6bff, capacity: 1 },
  boxStep: { label: 'Box Step-up', color: 0xff9b54, capacity: 1 },
  hangBar: { label: 'Hang Bar', color: 0x9b6bff, capacity: 1 },
  crawl: { label: 'Crawl', color: 0x7fd14f, capacity: 3 },
  dumbbells: { label: 'Dumbbell Area', color: 0xffe14f, capacity: 4 },
  mats: { label: 'Functional Mats', color: 0x8fe04f, capacity: 6 },
  // floor-movement zones: an open area where several people move at once
  walkingLunge: { label: 'Walking Lunge', color: 0x5fd0ff, capacity: 20, isZone: true },
  elephantWalk: { label: 'Elephant Walk', color: 0xffc24f, capacity: 20, isZone: true },
};

// `facing` is the direction a user stands / approaches from; queues form
// further out along `facing`, away from the wall.
// Build a rectangular grid block of `count` stations of one type.
function block(type, count, { x0, z0, cols, dx, dz, facing = [0, 1] }) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    out.push({ type, x: +(x0 + c * dx).toFixed(2), z: +(z0 + r * dz).toFixed(2), facing });
  }
  return out;
}

// Race layout in a narrow 7 m × 48 m corridor. Competitors start at the +z end
// and shuttle between the versa climbers (100 m climb, done 5×) and the five
// workout stations. Kit is packed into 3 columns (x = -2, 0, 2) down the
// corridor. `entrance`/`exit` are the editable start and finish points.
export const DEFAULT_LAYOUT = {
  width: 7,
  depth: 48,
  entrance: { x: 0, z: 23 },
  exit: { x: 0, z: -23 },
  stations: [
    // 20 Versa Climbers — the climb, used five times per competitor
    ...block('versaClimber', 20, { x0: -2, z0: 23, cols: 3, dx: 2, dz: -1.5 }),
    // 12 Bench Squat
    ...block('bench', 12, { x0: -2, z0: 12.5, cols: 3, dx: 2, dz: -1.7 }),
    // 12 Box Step-up
    ...block('boxStep', 12, { x0: -2, z0: 5.8, cols: 3, dx: 2, dz: -1.5 }),
    // 12 Hang Bar
    ...block('hangBar', 12, { x0: -2, z0: -0.3, cols: 3, dx: 2, dz: -1.7 }),

    // Two 20-person movement zones, stacked toward the finish end
    { type: 'walkingLunge', x: 0, z: -9, facing: [0, 1], capacity: 20 },
    { type: 'elephantWalk', x: 0, z: -16, facing: [0, 1], capacity: 20 },
  ],
};

export function typeColorHex(type) {
  return '#' + EQUIPMENT_TYPES[type].color.toString(16).padStart(6, '0');
}
