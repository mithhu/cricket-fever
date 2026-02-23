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

    for (const zSign of [-1, 1]) {
      const z = zSign * PITCH_HALF;
      for (let i = -1; i <= 1; i++) {
        const stumpGeo = new THREE.CylinderGeometry(STUMP_RADIUS, STUMP_RADIUS, STUMP_HEIGHT, 8);
        const stump = new THREE.Mesh(stumpGeo, stumpMat);
        stump.position.set(i * STUMP_GAP, STUMP_HEIGHT / 2, z);
        stump.castShadow = true;
        this.stumpsGroup.add(stump);
      }

      // Bails
      for (let i = 0; i < 2; i++) {
        const bailGeo = new THREE.CylinderGeometry(0.008, 0.008, STUMP_GAP + 0.02, 6);
        const bail = new THREE.Mesh(bailGeo, bailMat);
        bail.rotation.z = Math.PI / 2;
        bail.position.set((i - 0.5) * STUMP_GAP, STUMP_HEIGHT + 0.01, z);
        this.stumpsGroup.add(bail);
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
