import * as THREE from 'three';
import { BATSMAN_Z, BOWLER_RELEASE_Z } from '../utils/constants.js';

const MARKER_RADIUS = 0.3;
const LINE_MIN = -1.2;
const LINE_MAX = 1.2;
const LENGTH_MIN = BOWLER_RELEASE_Z + 4;
const LENGTH_MAX = BATSMAN_Z - 0.5;
const SPEED_MIN = 10;
const SPEED_MAX = 28;

const DIFFICULTY_OSCILLATION = {
  easy: { lineSpeed: 0.5, lengthSpeed: 0.4, speedRate: 0.45 },
  medium: { lineSpeed: 0.8, lengthSpeed: 0.65, speedRate: 0.7 },
  hard: { lineSpeed: 1.3, lengthSpeed: 1.1, speedRate: 1.2 },
};

export class BowlingMarker {
  constructor(scene) {
    this.scene = scene;
    this._phase = 'inactive'; // inactive | line | length | speed | done
    this._time = 0;
    this._difficulty = 'medium';

    this.lockedLine = 0;
    this.lockedLength = 0;
    this.lockedSpeed = 18;

    // 3D marker ring on pitch
    const ringGeo = new THREE.RingGeometry(MARKER_RADIUS - 0.05, MARKER_RADIUS, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.02;
    this.ring.visible = false;
    scene.add(this.ring);

    // Inner dot
    const dotGeo = new THREE.CircleGeometry(0.06, 16);
    const dotMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    this.dot = new THREE.Mesh(dotGeo, dotMat);
    this.dot.rotation.x = -Math.PI / 2;
    this.dot.position.y = 0.025;
    this.dot.visible = false;
    scene.add(this.dot);

    // UI elements (will be wired after HTML is ready)
    this.speedBarEl = null;
    this.speedFillEl = null;
    this.speedLabelEl = null;
    this.aimHintEl = null;
  }

  wireUI() {
    this.speedBarEl = document.getElementById('bowling-speed-bar');
    this.speedFillEl = document.getElementById('bowling-speed-fill');
    this.speedLabelEl = document.getElementById('bowling-speed-label');
    this.aimHintEl = document.getElementById('bowling-aim-hint');
  }

  setDifficulty(d) {
    this._difficulty = d;
  }

  start() {
    this._phase = 'line';
    this._time = 0;
    this.ring.visible = true;
    this.dot.visible = true;
    this._showHint('Set LINE — press Space');
    this._hideSpeedBar();
  }

  stop() {
    this._phase = 'inactive';
    this.ring.visible = false;
    this.dot.visible = false;
    this._hideSpeedBar();
    this._hideHint();
  }

  isActive() {
    return this._phase !== 'inactive' && this._phase !== 'done';
  }

  isDone() {
    return this._phase === 'done';
  }

  getResult() {
    return {
      line: this.lockedLine,
      length: this.lockedLength,
      speed: this.lockedSpeed,
    };
  }

  consumeResult() {
    this._phase = 'inactive';
    this.ring.visible = false;
    this.dot.visible = false;
    this._hideSpeedBar();
    this._hideHint();
    return this.getResult();
  }

  onSpacePressed() {
    if (this._phase === 'line') {
      this.lockedLine = this.ring.position.x;
      this._phase = 'length';
      this._time = 0;
      this._showHint('Set LENGTH — press Space');
    } else if (this._phase === 'length') {
      this.lockedLength = this.ring.position.z;
      this._phase = 'speed';
      this._time = 0;
      this.ring.material.color.setHex(0x44ff44);
      this._showSpeedBar();
      this._showHint('Set SPEED — press Space');
    } else if (this._phase === 'speed') {
      const settings = DIFFICULTY_OSCILLATION[this._difficulty] || DIFFICULTY_OSCILLATION.medium;
      const t = (Math.sin(this._time * settings.speedRate * Math.PI * 2) + 1) / 2;
      this.lockedSpeed = SPEED_MIN + t * (SPEED_MAX - SPEED_MIN);
      this._phase = 'done';
      this.ring.visible = false;
      this.dot.visible = false;
      this._hideSpeedBar();
      this._hideHint();
    }
  }

  update(dt) {
    if (this._phase === 'inactive' || this._phase === 'done') return;

    this._time += dt;
    const settings = DIFFICULTY_OSCILLATION[this._difficulty] || DIFFICULTY_OSCILLATION.medium;

    if (this._phase === 'line') {
      const x = Math.sin(this._time * settings.lineSpeed * Math.PI * 2);
      const lineX = x * ((LINE_MAX - LINE_MIN) / 2);
      const midZ = (LENGTH_MIN + LENGTH_MAX) / 2;
      this.ring.position.set(lineX, 0.02, midZ);
      this.dot.position.set(lineX, 0.025, midZ);
    } else if (this._phase === 'length') {
      const z = Math.sin(this._time * settings.lengthSpeed * Math.PI * 2);
      const lengthZ = ((LENGTH_MIN + LENGTH_MAX) / 2) + z * ((LENGTH_MAX - LENGTH_MIN) / 2);
      this.ring.position.set(this.lockedLine, 0.02, lengthZ);
      this.dot.position.set(this.lockedLine, 0.025, lengthZ);
    } else if (this._phase === 'speed') {
      const t = (Math.sin(this._time * settings.speedRate * Math.PI * 2) + 1) / 2;
      const speed = SPEED_MIN + t * (SPEED_MAX - SPEED_MIN);
      this._updateSpeedBar(t, speed);
    }
  }

  _showSpeedBar() {
    if (this.speedBarEl) this.speedBarEl.style.display = 'block';
    if (this.speedLabelEl) this.speedLabelEl.style.display = 'block';
  }

  _hideSpeedBar() {
    if (this.speedBarEl) this.speedBarEl.style.display = 'none';
    if (this.speedLabelEl) this.speedLabelEl.style.display = 'none';
  }

  _updateSpeedBar(pct, speed) {
    if (!this.speedFillEl) return;
    this.speedFillEl.style.height = `${pct * 100}%`;
    const kmh = (speed * 3.6).toFixed(0);
    if (this.speedLabelEl) this.speedLabelEl.textContent = `${kmh} km/h`;
    if (pct > 0.7) {
      this.speedFillEl.style.background = 'linear-gradient(to top, #ff4444, #ff8844)';
    } else if (pct > 0.35) {
      this.speedFillEl.style.background = 'linear-gradient(to top, #ffaa33, #ffdd44)';
    } else {
      this.speedFillEl.style.background = 'linear-gradient(to top, #44aa66, #88dd88)';
    }
  }

  _showHint(text) {
    if (this.aimHintEl) {
      this.aimHintEl.textContent = text;
      this.aimHintEl.style.display = 'block';
    }
  }

  _hideHint() {
    if (this.aimHintEl) this.aimHintEl.style.display = 'none';
  }
}
