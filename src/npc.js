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
    G = {
      head: new THREE.SphereGeometry(0.15, 20, 16),
      hair: new THREE.SphereGeometry(0.158, 18, 14),
      hairBack: new THREE.SphereGeometry(0.14, 16, 12),
      ponytail: new THREE.CapsuleGeometry(0.052, 0.26, 6, 12),
      nose: new THREE.SphereGeometry(0.028, 8, 6),
      eye: new THREE.SphereGeometry(0.017, 8, 6),
      brow: new THREE.BoxGeometry(0.05, 0.012, 0.02),
      ear: new THREE.SphereGeometry(0.03, 8, 8),
      thumb: new THREE.CapsuleGeometry(0.02, 0.05, 4, 8),
      neck: new THREE.CylinderGeometry(0.055, 0.07, 0.11, 12),
      torso: new THREE.CapsuleGeometry(0.19, 0.34, 10, 18),
      abdomen: new THREE.SphereGeometry(0.155, 14, 12),
      pelvis: new THREE.SphereGeometry(0.18, 16, 12),
      bust: new THREE.SphereGeometry(0.072, 12, 10),
      shoulder: new THREE.SphereGeometry(0.095, 14, 12),
      thigh: new THREE.CapsuleGeometry(0.1, 0.3, 8, 14),
      shin: new THREE.CapsuleGeometry(0.082, 0.3, 8, 14),
      ankleBall: new THREE.SphereGeometry(0.068, 10, 8),
      foot: new THREE.CapsuleGeometry(0.062, 0.17, 6, 12), // rounded heel→toe
      sole: new THREE.BoxGeometry(0.135, 0.05, 0.32),
      upperArm: new THREE.CapsuleGeometry(0.068, 0.2, 8, 14),
      foreArm: new THREE.CapsuleGeometry(0.057, 0.2, 8, 14),
      palm: new THREE.BoxGeometry(0.075, 0.12, 0.045),
      packBody: new THREE.BoxGeometry(0.34, 0.46, 0.2),
      packLid: new THREE.BoxGeometry(0.32, 0.16, 0.18),
      packPocket: new THREE.BoxGeometry(0.22, 0.22, 0.1),
      strap: new THREE.BoxGeometry(0.055, 0.44, 0.05),
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

    // materials: natural skin, wave-coloured top, dark bottoms, grey shoes, hair
    const skin = new THREE.MeshStandardMaterial({ color: SKIN_TONES[(Math.random() * SKIN_TONES.length) | 0], roughness: 0.8, metalness: 0 });
    const top = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.06 });
    const bottom = new THREE.MeshStandardMaterial({ color: BOTTOM_COLOR, roughness: 0.82, metalness: 0.02 });
    const shoe = new THREE.MeshStandardMaterial({ color: SHOE_COLOR, roughness: 0.55, metalness: 0.1 });
    const soleMat = new THREE.MeshStandardMaterial({ color: 0x111316, roughness: 0.7, metalness: 0.05 });
    const hairMat = new THREE.MeshStandardMaterial({ color: HAIR_TONES[(Math.random() * HAIR_TONES.length) | 0], roughness: 0.9 });
    const packCol = PACK_COLORS[(Math.random() * PACK_COLORS.length) | 0];
    const packMat = new THREE.MeshStandardMaterial({ color: packCol, roughness: 0.82, metalness: 0.08 });
    const strapMat = new THREE.MeshStandardMaterial({ color: 0x202327, roughness: 0.9, metalness: 0.05 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.35, metalness: 0.1 });
    this._mats = [skin, top, bottom, shoe, soleMat, hairMat, packMat, strapMat, eyeMat];
    this.bodyMat = top;

    // hips (clothed waistband) stay with the legs; upper body leans at the waist
    const pelvis = new THREE.Mesh(g.pelvis, bottom);
    pelvis.position.y = 0.88;
    pelvis.scale.set(1.18 * B.hip, 0.78, 0.82);
    pelvis.castShadow = true;
    this.group.add(pelvis);

    const upper = new THREE.Group();
    upper.position.y = 0.95;
    this.group.add(upper);
    this.upper = upper;

    // midriff connector: bare skin for women (sports bra), top colour for men
    const abdomen = new THREE.Mesh(g.abdomen, female ? skin : top);
    abdomen.position.y = 0.02;
    abdomen.scale.set(B.torsoW * 0.86, 0.7, B.torsoD);
    abdomen.castShadow = true;
    upper.add(abdomen);

    // torso = workout top (tank top / sports bra) in the wave colour
    const torso = new THREE.Mesh(g.torso, top);
    torso.position.y = 0.26;
    torso.scale.set(B.torsoW, 1, B.torsoD);
    torso.castShadow = true;
    upper.add(torso);

    if (female) {
      for (const sx of [-0.075, 0.075]) {
        const bust = new THREE.Mesh(g.bust, top);
        bust.position.set(sx, 0.28, 0.13);
        bust.scale.set(1, 0.85, 0.8);
        upper.add(bust);
      }
    }

    const neck = new THREE.Mesh(g.neck, skin);
    neck.position.set(0, 0.5, 0.01);
    neck.castShadow = true;
    upper.add(neck);

    const head = new THREE.Mesh(g.head, skin);
    head.position.set(0, 0.64, 0.02);
    head.scale.set(0.94, 1.08, 0.98); // slightly narrower jaw
    head.castShadow = true;
    upper.add(head);

    // jaw/chin taper for a less spherical face
    const jaw = new THREE.Mesh(g.head, skin);
    jaw.position.set(0, 0.575, 0.04);
    jaw.scale.set(0.72, 0.6, 0.78);
    upper.add(jaw);

    const nose = new THREE.Mesh(g.nose, skin);
    nose.position.set(0, 0.625, 0.155);
    nose.scale.set(0.8, 1.1, 1.1);
    upper.add(nose);

    // eyes + brows
    for (const ex of [-0.052, 0.052]) {
      const eye = new THREE.Mesh(g.eye, eyeMat);
      eye.position.set(ex, 0.66, 0.135);
      upper.add(eye);
      const brow = new THREE.Mesh(g.brow, hairMat);
      brow.position.set(ex, 0.685, 0.142);
      upper.add(brow);
    }

    // ears tucked at the sides of the head
    for (const ex of [-0.146, 0.146]) {
      const ear = new THREE.Mesh(g.ear, skin);
      ear.position.set(ex, 0.645, 0.0);
      ear.scale.set(0.6, 1, 0.9);
      upper.add(ear);
    }

    // hair: a crown dome that sits on the skull, a fuller back mass and a
    // small front fringe so the face (front-lower) stays exposed.
    const crown = new THREE.Mesh(g.hair, hairMat);
    crown.position.set(0, 0.715, -0.03);
    crown.scale.set(1.06, female ? 0.92 : 0.72, 1.12);
    crown.castShadow = true;
    upper.add(crown);

    const backHair = new THREE.Mesh(g.hairBack, hairMat);
    backHair.position.set(0, 0.63, -0.11);
    backHair.scale.set(1.12, female ? 1.35 : 0.96, 1.02);
    backHair.castShadow = true;
    upper.add(backHair);

    const fringe = new THREE.Mesh(g.hairBack, hairMat);
    fringe.position.set(0, 0.725, 0.07);
    fringe.scale.set(1.02, 0.46, 0.66);
    upper.add(fringe);

    if (female) {
      // hair gathered into a tie, then a ponytail falling down the back
      const tieBase = new THREE.Mesh(g.hairBack, hairMat);
      tieBase.position.set(0, 0.6, -0.17);
      tieBase.scale.set(0.66, 0.66, 0.66);
      tieBase.castShadow = true;
      upper.add(tieBase);
      const tail = new THREE.Mesh(g.ponytail, hairMat);
      tail.position.set(0, 0.5, -0.21);
      tail.rotation.x = 0.42;
      tail.castShadow = true;
      upper.add(tail);
    }

    // tactical-style backpack on the upper back (leans with the torso)
    const pack = new THREE.Group();
    pack.scale.setScalar(female ? 0.92 : 1.04);
    upper.add(pack);

    const packBody = new THREE.Mesh(g.packBody, packMat);
    packBody.position.set(0, 0.22, -0.27);
    packBody.castShadow = true;
    pack.add(packBody);

    const packLid = new THREE.Mesh(g.packLid, packMat);
    packLid.position.set(0, 0.42, -0.26);
    packLid.castShadow = true;
    pack.add(packLid);

    const packPocket = new THREE.Mesh(g.packPocket, packMat);
    packPocket.position.set(0, 0.13, -0.385);
    packPocket.castShadow = true;
    pack.add(packPocket);

    // compression straps across the pack body
    for (const sy of [0.32, 0.12]) {
      const band = new THREE.Mesh(g.strap, strapMat);
      band.scale.set(5.6, 0.12, 1.2);
      band.position.set(0, sy, -0.38);
      pack.add(band);
    }

    // shoulder straps running over the shoulders to the front of the chest
    for (const sx of [-0.13, 0.13]) {
      const strap = new THREE.Mesh(g.strap, strapMat);
      strap.position.set(sx, 0.24, 0.14);
      strap.rotation.x = -0.18;
      strap.castShadow = true;
      pack.add(strap);
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
      ? { thigh: bottom, shin: bottom, foot: skin, ankle: skin, sole: soleMat, isShoe: false }
      : { thigh: bottom, shin: skin, foot: shoe, ankle: skin, sole: soleMat, isShoe: true };
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

    const ab = new THREE.Mesh(g.ankleBall, parts.ankle);
    ab.scale.setScalar(0.7);
    ankle.add(ab);
    const foot = new THREE.Mesh(g.foot, parts.foot);
    foot.rotation.x = Math.PI / 2;
    foot.scale.set(1, 0.6, 1);
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
    const palm = new THREE.Mesh(g.palm, mat);
    palm.position.y = -0.33;
    palm.castShadow = true;
    el.add(palm);
    const thumb = new THREE.Mesh(g.thumb, mat);
    thumb.position.set(x < 0 ? 0.04 : -0.04, -0.31, 0.02);
    thumb.rotation.z = x < 0 ? -0.5 : 0.5;
    thumb.castShadow = true;
    el.add(thumb);
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
      ankL: -sL * 0.35 - kL * 0.25 + 0.08,
      ankR: -sR * 0.35 - kR * 0.25 + 0.08,
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

  // squats with a bar across the shoulders
  _poseSquat(t) {
    const down = Math.sin(t * 2.4 + this.bob) * 0.5 + 0.5;
    return {
      hipL: -down * 1.0, hipR: -down * 1.0,
      kneeL: -down * 1.5 - 0.1, kneeR: -down * 1.5 - 0.1,
      ankL: down * 0.5 + 0.05, ankR: down * 0.5 + 0.05,
      shLx: -2.5, shRx: -2.5, elL: -1.5, elR: -1.5, shLz: 0.3, shRz: -0.3,
      upx: 0.12 + down * 0.25, rootY: -down * 0.34,
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

  // versa climber: alternating arm/leg climb
  _poseClimb(t) {
    const s = Math.sin(t * 6 + this.bob);
    return {
      shLx: -2.35 + s * 0.7, shRx: -2.35 - s * 0.7,
      elL: -0.5 + Math.max(0, s) * 0.7, elR: -0.5 + Math.max(0, -s) * 0.7,
      shLz: 0.12, shRz: -0.12,
      hipL: -s * 0.5, hipR: s * 0.5,
      kneeL: -Math.max(0, -s) * 1.0 - 0.1, kneeR: -Math.max(0, s) * 1.0 - 0.1,
      ankL: Math.max(0, -s) * 0.4 + 0.05, ankR: Math.max(0, s) * 0.4 + 0.05,
      upx: 0.14, rootY: (s * 0.5 + 0.5) * 0.06,
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

  // walking lunges: alternate deep forward lunges, dipping the body down
  _poseLunge(t) {
    const s = Math.sin(t * 2.2 + this.bob);
    const fwd = Math.max(0, s);
    const bwd = Math.max(0, -s);
    return {
      hipL: -fwd * 0.95 + bwd * 0.55, hipR: -bwd * 0.95 + fwd * 0.55,
      kneeL: -fwd * 1.25 - 0.1 - bwd * 0.35, kneeR: -bwd * 1.25 - 0.1 - fwd * 0.35,
      ankL: 0.12, ankR: 0.12,
      shLx: 0.05, shRx: 0.05, elL: -0.25, elR: -0.25, shLz: 0.22, shRz: -0.22,
      upx: 0.05, rootY: -Math.abs(s) * 0.24,
    };
  }

  // elephant walk: bent over at the waist, near-straight legs, hands to the floor
  _poseElephant(t) {
    const p = t * 2.6 + this.bob;
    const sL = Math.sin(p);
    const sR = Math.sin(p + Math.PI);
    return {
      upx: -1.15,
      hipL: sL * 0.4, hipR: sR * 0.4,
      kneeL: -0.1 - Math.max(0, sL) * 0.25, kneeR: -0.1 - Math.max(0, sR) * 0.25,
      ankL: 0.1, ankR: 0.1,
      shLx: -1.6 + sR * 0.3, shRx: -1.6 + sL * 0.3, elL: -0.12, elR: -0.12,
      shLz: 0.06, shRz: -0.06,
    };
  }

  dispose(scene) {
    scene.remove(this.group);
    for (const m of this._mats) m.dispose();
  }
}
