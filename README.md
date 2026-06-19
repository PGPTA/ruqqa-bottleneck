# Gym Flow Simulator

A 3D fitness-gym simulation built with [Three.js](https://threejs.org/) and Vite.
Send waves of people into the gym, tell them which equipment to use and for how
long, and watch where **bottlenecks** form.

## What it does

- A 3D gym floor with realistic-ish equipment: treadmills, bikes, rowers, squat
  racks, benches, machines, a dumbbell area and functional mats.
- **Waves** – schedule groups of people to arrive at set times (e.g. 8 people at
  0 min, 10 people at 5 min, …). Each wave is colour-coded so you can track it.
- **Routines** – each wave follows a routine: a list of equipment to use, in
  order, each for a set number of minutes. Fully editable.
- People walk to their equipment, **queue when it is busy**, use it, then move on
  to the next item in their routine and finally leave.
- **Bottleneck detection**:
  - Equipment pads turn green → red as queues build.
  - Floating labels show `in-use / capacity (+queue)`.
  - The right-hand panel shows live utilisation %, current queue, max queue and
    average wait time per equipment type. Bottlenecked rows turn red.

## Running it

```bash
npm install
npm run dev
```

Then open the printed URL (default http://localhost:5173).

To make a production build:

```bash
npm run build
npm run preview
```

## Deploying to Netlify

This repo includes a `netlify.toml`, so deploys work with zero extra setup.

**Option A – connect the repo (recommended):**

1. Push to GitHub (already done for this project).
2. In Netlify, choose **Add new site → Import an existing project** and pick the
   `ruqqa-bottleneck` repo.
3. Netlify reads `netlify.toml` and uses build command `npm run build` and
   publish directory `dist` automatically. Click **Deploy**.

**Option B – deploy from your machine with the Netlify CLI:**

```bash
npm install -g netlify-cli
netlify login
npm run build
netlify deploy --prod    # publishes the dist/ folder
```

Every push to the connected branch triggers a fresh build and deploy.

## How to use

1. **Speed** – the slider fast-forwards gym time (default 10×) so a 60-minute
   session plays out in a minute or so.
2. Press **Start** to run, **Pause** to freeze, **Reset** to clear everyone and
   restart the clock.
3. **Add waves** on the left: set when they arrive, how many people, and which
   routine they follow.
4. **Edit routines** to change which kit is used and for how long. Changes to
   future waves take effect immediately; press **Reset** to re-run from 0:00.
5. Watch the right-hand panel and the floor colours to spot the kit that people
   pile up waiting for — that is your bottleneck.

## Project layout

| File | Purpose |
|------|---------|
| `src/equipment.js` | Equipment catalogue + physical gym layout |
| `src/gym.js` | Builds the 3D scene (floor, walls, equipment, labels) |
| `src/npc.js` | A single person (mesh + movement) |
| `src/simulation.js` | Simulation engine: waves, queues, routines, stats |
| `src/ui.js` | Control panel (waves, routines, clock, stats table) |
| `src/main.js` | Renderer, camera, lights and the main loop |

## Tuning ideas

- Change how many of each machine exist, or move them around, in
  `STATION_LAYOUT` in `src/equipment.js`.
- Multi-person stations (dumbbell area, mats) use the `capacity` field in
  `EQUIPMENT_TYPES`.
- The "bottleneck" threshold (queue length / wait time) lives in
  `getStats()` in `src/simulation.js`.
