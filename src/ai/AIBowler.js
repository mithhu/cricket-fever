import * as THREE from 'three';
import {
  BALL_SPEED_MIN, BALL_SPEED_MAX,
  BOWLER_RELEASE_HEIGHT, BATSMAN_Z,
  GRAVITY,
} from '../utils/constants.js';
import { randRange } from '../utils/helpers.js';

const LINE = { OFFSIDE: -0.3, MIDDLE: 0, LEGSIDE: 0.3 };

export class AIBowler {
  constructor() {
    this.difficulty = 1;
  }

  generateDelivery(releasePos) {
    const speed = randRange(BALL_SPEED_MIN, BALL_SPEED_MAX);

    const lines = [LINE.OFFSIDE, LINE.MIDDLE, LINE.LEGSIDE];
    const lineWeights = [0.3, 0.45, 0.25];
    const line = this._weightedPick(lines, lineWeights);

    // Length factor: how far along the pitch the ball should bounce
    // 0.3 = short, 0.5 = good length, 0.7 = full, 0.85 = yorker
    const lengths = [0.3, 0.5, 0.7, 0.85];
    const lengthWeights = [0.15, 0.4, 0.25, 0.2];
    const lengthFactor = this._weightedPick(lengths, lengthWeights);

    const swing = randRange(-0.3, 0.3);

    return this._calculateTrajectory(releasePos, speed, line, lengthFactor, swing);
  }

  _calculateTrajectory(releasePos, speed, lineTarget, lengthFactor, swing) {
    const targetZ = BATSMAN_Z;
    const dz = targetZ - releasePos.z;

    // Total time for ball to reach the batsman
    const totalTime = Math.abs(dz) / speed;

    // The ball should bounce at this fraction of the total distance
    const bounceZ = releasePos.z + dz * lengthFactor;
    const bounceTime = totalTime * lengthFactor;

    // We need the ball to go from releasePos.y down to 0 in bounceTime
    // Using: y = y0 + vy*t + 0.5*g*t^2 = 0
    // vy = (-y0 - 0.5*g*t^2) / t  (where g is GRAVITY which is negative)
    const g = GRAVITY;
    const vy = (-releasePos.y - 0.5 * g * bounceTime * bounceTime) / bounceTime;

    const vz = dz / totalTime;
    const vx = (lineTarget + swing - releasePos.x) / totalTime;

    return {
      velocity: new THREE.Vector3(vx, vy, vz),
      speed,
      line: lineTarget,
      lengthFactor,
      swing,
      expectedArrivalTime: totalTime,
    };
  }

  _weightedPick(items, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }
}
