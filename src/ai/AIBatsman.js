import { SHOTS, BATSMAN_Z } from '../utils/constants.js';
import { randRange } from '../utils/helpers.js';

const DIFFICULTY_SETTINGS = {
  easy: { missChance: 0.12, edgeChance: 0.20, loftChance: 0.25, reactionZone: 6.0 },
  medium: { missChance: 0.08, edgeChance: 0.12, loftChance: 0.18, reactionZone: 4.5 },
  hard: { missChance: 0.04, edgeChance: 0.06, loftChance: 0.12, reactionZone: 3.5 },
};

export class AIBatsman {
  constructor() {
    this._difficulty = 'medium';
    this._decided = false;
    this._decision = null;
  }

  setDifficulty(d) {
    this._difficulty = d;
  }

  reset() {
    this._decided = false;
    this._decision = null;
  }

  /**
   * Called each frame during BOWLING state when AI is batting.
   * Returns a shot decision when the ball enters the reaction zone, or null.
   */
  tryDecide(ball) {
    if (this._decided) return this._decision;
    if (!ball.active) return null;

    const distToBatsman = Math.abs(ball.position.z - BATSMAN_Z);
    const settings = DIFFICULTY_SETTINGS[this._difficulty] || DIFFICULTY_SETTINGS.medium;

    if (distToBatsman > settings.reactionZone) return null;

    this._decided = true;

    // Random miss
    if (Math.random() < settings.missChance) {
      this._decision = null;
      return null;
    }

    const ballX = ball.position.x;
    const isShort = ball.position.z < BATSMAN_Z - 4;
    const isFull = ball.position.z > BATSMAN_Z - 2;

    let shot;
    if (isShort && ballX < -0.2) {
      shot = SHOTS.PULL;
    } else if (isShort && ballX > 0.2) {
      shot = SHOTS.CUT;
    } else if (isShort) {
      shot = Math.random() < 0.5 ? SHOTS.PULL : SHOTS.CUT;
    } else if (isFull && Math.abs(ballX) < 0.4) {
      shot = SHOTS.DRIVE;
    } else if (isFull && ballX < -0.2) {
      shot = Math.random() < 0.6 ? SHOTS.SWEEP : SHOTS.PULL;
    } else if (isFull && ballX > 0.2) {
      shot = SHOTS.CUT;
    } else {
      // Good length — defensive or drive
      const r = Math.random();
      if (r < 0.35) shot = SHOTS.BLOCK;
      else if (r < 0.65) shot = SHOTS.DRIVE;
      else if (ballX < 0) shot = SHOTS.PULL;
      else shot = SHOTS.CUT;
    }

    // Edge chance: override to block (simulates mistimed shot)
    if (Math.random() < settings.edgeChance) {
      shot = SHOTS.BLOCK;
    }

    const lofted = Math.random() < settings.loftChance && shot !== SHOTS.BLOCK;

    // Add slight timing variation
    const timingOffset = randRange(-0.8, 0.8);

    this._decision = { shot, lofted, timingOffset };
    return this._decision;
  }
}
