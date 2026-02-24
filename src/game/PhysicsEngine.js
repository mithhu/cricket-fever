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
    const ballSpeed = ball.velocity.length();

    // Tighter windows for faster deliveries (base thresholds at ~15 m/s)
    const speedFactor = Math.max(0.6, 15 / Math.max(ballSpeed, 8));

    const perfectThreshold = 1.5 * speedFactor;
    const goodThreshold = 3.0 * speedFactor;
    const earlyLateThreshold = 5.0 * speedFactor;

    if (zDist < perfectThreshold) {
      this._timingQuality = 'perfect';
    } else if (zDist < goodThreshold) {
      this._timingQuality = 'good';
    } else if (zDist < earlyLateThreshold) {
      this._timingQuality = 'early_late';
    } else {
      this._timingQuality = 'miss';
    }

    return this._timingQuality;
  }

  /**
   * Checks if the chosen shot can reach the ball given its line.
   * ballRelativeX: ball.x - batsman.x (+X = off side, -X = leg side)
   * Returns 'clean', 'edge', or 'air'.
   */
  checkShotReach(shotType, ballRelativeX) {
    const offset = ballRelativeX;

    switch (shotType) {
      case SHOTS.PULL:
        if (offset > 0.6) return 'air';
        if (offset > 0.25) return 'edge';
        return 'clean';

      case SHOTS.CUT:
        if (offset < -0.6) return 'air';
        if (offset < -0.25) return 'edge';
        return 'clean';

      case SHOTS.DRIVE:
        if (Math.abs(offset) > 0.8) return 'edge';
        return 'clean';

      case SHOTS.SWEEP:
        // Sweep goes to leg side — similar reach to pull but on front foot
        if (offset > 0.7) return 'air';
        if (offset > 0.3) return 'edge';
        return 'clean';

      case SHOTS.LOFTED_DRIVE:
        // Same reach as drive but always aerial
        if (Math.abs(offset) > 0.8) return 'edge';
        return 'clean';

      case SHOTS.BLOCK:
      default:
        if (Math.abs(offset) > 0.9) return 'edge';
        return 'clean';
    }
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

    // Camera behind bowler looking at batsman's back:
    // +X = screen right = OFF side, -X = screen left = LEG side
    // -Z = toward bowler, +Z = behind batsman
    let vx, vy, vz;

    switch (shotType) {
      case SHOTS.DRIVE: {
        const speed = randRange(22, 36) * qualityMultiplier;
        vx = randRange(-2, 2);
        vz = -speed;
        vy = lofted ? randRange(6, 14) : randRange(1, 4);
        break;
      }
      case SHOTS.PULL: {
        // Pull: leg side = screen left = -X
        const speed = randRange(24, 40) * qualityMultiplier;
        vx = -speed * randRange(0.6, 0.95);
        vz = speed * randRange(-0.4, 0.3);
        vy = lofted ? randRange(8, 16) : randRange(2, 5);
        break;
      }
      case SHOTS.CUT: {
        // Cut: off side = screen right = +X
        const speed = randRange(20, 34) * qualityMultiplier;
        vx = speed * randRange(0.6, 0.95);
        vz = speed * randRange(-0.3, 0.3);
        vy = lofted ? randRange(6, 12) : randRange(1, 4);
        break;
      }
      case SHOTS.SWEEP: {
        // Sweep: low cross-bat to leg side, fast along the ground
        const speed = randRange(18, 32) * qualityMultiplier;
        vx = -speed * randRange(0.7, 1.0);
        vz = speed * randRange(-0.3, 0.2);
        vy = lofted ? randRange(6, 12) : randRange(1, 3);
        break;
      }
      case SHOTS.LOFTED_DRIVE: {
        // Lofted drive: always aerial, straight over bowler's head
        const speed = randRange(24, 40) * qualityMultiplier;
        vx = randRange(-3, 3);
        vz = -speed;
        vy = randRange(10, 18);
        break;
      }
      case SHOTS.BLOCK:
      default: {
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
    if (shotType === SHOTS.LOFTED_DRIVE) lofted = true;

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

  estimateRuns(ball, fielders) {
    if (ball.isSix()) return 6;
    if (ball.isFour()) return 4;

    const bx = ball.position.x;
    const bz = ball.position.z;
    const distFromCenter = ball.getDistanceFromCenter();

    if (distFromCenter < 5) return 0;

    if (!fielders) {
      if (distFromCenter < 25) return 1;
      if (distFromCenter < 40) return 2;
      return 3;
    }

    // Find nearest fielder to the ball's settled position
    const { dist: nearestDist } = fielders.getNearestFielder(bx, bz);

    // Estimate time for fielder to reach ball (sprint ~8 m/s)
    const fielderTime = nearestDist / 8;

    // Time per run is ~2.5 seconds for a single between wickets
    const timePerRun = 2.5;

    // Runs = how many can be completed before fielder reaches the ball
    // Subtract ~1s for the throw back
    const availableTime = Math.max(0, fielderTime - 1.0);
    let runs = Math.floor(availableTime / timePerRun);

    // Bonus: ball in a gap (nearest fielder far away) gets extra value
    if (nearestDist > 30 && distFromCenter > 35) runs = Math.max(runs, 3);

    return clamp(runs, 0, 3);
  }
}
