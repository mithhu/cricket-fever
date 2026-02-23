import * as THREE from 'three';
import { BALL_RADIUS, GRAVITY, BOUNDARY_RADIUS } from '../utils/constants.js';
import { distance2D } from '../utils/helpers.js';

const VISUAL_SCALE = 4;

export class Ball {
  constructor(scene) {
    this.scene = scene;

    // Visual radius is scaled up so you can actually see the ball from broadcast camera
    const geo = new THREE.SphereGeometry(BALL_RADIUS * VISUAL_SCALE, 16, 16);
    const mat = new THREE.MeshLambertMaterial({ color: 0xcc2222 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.mesh.visible = false;
    scene.add(this.mesh);

    // Seam line
    const seamGeo = new THREE.TorusGeometry(BALL_RADIUS * VISUAL_SCALE + 0.005, 0.012, 8, 32);
    const seamMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.seam = new THREE.Mesh(seamGeo, seamMat);
    this.mesh.add(this.seam);

    // Shadow blob on ground for depth perception
    const shadowGeo = new THREE.CircleGeometry(0.15, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.35,
    });
    this.shadowBlob = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowBlob.rotation.x = -Math.PI / 2;
    this.shadowBlob.visible = false;
    scene.add(this.shadowBlob);

    this.reset();
  }

  reset() {
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.active = false;
    this.hasBounced = false;
    this.hasBeenHit = false;
    this.settled = false;
    this._rolling = false;
    this.mesh.visible = false;
    this.shadowBlob.visible = false;
  }

  launch(startPos, velocity) {
    this.position.copy(startPos);
    this.velocity.copy(velocity);
    this.active = true;
    this.hasBounced = false;
    this.hasBeenHit = false;
    this.settled = false;
    this.mesh.visible = true;
    this.shadowBlob.visible = true;
    this.mesh.position.copy(startPos);
  }

  hitByBat(newVelocity) {
    this.velocity.copy(newVelocity);
    this.hasBeenHit = true;
    this.hasBounced = false;
  }

  update(dt) {
    if (!this.active || this.settled) return;

    this.velocity.y += GRAVITY * dt;
    this.position.addScaledVector(this.velocity, dt);

    if (this.position.y <= BALL_RADIUS) {
      this.position.y = BALL_RADIUS;

      if (this.hasBeenHit) {
        // Bounce: preserve most horizontal speed, lose some vertical
        this.velocity.y *= -0.35;
        this.velocity.x *= 0.95;
        this.velocity.z *= 0.95;

        if (Math.abs(this.velocity.y) < 0.4) {
          this.velocity.y = 0;
          this._rolling = true;
        }
      } else {
        // Pitch bounce before reaching batsman
        this.velocity.y *= -0.4;
        if (Math.abs(this.velocity.y) < 0.3) {
          this.velocity.y = 0.3;
        }
        this.hasBounced = true;
        this.velocity.x += (Math.random() - 0.5) * 0.3;
      }
    }

    // Ground rolling friction — ball slows gradually on the outfield
    if (this.hasBeenHit && this.position.y <= BALL_RADIUS + 0.05) {
      const groundSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);

      // Outfield friction: faster balls lose speed more slowly (proportional)
      // ~2-3 m/s² deceleration feels right for a cricket outfield
      const frictionDecel = 2.5;
      if (groundSpeed > 0.3) {
        const factor = Math.max(0, 1 - (frictionDecel * dt) / groundSpeed);
        this.velocity.x *= factor;
        this.velocity.z *= factor;
      } else {
        this.velocity.x = 0;
        this.velocity.z = 0;
        this.settled = true;
      }
    }

    // Spin the ball visually
    this.seam.rotation.x += dt * 15;
    this.seam.rotation.z += dt * 8;

    this.mesh.position.copy(this.position);

    this.shadowBlob.position.set(this.position.x, 0.02, this.position.z);
    this.shadowBlob.visible = this.position.y > 0.1;
  }

  isPassedBoundary() {
    return distance2D(this.position.x, this.position.z, 0, 0) >= BOUNDARY_RADIUS;
  }

  isSix() {
    return this.isPassedBoundary() && this.position.y > 1.0;
  }

  isFour() {
    return this.isPassedBoundary() && this.position.y <= 1.0;
  }

  getDistanceFromCenter() {
    return distance2D(this.position.x, this.position.z, 0, 0);
  }
}
