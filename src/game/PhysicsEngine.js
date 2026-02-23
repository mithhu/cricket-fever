import * as THREE from 'three';
import {
  BATSMAN_Z, STUMP_HEIGHT, STUMP_GAP, PITCH_HALF,
  SHOTS, BOUNDARY_RADIUS,
} from '../utils/constants.js';
import { randRange, clamp } from '../utils/helpers.js';

export class PhysicsEngine {
  constructor() {
    this._timingQuality = 'miss';
  }

  checkBallAtBatsman(ball) {
    if (ball.hasBeenHit) return false;
    const dz = Math.abs(ball.position.z - BATSMAN_Z);
    return dz < 0.8 && ball.velocity.z > 0;
  }

  calculateTimingQuality(ball) {
    const zDist = Math.abs(ball.position.z - BATSMAN_Z);

    if (zDist < 1.5) {
      this._timingQuality = 'perfect';
    } else if (zDist < 3.0) {
      this._timingQuality = 'good';
    } else if (zDist < 5.0) {
      this._timingQuality = 'early_late';
    } else {
      this._timingQuality = 'miss';
    }

    return this._timingQuality;
  }

  calculateShotVelocity(shotType, lofted, timingQuality) {
    const qualityMultiplier = {
      perfect: 1.0,
      good: 0.75,
      early_late: 0.4,
      miss: 0,
    }[timingQuality];

    if (qualityMultiplier === 0) {
      return null;
    }

    // Coordinate system: -Z toward bowler, +Z behind batsman, +X leg side, -X off side
    let vx, vy, vz;

    switch (shotType) {
      case SHOTS.DRIVE: {
        // Straight drive: goes back toward the bowler (-Z), slight spread
        const speed = randRange(22, 36) * qualityMultiplier;
        vx = randRange(-2, 2);
        vz = -speed;  // toward bowler
        vy = lofted ? randRange(6, 14) : randRange(1, 4);
        break;
      }
      case SHOTS.PULL: {
        // Pull: goes to leg side (+X), slightly behind square (+Z minor)
        const speed = randRange(24, 40) * qualityMultiplier;
        vx = speed * randRange(0.6, 0.95);   // strong leg side
        vz = speed * randRange(-0.4, 0.3);    // between mid-wicket and square leg
        vy = lofted ? randRange(8, 16) : randRange(2, 5);
        break;
      }
      case SHOTS.CUT: {
        // Cut: goes to off side (-X), slightly behind square
        const speed = randRange(20, 34) * qualityMultiplier;
        vx = -speed * randRange(0.6, 0.95);  // strong off side
        vz = speed * randRange(-0.3, 0.3);    // between cover and point
        vy = lofted ? randRange(6, 12) : randRange(1, 4);
        break;
      }
      case SHOTS.BLOCK:
      default: {
        // Block: soft shot, drops in front toward bowler (-Z)
        const speed = randRange(3, 8) * qualityMultiplier;
        vx = randRange(-1, 1);
        vz = -speed;
        vy = randRange(0.5, 2);
        break;
      }
    }

    return new THREE.Vector3(vx, Math.max(vy, 1), vz);
  }

  checkBowled(ball) {
    if (ball.hasBeenHit) return false;
    // Ball has passed batsman and is near stumps
    if (ball.position.z >= PITCH_HALF - 0.1 &&
        ball.position.y <= STUMP_HEIGHT + 0.05 &&
        Math.abs(ball.position.x) <= STUMP_GAP * 1.5) {
      return true;
    }
    return false;
  }

  checkCaught(shotType, timingQuality, lofted) {
    if (shotType === SHOTS.BLOCK) return false;

    let catchChance = 0;

    if (timingQuality === 'early_late') {
      catchChance = lofted ? 0.55 : 0.2;
    } else if (timingQuality === 'good') {
      catchChance = lofted ? 0.15 : 0.05;
    } else if (timingQuality === 'perfect') {
      catchChance = lofted ? 0.08 : 0.02;
    }

    return Math.random() < catchChance;
  }

  estimateRuns(ball) {
    if (ball.isSix()) return 6;
    if (ball.isFour()) return 4;

    const dist = ball.getDistanceFromCenter();
    if (dist < 10) return 0;
    if (dist < 25) return 1;
    if (dist < 40) return 2;
    return 3;
  }
}
