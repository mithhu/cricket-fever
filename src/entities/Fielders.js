import * as THREE from 'three';
import { BOUNDARY_RADIUS, PITCH_HALF } from '../utils/constants.js';
import { lerp, distance2D } from '../utils/helpers.js';

// Standard field positions: { name, x, z }
// Coordinate system: -Z toward bowler end, +Z behind batsman, +X leg side, -X off side
const FIELD_POSITIONS = [
  { name: 'Mid-off',       x: -5,   z: -20  },
  { name: 'Mid-on',        x: 5,    z: -20  },
  { name: 'Cover',         x: -18,  z: -10  },
  { name: 'Mid-wicket',    x: 18,   z: -10  },
  { name: 'Point',         x: -22,  z: 5    },
  { name: 'Square Leg',    x: 22,   z: 5    },
  { name: 'Third Man',     x: -20,  z: 20   },
  { name: 'Fine Leg',      x: 20,   z: 20   },
  { name: 'Long-off',      x: -8,   z: -40  },
];

const FIELDER_SPEED = 8;          // m/s sprint
const INTERCEPT_RADIUS = 2.0;     // how close fielder must be to "collect" ball
const CATCH_RADIUS = 1.2;         // fielder must be right under the ball
const DIVE_RANGE = 3.5;           // extended range with a dive

export class Fielders {
  constructor(scene) {
    this.scene = scene;
    this.fielders = [];
    this._difficulty = 'medium';
    this._shotHistory = [];
    this._overthrowBall = null;
    this._overthrowTimer = 0;
    this._buildFielders();
    this._buildThrowVisual();
  }

  setDifficulty(difficulty) {
    this._difficulty = difficulty;
  }

  recordShotDirection(ballX, ballZ) {
    this._shotHistory.push({ x: ballX, z: ballZ });
    if (this._shotHistory.length > 10) this._shotHistory.shift();
    this._adaptPositions();
  }

  _adaptPositions() {
    if (this._shotHistory.length < 3) return;

    // Compute average shot direction from recent history
    let avgX = 0, avgZ = 0;
    for (const s of this._shotHistory) { avgX += s.x; avgZ += s.z; }
    avgX /= this._shotHistory.length;
    avgZ /= this._shotHistory.length;

    // Shift the 2 nearest fielders' home positions toward the average landing zone
    const sorted = [...this.fielders].sort((a, b) => {
      const da = distance2D(a.homeX, a.homeZ, avgX, avgZ);
      const db = distance2D(b.homeX, b.homeZ, avgX, avgZ);
      return da - db;
    });

    for (let i = 0; i < Math.min(2, sorted.length); i++) {
      const f = sorted[i];
      const origIdx = FIELD_POSITIONS.findIndex(p => p.name === f.name);
      if (origIdx < 0) continue;
      const orig = FIELD_POSITIONS[origIdx];
      // Shift 30% toward average shot zone
      f.homeX = orig.x + (avgX - orig.x) * 0.3;
      f.homeZ = orig.z + (avgZ - orig.z) * 0.3;
      // Keep within boundary
      const r = distance2D(f.homeX, f.homeZ, 0, 0);
      if (r > BOUNDARY_RADIUS - 5) {
        f.homeX *= (BOUNDARY_RADIUS - 5) / r;
        f.homeZ *= (BOUNDARY_RADIUS - 5) / r;
      }
    }
  }

  _buildThrowVisual() {
    const geo = new THREE.SphereGeometry(0.08, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xcc2222 });
    this._throwBall = new THREE.Mesh(geo, mat);
    this._throwBall.visible = false;
    this.scene.add(this._throwBall);
    this._throwState = null;
  }

  _buildFielders() {
    for (const pos of FIELD_POSITIONS) {
      const fielder = this._createFielderModel();
      fielder.group.position.set(pos.x, 0, pos.z);
      fielder.homeX = pos.x;
      fielder.homeZ = pos.z;
      fielder.name = pos.name;
      fielder.state = 'idle'; // idle, chasing, returning, diving
      fielder.chaseTarget = new THREE.Vector3();
      fielder.diveTime = 0;
      this.scene.add(fielder.group);
      this.fielders.push(fielder);
    }
  }

  _createFielderModel() {
    const group = new THREE.Group();

    const skin = new THREE.MeshPhongMaterial({ color: 0xc68642, shininess: 20 });
    const kit = new THREE.MeshPhongMaterial({ color: 0xe8e8e8, shininess: 10 });
    const kitAccent = new THREE.MeshPhongMaterial({ color: 0x1a3c6e, shininess: 10 });
    const trouser = new THREE.MeshPhongMaterial({ color: 0xf0f0f0, shininess: 8 });
    const shoeMat = new THREE.MeshPhongMaterial({ color: 0xeeeeee, shininess: 20 });
    const hairMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, shininess: 30 });
    const capMat = new THREE.MeshPhongMaterial({ color: 0x1a3c6e, shininess: 30 });

    // Hip root
    const hipJoint = new THREE.Group();
    hipJoint.position.set(0, 0.88, 0);
    group.add(hipJoint);

    // Pelvis
    const pelvisGeo = new THREE.SphereGeometry(0.13, 8, 6);
    const pelvis = new THREE.Mesh(pelvisGeo, trouser);
    pelvis.scale.set(1, 0.6, 0.8);
    hipJoint.add(pelvis);

    // Left leg
    const leftHipJoint = new THREE.Group();
    leftHipJoint.position.set(-0.09, -0.06, 0);
    hipJoint.add(leftHipJoint);

    const upperLegGeo = new THREE.CylinderGeometry(0.05, 0.045, 0.4, 8);
    const lUpper = new THREE.Mesh(upperLegGeo, trouser);
    lUpper.position.y = -0.2;
    leftHipJoint.add(lUpper);

    const leftKnee = new THREE.Group();
    leftKnee.position.set(0, -0.4, 0);
    leftHipJoint.add(leftKnee);

    const lowerLegGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.4, 8);
    const lLower = new THREE.Mesh(lowerLegGeo, trouser);
    lLower.position.y = -0.2;
    leftKnee.add(lLower);

    const footGeo = new THREE.BoxGeometry(0.07, 0.035, 0.14);
    const lFoot = new THREE.Mesh(footGeo, shoeMat);
    lFoot.position.set(0, -0.42, 0.02);
    leftKnee.add(lFoot);

    // Right leg
    const rightHipJoint = new THREE.Group();
    rightHipJoint.position.set(0.09, -0.06, 0);
    hipJoint.add(rightHipJoint);

    const rUpper = new THREE.Mesh(upperLegGeo, trouser);
    rUpper.position.y = -0.2;
    rightHipJoint.add(rUpper);

    const rightKnee = new THREE.Group();
    rightKnee.position.set(0, -0.4, 0);
    rightHipJoint.add(rightKnee);

    const rLower = new THREE.Mesh(lowerLegGeo, trouser);
    rLower.position.y = -0.2;
    rightKnee.add(rLower);

    const rFoot = new THREE.Mesh(footGeo, shoeMat);
    rFoot.position.set(0, -0.42, 0.02);
    rightKnee.add(rFoot);

    // Spine / torso
    const spineJoint = new THREE.Group();
    spineJoint.position.set(0, 0.05, 0);
    hipJoint.add(spineJoint);

    const torsoGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.34, 8);
    const torso = new THREE.Mesh(torsoGeo, kit);
    torso.position.y = 0.17;
    spineJoint.add(torso);

    const collarGeo = new THREE.CylinderGeometry(0.09, 0.14, 0.05, 8);
    const collar = new THREE.Mesh(collarGeo, kitAccent);
    collar.position.y = 0.35;
    spineJoint.add(collar);

    // Back number patch (-Z = back of player)
    const backPatchGeo = new THREE.PlaneGeometry(0.14, 0.16);
    const backPatchMat = new THREE.MeshPhongMaterial({ color: 0x1a3c6e, side: THREE.DoubleSide });
    const backPatch = new THREE.Mesh(backPatchGeo, backPatchMat);
    backPatch.position.set(0, 0.2, -0.13);
    spineJoint.add(backPatch);

    // Front chest logo (+Z = front of player)
    const chestLogoGeo = new THREE.CircleGeometry(0.04, 8);
    const chestLogoMat = new THREE.MeshPhongMaterial({ color: 0xf0c040, side: THREE.FrontSide });
    const chestLogo = new THREE.Mesh(chestLogoGeo, chestLogoMat);
    chestLogo.position.set(0.05, 0.28, 0.13);
    spineJoint.add(chestLogo);

    // Neck + head
    const neckJoint = new THREE.Group();
    neckJoint.position.set(0, 0.38, 0);
    spineJoint.add(neckJoint);

    const neckGeo = new THREE.CylinderGeometry(0.04, 0.045, 0.06, 8);
    const neck = new THREE.Mesh(neckGeo, skin);
    neck.position.y = 0.03;
    neckJoint.add(neck);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.13, 0);
    neckJoint.add(headGroup);

    const headGeo = new THREE.SphereGeometry(0.1, 12, 10);
    const head = new THREE.Mesh(headGeo, skin);
    headGroup.add(head);

    // Face details — on +Z side so fielders face toward the ball/target
    const eyeGeo = new THREE.SphereGeometry(0.014, 6, 6);
    const eyeWhite = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const pupilGeo = new THREE.SphereGeometry(0.008, 6, 6);
    const pupilMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });

    const lEye = new THREE.Mesh(eyeGeo, eyeWhite);
    lEye.position.set(-0.035, 0.015, 0.085);
    headGroup.add(lEye);
    const lPupil = new THREE.Mesh(pupilGeo, pupilMat);
    lPupil.position.z = 0.008;
    lEye.add(lPupil);

    const rEye = new THREE.Mesh(eyeGeo, eyeWhite);
    rEye.position.set(0.035, 0.015, 0.085);
    headGroup.add(rEye);
    const rPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rPupil.position.z = 0.008;
    rEye.add(rPupil);

    const noseGeo = new THREE.ConeGeometry(0.012, 0.025, 6);
    const nose = new THREE.Mesh(noseGeo, skin);
    nose.position.set(0, -0.005, 0.095);
    nose.rotation.x = Math.PI / 2;
    headGroup.add(nose);

    // Cap — two-toned: bright front panel (+Z), darker back (-Z)
    const capFrontMat = new THREE.MeshPhongMaterial({ color: 0x2255cc, shininess: 30 });
    const capBackMat = new THREE.MeshPhongMaterial({ color: 0x0a1a3a, shininess: 20 });

    // Front half of cap (+Z = face side)
    const capFrontGeo = new THREE.SphereGeometry(0.11, 12, 8, -Math.PI / 2, Math.PI, 0, Math.PI * 0.45);
    const capFront = new THREE.Mesh(capFrontGeo, capFrontMat);
    capFront.position.y = 0.02;
    headGroup.add(capFront);

    // Back half of cap (-Z = back of head)
    const capBackGeo = new THREE.SphereGeometry(0.11, 12, 8, Math.PI / 2, Math.PI, 0, Math.PI * 0.45);
    const capBack = new THREE.Mesh(capBackGeo, capBackMat);
    capBack.position.y = 0.02;
    headGroup.add(capBack);

    // Brim on front (+Z)
    const brimGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.01, 12, 1, false, -Math.PI / 2, Math.PI);
    const brim = new THREE.Mesh(brimGeo, capFrontMat);
    brim.position.set(0, 0.02, 0.04);
    brim.rotation.x = 0.1;
    headGroup.add(brim);

    // Arms
    const leftShoulderJoint = new THREE.Group();
    leftShoulderJoint.position.set(-0.17, 0.31, 0);
    spineJoint.add(leftShoulderJoint);

    const armGeo = new THREE.CylinderGeometry(0.035, 0.03, 0.26, 8);
    const lUpperArm = new THREE.Mesh(armGeo, kit);
    lUpperArm.position.y = -0.13;
    leftShoulderJoint.add(lUpperArm);

    const leftElbow = new THREE.Group();
    leftElbow.position.set(0, -0.26, 0);
    leftShoulderJoint.add(leftElbow);

    const forearmGeo = new THREE.CylinderGeometry(0.03, 0.025, 0.22, 8);
    const lForearm = new THREE.Mesh(forearmGeo, skin);
    lForearm.position.y = -0.11;
    leftElbow.add(lForearm);

    const handGeo = new THREE.SphereGeometry(0.03, 6, 6);
    const lHand = new THREE.Mesh(handGeo, skin);
    lHand.position.y = -0.24;
    leftElbow.add(lHand);

    const rightShoulderJoint = new THREE.Group();
    rightShoulderJoint.position.set(0.17, 0.31, 0);
    spineJoint.add(rightShoulderJoint);

    const rUpperArm = new THREE.Mesh(armGeo, kit);
    rUpperArm.position.y = -0.13;
    rightShoulderJoint.add(rUpperArm);

    const rightElbow = new THREE.Group();
    rightElbow.position.set(0, -0.26, 0);
    rightShoulderJoint.add(rightElbow);

    const rForearm = new THREE.Mesh(forearmGeo, skin);
    rForearm.position.y = -0.11;
    rightElbow.add(rForearm);

    const rHand = new THREE.Mesh(handGeo, skin);
    rHand.position.y = -0.24;
    rightElbow.add(rHand);

    return {
      group,
      hipJoint,
      spineJoint,
      leftHipJoint, leftKnee,
      rightHipJoint, rightKnee,
      leftShoulderJoint, leftElbow,
      rightShoulderJoint, rightElbow,
      neckJoint, headGroup,
    };
  }

  // Find the nearest fielder to a given position
  getNearestFielder(x, z) {
    let best = null;
    let bestDist = Infinity;
    for (const f of this.fielders) {
      const d = distance2D(f.group.position.x, f.group.position.z, x, z);
      if (d < bestDist) {
        bestDist = d;
        best = f;
      }
    }
    return { fielder: best, dist: bestDist };
  }

  // Tell all fielders to chase the ball's predicted landing spot
  snapshotPositions() {
    this._snapshot = this.fielders.map((f) => ({
      x: f.group.position.x,
      z: f.group.position.z,
    }));
  }

  getNearestFielderFromSnapshot(x, z) {
    if (!this._snapshot || this._snapshot.length === 0) {
      return this.getNearestFielder(x, z);
    }
    let bestDist = Infinity;
    for (const s of this._snapshot) {
      const d = distance2D(s.x, s.z, x, z);
      if (d < bestDist) bestDist = d;
    }
    return { dist: bestDist };
  }

  chaseBall(ballPos, ballVel) {
    // Predict where ball will be in ~1.5 seconds
    const predictX = ballPos.x + ballVel.x * 1.5;
    const predictZ = ballPos.z + ballVel.z * 1.5;

    // Assign the 3 nearest fielders to chase
    const sorted = [...this.fielders].sort((a, b) => {
      const da = distance2D(a.group.position.x, a.group.position.z, predictX, predictZ);
      const db = distance2D(b.group.position.x, b.group.position.z, predictX, predictZ);
      return da - db;
    });

    for (let i = 0; i < sorted.length; i++) {
      if (i < 3) {
        sorted[i].state = 'chasing';
        sorted[i].chaseTarget.set(predictX, 0, predictZ);
      }
    }
  }

  _getMisfieldChance() {
    switch (this._difficulty) {
      case 'easy':   return 0.15;
      case 'hard':   return 0.03;
      default:       return 0.08;
    }
  }

  _getDropChance() {
    switch (this._difficulty) {
      case 'easy':   return 0.25;
      case 'hard':   return 0.05;
      default:       return 0.12;
    }
  }

  checkIntercept(ballPos) {
    for (const f of this.fielders) {
      if (f.state !== 'chasing') continue;
      const d = distance2D(f.group.position.x, f.group.position.z, ballPos.x, ballPos.z);
      if (d < INTERCEPT_RADIUS) {
        // Chance of misfield — ball slips through
        if (Math.random() < this._getMisfieldChance()) {
          f.misfieldTime = 0;
          f.state = 'misfield';
          return null;
        }
        return { fielder: f, distance: d, isDive: false };
      }
      if (d < DIVE_RANGE && f.state === 'chasing') {
        return { fielder: f, distance: d, isDive: true };
      }
    }
    return null;
  }

  // Check if a fielder is close enough to take a catch (ball in air, coming down)
  checkCatchOpportunity(ballPos) {
    if (ballPos.y < 0.3 || ballPos.y > 10) return null;
    for (const f of this.fielders) {
      if (f.state === 'catching') continue; // already catching
      const d = distance2D(f.group.position.x, f.group.position.z, ballPos.x, ballPos.z);
      if (d < CATCH_RADIUS) {
        return { fielder: f, distance: d };
      }
    }
    return null;
  }

  triggerCatch(fielder) {
    fielder.state = 'catching';
    fielder.catchTime = 0;
    fielder.willDrop = Math.random() < this._getDropChance();
  }

  isCatchComplete(fielder) {
    if (fielder.willDrop && fielder.catchTime >= 0.4) {
      fielder.state = 'returning';
      fielder.willDrop = false;
      return false;
    }
    return fielder.state === 'catching' && fielder.catchTime >= 0.6;
  }

  didDropCatch(fielder) {
    return fielder.willDrop === true && fielder.catchTime >= 0.4;
  }

  // Send all fielders back to their home positions
  returnToPositions() {
    for (const f of this.fielders) {
      f.state = 'returning';
    }
    if (this._throwState) {
      this._throwState = null;
      this._throwBall.visible = false;
    }
  }

  startReturnThrow(fielder) {
    const fx = fielder.group.position.x;
    const fz = fielder.group.position.z;
    // Throw toward the bowler's end stumps (0, 0, -PITCH_HALF)
    this._throwState = {
      fromX: fx, fromZ: fz, fromY: 1.6,
      toX: 0, toZ: -PITCH_HALF, toY: 0.8,
      t: 0,
      duration: 0.6,
      overthrow: false,
    };
    // Rare overthrow chance (more common on easy difficulty)
    const overthrowChance = this._difficulty === 'easy' ? 0.12 : this._difficulty === 'hard' ? 0.02 : 0.06;
    if (Math.random() < overthrowChance) {
      this._throwState.overthrow = true;
    }
    this._throwBall.visible = true;
  }

  isOverthrow() {
    return this._throwState && this._throwState.overthrow && this._throwState.t >= 1;
  }

  getOverthrowRuns() {
    return Math.random() < 0.5 ? 1 : 2;
  }

  consumeOverthrow() {
    if (this._throwState) {
      this._throwState = null;
      this._throwBall.visible = false;
    }
  }

  update(dt, ballPos, ballActive, ballHit) {
    for (const f of this.fielders) {
      if (f.state === 'chasing' && ballActive && ballHit) {
        f.chaseTarget.set(ballPos.x, 0, ballPos.z);
      }

      if (f.state === 'chasing') {
        this._updateChasing(f, dt);
        this._lookAt(f, f.chaseTarget.x, f.chaseTarget.z);
      } else if (f.state === 'catching') {
        this._updateCatching(f, dt);
        if (ballActive) this._lookAt(f, ballPos.x, ballPos.z);
      } else if (f.state === 'misfield') {
        this._updateMisfield(f, dt);
      } else if (f.state === 'returning') {
        this._updateReturning(f, dt);
        this._lookAt(f, f.homeX, f.homeZ);
      } else if (f.state === 'diving') {
        this._updateDiving(f, dt);
      } else {
        this._updateIdle(f, dt);
        if (ballActive) {
          this._lookAt(f, ballPos.x, ballPos.z);
        } else {
          this._lookAt(f, 0, PITCH_HALF);
        }
      }
    }

    // Return throw animation
    if (this._throwState) {
      const ts = this._throwState;
      ts.t += dt / ts.duration;
      if (ts.t >= 1) {
        ts.t = 1;
        if (!ts.overthrow) {
          this._throwBall.visible = false;
          this._throwState = null;
        }
      }
      if (ts.t <= 1 && this._throwBall.visible) {
        const t = ts.t;
        const x = lerp(ts.fromX, ts.toX, t);
        const z = lerp(ts.fromZ, ts.toZ, t);
        const arcY = lerp(ts.fromY, ts.toY, t) + Math.sin(t * Math.PI) * 3;
        this._throwBall.position.set(x, arcY, z);
      }
    }
  }

  _updateChasing(f, dt) {
    const dx = f.chaseTarget.x - f.group.position.x;
    const dz = f.chaseTarget.z - f.group.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.5) {
      f.state = 'idle';
      this._resetRunPose(f);
      return;
    }

    const speed = FIELDER_SPEED * dt;
    const nx = dx / dist;
    const nz = dz / dist;

    f.group.position.x += nx * speed;
    f.group.position.z += nz * speed;

    // Clamp to boundary
    const r = distance2D(f.group.position.x, f.group.position.z, 0, 0);
    if (r > BOUNDARY_RADIUS - 2) {
      f.group.position.x *= (BOUNDARY_RADIUS - 2) / r;
      f.group.position.z *= (BOUNDARY_RADIUS - 2) / r;
    }

    // Running animation
    const cycle = Math.sin(performance.now() * 0.014);
    f.leftHipJoint.rotation.x = cycle * 0.6;
    f.rightHipJoint.rotation.x = -cycle * 0.6;
    f.leftKnee.rotation.x = Math.max(0, -cycle) * 0.7;
    f.rightKnee.rotation.x = Math.max(0, cycle) * 0.7;
    f.leftShoulderJoint.rotation.x = -cycle * 0.5;
    f.rightShoulderJoint.rotation.x = cycle * 0.5;
    f.spineJoint.rotation.x = -0.1;
  }

  _updateReturning(f, dt) {
    const dx = f.homeX - f.group.position.x;
    const dz = f.homeZ - f.group.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.5) {
      f.group.position.x = f.homeX;
      f.group.position.z = f.homeZ;
      f.state = 'idle';
      this._resetRunPose(f);
      return;
    }

    // Jog back (slower than sprint)
    const speed = FIELDER_SPEED * 0.5 * dt;
    f.group.position.x += (dx / dist) * speed;
    f.group.position.z += (dz / dist) * speed;

    // Light jog animation
    const cycle = Math.sin(performance.now() * 0.01);
    f.leftHipJoint.rotation.x = cycle * 0.3;
    f.rightHipJoint.rotation.x = -cycle * 0.3;
    f.leftShoulderJoint.rotation.x = -cycle * 0.2;
    f.rightShoulderJoint.rotation.x = cycle * 0.2;
  }

  _updateDiving(f, dt) {
    f.diveTime += dt;
    if (f.diveTime > 1.0) {
      f.state = 'returning';
      f.diveTime = 0;
      this._resetRunPose(f);
      f.hipJoint.position.y = 0.88;
    } else {
      const t = f.diveTime;
      // Drop body to ground
      f.hipJoint.position.y = lerp(0.88, 0.3, Math.min(t * 4, 1));
      f.spineJoint.rotation.x = lerp(0, -0.8, Math.min(t * 3, 1));
      // Arms reach out
      f.leftShoulderJoint.rotation.x = lerp(0, -2.5, Math.min(t * 3, 1));
      f.rightShoulderJoint.rotation.x = lerp(0, -2.5, Math.min(t * 3, 1));
    }
  }

  _updateCatching(f, dt) {
    if (!f.catchTime) f.catchTime = 0;
    f.catchTime += dt;
    const t = Math.min(f.catchTime / 0.4, 1.0);

    // Arms go up to catch position
    f.leftShoulderJoint.rotation.x = lerp(0, -2.2, t);
    f.leftShoulderJoint.rotation.z = lerp(0, 0.3, t);
    f.leftElbow.rotation.x = lerp(0, -0.4, t);
    f.rightShoulderJoint.rotation.x = lerp(0, -2.2, t);
    f.rightShoulderJoint.rotation.z = lerp(0, -0.3, t);
    f.rightElbow.rotation.x = lerp(0, -0.4, t);

    // Look up slightly
    f.neckJoint.rotation.x = lerp(0, -0.3, t);

    // Slight knee bend to absorb
    f.leftKnee.rotation.x = lerp(0, 0.2, t);
    f.rightKnee.rotation.x = lerp(0, 0.2, t);

    // After catch, bring hands to chest
    if (f.catchTime > 0.4) {
      const t2 = Math.min((f.catchTime - 0.4) / 0.3, 1.0);
      f.leftShoulderJoint.rotation.x = lerp(-2.2, -1.0, t2);
      f.rightShoulderJoint.rotation.x = lerp(-2.2, -1.0, t2);
      f.leftElbow.rotation.x = lerp(-0.4, -1.5, t2);
      f.rightElbow.rotation.x = lerp(-0.4, -1.5, t2);
      f.neckJoint.rotation.x = lerp(-0.3, 0, t2);
    }

    // After full animation, transition to returning
    if (f.catchTime > 1.5) {
      f.state = 'returning';
      f.catchTime = 0;
      this._resetRunPose(f);
    }
  }

  triggerDive(fielder) {
    fielder.state = 'diving';
    fielder.diveTime = 0;
  }

  _updateMisfield(f, dt) {
    if (!f.misfieldTime) f.misfieldTime = 0;
    f.misfieldTime += dt;
    // Stumble animation: lean forward and reach out
    const t = Math.min(f.misfieldTime / 0.4, 1.0);
    f.spineJoint.rotation.x = lerp(0, -0.5, t);
    f.leftShoulderJoint.rotation.x = lerp(0, -1.5, t);
    f.rightShoulderJoint.rotation.x = lerp(0, -1.5, t);
    f.leftKnee.rotation.x = lerp(0, 0.3, t);
    f.rightKnee.rotation.x = lerp(0, 0.3, t);

    if (f.misfieldTime > 0.8) {
      f.state = 'chasing';
      f.misfieldTime = 0;
      this._resetRunPose(f);
    }
  }

  _updateIdle(f, dt) {
    // Subtle idle sway
    const t = performance.now() * 0.001;
    f.spineJoint.rotation.x = Math.sin(t + f.homeX) * 0.02;
  }

  _resetRunPose(f) {
    f.leftHipJoint.rotation.x = 0;
    f.rightHipJoint.rotation.x = 0;
    f.leftKnee.rotation.x = 0;
    f.rightKnee.rotation.x = 0;
    f.leftShoulderJoint.rotation.x = 0;
    f.rightShoulderJoint.rotation.x = 0;
    f.leftElbow.rotation.x = 0;
    f.rightElbow.rotation.x = 0;
    f.spineJoint.rotation.x = 0;
  }

  _lookAt(f, tx, tz) {
    const dx = tx - f.group.position.x;
    const dz = tz - f.group.position.z;
    f.group.rotation.y = Math.atan2(dx, dz);
  }
}
