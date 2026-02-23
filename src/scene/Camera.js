import * as THREE from 'three';
import { CAMERA_BROADCAST_POS, CAMERA_BROADCAST_LOOK, BATSMAN_Z } from '../utils/constants.js';
import { lerp } from '../utils/helpers.js';

export class GameCamera {
  constructor(canvas) {
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    this._resetToDefault();
    this._targetPos = this.camera.position.clone();
    this._targetLook = new THREE.Vector3(CAMERA_BROADCAST_LOOK.x, CAMERA_BROADCAST_LOOK.y, CAMERA_BROADCAST_LOOK.z);
    this._currentLook = this._targetLook.clone();
    this._trackingBall = false;
    this._lerpSpeed = 2.0;

    window.addEventListener('resize', () => this._onResize());
  }

  _resetToDefault() {
    this.camera.position.set(
      CAMERA_BROADCAST_POS.x,
      CAMERA_BROADCAST_POS.y,
      CAMERA_BROADCAST_POS.z
    );
    this.camera.lookAt(
      CAMERA_BROADCAST_LOOK.x,
      CAMERA_BROADCAST_LOOK.y,
      CAMERA_BROADCAST_LOOK.z
    );
  }

  resetForNewBall() {
    this._trackingBall = false;
    this._targetPos.set(
      CAMERA_BROADCAST_POS.x,
      CAMERA_BROADCAST_POS.y,
      CAMERA_BROADCAST_POS.z
    );
    this._targetLook.set(
      CAMERA_BROADCAST_LOOK.x,
      CAMERA_BROADCAST_LOOK.y,
      CAMERA_BROADCAST_LOOK.z
    );
    this._lerpSpeed = 2.0;
  }

  followBall(ballPosition, isHit) {
    this._trackingBall = true;
    this._targetLook.copy(ballPosition);

    if (!isHit) return;

    // After a shot, pull the camera up and back to show where the ball is going
    const dist = Math.sqrt(ballPosition.x * ballPosition.x + ballPosition.z * ballPosition.z);
    if (dist > 8) {
      this._targetPos.set(
        ballPosition.x * 0.15,
        10 + dist * 0.08,
        BATSMAN_Z + 2
      );
      this._lerpSpeed = 1.2;
    }
  }

  update(dt) {
    const s = 1 - Math.exp(-this._lerpSpeed * dt);

    this.camera.position.x = lerp(this.camera.position.x, this._targetPos.x, s);
    this.camera.position.y = lerp(this.camera.position.y, this._targetPos.y, s);
    this.camera.position.z = lerp(this.camera.position.z, this._targetPos.z, s);

    this._currentLook.x = lerp(this._currentLook.x, this._targetLook.x, s);
    this._currentLook.y = lerp(this._currentLook.y, this._targetLook.y, s);
    this._currentLook.z = lerp(this._currentLook.z, this._targetLook.z, s);

    this.camera.lookAt(this._currentLook);
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}
