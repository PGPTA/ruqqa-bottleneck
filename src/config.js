// Shared, mutable gym configuration. The start (entrance) and finish (exit)
// points are editable in the layout editor and persisted with the layout.
// Simulation reads these live.

export const gym = {
  width: 7,
  depth: 48,
  entrance: { x: 0, z: 23 },
  exit: { x: 0, z: -23 },
};

// Sensible default marker positions for a given gym depth (door on +z wall).
export function defaultMarkers(depth) {
  const z = depth / 2 - 2;
  return { entrance: { x: -3, z }, exit: { x: 3, z } };
}

export const FLOOR_MARGIN = 2.5; // keep kit this far from the walls

export function clampToFloor(x, z, margin = FLOOR_MARGIN) {
  const hx = gym.width / 2 - margin;
  const hz = gym.depth / 2 - margin;
  return {
    x: Math.max(-hx, Math.min(hx, x)),
    z: Math.max(-hz, Math.min(hz, z)),
  };
}

export const STORAGE_KEY = 'gymLayout.v8';
