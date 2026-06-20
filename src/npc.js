import * as THREE from 'three';

// A jointed human figure in athletic wear. NPCs are randomly male or female
// (different builds, hair and clothing). Skin is a natural tone, the workout
// top carries the wave colour for identification, and shorts/leggings are dark.
//
// Animation uses a pose-target system: each frame the active animation produces
// a *target* pose (a set of joint angles) and the body eases toward it. That
// keeps every motion smooth and blends cleanly between walking, queueing and
// using each piece of kit.

const SKIN_TONES = [0xf2c5a4, 0xe6b48c, 0xd29b6e, 0xb87a4b, 0x8d5a32, 0x6b4326];
const HAIR_TONES = [0x14100c, 0x2a1d12, 0x3c2a1a, 0x5a3a22, 0x0b0a09, 0x6e5236];
const BOTTOM_COLOR = 0x2a2d33;
const SHOE_COLOR = 0x9aa0a8;
const PACK_COLORS = [0x3b4149, 0x4a4d3c, 0x2f3640, 0x55402c, 0x394b44];

// which pose-generator each kit type uses while a person is exercising on it
const EX_POSE = {
  treadmill: '_poseTreadmill',
  bike: '_poseBike',
  rower: '_poseRow',
  versaClimber: '_poseClimb',
  squatRack: '_poseSquat',
  bench: '_poseSquat', // "Bench Squat"
  hangBar: '_poseHang',
  legPress: '_poseLegPress',
  cable: '_posePulldown',
  latPull: '_posePulldown',
  boxStep: '_poseBoxStep',
  crawl: '_poseCrawl',
  dumbbells: '_poseCurl',
  mats: '_poseStretch',
  walkingLunge: '_poseLunge',
  elephantWalk: '_poseElephant',
};

// neutral standing pose; animations override only the joints they care about
const NEUTRAL = {
  hipL: 0, hipR: 0, kneeL: -0.05, kneeR: -0.05, ankL: 0.05, ankR: 0.05,
  shLx: 0, shRx: 0, shLz: 0.11, shRz: -0.11, elL: -0.18, elR: -0.18,
  upx: 0, upy: 0, upz: 0, rootY: 0,
};

let G = null;

function getShared() {
  if (!G) {
    // clean low-poly parts: tapered "bone" cylinders capped by sphere joints,
    // flat-shaded for a crisp stylized game-character look.
    G = {
      head: new THREE.SphereGeometry(0.17, 12, 10),
      hairCap: new THREE.SphereGeometry(0.183, 12, 9),
      hairBack: new THREE.SphereGeometry(0.16, 10, 8),
      ponytail: new THREE.ConeGeometry(0.075, 0.36, 8),
      eye: new THREE.SphereGeometry(0.024, 8, 6),
      nose: new THREE.ConeGeometry(0.03, 0.06, 6),
      neck: new THREE.CylinderGeometry(0.06, 0.072, 0.12, 10),
      torso: new THREE.CylinderGeometry(0.2, 0.135, 0.5, 12),
      chest: new THREE.SphereGeometry(0.2, 12, 9),
      waist: new THREE.SphereGeometry(0.145, 10, 8),
      pelvis: new THREE.CylinderGeometry(0.16, 0.14, 0.22, 12),
      bust: new THREE.SphereGeometry(0.078, 10, 8),
      shoulderBall: new THREE.SphereGeometry(0.088, 10, 8),
      joint: new THREE.SphereGeometry(0.066, 10, 8),
      upperArm: new THREE.CylinderGeometry(0.064, 0.05, 0.32, 8),
      foreArm: new THREE.CylinderGeometry(0.05, 0.04, 0.3, 8),
      hand: new THREE.SphereGeometry(0.072, 9, 7),
      thigh: new THREE.CylinderGeometry(0.1, 0.072, 0.44, 10),
      shin: new THREE.CylinderGeometry(0.072, 0.052, 0.42, 10),
      footSole: new THREE.BoxGeometry(0.12, 0.07, 0.3),
      footToe: new THREE.SphereGeometry(0.074, 10, 8),
      midsole: new THREE.BoxGeometry(0.13, 0.03, 0.32),
      packBody: new THREE.BoxGeometry(0.32, 0.42, 0.18),
      packLid: new THREE.BoxGeometry(0.3, 0.14, 0.16),
      strap: new THREE.BoxGeometry(0.05, 0.4, 0.05),
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
      ? { shoulderX: 0.185, hip: 1.14, arm: 0.85, torsoW: 1.1, torsoD: 0.74, height: 0.96 }
      : { shoulderX: 0.255, hip: 0.92, arm: 1.16, torsoW: 1.46, torsoD: 0.85, height: 1.05 };
    this.group.scale.setScalar(B.height);

    // stylized materials: flat-shaded facets, a clean limited palette
    const fs = { flatShading: true };
    const skin = new THREE.MeshStandardMaterial({ color: SKIN_TONES[(Math.random() * SKIN_TONES.length) | 0], roughness: 0.78, metalness: 0, ...fs });
    const top = new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.02, ...fs });
    const bottom = new THREE.MeshStandardMaterial({ color: BOTTOM_COLOR, roughness: 0.8, metalness: 0.02, ...fs });
    const shoe = new THREE.MeshStandardMaterial({ color: SHOE_COLOR, roughness: 0.55, metalness: 0.08, ...fs });
    const midsoleMat = new THREE.MeshStandardMaterial({ color: 0xeef1f4, roughness: 0.6, metalness: 0.02, ...fs });
    const hairMat = new THREE.MeshStandardMaterial({ color: HAIR_TONES[(Math.random() * HAIR_TONES.length) | 0], roughness: 0.95, ...fs });
    const packCol = PACK_COLORS[(Math.random() * PACK_COLORS.length) | 0];
    const packMat = new THREE.MeshStandardMaterial({ color: packCol, roughness: 0.85, metalness: 0.06, ...fs });
    const strapMat = new THREE.MeshStandardMaterial({ color: 0x202327, roughness: 0.9, metalness: 0.04, ...fs });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.3, metalness: 0.1 });
    this._mats = [skin, top, bottom, shoe, midsoleMat, hairMat, packMat, strapMat, eyeMat];
    this.bodyMat = top;

    // hips (dark shorts/leggings) stay with the legs; the upper body leans
    const pelvis = new THREE.Mesh(g.pelvis, bottom);
    pelvis.position.y = 0.86;
    pelvis.scale.set(1.06 * B.hip, 1, 0.82);
    pelvis.castShadow = true;
    this.group.add(pelvis);

    const upper = new THREE.Group();
    upper.position.y = 0.95;
    this.group.add(upper);
    this.upper = upper;

    // torso: a tapered "V" trunk (broad chest → narrow waist) in the top colour
    const torso = new THREE.Mesh(g.torso, top);
    torso.position.y = 0.24;
    torso.scale.set(B.torsoW, 1, B.torsoD);
    torso.castShadow = true;
    upper.add(torso);

    // round the chest top and the waist so the cylinder reads as a body
    const chest = new THREE.Mesh(g.chest, top);
    chest.position.y = 0.45;
    chest.scale.set(B.torsoW * 0.92, 0.62, B.torsoD * 0.95);
    chest.castShadow = true;
    upper.add(chest);

    const waist = new THREE.Mesh(g.waist, female ? skin : top);
    waist.position.y = 0.02;
    waist.scale.set(B.torsoW * 0.92, 0.85, B.torsoD * 0.95);
    upper.add(waist);

    if (female) {
      for (const sx of [-0.07, 0.07]) {
        const bust = new THREE.Mesh(g.bust, top);
        bust.position.set(sx, 0.3, 0.12);
        bust.scale.set(1, 0.85, 0.85);
        upper.add(bust);
      }
    }

    const neck = new THREE.Mesh(g.neck, skin);
    neck.position.set(0, 0.52, 0.0);
    neck.castShadow = true;
    upper.add(neck);

    const head = new THREE.Mesh(g.head, skin);
    head.position.set(0, 0.68, 0.015);
    head.scale.set(0.95, 1.04, 0.97);
    head.castShadow = true;
    upper.add(head);

    // simple stylized face: two eyes and a small nose
    for (const ex of [-0.058, 0.058]) {
      const eye = new THREE.Mesh(g.eye, eyeMat);
      eye.position.set(ex, 0.665, 0.15);
      eye.scale.set(0.8, 1.15, 0.6);
      upper.add(eye);
    }
    const nose = new THREE.Mesh(g.nose, skin);
    nose.position.set(0, 0.625, 0.165);
    nose.rotation.x = Math.PI / 2;
    upper.add(nose);

    // hair: a clean faceted cap over the crown/back, leaving the face clear
    const cap = new THREE.Mesh(g.hairCap, hairMat);
    cap.position.set(0, 0.735, -0.02);
    cap.scale.set(1.04, female ? 0.86 : 0.74, 1.08);
    cap.castShadow = true;
    upper.add(cap);

    if (female) {
      const backHair = new THREE.Mesh(g.hairBack, hairMat);
      backHair.position.set(0, 0.66, -0.1);
      backHair.scale.set(1.05, 1.3, 1.0);
      backHair.castShadow = true;
      upper.add(backHair);
      const tail = new THREE.Mesh(g.ponytail, hairMat);
      tail.position.set(0, 0.52, -0.2);
      tail.rotation.x = 0.4;
      tail.castShadow = true;
      upper.add(tail);
    }

    // clean low-poly daypack on the upper back (leans with the torso)
    const pack = new THREE.Group();
    pack.scale.setScalar(female ? 0.9 : 1.04);
    upper.add(pack);
    const packBody = new THREE.Mesh(g.packBody, packMat);
    packBody.position.set(0, 0.22, -0.26);
    packBody.castShadow = true;
    pack.add(packBody);
    const packLid = new THREE.Mesh(g.packLid, packMat);
    packLid.position.set(0, 0.4, -0.25);
    packLid.castShadow = true;
    pack.add(packLid);
    for (const sx of [-0.12, 0.12]) {
      const strap = new THREE.Mesh(g.strap, strapMat);
      strap.position.set(sx, 0.24, 0.13);
      strap.rotation.x = -0.18;
      strap.castShadow = true;
      pack.add(strap);
    }

    // shoulder caps (deltoids) where the arms meet the torso
    for (const sx of [-B.shoulderX, B.shoulderX]) {
      const sh = new THREE.Mesh(g.shoulderBall, skin);
      sh.position.set(sx, 0.45, 0);
      sh.scale.setScalar(B.arm);
      sh.castShadow = true;
      upper.add(sh);
    }

    // legs: men wear shorts (bare shins + trainers); women wear leggings
    // (covered shins + minimal shoes)
    const legParts = female
      ? { thigh: bottom, shin: bottom, kneeMat: bottom, foot: bottom, shoe: bottom, midsole: midsoleMat, isShoe: false }
      : { thigh: bottom, shin: skin, kneeMat: skin, foot: shoe, shoe, midsole: midsoleMat, isShoe: true };
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

  // a low-poly leg: tapered thigh/shin bones capped by sphere joints
  _makeLeg(g, parts, x) {
    const hip = new THREE.Group();
    hip.position.set(x, 0.92, 0);
    const hipJoint = new THREE.Mesh(g.joint, parts.thigh);
    hipJoint.scale.setScalar(1.2);
    hip.add(hipJoint);
    const thigh = new THREE.Mesh(g.thigh, parts.thigh);
    thigh.position.y = -0.23;
    thigh.castShadow = true;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -0.46;
    hip.add(knee);
    const kneeJoint = new THREE.Mesh(g.joint, parts.kneeMat);
    kneeJoint.scale.setScalar(0.95);
    kneeJoint.castShadow = true;
    knee.add(kneeJoint);
    const shin = new THREE.Mesh(g.shin, parts.shin);
    shin.position.y = -0.22;
    shin.castShadow = true;
    knee.add(shin);

    const ankle = new THREE.Group();
    ankle.position.y = -0.44;
    knee.add(ankle);
    const ankleJoint = new THREE.Mesh(g.joint, parts.shin);
    ankleJoint.scale.setScalar(0.62);
    ankle.add(ankleJoint);
    this._makeFoot(g, parts, ankle);
    this.group.add(hip);
    return { hip, knee, ankle };
  }

  // a clean stylized shoe/boot: a sole block with a rounded toe (men get a
  // white midsole; women's leggings carry into a minimal dark shoe)
  _makeFoot(g, parts, ankle) {
    const footMat = parts.shoe;
    const sole = new THREE.Mesh(g.footSole, footMat);
    sole.position.set(0, 0.0, 0.07);
    sole.castShadow = true;
    ankle.add(sole);
    const toe = new THREE.Mesh(g.footToe, footMat);
    toe.position.set(0, -0.005, 0.21);
    toe.scale.set(1.0, 0.82, 1.05);
    toe.castShadow = true;
    ankle.add(toe);
    if (parts.isShoe) {
      const midsole = new THREE.Mesh(g.midsole, parts.midsole);
      midsole.position.set(0, -0.04, 0.08);
      ankle.add(midsole);
    }
  }

  // a low-poly arm: tapered upper/fore-arm bones, sphere elbow, rounded hand
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
    const elbow = new THREE.Mesh(g.joint, mat);
    elbow.scale.setScalar(thick * 0.8);
    elbow.castShadow = true;
    el.add(elbow);
    const fa = new THREE.Mesh(g.foreArm, mat);
    fa.position.y = -0.16;
    fa.scale.set(thick, 1, thick);
    fa.castShadow = true;
    el.add(fa);
    const hand = new THREE.Mesh(g.hand, mat);
    hand.position.y = -0.35;
    hand.scale.set(thick, 1.05, thick * 0.8);
    hand.castShadow = true;
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

  // ---- animation ----------------------------------------------------------
  animate(t) {
    const moved = this.pos.distanceTo(this._lastPos);
    this._lastPos.copy(this.pos);

    let pose;
    let k;
    if (moved > 0.0006) {
      pose = this._poseGait(this.state === 'running', moved);
      k = 0.5;
    } else if (this.state === 'exercising') {
      const fn = EX_POSE[this.station ? this.station.type : ''] || '_poseGeneric';
      pose = this[fn](t);
      k = 0.22;
    } else {
      pose = this._poseIdle();
      k = 0.16;
    }
    this._applyPose(pose, k);
  }

  // ease every joint toward the target pose (missing keys fall back to NEUTRAL)
  _applyPose(p, k) {
    const lx = (o, key) => { o.rotation.x += ((p[key] ?? NEUTRAL[key]) - o.rotation.x) * k; };
    lx(this.legL.hip, 'hipL');
    lx(this.legR.hip, 'hipR');
    lx(this.legL.knee, 'kneeL');
    lx(this.legR.knee, 'kneeR');
    lx(this.legL.ankle, 'ankL');
    lx(this.legR.ankle, 'ankR');
    lx(this.armL.shoulder, 'shLx');
    lx(this.armR.shoulder, 'shRx');
    lx(this.armL.elbow, 'elL');
    lx(this.armR.elbow, 'elR');
    this.armL.shoulder.rotation.z += ((p.shLz ?? NEUTRAL.shLz) - this.armL.shoulder.rotation.z) * k;
    this.armR.shoulder.rotation.z += ((p.shRz ?? NEUTRAL.shRz) - this.armR.shoulder.rotation.z) * k;
    this.upper.rotation.x += ((p.upx ?? 0) - this.upper.rotation.x) * k;
    this.upper.rotation.y += ((p.upy ?? 0) - this.upper.rotation.y) * k;
    this.upper.rotation.z += ((p.upz ?? 0) - this.upper.rotation.z) * k;
    this.group.position.y += ((p.rootY ?? 0) - this.group.position.y) * k;
  }

  _poseIdle() {
    const breath = Math.sin(performance.now() * 0.0016 + this.bob) * 0.022;
    return { shLz: 0.13, shRz: -0.13, upx: breath };
  }

  _poseGait(running, moved) {
    this.stridePhase += moved * (running ? 2.0 : 2.45);
    const p = this.stridePhase;
    const amp = running ? 0.95 : 0.55;
    const kneeAmp = running ? 1.55 : 0.9;
    const sL = Math.sin(p);
    const sR = Math.sin(p + Math.PI);
    const kL = -Math.max(0, Math.sin(p + 0.5)) * kneeAmp - 0.05;
    const kR = -Math.max(0, Math.sin(p + Math.PI + 0.5)) * kneeAmp - 0.05;
    const armAmp = running ? 0.95 : 0.62;
    const baseElb = running ? -1.4 : -0.5;
    const pump = running ? 0.55 : 0.28;
    return {
      hipL: sL * amp, hipR: sR * amp,
      kneeL: kL, kneeR: kR,
      // heel strike on the forward swing, toe-off as the leg drives back
      ankL: -sL * 0.4 - kL * 0.2 + Math.max(0, -sL) * 0.25 + 0.06,
      ankR: -sR * 0.4 - kR * 0.2 + Math.max(0, -sR) * 0.25 + 0.06,
      shLx: sR * armAmp, shRx: sL * armAmp,
      shLz: 0.08, shRz: -0.08,
      elL: baseElb - Math.max(0, sR) * pump,
      elR: baseElb - Math.max(0, sL) * pump,
      upx: running ? 0.28 : 0.08,
      upy: -sL * (running ? 0.2 : 0.11),
      upz: sL * (running ? 0.06 : 0.035),
      rootY: Math.abs(Math.cos(p)) * (running ? 0.1 : 0.05),
    };
  }

  _poseGeneric(t) {
    const c = -0.95 + Math.sin(t * 4 + this.bob) * 0.5;
    return { shLx: c, shRx: c, elL: -0.9, elR: -0.9, upx: 0.03, rootY: Math.abs(Math.sin(t * 4 + this.bob)) * 0.05 };
  }

  // running on the spot (treadmill)
  _poseTreadmill(t) {
    const p = t * 7.5 + this.bob;
    const sL = Math.sin(p);
    const sR = Math.sin(p + Math.PI);
    const kL = -Math.max(0, Math.sin(p + 0.5)) * 1.5 - 0.1;
    const kR = -Math.max(0, Math.sin(p + Math.PI + 0.5)) * 1.5 - 0.1;
    return {
      hipL: sL * 0.85, hipR: sR * 0.85, kneeL: kL, kneeR: kR,
      ankL: -sL * 0.3 + 0.1, ankR: -sR * 0.3 + 0.1,
      shLx: sR * 0.7, shRx: sL * 0.7, elL: -1.35, elR: -1.35,
      upx: 0.22, rootY: Math.abs(Math.cos(p)) * 0.07,
    };
  }

  // seated pedalling (exercise bike)
  _poseBike(t) {
    const p = t * 5 + this.bob;
    return {
      hipL: -1.3 + Math.sin(p) * 0.18, hipR: -1.3 + Math.sin(p + Math.PI) * 0.18,
      kneeL: -1.35 + Math.sin(p + Math.PI) * 0.55, kneeR: -1.35 + Math.sin(p) * 0.55,
      ankL: 0.25 + Math.sin(p) * 0.2, ankR: 0.25 + Math.sin(p + Math.PI) * 0.2,
      shLx: -0.75, shRx: -0.75, shLz: 0.18, shRz: -0.18, elL: -0.5, elR: -0.5,
      upx: 0.42,
    };
  }

  // rowing machine: drive with the legs, pull with the arms, lean back
  _poseRow(t) {
    const drive = Math.sin(t * 2.6 + this.bob) * 0.5 + 0.5;
    const sh = -0.55 + drive * 0.5;
    const el = -0.35 - drive * 1.15;
    return {
      hipL: -1.25 + drive * 0.85, hipR: -1.25 + drive * 0.85,
      kneeL: -1.5 + drive * 1.25, kneeR: -1.5 + drive * 1.25,
      ankL: 0.3 - drive * 0.25, ankR: 0.3 - drive * 0.25,
      shLx: sh, shRx: sh, elL: el, elR: el, shLz: 0.05, shRz: -0.05,
      upx: 0.35 - drive * 0.7,
    };
  }

  // back squats with a bar across the shoulders: controlled tempo, hips drive
  // back and the torso leans as the lifter descends
  _poseSquat(t) {
    const raw = Math.sin(t * 2.2 + this.bob) * 0.5 + 0.5;
    const down = raw * raw * (3 - 2 * raw); // smoothstep for a controlled tempo
    return {
      hipL: -down * 1.15, hipR: -down * 1.15,
      kneeL: -down * 1.55 - 0.1, kneeR: -down * 1.55 - 0.1,
      ankL: down * 0.45 + 0.05, ankR: down * 0.45 + 0.05,
      // hands grip the bar high on the back, elbows tucked under
      shLx: -2.55, shRx: -2.55, elL: -1.75, elR: -1.75, shLz: 0.42, shRz: -0.42,
      upx: 0.1 + down * 0.32, rootY: -down * 0.4,
    };
  }

  // overhead / chest press
  _posePress(t) {
    const push = Math.sin(t * 3 + this.bob) * 0.5 + 0.5;
    const sh = -1.2 - push * 1.3;
    const el = -1.5 + push * 1.35;
    return { shLx: sh, shRx: sh, elL: el, elR: el, shLz: 0.25, shRz: -0.25, kneeL: -0.18, kneeR: -0.18, upx: 0.04 };
  }

  // seated leg press: legs extend and retract together
  _poseLegPress(t) {
    const push = Math.sin(t * 2.6 + this.bob) * 0.5 + 0.5;
    return {
      hipL: -1.35 + push * 0.15, hipR: -1.35 + push * 0.15,
      kneeL: -1.6 + push * 1.4, kneeR: -1.6 + push * 1.4,
      ankL: 0.2, ankR: 0.2, shLx: -0.3, shRx: -0.3, elL: -0.5, elR: -0.5,
      shLz: 0.22, shRz: -0.22, upx: 0.2,
    };
  }

  // lat pulldown / cable: pull the bar down from overhead
  _posePulldown(t) {
    const pull = Math.sin(t * 3 + this.bob) * 0.5 + 0.5;
    const sh = -2.6 + pull * 1.5;
    const el = -0.25 - pull * 1.1;
    return { shLx: sh, shRx: sh, elL: el, elR: el, shLz: 0.35, shRz: -0.35, kneeL: -0.12, kneeR: -0.12, upx: 0.06 + pull * 0.06 };
  }

  // alternating dumbbell curls
  _poseCurl(t) {
    const p = t * 3 + this.bob;
    const cL = Math.sin(p) * 0.5 + 0.5;
    const cR = Math.sin(p + Math.PI) * 0.5 + 0.5;
    return {
      shLx: -0.2, shRx: -0.2, shLz: 0.16, shRz: -0.16,
      elL: -0.3 - cL * 2.0, elR: -0.3 - cR * 2.0, upx: 0.03,
    };
  }

  // gentle stretching on the mats
  _poseStretch(t) {
    const p = t * 1.4 + this.bob;
    const reach = Math.sin(p) * 0.5 + 0.5;
    const sh = -0.3 - reach * 2.3;
    return {
      shLx: sh, shRx: sh, elL: -0.15, elR: -0.15,
      shLz: 0.2 + reach * 0.3, shRz: -0.2 - reach * 0.3,
      upx: 0.02, upz: Math.sin(p * 0.7) * 0.16,
    };
  }

  // hang bar: dead hang from a high bar by both hands, with the occasional
  // active knee tuck and a gentle sway
  _poseHang(t) {
    const sway = Math.sin(t * 1.4 + this.bob) * 0.07;
    const tuck = Math.max(0, Math.sin(t * 0.6 + this.bob)) ** 3; // brief knee raise
    return {
      shLx: -2.96, shRx: -2.96, elL: -0.04, elR: -0.04, shLz: 0.14, shRz: -0.14,
      hipL: 0.05 + sway - tuck * 1.1, hipR: 0.05 - sway - tuck * 1.1,
      kneeL: -0.3 - tuck * 1.0, kneeR: -0.3 - tuck * 1.0,
      ankL: 0.2, ankR: 0.2,
      upx: sway * 0.3, rootY: 0.16, // lift the body to hang from the bar
    };
  }

  // versa climber: opposite arm and leg drive together, with a slight torso
  // twist as the body climbs
  _poseClimb(t) {
    const s = Math.sin(t * 5.5 + this.bob);
    const c = Math.cos(t * 5.5 + this.bob);
    return {
      shLx: -2.45 + s * 0.85, shRx: -2.45 - s * 0.85,
      elL: -0.45 + Math.max(0, s) * 0.85, elR: -0.45 + Math.max(0, -s) * 0.85,
      shLz: 0.1, shRz: -0.1,
      hipL: -s * 0.7, hipR: s * 0.7,
      kneeL: -Math.max(0, -s) * 1.25 - 0.1, kneeR: -Math.max(0, s) * 1.25 - 0.1,
      ankL: Math.max(0, -s) * 0.45 + 0.05, ankR: Math.max(0, s) * 0.45 + 0.05,
      upx: 0.16, upy: c * 0.08, rootY: (s * 0.5 + 0.5) * 0.07,
    };
  }

  // box step-ups: drive one knee high, push up onto the box, then back down
  _poseBoxStep(t) {
    const s = Math.sin(t * 3.0 + this.bob);
    const liftL = Math.max(0, s);
    const liftR = Math.max(0, -s);
    const rise = Math.abs(s); // body rises as the step is driven up
    return {
      hipL: liftL * 1.45, hipR: liftR * 1.45,
      kneeL: -liftL * 1.8 - 0.05, kneeR: -liftR * 1.8 - 0.05,
      ankL: liftL * 0.55 + 0.05, ankR: liftR * 0.55 + 0.05,
      shLx: s * 0.55, shRx: -s * 0.55, elL: -0.7, elR: -0.7,
      upx: 0.12 + rise * 0.06, rootY: rise * 0.22,
    };
  }

  // crawl: hands and feet on the floor, alternating sweeps
  _poseCrawl(t) {
    const s = Math.sin(t * 5 + this.bob);
    return {
      upx: -1.25,
      shLx: -1.35 + s * 0.7, shRx: -1.35 - s * 0.7, elL: -0.7, elR: -0.7,
      hipL: -0.85 - s * 0.4, hipR: -0.85 + s * 0.4,
      kneeL: -1.3, kneeR: -1.3, ankL: 0.4, ankR: 0.4,
    };
  }

  // walking lunges: alternate deep forward lunges, dipping the body down,
  // with a natural opposite-arm swing and tall chest
  _poseLunge(t) {
    const s = Math.sin(t * 2.2 + this.bob);
    const fwd = Math.max(0, s);
    const bwd = Math.max(0, -s);
    return {
      hipL: -fwd * 1.0 + bwd * 0.55, hipR: -bwd * 1.0 + fwd * 0.55,
      kneeL: -fwd * 1.35 - 0.1 - bwd * 0.4, kneeR: -bwd * 1.35 - 0.1 - fwd * 0.4,
      ankL: 0.12, ankR: 0.12,
      shLx: s * 0.5, shRx: -s * 0.5, elL: -0.55, elR: -0.55, shLz: 0.18, shRz: -0.18,
      upx: 0.08, upy: s * 0.06, rootY: -Math.abs(s) * 0.28,
    };
  }

  // elephant walk: bent over at the waist, near-straight legs, hands tracking
  // the floor as opposite hand and foot advance
  _poseElephant(t) {
    const p = t * 2.6 + this.bob;
    const sL = Math.sin(p);
    const sR = Math.sin(p + Math.PI);
    return {
      upx: -1.2, upy: sL * 0.07,
      hipL: sL * 0.45, hipR: sR * 0.45,
      kneeL: -0.08 - Math.max(0, sL) * 0.3, kneeR: -0.08 - Math.max(0, sR) * 0.3,
      ankL: 0.1, ankR: 0.1,
      shLx: -1.55 + sR * 0.45, shRx: -1.55 + sL * 0.45, elL: -0.1, elR: -0.1,
      shLz: 0.05, shRz: -0.05,
    };
  }

  dispose(scene) {
    scene.remove(this.group);
    for (const m of this._mats) m.dispose();
  }
}
