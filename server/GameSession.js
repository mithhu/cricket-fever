const BATSMAN_Z = 9.0;
const GRAVITY = -9.81;
const BOWLER_RELEASE_HEIGHT = 2.1;

export class GameSession {
  constructor(overs) {
    this.overs = overs;
    this.currentInnings = 1;
    this.tossWinnerIndex = -1;
    this.tossChoice = null;

    this.batterIndex = -1;
    this.bowlerIndex = -1;

    this.innings1 = this._newInningsState();
    this.innings2 = this._newInningsState();
  }

  _newInningsState() {
    return {
      runs: 0,
      wickets: 0,
      ballsFaced: 0,
      fours: 0,
      sixes: 0,
      wides: 0,
      extras: 0,
      batsmanRuns: 0,
      batsmanBalls: 0,
      target: null,
      lastBallResult: '',
    };
  }

  _currentInningsState() {
    return this.currentInnings === 1 ? this.innings1 : this.innings2;
  }

  get ballsFaced() {
    return this._currentInningsState().ballsFaced;
  }

  performToss() {
    this.tossWinnerIndex = Math.random() < 0.5 ? 0 : 1;
    return { winnerIndex: this.tossWinnerIndex };
  }

  startInnings(batterIdx, bowlerIdx) {
    this.batterIndex = batterIdx;
    this.bowlerIndex = bowlerIdx;

    if (this.currentInnings === 1) {
      this.innings1FirstBatterIdx = batterIdx;
      this.innings1FirstBowlerIdx = bowlerIdx;
    }
  }

  startSecondInnings() {
    const summary = this.getInningsSummary();
    this.currentInnings = 2;
    this.innings2.target = summary.runs + 1;

    this.batterIndex = this.innings1FirstBowlerIdx;
    this.bowlerIndex = this.innings1FirstBatterIdx;
  }

  resetBall() {
    // Called at the start of each delivery
  }

  processDelivery(line, length, speed) {
    const releaseZ = -10 + 1.5;
    const releaseY = BOWLER_RELEASE_HEIGHT;
    const targetZ = BATSMAN_Z;
    const dz = targetZ - releaseZ;
    const clampedSpeed = Math.max(8, Math.min(30, speed));
    const totalTime = Math.abs(dz) / clampedSpeed;

    const lengthMin = -6.5;
    const lengthMax = 8.5;
    const lengthFactor = Math.max(0.2, Math.min(0.9, (length - lengthMin) / (lengthMax - lengthMin)));
    const bounceTime = totalTime * lengthFactor;

    const vy = (-releaseY - 0.5 * GRAVITY * bounceTime * bounceTime) / bounceTime;
    const vz = dz / totalTime;
    const vx = (line - 0) / totalTime;

    return {
      velocity: { x: vx, y: vy, z: vz },
      speed: clampedSpeed,
      line,
      length,
      lengthFactor,
    };
  }

  addBall(runs, isBoundary) {
    const state = this._currentInningsState();
    state.ballsFaced++;
    state.batsmanBalls++;
    state.runs += runs;
    state.batsmanRuns += runs;

    if (isBoundary) {
      if (runs === 4) state.fours++;
      if (runs === 6) state.sixes++;
    }

    state.lastBallResult = runs === 0 ? 'dot' : `${runs}`;
    if (runs === 4) state.lastBallResult = 'FOUR!';
    if (runs === 6) state.lastBallResult = 'SIX!';
  }

  addWicket(type) {
    const state = this._currentInningsState();
    state.wickets++;
    state.lastBallResult = `W (${type})`;
    state.batsmanRuns = 0;
    state.batsmanBalls = 0;
  }

  addBallOnly() {
    const state = this._currentInningsState();
    state.ballsFaced++;
  }

  addWide() {
    const state = this._currentInningsState();
    state.runs += 1;
    state.extras += 1;
    state.wides += 1;
    state.lastBallResult = 'WIDE';
  }

  isInningsOver() {
    const state = this._currentInningsState();
    if (state.target !== null && state.runs >= state.target) return true;
    return state.wickets >= 10 || state.ballsFaced >= this.overs * 6;
  }

  getScore() {
    const state = this._currentInningsState();
    const completedOvers = Math.floor(state.ballsFaced / 6);
    const ballsInOver = state.ballsFaced % 6;
    return {
      runs: state.runs,
      wickets: state.wickets,
      overs: `${completedOvers}.${ballsInOver}`,
      fours: state.fours,
      sixes: state.sixes,
      wides: state.wides,
      extras: state.extras,
      batsmanRuns: state.batsmanRuns,
      batsmanBalls: state.batsmanBalls,
      target: state.target,
      lastBallResult: state.lastBallResult,
      innings: this.currentInnings,
    };
  }

  getInningsSummary() {
    const state = this._currentInningsState();
    const completedOvers = Math.floor(state.ballsFaced / 6);
    const ballsInOver = state.ballsFaced % 6;
    const oversStr = `${completedOvers}.${ballsInOver}`;
    const oversNum = state.ballsFaced / 6;
    const runRate = oversNum > 0 ? (state.runs / oversNum).toFixed(2) : '0.00';

    return {
      runs: state.runs,
      wickets: state.wickets,
      overs: oversStr,
      runRate,
      fours: state.fours,
      sixes: state.sixes,
      balls: state.ballsFaced,
      innings: this.currentInnings,
    };
  }

  getMatchResult(player0Name, player1Name) {
    const i1 = this.innings1;
    const i2 = this.innings2;

    const computeOvers = (state) => {
      const c = Math.floor(state.ballsFaced / 6);
      const b = state.ballsFaced % 6;
      return `${c}.${b}`;
    };
    const computeRR = (state) => {
      const o = state.ballsFaced / 6;
      return o > 0 ? (state.runs / o).toFixed(2) : '0.00';
    };

    const i1BatterName = player0Name === undefined
      ? 'Player 1'
      : (this.innings1FirstBatterIdx === 0 ? player0Name : player1Name);
    const i2BatterName = this.innings1FirstBatterIdx === 0 ? player1Name : player0Name;

    let headline;
    if (i2.runs >= i1.runs + 1) {
      const wktsLeft = 10 - i2.wickets;
      headline = `${i2BatterName} wins by ${wktsLeft} wicket${wktsLeft !== 1 ? 's' : ''}!`;
    } else if (i2.runs === i1.runs) {
      headline = 'Match Tied!';
    } else {
      const margin = i1.runs - i2.runs;
      headline = `${i1BatterName} wins by ${margin} run${margin !== 1 ? 's' : ''}!`;
    }

    return {
      headline,
      innings1: {
        batterName: i1BatterName,
        runs: i1.runs,
        wickets: i1.wickets,
        overs: computeOvers(i1),
        runRate: computeRR(i1),
        fours: i1.fours,
        sixes: i1.sixes,
      },
      innings2: {
        batterName: i2BatterName,
        runs: i2.runs,
        wickets: i2.wickets,
        overs: computeOvers(i2),
        runRate: computeRR(i2),
        fours: i2.fours,
        sixes: i2.sixes,
      },
    };
  }
}
