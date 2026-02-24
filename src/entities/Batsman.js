import * as THREE from 'three';
import { BATSMAN_Z, BATSMAN_X, SHOTS } from '../utils/constants.js';
import { lerp } from '../utils/helpers.js';

export class Batsman {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    this._animState = 'idle';
    this._animTime = 0;
    this._animDuration = 0;
    this._shotType = null;

    this._restPose = {};
    this._homeX = BATSMAN_X;
    this._homeZ = BATSMAN_Z;

    this._buildModel();
    this._saveRestPose();

    this.group.position.set(BATSMAN_X, 0, BATSMAN_Z);
    scene.add(this.group);
  }

  _buildModel() {
    const skin = new THREE.MeshPhongMaterial({ color: 0xc68642, shininess: 20 });
    const kit = new THREE.MeshPhongMaterial({ color: 0xf5f5f5, shininess: 10 });
    const kitBlue = new THREE.MeshPhongMaterial({ color: 0x1a3c6e, shininess: 10 });
    const pad = new THREE.MeshPhongMaterial({ color: 0xe8e0d0, shininess: 5 });
    const helmetMat = new THREE.MeshPhongMaterial({ color: 0x2a3a50, shininess: 60, specular: 0x444444 });
    const grillMat = new THREE.MeshPhongMaterial({ color: 0x888888, shininess: 80, specular: 0xaaaaaa });
    const gloveMat = new THREE.MeshPhongMaterial({ color: 0xf0f0f0, shininess: 15 });
    const batWood = new THREE.MeshPhongMaterial({ color: 0xdec88a, shininess: 30 });
    const batHandle = new THREE.MeshPhongMaterial({ color: 0x3a2510, shininess: 10 });
    const shoeMat = new THREE.MeshPhongMaterial({ color: 0xeeeeee, shininess: 20 });

    // ── Hip joint (root of skeleton) ──
    this.hipJoint = new THREE.Group();
    this.hipJoint.position.set(0, 0.88, 0);
    this.group.add(this.hipJoint);

    const pelvisGeo = new THREE.SphereGeometry(0.16, 10, 8);
    const pelvis = new THREE.Mesh(pelvisGeo, kit);
    pelvis.scale.set(1, 0.6, 0.8);
    this.hipJoint.add(pelvis);

    // ── LEFT LEG ──
    this.leftHipJoint = new THREE.Group();
    this.leftHipJoint.position.set(-0.1, -0.08, 0);
    this.hipJoint.add(this.leftHipJoint);

    const lUpperLegGeo = new THREE.CylinderGeometry(0.06, 0.055, 0.42, 8);
    const lUpperLeg = new THREE.Mesh(lUpperLegGeo, kit);
    lUpperLeg.position.y = -0.21;
    this.leftHipJoint.add(lUpperLeg);

    this.leftKneeJoint = new THREE.Group();
    this.leftKneeJoint.position.set(0, -0.42, 0);
    this.leftHipJoint.add(this.leftKneeJoint);

    const lLowerLegGeo = new THREE.CylinderGeometry(0.055, 0.05, 0.42, 8);
    const lLowerLeg = new THREE.Mesh(lLowerLegGeo, pad);
    lLowerLeg.position.y = -0.21;
    this.leftKneeJoint.add(lLowerLeg);

    const padPlateGeo = new THREE.BoxGeometry(0.1, 0.38, 0.03);
    const padPlate = new THREE.Mesh(padPlateGeo, pad);
    padPlate.position.set(0, -0.2, -0.05);
    this.leftKneeJoint.add(padPlate);

    const footGeo = new THREE.BoxGeometry(0.08, 0.04, 0.16);
    const lFoot = new THREE.Mesh(footGeo, shoeMat);
    lFoot.position.set(0, -0.44, -0.03);
    this.leftKneeJoint.add(lFoot);

    // ── RIGHT LEG ──
    this.rightHipJoint = new THREE.Group();
    this.rightHipJoint.position.set(0.1, -0.08, 0);
    this.hipJoint.add(this.rightHipJoint);

    const rUpperLegGeo = new THREE.CylinderGeometry(0.06, 0.055, 0.42, 8);
    const rUpperLeg = new THREE.Mesh(rUpperLegGeo, kit);
    rUpperLeg.position.y = -0.21;
    this.rightHipJoint.add(rUpperLeg);

    this.rightKneeJoint = new THREE.Group();
    this.rightKneeJoint.position.set(0, -0.42, 0);
    this.rightHipJoint.add(this.rightKneeJoint);

    const rLowerLegGeo = new THREE.CylinderGeometry(0.055, 0.05, 0.42, 8);
    const rLowerLeg = new THREE.Mesh(rLowerLegGeo, pad);
    rLowerLeg.position.y = -0.21;
    this.rightKneeJoint.add(rLowerLeg);

    const rPadPlate = new THREE.Mesh(padPlateGeo, pad);
    rPadPlate.position.set(0, -0.2, -0.05);
    this.rightKneeJoint.add(rPadPlate);

    const rFoot = new THREE.Mesh(footGeo, shoeMat);
    rFoot.position.set(0, -0.44, -0.03);
    this.rightKneeJoint.add(rFoot);

    // ── SPINE / TORSO ──
    this.spineJoint = new THREE.Group();
    this.spineJoint.position.set(0, 0.05, 0);
    this.hipJoint.add(this.spineJoint);

    const torsoGeo = new THREE.CylinderGeometry(0.17, 0.15, 0.36, 10);
    const torso = new THREE.Mesh(torsoGeo, kit);
    torso.position.y = 0.18;
    this.spineJoint.add(torso);

    const collarGeo = new THREE.CylinderGeometry(0.12, 0.17, 0.06, 10);
    const collar = new THREE.Mesh(collarGeo, kitBlue);
    collar.position.y = 0.37;
    this.spineJoint.add(collar);

    // ── NECK + HEAD ──
    this.neckJoint = new THREE.Group();
    this.neckJoint.position.set(0, 0.4, 0);
    this.spineJoint.add(this.neckJoint);

    const neckGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.08, 8);
    const neck = new THREE.Mesh(neckGeo, skin);
    neck.position.y = 0.04;
    this.neckJoint.add(neck);

    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.16, 0);
    this.neckJoint.add(this.headGroup);

    const headGeo = new THREE.SphereGeometry(0.12, 14, 12);
    const head = new THREE.Mesh(headGeo, skin);
    this.headGroup.add(head);

    // Face details
    const eyeGeo = new THREE.SphereGeometry(0.018, 8, 8);
    const eyeWhiteMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const pupilGeo = new THREE.SphereGeometry(0.01, 8, 8);
    const pupilMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });

    const leftEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    leftEye.position.set(-0.04, 0.02, -0.1);
    this.headGroup.add(leftEye);
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(0, 0, -0.01);
    leftEye.add(leftPupil);

    const rightEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    rightEye.position.set(0.04, 0.02, -0.1);
    this.headGroup.add(rightEye);
    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(0, 0, -0.01);
    rightEye.add(rightPupil);

    const browGeo = new THREE.BoxGeometry(0.04, 0.008, 0.01);
    const browMat = new THREE.MeshPhongMaterial({ color: 0x2a1a0a });
    const leftBrow = new THREE.Mesh(browGeo, browMat);
    leftBrow.position.set(-0.04, 0.045, -0.1);
    this.headGroup.add(leftBrow);
    const rightBrow = new THREE.Mesh(browGeo, browMat);
    rightBrow.position.set(0.04, 0.045, -0.1);
    this.headGroup.add(rightBrow);

    const noseGeo = new THREE.ConeGeometry(0.015, 0.03, 6);
    const nose = new THREE.Mesh(noseGeo, skin);
    nose.position.set(0, -0.005, -0.115);
    nose.rotation.x = -Math.PI / 2;
    this.headGroup.add(nose);

    const mouthGeo = new THREE.BoxGeometry(0.04, 0.008, 0.005);
    const mouthMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -0.04, -0.11);
    this.headGroup.add(mouth);

    const earGeo = new THREE.SphereGeometry(0.025, 8, 8);
    const leftEar = new THREE.Mesh(earGeo, skin);
    leftEar.position.set(-0.12, 0.01, 0);
    leftEar.scale.set(0.5, 1, 0.7);
    this.headGroup.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, skin);
    rightEar.position.set(0.12, 0.01, 0);
    rightEar.scale.set(0.5, 1, 0.7);
    this.headGroup.add(rightEar);

    // ── HELMET ──
    const helmetShellGeo = new THREE.SphereGeometry(0.14, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const helmetShell = new THREE.Mesh(helmetShellGeo, helmetMat);
    helmetShell.position.y = 0.02;
    this.headGroup.add(helmetShell);

    const peakGeo = new THREE.BoxGeometry(0.2, 0.015, 0.1);
    const peak = new THREE.Mesh(peakGeo, helmetMat);
    peak.position.set(0, 0.04, -0.12);
    peak.rotation.x = -0.2;
    this.headGroup.add(peak);

    for (let i = -2; i <= 2; i++) {
      const barGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.1, 6);
      const bar = new THREE.Mesh(barGeo, grillMat);
      bar.position.set(i * 0.025, -0.01, -0.135);
      this.headGroup.add(bar);
    }
    for (let j = 0; j < 3; j++) {
      const hBarGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.12, 6);
      const hBar = new THREE.Mesh(hBarGeo, grillMat);
      hBar.rotation.z = Math.PI / 2;
      hBar.position.set(0, 0.02 - j * 0.03, -0.135);
      this.headGroup.add(hBar);
    }

    const sideGuardGeo = new THREE.BoxGeometry(0.02, 0.08, 0.06);
    const lGuard = new THREE.Mesh(sideGuardGeo, helmetMat);
    lGuard.position.set(-0.13, 0.0, -0.06);
    this.headGroup.add(lGuard);
    const rGuard = new THREE.Mesh(sideGuardGeo, helmetMat);
    rGuard.position.set(0.13, 0.0, -0.06);
    this.headGroup.add(rGuard);

    // ── LEFT ARM (front arm) ──
    this.leftShoulderJoint = new THREE.Group();
    this.leftShoulderJoint.position.set(-0.2, 0.33, 0);
    this.spineJoint.add(this.leftShoulderJoint);

    const lUpperArmGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.28, 8);
    const lUpperArm = new THREE.Mesh(lUpperArmGeo, kit);
    lUpperArm.position.y = -0.14;
    this.leftShoulderJoint.add(lUpperArm);

    this.leftElbowJoint = new THREE.Group();
    this.leftElbowJoint.position.set(0, -0.28, 0);
    this.leftShoulderJoint.add(this.leftElbowJoint);

    const lForearmGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.25, 8);
    const lForearm = new THREE.Mesh(lForearmGeo, skin);
    lForearm.position.y = -0.125;
    this.leftElbowJoint.add(lForearm);

    const lGloveGeo = new THREE.SphereGeometry(0.045, 8, 8);
    this.leftGlove = new THREE.Mesh(lGloveGeo, gloveMat);
    this.leftGlove.position.set(0, -0.27, 0);
    this.leftElbowJoint.add(this.leftGlove);

    // ── RIGHT ARM (bat arm) ──
    this.rightShoulderJoint = new THREE.Group();
    this.rightShoulderJoint.position.set(0.2, 0.33, 0);
    this.spineJoint.add(this.rightShoulderJoint);

    const rUpperArmGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.28, 8);
    const rUpperArm = new THREE.Mesh(rUpperArmGeo, kit);
    rUpperArm.position.y = -0.14;
    this.rightShoulderJoint.add(rUpperArm);

    this.rightElbowJoint = new THREE.Group();
    this.rightElbowJoint.position.set(0, -0.28, 0);
    this.rightShoulderJoint.add(this.rightElbowJoint);

    const rForearmGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.25, 8);
    const rForearm = new THREE.Mesh(rForearmGeo, skin);
    rForearm.position.y = -0.125;
    this.rightElbowJoint.add(rForearm);

    this.rightGlove = new THREE.Mesh(lGloveGeo.clone(), gloveMat);
    this.rightGlove.position.set(0, -0.27, 0);
    this.rightElbowJoint.add(this.rightGlove);

    // ── BAT ──
    // Grip (dark handle) at +Y near the hand, blade (light wood) at -Y toward ground.
    // Verified via world-space simulation: with the elbow bend and PI/2 group rotation,
    // +Y in bat-local space maps to higher world Y = correct handle-up orientation.
    this.batGroup = new THREE.Group();

    const gripGeo = new THREE.CylinderGeometry(0.016, 0.018, 0.28, 8);
    const grip = new THREE.Mesh(gripGeo, batHandle);
    grip.position.y = 0.14;
    this.batGroup.add(grip);

    const spliceGeo = new THREE.CylinderGeometry(0.018, 0.04, 0.08, 8);
    const splice = new THREE.Mesh(spliceGeo, batWood);
    splice.position.y = -0.02;
    this.batGroup.add(splice);

    const bladeGeo = new THREE.BoxGeometry(0.17, 0.50, 0.05);
    const blade = new THREE.Mesh(bladeGeo, batWood);
    blade.position.y = -0.29;
    this.batGroup.add(blade);

    const spineGeo = new THREE.BoxGeometry(0.05, 0.48, 0.025);
    const bladeSpine = new THREE.Mesh(spineGeo, batWood);
    bladeSpine.position.set(0, -0.28, -0.033);
    this.batGroup.add(bladeSpine);

    const toeGeo = new THREE.BoxGeometry(0.17, 0.02, 0.05);
    const toe = new THREE.Mesh(toeGeo, batWood);
    toe.position.y = -0.55;
    this.batGroup.add(toe);

    // Logo sticker on the front face of the blade (facing bowler/camera)
    const logoMat = new THREE.MeshPhongMaterial({ color: 0xcc2222, shininess: 20 });
    const logoGeo = new THREE.PlaneGeometry(0.10, 0.12);
    const logo = new THREE.Mesh(logoGeo, logoMat);
    logo.position.set(0, -0.22, 0.026);
    logo.rotation.y = Math.PI;
    this.batGroup.add(logo);

    const logoTextMat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 30 });
    const logoStripe1 = new THREE.Mesh(
      new THREE.PlaneGeometry(0.08, 0.015), logoTextMat
    );
    logoStripe1.position.set(0, -0.19, 0.027);
    logoStripe1.rotation.y = Math.PI;
    this.batGroup.add(logoStripe1);

    const logoStripe2 = new THREE.Mesh(
      new THREE.PlaneGeometry(0.06, 0.015), logoTextMat
    );
    logoStripe2.position.set(0, -0.21, 0.027);
    logoStripe2.rotation.y = Math.PI;
    this.batGroup.add(logoStripe2);

    const logoStripe3 = new THREE.Mesh(
      new THREE.PlaneGeometry(0.04, 0.015), logoTextMat
    );
    logoStripe3.position.set(0, -0.23, 0.027);
    logoStripe3.rotation.y = Math.PI;
    this.batGroup.add(logoStripe3);

    this.batGroup.position.set(0, -0.27, 0);
    this.rightElbowJoint.add(this.batGroup);

    // ── Right-handed batting stance (side-on guard position) ──
    // +PI/2 rotation: model's +X (right side) faces -Z world (toward bowler).
    // From the camera (behind bowler looking +Z), we see the batsman's
    // left side with bat visible on the right — correct for a right-hander.
    this.group.rotation.y = Math.PI / 2;

    // Slight forward lean toward the bowler
    this.spineJoint.rotation.x = -0.06;
    this.spineJoint.rotation.z = -0.04;

    // Front arm (left) — top hand on bat, shoulder forward, elbow bent
    this.leftShoulderJoint.rotation.x = -0.5;
    this.leftShoulderJoint.rotation.z = 0.25;
    this.leftElbowJoint.rotation.x = -0.9;

    // Back arm (right) — bottom hand, holds bat handle at waist
    this.rightShoulderJoint.rotation.x = -0.45;
    this.rightShoulderJoint.rotation.z = -0.2;
    this.rightElbowJoint.rotation.x = -0.95;

    // Bat hangs straight down from hands, blade face toward bowler
    this.batGroup.rotation.x = 0.15;
    this.batGroup.rotation.y = Math.PI / 2;
    this.batGroup.rotation.z = 0;

    // Comfortable knee bend — weight balanced
    this.leftKneeJoint.rotation.x = 0.18;
    this.rightKneeJoint.rotation.x = 0.18;

    // Feet slightly apart
    this.leftHipJoint.rotation.z = 0.05;
    this.rightHipJoint.rotation.z = -0.05;

    // Head turned to watch the bowler — face/grille points toward bowler and off side
    this.neckJoint.rotation.y = -Math.PI / 2 * 1.1;
  }

  _saveRestPose() {
    this._restPose = {
      hipY: this.hipJoint.rotation.y,
      hipX: this.hipJoint.rotation.x,
      spineX: this.spineJoint.rotation.x,
      spineY: this.spineJoint.rotation.y,
      spineZ: this.spineJoint.rotation.z,
      neckY: this.neckJoint.rotation.y,
      neckX: this.neckJoint.rotation.x,
      lShX: this.leftShoulderJoint.rotation.x,
      lShY: this.leftShoulderJoint.rotation.y,
      lShZ: this.leftShoulderJoint.rotation.z,
      lElX: this.leftElbowJoint.rotation.x,
      rShX: this.rightShoulderJoint.rotation.x,
      rShY: this.rightShoulderJoint.rotation.y,
      rShZ: this.rightShoulderJoint.rotation.z,
      rElX: this.rightElbowJoint.rotation.x,
      batX: this.batGroup.rotation.x,
      batY: this.batGroup.rotation.y,
      batZ: this.batGroup.rotation.z,
      lHipJointX: this.leftHipJoint.rotation.x,
      lHipJointZ: this.leftHipJoint.rotation.z,
      rHipJointX: this.rightHipJoint.rotation.x,
      rHipJointZ: this.rightHipJoint.rotation.z,
      lKneeX: this.leftKneeJoint.rotation.x,
      rKneeX: this.rightKneeJoint.rotation.x,
      groupZ: 0,
    };
  }

  moveInCrease(dirX, dirZ, dt) {
    const speed = 2.0;
    this.group.position.x += dirX * speed * dt;
    this.group.position.z += dirZ * speed * dt;

    this.group.position.x = Math.max(-1.2, Math.min(1.2, this.group.position.x));
    this.group.position.z = Math.max(this._homeZ - 0.8, Math.min(this._homeZ + 0.8, this.group.position.z));

    if (Math.abs(dirX) > 0.01 || Math.abs(dirZ) > 0.01) {
      const shuffle = Math.sin(performance.now() * 0.018) * 0.08;
      this.leftHipJoint.rotation.x = this._restPose.lHipJointX + shuffle;
      this.rightHipJoint.rotation.x = this._restPose.rHipJointX - shuffle;
      this.leftKneeJoint.rotation.x = this._restPose.lKneeX + Math.max(0, -shuffle) * 0.3;
      this.rightKneeJoint.rotation.x = this._restPose.rKneeX + Math.max(0, shuffle) * 0.3;
    }
  }

  playShot(shotType) {
    this._shotType = shotType;
    this._animState = 'step';
    this._animTime = 0;
    this._animDuration = 0.1;
  }

  _getShotKeyframes(shot) {
    // With group.rotation.y = +PI/2, model's +X faces -Z world (bowler).
    // hipY / spineY signs are flipped vs the old -PI/2 orientation.
    const R = this._restPose;

    switch (shot) {
      case SHOTS.DRIVE:
        return {
          step: {
            lHipJointX: -0.5, lHipJointZ: R.lHipJointZ, lKneeX: 0.25,
            rHipJointX: 0.1, rHipJointZ: R.rHipJointZ, rKneeX: 0.18,
            hipY: 0, hipX: 0, spineX: -0.1, spineY: 0, spineZ: -0.06,
            neckY: R.neckY, neckX: -0.05,
            rShX: -0.4, rShY: 0, rShZ: -0.2, rElX: -1.2,
            lShX: -0.3, lShY: 0, lShZ: 0.3, lElX: -1.2,
            batX: 0.6, batY: R.batY, batZ: 0.1,
            groupZ: -0.3,
          },
          backlift: {
            lHipJointX: -0.55, lHipJointZ: R.lHipJointZ, lKneeX: 0.3,
            rHipJointX: 0.15, rHipJointZ: R.rHipJointZ, rKneeX: 0.18,
            hipY: 0, hipX: 0, spineX: 0.12, spineY: -0.05, spineZ: -0.08,
            neckY: R.neckY, neckX: 0,
            rShX: -1.8, rShY: 0, rShZ: -0.15, rElX: -0.3,
            lShX: -1.6, lShY: 0, lShZ: 0.35, lElX: -0.2,
            batX: 2.0, batY: R.batY, batZ: 0,
            groupZ: -0.35,
          },
          swing: {
            lHipJointX: -0.7, lHipJointZ: R.lHipJointZ, lKneeX: 0.15,
            rHipJointX: 0.2, rHipJointZ: R.rHipJointZ, rKneeX: 0.3,
            hipY: 0.15, hipX: -0.05, spineX: -0.3, spineY: 0.15, spineZ: 0,
            neckY: R.neckY * 0.7, neckX: -0.1,
            rShX: -0.1, rShY: 0, rShZ: -0.4, rElX: -1.3,
            lShX: -0.15, lShY: 0, lShZ: 0.1, lElX: -1.1,
            batX: -1.4, batY: R.batY, batZ: 0.1,
            groupZ: -0.45,
          },
          followThrough: {
            lHipJointX: -0.75, lHipJointZ: R.lHipJointZ, lKneeX: 0.1,
            rHipJointX: 0.25, rHipJointZ: R.rHipJointZ, rKneeX: 0.35,
            hipY: 0.2, hipX: -0.05, spineX: -0.35, spineY: 0.2, spineZ: 0.05,
            neckY: R.neckY * 0.5, neckX: -0.15,
            rShX: 0.4, rShY: 0, rShZ: -0.3, rElX: -1.4,
            lShX: 0.3, lShY: 0, lShZ: 0, lElX: -1.2,
            batX: -2.4, batY: R.batY, batZ: 0.15,
            groupZ: -0.5,
          },
        };

      case SHOTS.PULL:
        return {
          step: {
            lHipJointX: 0.1, lHipJointZ: R.lHipJointZ, lKneeX: 0.2,
            rHipJointX: -0.3, rHipJointZ: R.rHipJointZ, rKneeX: 0.4,
            hipY: -0.2, hipX: 0, spineX: -0.05, spineY: -0.1, spineZ: 0,
            neckY: R.neckY, neckX: 0,
            rShX: -0.3, rShY: 0, rShZ: -0.2, rElX: -1.2,
            lShX: -0.25, lShY: 0, lShZ: 0.25, lElX: -1.1,
            batX: 0.4, batY: R.batY, batZ: 0.15,
            groupZ: 0.2,
          },
          backlift: {
            lHipJointX: 0.05, lHipJointZ: R.lHipJointZ, lKneeX: 0.2,
            rHipJointX: -0.35, rHipJointZ: R.rHipJointZ, rKneeX: 0.5,
            hipY: -0.3, hipX: 0, spineX: 0.15, spineY: -0.2, spineZ: -0.1,
            neckY: R.neckY, neckX: 0.05,
            rShX: -2.2, rShY: -0.2, rShZ: 0.1, rElX: -0.3,
            lShX: -2.0, lShY: -0.15, lShZ: 0.15, lElX: -0.2,
            batX: 2.2, batY: R.batY + 0.3, batZ: 0.3,
            groupZ: 0.2,
          },
          swing: {
            lHipJointX: 0, lHipJointZ: R.lHipJointZ, lKneeX: 0.3,
            rHipJointX: -0.15, rHipJointZ: R.rHipJointZ, rKneeX: 0.25,
            hipY: -0.5, hipX: 0.05, spineX: -0.1, spineY: -0.5, spineZ: -0.1,
            neckY: R.neckY * 0.3, neckX: 0,
            rShX: -0.2, rShY: -0.4, rShZ: 0.35, rElX: -0.7,
            lShX: -0.3, lShY: -0.3, lShZ: -0.3, lElX: -0.5,
            batX: -0.6, batY: R.batY + 0.8, batZ: -0.9,
            groupZ: 0.2,
          },
          followThrough: {
            lHipJointX: 0, lHipJointZ: R.lHipJointZ, lKneeX: 0.35,
            rHipJointX: -0.05, rHipJointZ: R.rHipJointZ, rKneeX: 0.2,
            hipY: -0.6, hipX: 0.05, spineX: -0.1, spineY: -0.7, spineZ: -0.15,
            neckY: R.neckY * 0.1, neckX: -0.05,
            rShX: 0.2, rShY: -0.5, rShZ: 0.5, rElX: -0.5,
            lShX: 0.1, lShY: -0.35, lShZ: -0.5, lElX: -0.4,
            batX: -1.6, batY: R.batY + 1.2, batZ: -1.3,
            groupZ: 0.2,
          },
        };

      case SHOTS.CUT:
        return {
          step: {
            lHipJointX: 0.05, lHipJointZ: R.lHipJointZ, lKneeX: 0.2,
            rHipJointX: -0.2, rHipJointZ: R.rHipJointZ, rKneeX: 0.35,
            hipY: 0.1, hipX: 0, spineX: -0.05, spineY: 0.1, spineZ: 0,
            neckY: R.neckY, neckX: 0,
            rShX: -0.3, rShY: 0, rShZ: -0.25, rElX: -1.2,
            lShX: -0.25, lShY: 0, lShZ: 0.35, lElX: -1.1,
            batX: 0.4, batY: R.batY, batZ: -0.1,
            groupZ: 0.1,
          },
          backlift: {
            lHipJointX: 0, lHipJointZ: R.lHipJointZ, lKneeX: 0.2,
            rHipJointX: -0.25, rHipJointZ: R.rHipJointZ, rKneeX: 0.4,
            hipY: 0.1, hipX: 0, spineX: 0.12, spineY: 0.15, spineZ: 0.05,
            neckY: R.neckY, neckX: 0,
            rShX: -2.0, rShY: 0.15, rShZ: -0.3, rElX: -0.25,
            lShX: -1.8, lShY: 0.1, lShZ: 0.5, lElX: -0.15,
            batX: 2.0, batY: R.batY - 0.3, batZ: -0.2,
            groupZ: 0.1,
          },
          swing: {
            lHipJointX: 0, lHipJointZ: R.lHipJointZ, lKneeX: 0.15,
            rHipJointX: -0.1, rHipJointZ: R.rHipJointZ, rKneeX: 0.45,
            hipY: 0.25, hipX: 0, spineX: -0.15, spineY: 0.4, spineZ: 0.1,
            neckY: R.neckY * 1.2, neckX: -0.05,
            rShX: -0.3, rShY: 0.25, rShZ: -0.7, rElX: -1.0,
            lShX: -0.2, lShY: 0.15, lShZ: 0.25, lElX: -0.9,
            batX: -0.8, batY: R.batY - 0.8, batZ: 0.6,
            groupZ: 0.1,
          },
          followThrough: {
            lHipJointX: 0, lHipJointZ: R.lHipJointZ, lKneeX: 0.1,
            rHipJointX: -0.05, rHipJointZ: R.rHipJointZ, rKneeX: 0.5,
            hipY: 0.3, hipX: 0, spineX: -0.2, spineY: 0.5, spineZ: 0.15,
            neckY: R.neckY * 1.3, neckX: -0.1,
            rShX: -0.1, rShY: 0.35, rShZ: -0.9, rElX: -1.1,
            lShX: 0, lShY: 0.25, lShZ: 0.15, lElX: -1.0,
            batX: -1.6, batY: R.batY - 1.2, batZ: 0.8,
            groupZ: 0.1,
          },
        };

      case SHOTS.BLOCK:
      default:
        return {
          step: {
            lHipJointX: -0.25, lHipJointZ: R.lHipJointZ, lKneeX: 0.22,
            rHipJointX: 0.05, rHipJointZ: R.rHipJointZ, rKneeX: 0.2,
            hipY: 0, hipX: 0, spineX: -0.08, spineY: 0, spineZ: -0.03,
            neckY: R.neckY, neckX: -0.03,
            rShX: -0.25, rShY: 0, rShZ: -0.2, rElX: -1.3,
            lShX: -0.2, lShY: 0, lShZ: 0.3, lElX: -1.2,
            batX: 0.2, batY: R.batY, batZ: 0.05,
            groupZ: -0.15,
          },
          backlift: {
            lHipJointX: -0.3, lHipJointZ: R.lHipJointZ, lKneeX: 0.25,
            rHipJointX: 0.05, rHipJointZ: R.rHipJointZ, rKneeX: 0.2,
            hipY: 0, hipX: 0, spineX: 0.03, spineY: 0, spineZ: -0.03,
            neckY: R.neckY, neckX: 0,
            rShX: -1.0, rShY: 0, rShZ: -0.18, rElX: -0.6,
            lShX: -0.9, lShY: 0, lShZ: 0.3, lElX: -0.5,
            batX: 1.0, batY: R.batY, batZ: 0,
            groupZ: -0.15,
          },
          swing: {
            lHipJointX: -0.4, lHipJointZ: R.lHipJointZ, lKneeX: 0.2,
            rHipJointX: 0.08, rHipJointZ: R.rHipJointZ, rKneeX: 0.22,
            hipY: 0.05, hipX: 0, spineX: -0.12, spineY: 0, spineZ: -0.02,
            neckY: R.neckY, neckX: -0.05,
            rShX: -0.4, rShY: 0, rShZ: -0.25, rElX: -1.0,
            lShX: -0.35, lShY: 0, lShZ: 0.25, lElX: -0.9,
            batX: -0.2, batY: R.batY, batZ: 0,
            groupZ: -0.2,
          },
          followThrough: {
            lHipJointX: -0.45, lHipJointZ: R.lHipJointZ, lKneeX: 0.2,
            rHipJointX: 0.08, rHipJointZ: R.rHipJointZ, rKneeX: 0.22,
            hipY: 0.05, hipX: 0, spineX: -0.12, spineY: 0, spineZ: -0.02,
            neckY: R.neckY, neckX: -0.05,
            rShX: -0.35, rShY: 0, rShZ: -0.25, rElX: -1.0,
            lShX: -0.3, lShY: 0, lShZ: 0.25, lElX: -0.85,
            batX: -0.35, batY: R.batY, batZ: 0,
            groupZ: -0.2,
          },
        };
    }
  }

  _applyPose(pose, t) {
    const l = (current, target) => lerp(current, target, t);

    if (pose.rShX !== undefined) this.rightShoulderJoint.rotation.x = l(this.rightShoulderJoint.rotation.x, pose.rShX);
    if (pose.rShY !== undefined) this.rightShoulderJoint.rotation.y = l(this.rightShoulderJoint.rotation.y, pose.rShY);
    if (pose.rShZ !== undefined) this.rightShoulderJoint.rotation.z = l(this.rightShoulderJoint.rotation.z, pose.rShZ);
    if (pose.rElX !== undefined) this.rightElbowJoint.rotation.x = l(this.rightElbowJoint.rotation.x, pose.rElX);
    // Left arm (lShX, lShY, lShZ, lElX) is driven by _solveLeftHandIK — skip here
    if (pose.batX !== undefined) this.batGroup.rotation.x = l(this.batGroup.rotation.x, pose.batX);
    if (pose.batY !== undefined) this.batGroup.rotation.y = l(this.batGroup.rotation.y, pose.batY);
    if (pose.batZ !== undefined) this.batGroup.rotation.z = l(this.batGroup.rotation.z, pose.batZ);
    if (pose.spineX !== undefined) this.spineJoint.rotation.x = l(this.spineJoint.rotation.x, pose.spineX);
    if (pose.spineY !== undefined) this.spineJoint.rotation.y = l(this.spineJoint.rotation.y, pose.spineY);
    if (pose.spineZ !== undefined) this.spineJoint.rotation.z = l(this.spineJoint.rotation.z, pose.spineZ);
    if (pose.hipY !== undefined) this.hipJoint.rotation.y = l(this.hipJoint.rotation.y, pose.hipY);
    if (pose.hipX !== undefined) this.hipJoint.rotation.x = l(this.hipJoint.rotation.x, pose.hipX);
    if (pose.lHipJointX !== undefined) this.leftHipJoint.rotation.x = l(this.leftHipJoint.rotation.x, pose.lHipJointX);
    if (pose.lHipJointZ !== undefined) this.leftHipJoint.rotation.z = l(this.leftHipJoint.rotation.z, pose.lHipJointZ);
    if (pose.rHipJointX !== undefined) this.rightHipJoint.rotation.x = l(this.rightHipJoint.rotation.x, pose.rHipJointX);
    if (pose.rHipJointZ !== undefined) this.rightHipJoint.rotation.z = l(this.rightHipJoint.rotation.z, pose.rHipJointZ);
    if (pose.lKneeX !== undefined) this.leftKneeJoint.rotation.x = l(this.leftKneeJoint.rotation.x, pose.lKneeX);
    if (pose.rKneeX !== undefined) this.rightKneeJoint.rotation.x = l(this.rightKneeJoint.rotation.x, pose.rKneeX);
    if (pose.neckY !== undefined) this.neckJoint.rotation.y = l(this.neckJoint.rotation.y, pose.neckY);
    if (pose.neckX !== undefined) this.neckJoint.rotation.x = l(this.neckJoint.rotation.x, pose.neckX);

    if (pose.groupZ !== undefined) {
      this.group.position.z = l(this.group.position.z, this._homeZ + pose.groupZ);
    }
  }

  update(dt) {
    if (this._animState === 'step') {
      this._animTime += dt;
      const t = Math.min(this._animTime / this._animDuration, 1.0);
      const kf = this._getShotKeyframes(this._shotType);
      this._applyPose(kf.step, t);
      if (t >= 1.0) {
        this._animState = 'backlift';
        this._animTime = 0;
        this._animDuration = 0.1;
      }
    } else if (this._animState === 'backlift') {
      this._animTime += dt;
      const t = Math.min(this._animTime / this._animDuration, 1.0);
      const kf = this._getShotKeyframes(this._shotType);
      this._applyPose(kf.backlift, t);
      if (t >= 1.0) {
        this._animState = 'swinging';
        this._animTime = 0;
        this._animDuration = 0.12;
      }
    } else if (this._animState === 'swinging') {
      this._animTime += dt;
      const t = Math.min(this._animTime / this._animDuration, 1.0);
      const kf = this._getShotKeyframes(this._shotType);
      this._applyPose(kf.swing, t);
      if (t >= 1.0) {
        this._animState = 'followthrough';
        this._animTime = 0;
        this._animDuration = 0.18;
      }
    } else if (this._animState === 'followthrough') {
      this._animTime += dt;
      const t = Math.min(this._animTime / this._animDuration, 1.0);
      const kf = this._getShotKeyframes(this._shotType);
      this._applyPose(kf.followThrough, t);
      if (t >= 1.0) {
        this._animState = 'returning';
        this._animTime = 0;
        this._animDuration = 0.5;
      }
    } else if (this._animState === 'returning') {
      this._animTime += dt;
      const t = Math.min(this._animTime / this._animDuration, 1.0);
      this._applyPose(this._restPose, t);
      if (t >= 1.0) {
        this._animState = 'idle';
      }
    }

    this._solveLeftHandIK();
  }

  _solveLeftHandIK() {
    // Both hands grip the bat together. The left arm mirrors the right arm's
    // rotations with offsets to account for the opposite shoulder position.
    // The left shoulder Z is flipped and offset to bring the arm across the body.
    const rShX = this.rightShoulderJoint.rotation.x;
    const rShY = this.rightShoulderJoint.rotation.y;
    const rShZ = this.rightShoulderJoint.rotation.z;
    const rElX = this.rightElbowJoint.rotation.x;

    this.leftShoulderJoint.rotation.x = rShX - 0.05;
    this.leftShoulderJoint.rotation.y = -rShY;
    this.leftShoulderJoint.rotation.z = -rShZ + 0.45;
    this.leftElbowJoint.rotation.x = rElX + 0.1;
  }

  resetPose() {
    this._animState = 'idle';
    this._animTime = 0;
    this.group.position.set(this._homeX, 0, this._homeZ);
    if (!this._restPose) return;
    this._applyPose(this._restPose, 1.0);
  }
}
