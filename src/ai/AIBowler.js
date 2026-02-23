import * as THREE from 'three';
import {
  BOWLER_RELEASE_HEIGHT, BATSMAN_Z,
  GRAVITY,
} from '../utils/constants.js';
import { randRange } from '../utils/helpers.js';

const LINE = { OFFSIDE: -0.3, MIDDLE: 0, LEGSIDE: 0.3 };

const DIFFICULTY_SETTINGS = {
  easy: {
    speedMin: 9, speedMax: 15,
    lineWeights: [0.2, 0.6, 0.2],
    lengthWeights: [0.1, 0.55, 0.25, 0.1],
    swingRange: 0.15,
  },
  medium: {
    speedMin: 12, speedMax: 22,
    lineWeights: [0.3, 0.45, 0.25],
    lengthWeights: [0.15, 0.4, 0.25, 0.2],
    swingRange: 0.3,
  },
  hard: {
    speedMin: 16, speedMax: 28,
    lineWeights: [0.35, 0.3, 0.35],
    lengthWeights: [0.2, 0.3, 0.25, 0.25],
    swingRange: 0.5,
  },
};

export class AIBowler {
  constructor() {
    this.difficulty = 'medium';
  }

  setDifficulty(level) {
    this.difficulty = level;
  }

  generateDelivery(releasePos) {
    const settings = DIFFICULTY_SETTINGS[this.difficulty] || DIFFICULTY_SETTINGS.medium;

    const speed = randRange(settings.speedMin, settings.speedMax);

    const lines = [LINE.OFFSIDE, LINE.MIDDLE, LINE.LEGSIDE];
    const line = this._weightedPick(lines, settings.lineWeights);

    const lengths = [0.3, 0.5, 0.7, 0.85];
    const lengthFactor = this._weightedPick(lengths, settings.lengthWeights);

    const swing = randRange(-settings.swingRange, settings.swingRange);

    return this._calculateTrajectory(releasePos, speed, line, lengthFactor, swing);
  }

  _calculateTrajectory(releasePos, speed, lineTarget, lengthFactor, swing) {
    const targetZ = BATSMAN_Z;
    const dz = targetZ - releasePos.z;

    const totalTime = Math.abs(dz) / speed;
    const bounceTime = totalTime * lengthFactor;

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
