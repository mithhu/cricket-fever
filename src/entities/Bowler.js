import * as THREE from 'three';
import {
  PITCH_HALF, BOWLER_RELEASE_HEIGHT, BOWLER_RELEASE_Z,
} from '../utils/constants.js';
import { lerp } from '../utils/helpers.js';

export class Bowler {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this._buildModel();

    this._startZ = -PITCH_HALF - 12;
    this.group.position.set(0, 0, this._startZ);
    scene.add(this.group);

    this._animState = 'idle';
    this._animTime = 0;
    this._runUpDuration = 1.2;
    this._bowlDuration = 0.5;
    this._onDelivery = null;
    this._delivered = false;
  }

  _buildModel() {
    const skin = new THREE.MeshPhongMaterial({ color: 0xc68642, shininess: 20 });
    const kit = new THREE.MeshPhongMaterial({ color: 0xe8e8e8, shininess: 10 });
    const kitAccent = new THREE.MeshPhongMaterial({ color: 0x1a3c6e, shininess: 10 });
    const trouser = new THREE.MeshPhongMaterial({ color: 0xf0f0f0, shininess: 8 });
    const shoeMat = new THREE.MeshPhongMaterial({ color: 0xeeeeee, shininess: 20 });
    const hairMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, shininess: 30 });
    const ballMat = new THREE.MeshPhongMaterial({ color: 0xcc2222, shininess: 40 });

    // ── Hip joint (root) ──
    this.hipJoint = new THREE.Group();
    this.hipJoint.position.set(0, 0.88, 0);
    this.group.add(this.hipJoint);

    const pelvisGeo = new THREE.SphereGeometry(0.15, 10, 8);
    const pelvis = new THREE.Mesh(pelvisGeo, trouser);
    pelvis.scale.set(1, 0.6, 0.8);
    this.hipJoint.add(pelvis);

    // ── LEFT LEG ──
    this.leftHipJoint = new THREE.Group();
    this.leftHipJoint.position.set(-0.1, -0.08, 0);
    this.hipJoint.add(this.leftHipJoint);

    const upperLegGeo = new THREE.CylinderGeometry(0.055, 0.05, 0.42, 8);
    const lUpperLeg = new THREE.Mesh(upperLegGeo, trouser);
    lUpperLeg.position.y = -0.21;
    this.leftHipJoint.add(lUpperLeg);

    this.leftKneeJoint = new THREE.Group();
    this.leftKneeJoint.position.set(0, -0.42, 0);
    this.leftHipJoint.add(this.leftKneeJoint);

    const lowerLegGeo = new THREE.CylinderGeometry(0.05, 0.045, 0.42, 8);
    const lLowerLeg = new THREE.Mesh(lowerLegGeo, trouser);
    lLowerLeg.position.y = -0.21;
    this.leftKneeJoint.add(lLowerLeg);

    const footGeo = new THREE.BoxGeometry(0.08, 0.04, 0.16);
    const lFoot = new THREE.Mesh(footGeo, shoeMat);
    lFoot.position.set(0, -0.44, 0.03);
    this.leftKneeJoint.add(lFoot);

    // ── RIGHT LEG ──
    this.rightHipJoint = new THREE.Group();
    this.rightHipJoint.position.set(0.1, -0.08, 0);
    this.hipJoint.add(this.rightHipJoint);

    const rUpperLeg = new THREE.Mesh(upperLegGeo, trouser);
    rUpperLeg.position.y = -0.21;
    this.rightHipJoint.add(rUpperLeg);

    this.rightKneeJoint = new THREE.Group();
    this.rightKneeJoint.position.set(0, -0.42, 0);
    this.rightHipJoint.add(this.rightKneeJoint);

    const rLowerLeg = new THREE.Mesh(lowerLegGeo, trouser);
    rLowerLeg.position.y = -0.21;
    this.rightKneeJoint.add(rLowerLeg);

    const rFoot = new THREE.Mesh(footGeo, shoeMat);
    rFoot.position.set(0, -0.44, 0.03);
    this.rightKneeJoint.add(rFoot);

    // ── SPINE / TORSO ──
    this.spineJoint = new THREE.Group();
    this.spineJoint.position.set(0, 0.05, 0);
    this.hipJoint.add(this.spineJoint);

    const torsoGeo = new THREE.CylinderGeometry(0.16, 0.14, 0.36, 10);
    const torso = new THREE.Mesh(torsoGeo, kit);
    torso.position.y = 0.18;
    this.spineJoint.add(torso);

    const collarGeo = new THREE.CylinderGeometry(0.11, 0.16, 0.06, 10);
    const collar = new THREE.Mesh(collarGeo, kitAccent);
    collar.position.y = 0.37;
    this.spineJoint.add(collar);

    // Back number stripe (-Z = back)
    const backStripeMat = new THREE.MeshPhongMaterial({ color: 0x1a3c6e, side: THREE.DoubleSide });
    const backStripeGeo = new THREE.PlaneGeometry(0.16, 0.2);
    const backStripe = new THREE.Mesh(backStripeGeo, backStripeMat);
    backStripe.position.set(0, 0.22, -0.15);
    this.spineJoint.add(backStripe);

    // Front chest V-shape (+Z = front, faces batsman)
    const chestVGeo = new THREE.CircleGeometry(0.05, 3);
    const chestVMat = new THREE.MeshPhongMaterial({ color: 0xf0c040, side: THREE.FrontSide });
    const chestV = new THREE.Mesh(chestVGeo, chestVMat);
    chestV.position.set(0, 0.28, 0.15);
    this.spineJoint.add(chestV);

    // ── NECK + HEAD ──
    this.neckJoint = new THREE.Group();
    this.neckJoint.position.set(0, 0.4, 0);
    this.spineJoint.add(this.neckJoint);

    const neckGeo = new THREE.CylinderGeometry(0.045, 0.05, 0.08, 8);
    const neck = new THREE.Mesh(neckGeo, skin);
    neck.position.y = 0.04;
    this.neckJoint.add(neck);

    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.16, 0);
    this.neckJoint.add(this.headGroup);

    const headGeo = new THREE.SphereGeometry(0.12, 14, 12);
    const head = new THREE.Mesh(headGeo, skin);
    this.headGroup.add(head);

    // Hair — full cap covering top and sides of head
    const hairGeo = new THREE.SphereGeometry(0.13, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 0.02;
    this.headGroup.add(hair);

    // Hair fringe/back — thicker at the back
    const hairBackGeo = new THREE.SphereGeometry(0.128, 12, 8, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.35);
    const hairBack = new THREE.Mesh(hairBackGeo, hairMat);
    hairBack.position.set(0, 0.01, -0.02);
    hairBack.rotation.x = Math.PI;
    this.headGroup.add(hairBack);

    // Face — on +Z side so bowler faces toward batsman
    const eyeGeo = new THREE.SphereGeometry(0.016, 8, 8);
    const eyeWhite = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const pupilGeo = new THREE.SphereGeometry(0.009, 8, 8);
    const pupilMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });

    const lEye = new THREE.Mesh(eyeGeo, eyeWhite);
    lEye.position.set(-0.04, 0.02, 0.1);
    this.headGroup.add(lEye);
    const lPupil = new THREE.Mesh(pupilGeo, pupilMat);
    lPupil.position.z = 0.01;
    lEye.add(lPupil);

    const rEye = new THREE.Mesh(eyeGeo, eyeWhite);
    rEye.position.set(0.04, 0.02, 0.1);
    this.headGroup.add(rEye);
    const rPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rPupil.position.z = 0.01;
    rEye.add(rPupil);

    const browGeo = new THREE.BoxGeometry(0.04, 0.008, 0.01);
    const browMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
    const lBrow = new THREE.Mesh(browGeo, browMat);
    lBrow.position.set(-0.04, 0.045, 0.1);
    this.headGroup.add(lBrow);
    const rBrow = new THREE.Mesh(browGeo, browMat);
    rBrow.position.set(0.04, 0.045, 0.1);
    this.headGroup.add(rBrow);

    const noseGeo = new THREE.ConeGeometry(0.015, 0.03, 6);
    const nose = new THREE.Mesh(noseGeo, skin);
    nose.position.set(0, -0.005, 0.115);
    nose.rotation.x = Math.PI / 2;
    this.headGroup.add(nose);

    const mouthGeo = new THREE.BoxGeometry(0.035, 0.007, 0.005);
    const mouthMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -0.04, 0.11);
    this.headGroup.add(mouth);

    const earGeo = new THREE.SphereGeometry(0.025, 8, 8);
    const lEar = new THREE.Mesh(earGeo, skin);
    lEar.position.set(-0.12, 0.01, 0);
    lEar.scale.set(0.5, 1, 0.7);
    this.headGroup.add(lEar);
    const rEar = new THREE.Mesh(earGeo, skin);
    rEar.position.set(0.12, 0.01, 0);
    rEar.scale.set(0.5, 1, 0.7);
    this.headGroup.add(rEar);

    // ── LEFT ARM (non-bowling) ──
    this.leftShoulderJoint = new THREE.Group();
    this.leftShoulderJoint.position.set(-0.19, 0.33, 0);
    this.spineJoint.add(this.leftShoulderJoint);

    const upperArmGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.28, 8);
    const lUpperArm = new THREE.Mesh(upperArmGeo, kit);
    lUpperArm.position.y = -0.14;
    this.leftShoulderJoint.add(lUpperArm);

    this.leftElbowJoint = new THREE.Group();
    this.leftElbowJoint.position.set(0, -0.28, 0);
    this.leftShoulderJoint.add(this.leftElbowJoint);

    const forearmGeo = new THREE.CylinderGeometry(0.035, 0.03, 0.25, 8);
    const lForearm = new THREE.Mesh(forearmGeo, skin);
    lForearm.position.y = -0.125;
    this.leftElbowJoint.add(lForearm);

    const handGeo = new THREE.SphereGeometry(0.035, 8, 8);
    const lHand = new THREE.Mesh(handGeo, skin);
    lHand.position.y = -0.27;
    this.leftElbowJoint.add(lHand);

    // ── RIGHT ARM (bowling arm) ──
    this.rightShoulderJoint = new THREE.Group();
    this.rightShoulderJoint.position.set(0.19, 0.33, 0);
    this.spineJoint.add(this.rightShoulderJoint);

    const rUpperArm = new THREE.Mesh(upperArmGeo, kit);
    rUpperArm.position.y = -0.14;
    this.rightShoulderJoint.add(rUpperArm);

    this.rightElbowJoint = new THREE.Group();
    this.rightElbowJoint.position.set(0, -0.28, 0);
    this.rightShoulderJoint.add(this.rightElbowJoint);

    const rForearm = new THREE.Mesh(forearmGeo, skin);
    rForearm.position.y = -0.125;
    this.rightElbowJoint.add(rForearm);

    const rHand = new THREE.Mesh(handGeo, skin);
    rHand.position.y = -0.27;
    this.rightElbowJoint.add(rHand);

    // Ball in bowling hand (left arm = screen right when viewed from behind = right-arm bowler look)
    const ballGeo = new THREE.SphereGeometry(0.14, 10, 10);
    this.handBall = new THREE.Mesh(ballGeo, ballMat);
    this.handBall.position.y = -0.32;
    this.leftElbowJoint.add(this.handBall);
    this.handBall.visible = false;
  }

  startBowling(onDeliveryCallback) {
    this._onDelivery = onDeliveryCallback;
    this._animState = 'runup';
    this._animTime = 0;
    this._delivered = false;
    this.group.position.set(0, 0, this._startZ);
    this.handBall.visible = true;
    this._resetAllJoints();
  }

  _resetAllJoints() {
    this.hipJoint.rotation.set(0, 0, 0);
    this.spineJoint.rotation.set(0, 0, 0);
    this.neckJoint.rotation.set(0, 0, 0);
    this.leftHipJoint.rotation.set(0, 0, 0);
    this.rightHipJoint.rotation.set(0, 0, 0);
    this.leftKneeJoint.rotation.set(0, 0, 0);
    this.rightKneeJoint.rotation.set(0, 0, 0);
    this.leftShoulderJoint.rotation.set(0, 0, 0);
    this.leftElbowJoint.rotation.set(0, 0, 0);
    this.rightShoulderJoint.rotation.set(0, 0, 0);
    this.rightElbowJoint.rotation.set(0, 0, 0);
  }

  getReleasePosition() {
    return new THREE.Vector3(0, BOWLER_RELEASE_HEIGHT, BOWLER_RELEASE_Z);
  }

  update(dt) {
    if (this._animState === 'runup') {
      this._updateRunUp(dt);
    } else if (this._animState === 'gather') {
      this._updateGather(dt);
    } else if (this._animState === 'bowling') {
      this._updateBowling(dt);
    } else if (this._animState === 'followthrough') {
      this._updateFollowThrough(dt);
    }
  }

  _updateRunUp(dt) {
    this._animTime += dt;
    const t = Math.min(this._animTime / this._runUpDuration, 1.0);

    const targetZ = BOWLER_RELEASE_Z - 2;
    this.group.position.z = lerp(this._startZ, targetZ, t);

    // Running animation: alternating legs and arms
    const cycle = Math.sin(this._animTime * 14);

    this.leftHipJoint.rotation.x = cycle * 0.5;
    this.rightHipJoint.rotation.x = -cycle * 0.5;
    this.leftKneeJoint.rotation.x = Math.max(0, -cycle) * 0.8;
    this.rightKneeJoint.rotation.x = Math.max(0, cycle) * 0.8;

    // Arms pump opposite to legs
    this.rightShoulderJoint.rotation.x = -cycle * 0.4;
    this.rightElbowJoint.rotation.x = -0.5;
    this.leftShoulderJoint.rotation.x = cycle * 0.4;
    this.leftElbowJoint.rotation.x = -0.5;

    // Slight torso lean forward
    this.spineJoint.rotation.x = -0.1;

    // Accelerate toward end
    if (t >= 0.8) {
      const accelT = (t - 0.8) / 0.2;
      this.spineJoint.rotation.x = lerp(-0.1, -0.15, accelT);
    }

    if (t >= 1.0) {
      this._animState = 'gather';
      this._animTime = 0;
    }
  }

  _updateGather(dt) {
    this._animTime += dt;
    const duration = 0.25;
    const t = Math.min(this._animTime / duration, 1.0);

    // Gather: jump, bring bowling arm (left) up, non-bowling arm comes up too
    this.leftShoulderJoint.rotation.x = lerp(0, -2.8, t);
    this.leftElbowJoint.rotation.x = lerp(-0.5, -0.1, t);

    this.rightShoulderJoint.rotation.x = lerp(0, -1.5, t);
    this.rightElbowJoint.rotation.x = lerp(-0.5, -0.3, t);

    // Chest opens up
    this.spineJoint.rotation.x = lerp(-0.15, 0.2, t);
    this.hipJoint.rotation.x = lerp(0, -0.1, t);

    // Back leg drives
    this.rightHipJoint.rotation.x = lerp(0, -0.3, t);
    this.leftHipJoint.rotation.x = lerp(0, 0.2, t);
    this.leftKneeJoint.rotation.x = lerp(0, 0.1, t);

    // Move forward during gather
    this.group.position.z += dt * 3;

    if (t >= 1.0) {
      this._animState = 'bowling';
      this._animTime = 0;
    }
  }

  _updateBowling(dt) {
    this._animTime += dt;
    const t = Math.min(this._animTime / this._bowlDuration, 1.0);

    // Arm starts at -2.8 (behind head). Release at the top of the arc (-PI = straight up).
    // After release, arm follows through naturally downward then decelerates.
    const releaseT = 0.35;
    const topAngle = -Math.PI;
    const endAngle = -0.5;

    if (t <= releaseT) {
      // Pre-release: arm sweeps up to vertical (the release point)
      const preT = t / releaseT;
      const eased = preT * preT;
      this.leftShoulderJoint.rotation.x = lerp(-2.8, topAngle, eased);
      this.leftElbowJoint.rotation.x = lerp(-0.1, -0.02, preT);
    } else {
      // Post-release: arm continues forward then decelerates to rest
      const postT = (t - releaseT) / (1.0 - releaseT);
      const eased = 1 - (1 - postT) * (1 - postT);
      this.leftShoulderJoint.rotation.x = lerp(topAngle, endAngle, eased);
      this.leftElbowJoint.rotation.x = lerp(-0.02, -0.4, eased);
    }

    // Non-bowling arm (right) pulls down
    this.rightShoulderJoint.rotation.x = lerp(-1.5, 0.3, t);
    this.rightElbowJoint.rotation.x = lerp(-0.3, -1.2, t);

    // Torso drives forward and rotates
    this.spineJoint.rotation.x = lerp(0.2, -0.4, t);
    this.spineJoint.rotation.y = lerp(0, 0.3, t);

    // Front foot plants hard
    this.leftHipJoint.rotation.x = lerp(0.2, -0.4, t);
    this.leftKneeJoint.rotation.x = lerp(0.1, 0.05, t);

    // Back leg comes through
    this.rightHipJoint.rotation.x = lerp(-0.3, 0.3, t);
    this.rightKneeJoint.rotation.x = lerp(0, 0.5, t);

    this.neckJoint.rotation.x = lerp(0, 0.3, t);

    if (t >= releaseT && !this._delivered) {
      this._delivered = true;
      this.handBall.visible = false;
      if (this._onDelivery) {
        this._onDelivery(this.getReleasePosition());
      }
    }

    this.group.position.z += dt * 2;

    if (t >= 1.0) {
      this._animState = 'followthrough';
      this._animTime = 0;
    }
  }

  _updateFollowThrough(dt) {
    this._animTime += dt;
    const duration = 0.35;
    const t = Math.min(this._animTime / duration, 1.0);
    const eased = 1 - (1 - t) * (1 - t);

    // Everything settles to idle quickly
    this.leftShoulderJoint.rotation.x = lerp(this.leftShoulderJoint.rotation.x, -0.1, eased);
    this.leftElbowJoint.rotation.x = lerp(this.leftElbowJoint.rotation.x, 0, eased);

    this.rightShoulderJoint.rotation.x = lerp(this.rightShoulderJoint.rotation.x, 0, eased);
    this.rightElbowJoint.rotation.x = lerp(this.rightElbowJoint.rotation.x, 0, eased);

    this.spineJoint.rotation.x = lerp(this.spineJoint.rotation.x, -0.05, eased);
    this.spineJoint.rotation.y = lerp(this.spineJoint.rotation.y, 0, eased);

    this.leftHipJoint.rotation.x = lerp(this.leftHipJoint.rotation.x, 0, eased);
    this.rightHipJoint.rotation.x = lerp(this.rightHipJoint.rotation.x, 0, eased);
    this.leftKneeJoint.rotation.x = lerp(this.leftKneeJoint.rotation.x, 0, eased);
    this.rightKneeJoint.rotation.x = lerp(this.rightKneeJoint.rotation.x, 0, eased);

    this.neckJoint.rotation.x = lerp(this.neckJoint.rotation.x, 0, eased);

    this.group.position.z += dt * (1 - t) * 1.5;

    if (t >= 1.0) {
      this._animState = 'idle';
      this._resetAllJoints();
    }
  }

  resetPosition() {
    this.group.position.set(0, 0, this._startZ);
    this._animState = 'idle';
    this._animTime = 0;
    this._delivered = false;
    this._resetAllJoints();
    this.handBall.visible = false;
  }
}
