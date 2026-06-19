import * as THREE from 'three';

// A jointed human figure in athletic wear. NPCs are randomly male or female
// (different builds, hair and clothing). Skin is a natural tone, the workout
// top carries the wave colour for identification, and shorts/leggings are dark.
// The gait is driven by distance travelled; each kit type has its own animation.

const SKIN_TONES = [0xf2c5a4, 0xe6b48c, 0xd29b6e, 0xb87a4b, 0x8d5a32, 0x6b4326];
const HAIR_TONES = [0x14100c, 0x2a1d12, 0x3c2a1a, 0x5a3a22, 0x0b0a09, 0x6e5236];
const BOTTOM_COLOR = 0x2a2d33;
const SHOE_COLOR = 0x9aa0a8;

// which animation each kit type uses while a person is exercising on it
const EX_ANIM = {
  treadmill: '_animTreadmill',
  bike: '_animBike',
  rower: '_animRow',
  versaClimber: '_animClimb',
  squatRack: '_animSquat',
  bench: '_animPress',
  legPress: '_animLegPress',
  cable: '_animPulldown',
  latPull: '_animPulldown',
  boxStep: '_animBoxStep',
  crawl: '_animCrawl',
  dumbbells: '_animCurl',
  mats: '_animStretch',
  walkingLunge: '_animLunge',
  elephantWalk: '_animElephant',
};

let G = null;

function getShared() {
  if (!G) {
    G = {
      head: new THREE.SphereGeometry(0.15, 18, 14),
      hair: new THREE.SphereGeometry(0.155, 16, 12),
      ponytail: new THREE.CapsuleGeometry(0.055, 0.22, 5, 10),
      neck: new THREE.CylinderGeometry(0.055, 0.07, 0.11, 10),
      torso: new THREE.CapsuleGeometry(0.19, 0.34, 8, 16),
      pelvis: new THREE.SphereGeometry(0.18, 16, 12),
      shoulder: new THREE.SphereGeometry(0.095, 12, 10),
      thigh: new THREE.CapsuleGeometry(0.1, 0.3, 6, 12),
      shin: new THREE.CapsuleGeometry(0.085, 0.3, 6, 12),
      ankleBall: new THREE.SphereGeometry(0.07, 10, 8),
      foot: new THREE.CapsuleGeometry(0.062, 0.17, 6, 12), // rounded heel→toe
      sole: new THREE.BoxGeometry(0.135, 0.05, 0.32),
      upperArm: new THREE.CapsuleGeometry(0.07, 0.2, 6, 12),
      foreArm: new THREE.CapsuleGeometry(0.06, 0.2, 6, 12),
      hand: new THREE.SphereGeometry(0.062, 10, 8),
    };
  }
  return G;
}

export class NPC {
  constructor(scene, color, start, waveId) {
    const g = getShared();
    this.group = new THREE.Group();
    this.color = color;
    this.waveId = waveId;

    const female = Math.random() < 0.5;
    this.female = female;

    // build differences between female / male figures
    const B = female
      ? { shoulderX: 0.185, hip: 1.12, arm: 0.86, torsoW: 1.12, torsoD: 0.72, height: 0.96 }
      : { shoulderX: 0.25, hip: 0.92, arm: 1.18, torsoW: 1.46, torsoD: 0.84, height: 1.05 };
    this.group.scale.setScalar(B.height);

    // materials: natural skin, wave-coloured top, dark bottoms, grey shoes, hair
    const skin = new THREE.MeshStandardMaterial({ color: SKIN_TONES[(Math.random() * SKIN_TONES.length) | 0], roughness: 0.78, metalness: 0 });
    const top = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.06 });
    const bottom = new THREE.MeshStandardMaterial({ color: BOTTOM_COLOR, roughness: 0.8, metalness: 0.02 });
    const shoe = new THREE.MeshStandardMaterial({ color: SHOE_COLOR, roughness: 0.55, metalness: 0.1 });
    const sole = new THREE.MeshStandardMaterial({ color: 0x111316, roughness: 0.7, metalness: 0.05 });
    const hairMat = new THREE.MeshStandardMaterial({ color: HAIR_TONES[(Math.random() * HAIR_TONES.length) | 0], roughness: 0.9 });
    this._mats = [skin, top, bottom, shoe, sole, hairMat];
    this.bodyMat = top;

    // pelvis / hips (clothed) stays with the legs; the upper body leans at the waist
    const pelvis = new THREE.Mesh(g.pelvis, bottom);
    pelvis.position.y = 0.88;
    pelvis.scale.set(1.18 * B.hip, 0.8, 0.82);
    pelvis.castShadow = true;
    this.group.add(pelvis);

    const upper = new THREE.Group();
    upper.position.y = 0.95;
    this.group.add(upper);
    this.upper = upper;

    // torso = workout top (tank top / sports bra) in the wave colour
    const torso = new THREE.Mesh(g.torso, top);
    torso.position.y = 0.24;
    torso.scale.set(B.torsoW, 1, B.torsoD);
    torso.castShadow = true;
    upper.add(torso);

    const neck = new THREE.Mesh(g.neck, skin);
    neck.position.set(0, 0.5, 0.01);
    neck.castShadow = true;
    upper.add(neck);

    const head = new THREE.Mesh(g.head, skin);
    head.position.set(0, 0.64, 0.02);
    head.scale.set(0.98, 1.08, 1);
    head.castShadow = true;
    upper.add(head);

    const hair = new THREE.Mesh(g.hair, hairMat);
    hair.position.set(0, 0.69, female ? -0.02 : -0.005);
    hair.scale.set(1.02, female ? 0.78 : 0.66, 1.04);
    hair.castShadow = true;
    upper.add(hair);
    if (female) {
      const tail = new THREE.Mesh(g.ponytail, hairMat);
      tail.position.set(0, 0.6, -0.16);
      tail.rotation.x = 0.5;
      tail.castShadow = true;
      upper.add(tail);
    }

    // bare shoulders (sleeveless top)
    for (const sx of [-B.shoulderX, B.shoulderX]) {
      const sh = new THREE.Mesh(g.shoulder, skin);
      sh.position.set(sx, 0.46, 0);
      sh.scale.setScalar(B.arm);
      sh.castShadow = true;
      upper.add(sh);
    }

    // legs: men wear shorts (bare shins + trainers); women wear full leggings
    // (covered shins + bare feet).
    const legParts = female
      ? { thigh: bottom, shin: bottom, foot: skin, ankle: skin, sole, isShoe: false }
      : { thigh: bottom, shin: skin, foot: shoe, ankle: skin, sole, isShoe: true };
    this.legL = this._makeLeg(g, legParts, -0.1);
    this.legR = this._makeLeg(g, legParts, 0.1);
    this.armL = this._makeArm(g, skin, upper, -0.22 - B.shoulderX * 0.05, B.arm);
    this.armR = this._makeArm(g, skin, upper, 0.22 + B.shoulderX * 0.05, B.arm);

    this.pos = new THREE.Vector2(start.x, start.z);
    this.group.position.set(start.x, 0, start.z);
    scene.add(this.group);

    this.speed = 2.6 + Math.random() * 0.8;
    this.runSpeed = 4.4 + Math.random() * 1.2;
    this.target = null;
    this.arrived = true;

    this._lastPos = this.pos.clone();
    this.stridePhase = Math.random() * Math.PI * 2;

    this.state = 'spawning';
    this.routine = [];
    this.stepIndex = 0;
    this.station = null;
    this.slotIndex = -1;
    this.exerciseEnd = 0;
    this.waitStart = 0;
    this.bob = Math.random() * Math.PI * 2;
  }

  _makeLeg(g, parts, x) {
    const hip = new THREE.Group();
    hip.position.set(x, 0.92, 0);
    const thigh = new THREE.Mesh(g.thigh, parts.thigh);
    thigh.position.y = -0.23;
    thigh.castShadow = true;
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.46;
    hip.add(knee);
    const shin = new THREE.Mesh(g.shin, parts.shin);
    shin.position.y = -0.22;
    shin.castShadow = true;
    knee.add(shin);
    const ankle = new THREE.Group();
    ankle.position.y = -0.44;
    knee.add(ankle);

    // ankle bone (bare skin) + a rounded foot pointing forward
    const ab = new THREE.Mesh(g.ankleBall, parts.ankle);
    ab.scale.setScalar(0.7);
    ankle.add(ab);
    const foot = new THREE.Mesh(g.foot, parts.foot);
    foot.rotation.x = Math.PI / 2;
    foot.scale.set(1, 0.6, 1); // flatten the pill into a foot
    foot.position.set(0, parts.isShoe ? 0.065 : 0.025, 0.08);
    foot.castShadow = true;
    ankle.add(foot);
    if (parts.isShoe) {
      const sole = new THREE.Mesh(g.sole, parts.sole);
      sole.position.set(0, 0.005, 0.07);
      sole.castShadow = true;
      ankle.add(sole);
    }
    this.group.add(hip);
    return { hip, knee, ankle };
  }

  _makeArm(g, mat, upper, x, thick = 1) {
    const sh = new THREE.Group();
    sh.position.set(x, 0.46, 0);
    upper.add(sh);
    const ua = new THREE.Mesh(g.upperArm, mat);
    ua.position.y = -0.17;
    ua.scale.set(thick, 1, thick);
    ua.castShadow = true;
    sh.add(ua);
    const el = new THREE.Group();
    el.position.y = -0.34;
    sh.add(el);
    const fa = new THREE.Mesh(g.foreArm, mat);
    fa.position.y = -0.16;
    fa.scale.set(thick, 1, thick);
    fa.castShadow = true;
    el.add(fa);
    const hand = new THREE.Mesh(g.hand, mat);
    hand.position.y = -0.3;
    el.add(hand);
    return { shoulder: sh, elbow: el };
  }

  setTarget(p) {
    this.target = new THREE.Vector2(p.x, p.z);
    this.arrived = false;
  }

  move(dt) {
    if (!this.target || this.arrived) return false;
    const dir = this.target.clone().sub(this.pos);
    const dist = dir.length();
    const step = this.speed * dt;
    if (dist <= step || dist < 0.05) {
      this.pos.copy(this.target);
      this.arrived = true;
      this.group.position.set(this.pos.x, this.group.position.y, this.pos.y);
      return true;
    }
    dir.multiplyScalar(step / dist);
    this.pos.add(dir);
    this.group.position.set(this.pos.x, this.group.position.y, this.pos.y);
    this.group.rotation.y = Math.atan2(dir.x, dir.y);
    return false;
  }

  animate(t) {
    const moved = this.pos.distanceTo(this._lastPos);
    this._lastPos.copy(this.pos);

    if (moved > 0.0006) {
      this._animGait(this.state === 'running', moved);
    } else if (this.state === 'exercising') {
      const fn = EX_ANIM[this.station ? this.station.type : ''] || '_animGeneric';
      this[fn](t);
    } else {
      this._animIdle();
    }
  }

  _animGait(running, moved) {
    this.stridePhase += moved * (running ? 2.0 : 2.45);
    const p = this.stridePhase;
    const amp = running ? 0.95 : 0.55;
    const kneeAmp = running ? 1.55 : 0.9;
    const sL = Math.sin(p);
    const sR = Math.sin(p + Math.PI);

    this.legL.hip.rotation.x = sL * amp;
    this.legR.hip.rotation.x = sR * amp;
    const kL = -Math.max(0, Math.sin(p + 0.5)) * kneeAmp - 0.05;
    const kR = -Math.max(0, Math.sin(p + Math.PI + 0.5)) * kneeAmp - 0.05;
    this.legL.knee.rotation.x = kL;
    this.legR.knee.rotation.x = kR;
    // ankles: toe-off when the leg swings back, ground clearance on the lift
    this.legL.ankle.rotation.x = -sL * 0.35 - kL * 0.25 + 0.08;
    this.legR.ankle.rotation.x = -sR * 0.35 - kR * 0.25 + 0.08;

    // arms swing opposite the legs with a dynamic elbow pump
    const armAmp = running ? 0.95 : 0.62;
    this.armL.shoulder.rotation.x = sR * armAmp;
    this.armR.shoulder.rotation.x = sL * armAmp;
    const baseElb = running ? -1.4 : -0.5;
    const pump = running ? 0.55 : 0.28;
    this.armL.elbow.rotation.x = baseElb - Math.max(0, sR) * pump;
    this.armR.elbow.rotation.x = baseElb - Math.max(0, sL) * pump;
    this.armL.shoulder.rotation.z = 0.06;
    this.armR.shoulder.rotation.z = -0.06;

    // forward lean, with the torso counter-rotating and swaying for life
    this.upper.rotation.x = running ? 0.28 : 0.08;
    this.upper.rotation.y = -sL * (running ? 0.2 : 0.11);
    this.upper.rotation.z = sL * (running ? 0.06 : 0.035);
    this.group.position.y = Math.abs(Math.cos(p)) * (running ? 0.1 : 0.05);
  }

  _animIdle() {
    this._ease(this.legL.hip, 0);
    this._ease(this.legR.hip, 0);
    this._ease(this.legL.knee, -0.05);
    this._ease(this.legR.knee, -0.05);
    this._ease(this.legL.ankle, 0.05);
    this._ease(this.legR.ankle, 0.05);
    this._ease(this.armL.shoulder, 0);
    this._ease(this.armR.shoulder, 0);
    this._ease(this.armL.elbow, -0.18);
    this._ease(this.armR.elbow, -0.18);
    this.armL.shoulder.rotation.z += (0.12 - this.armL.shoulder.rotation.z) * 0.2;
    this.armR.shoulder.rotation.z += (-0.12 - this.armR.shoulder.rotation.z) * 0.2;
    // gentle breathing bob
    const breath = Math.sin(performance.now() * 0.0016 + this.bob) * 0.006;
    this.upper.rotation.x += (breath - this.upper.rotation.x) * 0.5;
    this.upper.rotation.y *= 0.7;
    this.upper.rotation.z *= 0.7;
    this.group.position.y *= 0.7;
  }

  // arms helper: set both arms' shoulder/elbow at once
  _arms(shL, shR, elL, elR, zL = 0.08, zR = -0.08) {
    this.armL.shoulder.rotation.x = shL;
    this.armR.shoulder.rotation.x = shR;
    this.armL.elbow.rotation.x = elL;
    this.armR.elbow.rotation.x = elR;
    this.armL.shoulder.rotation.z = zL;
    this.armR.shoulder.rotation.z = zR;
  }

  _animGeneric(t) {
    const c = -0.95 + Math.sin(t * 4 + this.bob) * 0.5;
    this._arms(c, c, -0.9, -0.9);
    this._ease(this.legL.hip, 0);
    this._ease(this.legR.hip, 0);
    this._ease(this.legL.knee, -0.08);
    this._ease(this.legR.knee, -0.08);
    this.group.position.y = Math.abs(Math.sin(t * 4 + this.bob)) * 0.05;
    this.upper.rotation.x = 0.03;
    this._ease(this.legL.ankle, 0.05);
    this._ease(this.legR.ankle, 0.05);
  }

  // running on the spot (treadmill)
  _animTreadmill(t) {
    const p = t * 7.5 + this.bob;
    const sL = Math.sin(p);
    const sR = Math.sin(p + Math.PI);
    this.legL.hip.rotation.x = sL * 0.85;
    this.legR.hip.rotation.x = sR * 0.85;
    const kL = -Math.max(0, Math.sin(p + 0.5)) * 1.5 - 0.1;
    const kR = -Math.max(0, Math.sin(p + Math.PI + 0.5)) * 1.5 - 0.1;
    this.legL.knee.rotation.x = kL;
    this.legR.knee.rotation.x = kR;
    this.legL.ankle.rotation.x = -sL * 0.3 + 0.1;
    this.legR.ankle.rotation.x = -sR * 0.3 + 0.1;
    this._arms(sR * 0.7, sL * 0.7, -1.35, -1.35);
    this.upper.rotation.x = 0.22;
    this.upper.rotation.z = 0;
    this.group.position.y = Math.abs(Math.cos(p)) * 0.07;
  }

  // seated pedalling (exercise bike)
  _animBike(t) {
    const p = t * 5 + this.bob;
    this.legL.hip.rotation.x = -1.3 + Math.sin(p) * 0.18;
    this.legR.hip.rotation.x = -1.3 + Math.sin(p + Math.PI) * 0.18;
    this.legL.knee.rotation.x = -1.35 + Math.sin(p + Math.PI) * 0.55;
    this.legR.knee.rotation.x = -1.35 + Math.sin(p) * 0.55;
    this.legL.ankle.rotation.x = 0.25 + Math.sin(p) * 0.2;
    this.legR.ankle.rotation.x = 0.25 + Math.sin(p + Math.PI) * 0.2;
    this._arms(-0.75, -0.75, -0.5, -0.5, 0.18, -0.18); // hands forward on bars
    this.upper.rotation.x = 0.42;
    this.upper.rotation.z = 0;
    this.group.position.y = 0;
  }

  // rowing machine: drive with the legs, pull with the arms, lean back
  _animRow(t) {
    const p = t * 2.6 + this.bob;
    const drive = Math.sin(p) * 0.5 + 0.5; // 0 = compressed, 1 = extended
    this.legL.hip.rotation.x = -1.25 + drive * 0.85;
    this.legR.hip.rotation.x = -1.25 + drive * 0.85;
    this.legL.knee.rotation.x = -1.5 + drive * 1.25;
    this.legR.knee.rotation.x = -1.5 + drive * 1.25;
    this.legL.ankle.rotation.x = 0.3 - drive * 0.25;
    this.legR.ankle.rotation.x = 0.3 - drive * 0.25;
    const sh = -0.55 + drive * 0.5;
    const el = -0.35 - drive * 1.15; // bend elbows as the handle comes in
    this._arms(sh, sh, el, el, 0.05, -0.05);
    this.upper.rotation.x = 0.35 - drive * 0.7; // lean back on the drive
    this.group.position.y = 0;
  }

  // squats with a bar across the shoulders
  _animSquat(t) {
    const p = t * 2.4 + this.bob;
    const down = Math.sin(p) * 0.5 + 0.5;
    this.legL.hip.rotation.x = -down * 1.0;
    this.legR.hip.rotation.x = -down * 1.0;
    this.legL.knee.rotation.x = -down * 1.5 - 0.1;
    this.legR.knee.rotation.x = -down * 1.5 - 0.1;
    this.legL.ankle.rotation.x = down * 0.5 + 0.05;
    this.legR.ankle.rotation.x = down * 0.5 + 0.05;
    this._arms(-2.5, -2.5, -1.5, -1.5, 0.3, -0.3); // hands up holding the bar
    this.upper.rotation.x = 0.12 + down * 0.25;
    this.group.position.y = -down * 0.34;
  }

  // overhead / chest press
  _animPress(t) {
    const push = Math.sin(t * 3 + this.bob) * 0.5 + 0.5;
    const sh = -1.2 - push * 1.3;
    const el = -1.5 + push * 1.35;
    this._arms(sh, sh, el, el, 0.25, -0.25);
    this._ease(this.legL.hip, -0.05);
    this._ease(this.legR.hip, -0.05);
    this._ease(this.legL.knee, -0.18);
    this._ease(this.legR.knee, -0.18);
    this._ease(this.legL.ankle, 0.06);
    this._ease(this.legR.ankle, 0.06);
    this.upper.rotation.x = 0.04;
    this.group.position.y = 0;
  }

  // seated leg press: legs extend and retract together
  _animLegPress(t) {
    const push = Math.sin(t * 2.6 + this.bob) * 0.5 + 0.5;
    this.legL.hip.rotation.x = -1.35 + push * 0.15;
    this.legR.hip.rotation.x = -1.35 + push * 0.15;
    this.legL.knee.rotation.x = -1.6 + push * 1.4;
    this.legR.knee.rotation.x = -1.6 + push * 1.4;
    this.legL.ankle.rotation.x = 0.2;
    this.legR.ankle.rotation.x = 0.2;
    this._arms(-0.3, -0.3, -0.5, -0.5, 0.22, -0.22);
    this.upper.rotation.x = 0.2;
    this.group.position.y = 0;
  }

  // lat pulldown / cable: pull the bar down from overhead
  _animPulldown(t) {
    const pull = Math.sin(t * 3 + this.bob) * 0.5 + 0.5;
    const sh = -2.6 + pull * 1.5;
    const el = -0.25 - pull * 1.1;
    this._arms(sh, sh, el, el, 0.35, -0.35);
    this._ease(this.legL.hip, -0.05);
    this._ease(this.legR.hip, -0.05);
    this._ease(this.legL.knee, -0.12);
    this._ease(this.legR.knee, -0.12);
    this._ease(this.legL.ankle, 0.06);
    this._ease(this.legR.ankle, 0.06);
    this.upper.rotation.x = 0.06 + pull * 0.06;
    this.group.position.y = 0;
  }

  // alternating dumbbell curls
  _animCurl(t) {
    const p = t * 3 + this.bob;
    const cL = Math.sin(p) * 0.5 + 0.5;
    const cR = Math.sin(p + Math.PI) * 0.5 + 0.5;
    this.armL.shoulder.rotation.x = -0.2;
    this.armR.shoulder.rotation.x = -0.2;
    this.armL.shoulder.rotation.z = 0.16;
    this.armR.shoulder.rotation.z = -0.16;
    this.armL.elbow.rotation.x = -0.3 - cL * 2.0;
    this.armR.elbow.rotation.x = -0.3 - cR * 2.0;
    this._ease(this.legL.hip, 0);
    this._ease(this.legR.hip, 0);
    this._ease(this.legL.knee, -0.06);
    this._ease(this.legR.knee, -0.06);
    this._ease(this.legL.ankle, 0.05);
    this._ease(this.legR.ankle, 0.05);
    this.upper.rotation.x = 0.03;
    this.group.position.y = 0;
  }

  // gentle stretching on the mats
  _animStretch(t) {
    const p = t * 1.4 + this.bob;
    const reach = Math.sin(p) * 0.5 + 0.5;
    const sh = -0.3 - reach * 2.3; // raise arms overhead
    this._arms(sh, sh, -0.15, -0.15, 0.2 + reach * 0.3, -0.2 - reach * 0.3);
    this._ease(this.legL.hip, 0);
    this._ease(this.legR.hip, 0);
    this._ease(this.legL.knee, -0.05);
    this._ease(this.legR.knee, -0.05);
    this._ease(this.legL.ankle, 0.05);
    this._ease(this.legR.ankle, 0.05);
    this.upper.rotation.x = 0.02;
    this.upper.rotation.z = Math.sin(p * 0.7) * 0.16; // sway side to side
    this.group.position.y = 0;
  }

  // walking lunges: alternate deep forward lunges, dipping the body down
  _animLunge(t) {
    const s = Math.sin(t * 2.2 + this.bob);
    const fwd = Math.max(0, s); // left leg forward
    const bwd = Math.max(0, -s); // right leg forward
    this.legL.hip.rotation.x = -fwd * 0.95 + bwd * 0.55;
    this.legR.hip.rotation.x = -bwd * 0.95 + fwd * 0.55;
    this.legL.knee.rotation.x = -fwd * 1.25 - 0.1 - bwd * 0.35;
    this.legR.knee.rotation.x = -bwd * 1.25 - 0.1 - fwd * 0.35;
    this.legL.ankle.rotation.x = 0.12;
    this.legR.ankle.rotation.x = 0.12;
    this._arms(0.05, 0.05, -0.25, -0.25, 0.22, -0.22); // hands by the hips
    this.upper.rotation.x = 0.05;
    this.upper.rotation.z = 0;
    this.group.position.y = -Math.abs(s) * 0.24; // dip on each lunge
  }

  // elephant walk: bent over at the waist, near-straight legs, hands to the floor
  _animElephant(t) {
    const p = t * 2.6 + this.bob;
    const sL = Math.sin(p);
    const sR = Math.sin(p + Math.PI);
    this.upper.rotation.x = -1.15;
    this.upper.rotation.z = 0;
    this.legL.hip.rotation.x = sL * 0.4;
    this.legR.hip.rotation.x = sR * 0.4;
    this.legL.knee.rotation.x = -0.1 - Math.max(0, sL) * 0.25;
    this.legR.knee.rotation.x = -0.1 - Math.max(0, sR) * 0.25;
    this.legL.ankle.rotation.x = 0.1;
    this.legR.ankle.rotation.x = 0.1;
    this.armL.shoulder.rotation.x = -1.6 + sR * 0.3; // arms hang toward the floor
    this.armR.shoulder.rotation.x = -1.6 + sL * 0.3;
    this.armL.shoulder.rotation.z = 0.06;
    this.armR.shoulder.rotation.z = -0.06;
    this.armL.elbow.rotation.x = -0.12;
    this.armR.elbow.rotation.x = -0.12;
    this.group.position.y = 0;
  }

  _animClimb(t) {
    const s = Math.sin(t * 6 + this.bob);
    this.armL.shoulder.rotation.x = -2.35 + s * 0.7;
    this.armR.shoulder.rotation.x = -2.35 - s * 0.7;
    this.armL.elbow.rotation.x = -0.5 + Math.max(0, s) * 0.7;
    this.armR.elbow.rotation.x = -0.5 + Math.max(0, -s) * 0.7;
    this.legL.hip.rotation.x = -s * 0.5;
    this.legR.hip.rotation.x = s * 0.5;
    this.legL.knee.rotation.x = -Math.max(0, -s) * 1.0 - 0.1;
    this.legR.knee.rotation.x = -Math.max(0, s) * 1.0 - 0.1;
    this.upper.rotation.x = 0.14;
    this.group.position.y = (s * 0.5 + 0.5) * 0.06;
    this.legL.ankle.rotation.x = Math.max(0, -s) * 0.4 + 0.05;
    this.legR.ankle.rotation.x = Math.max(0, s) * 0.4 + 0.05;
  }

  _animBoxStep(t) {
    const s = Math.sin(t * 3.2 + this.bob);
    const liftL = Math.max(0, s);
    const liftR = Math.max(0, -s);
    this.legL.hip.rotation.x = liftL * 1.25;
    this.legR.hip.rotation.x = liftR * 1.25;
    this.legL.knee.rotation.x = -liftL * 1.6 - 0.05;
    this.legR.knee.rotation.x = -liftR * 1.6 - 0.05;
    this.armL.shoulder.rotation.x = s * 0.4;
    this.armR.shoulder.rotation.x = -s * 0.4;
    this.armL.elbow.rotation.x = -0.6;
    this.armR.elbow.rotation.x = -0.6;
    this.group.position.y = Math.abs(s) * 0.13;
    this.upper.rotation.x = 0.08;
    this.legL.ankle.rotation.x = liftL * 0.5 + 0.05;
    this.legR.ankle.rotation.x = liftR * 0.5 + 0.05;
  }

  _animCrawl(t) {
    const s = Math.sin(t * 5 + this.bob);
    this.upper.rotation.x = -1.25;
    this.armL.shoulder.rotation.x = -1.35 + s * 0.7;
    this.armR.shoulder.rotation.x = -1.35 - s * 0.7;
    this.armL.elbow.rotation.x = -0.7;
    this.armR.elbow.rotation.x = -0.7;
    this.legL.hip.rotation.x = -0.85 - s * 0.4;
    this.legR.hip.rotation.x = -0.85 + s * 0.4;
    this.legL.knee.rotation.x = -1.3;
    this.legR.knee.rotation.x = -1.3;
    this.group.position.y = 0.0 + Math.abs(Math.sin(t * 10)) * 0.02;
    this._ease(this.legL.ankle, 0.4);
    this._ease(this.legR.ankle, 0.4);
  }

  _ease(obj, target) {
    obj.rotation.x += (target - obj.rotation.x) * 0.2;
  }

  dispose(scene) {
    scene.remove(this.group);
    for (const m of this._mats) m.dispose();
  }
}
