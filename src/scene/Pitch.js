import * as THREE from 'three';
import {
  PITCH_LENGTH, PITCH_WIDTH, PITCH_HALF,
  STUMP_HEIGHT, STUMP_RADIUS, STUMP_GAP,
  CREASE_LENGTH, POPPING_CREASE_DIST,
} from '../utils/constants.js';

export class Pitch {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.stumpsGroup = new THREE.Group();
    this._buildPitchStrip();
    this._buildStumps();
    this._buildCreaseLines();
    this.group.add(this.stumpsGroup);
    scene.add(this.group);
  }

  _buildPitchStrip() {
    const geo = new THREE.PlaneGeometry(PITCH_WIDTH, PITCH_LENGTH);
    const mat = new THREE.MeshLambertMaterial({ color: 0xc4a455 });
    const strip = new THREE.Mesh(geo, mat);
    strip.rotation.x = -Math.PI / 2;
    strip.position.y = 0.005;
    this.group.add(strip);

    // Good length area marking (subtle)
    const goodGeo = new THREE.PlaneGeometry(PITCH_WIDTH * 0.9, 3);
    const goodMat = new THREE.MeshLambertMaterial({ color: 0xb89840, transparent: true, opacity: 0.5 });
    const good = new THREE.Mesh(goodGeo, goodMat);
    good.rotation.x = -Math.PI / 2;
    good.position.set(0, 0.008, -2);
    this.group.add(good);
  }

  _buildStumps() {
    const stumpMat = new THREE.MeshLambertMaterial({ color: 0xf5f0dc });
    const bailMat = new THREE.MeshLambertMaterial({ color: 0xf5e6b8 });

    this._batsmanBails = [];
    this._bailAnims = [];

    for (const zSign of [-1, 1]) {
      const z = zSign * PITCH_HALF;
      const isBatsmanEnd = zSign === 1;

      for (let i = -1; i <= 1; i++) {
        const stumpGeo = new THREE.CylinderGeometry(STUMP_RADIUS, STUMP_RADIUS, STUMP_HEIGHT, 8);
        const stump = new THREE.Mesh(stumpGeo, stumpMat);
        stump.position.set(i * STUMP_GAP, STUMP_HEIGHT / 2, z);
        stump.castShadow = true;
        this.stumpsGroup.add(stump);
      }

      for (let i = 0; i < 2; i++) {
        const bailGeo = new THREE.CylinderGeometry(0.008, 0.008, STUMP_GAP + 0.02, 6);
        const bail = new THREE.Mesh(bailGeo, bailMat);
        bail.rotation.z = Math.PI / 2;
        const restX = (i - 0.5) * STUMP_GAP;
        const restY = STUMP_HEIGHT + 0.01;
        bail.position.set(restX, restY, z);
        this.stumpsGroup.add(bail);

        if (isBatsmanEnd) {
          this._batsmanBails.push(bail);
          bail.userData.restPos = new THREE.Vector3(restX, restY, z);
          bail.userData.restRot = new THREE.Euler(0, 0, Math.PI / 2);
        }
      }
    }
  }

  triggerBailsFly() {
    if (this._bailAnims.length > 0) return;
    for (const bail of this._batsmanBails) {
      this._bailAnims.push({
        bail,
        vx: (Math.random() - 0.5) * 3,
        vy: 4 + Math.random() * 3,
        vz: 1 + Math.random() * 2,
        vRotX: (Math.random() - 0.5) * 15,
        vRotZ: (Math.random() - 0.5) * 15,
        time: 0,
      });
    }
  }

  resetBails() {
    this._bailAnims = [];
    for (const bail of this._batsmanBails) {
      bail.position.copy(bail.userData.restPos);
      bail.rotation.set(0, 0, Math.PI / 2);
    }
  }

  updateBails(dt) {
    for (const a of this._bailAnims) {
      a.time += dt;
      a.vy -= 9.81 * dt;
      a.bail.position.x += a.vx * dt;
      a.bail.position.y += a.vy * dt;
      a.bail.position.z += a.vz * dt;
      a.bail.rotation.x += a.vRotX * dt;
      a.bail.rotation.z += a.vRotZ * dt;

      if (a.bail.position.y < 0.01) {
        a.bail.position.y = 0.01;
        a.vy = 0;
        a.vx *= 0.5;
        a.vz *= 0.5;
        a.vRotX *= 0.3;
        a.vRotZ *= 0.3;
      }
    }
  }

  _buildCreaseLines() {
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });

    for (const zSign of [-1, 1]) {
      const stumpZ = zSign * PITCH_HALF;

      // Popping crease
      const popZ = stumpZ - zSign * POPPING_CREASE_DIST;
      const popPoints = [
        new THREE.Vector3(-CREASE_LENGTH, 0.01, popZ),
        new THREE.Vector3(CREASE_LENGTH, 0.01, popZ),
      ];
      const popGeo = new THREE.BufferGeometry().setFromPoints(popPoints);
      this.group.add(new THREE.Line(popGeo, lineMat));

      // Bowling crease (at stumps)
      const bowlPoints = [
        new THREE.Vector3(-CREASE_LENGTH, 0.01, stumpZ),
        new THREE.Vector3(CREASE_LENGTH, 0.01, stumpZ),
      ];
      const bowlGeo = new THREE.BufferGeometry().setFromPoints(bowlPoints);
      this.group.add(new THREE.Line(bowlGeo, lineMat));

      // Return creases
      for (const xSign of [-1, 1]) {
        const retPoints = [
          new THREE.Vector3(xSign * CREASE_LENGTH, 0.01, stumpZ),
          new THREE.Vector3(xSign * CREASE_LENGTH, 0.01, popZ),
        ];
        const retGeo = new THREE.BufferGeometry().setFromPoints(retPoints);
        this.group.add(new THREE.Line(retGeo, lineMat));
      }
    }
  }

  getBatsmanStumpsPosition() {
    return new THREE.Vector3(0, STUMP_HEIGHT / 2, PITCH_HALF);
  }

  getBowlerStumpsPosition() {
    return new THREE.Vector3(0, STUMP_HEIGHT / 2, -PITCH_HALF);
  }
}
