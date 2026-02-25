export class ScoreManager {
  constructor(totalOvers) {
    this.totalOvers = totalOvers;
    this.reset();
  }

  reset() {
    this.runs = 0;
    this.wickets = 0;
    this.ballsFaced = 0;
    this.extras = 0;
    this.wides = 0;
    this.fours = 0;
    this.sixes = 0;
    this.batsmanRuns = 0;
    this.batsmanBalls = 0;
    this.lastBallResult = '—';
    this.ballLog = [];
    this._target = null;

    // Bowling stats (used when player is bowling)
    this.bowlerBalls = 0;
    this.bowlerRunsConceded = 0;
    this.bowlerWickets = 0;
    this.bowlerMaidens = 0;
    this._currentOverRuns = 0;
  }

  addRuns(runs) {
    this.runs += runs;
    this.batsmanRuns += runs;
    if (runs === 4) this.fours++;
    if (runs === 6) this.sixes++;
    this.lastBallResult = runs === 0 ? 'dot' : `${runs}`;
    if (runs === 4) this.lastBallResult = 'FOUR!';
    if (runs === 6) this.lastBallResult = 'SIX!';
  }

  addWicket(dismissalType) {
    this.wickets++;
    this.lastBallResult = `W (${dismissalType})`;
    this.batsmanRuns = 0;
    this.batsmanBalls = 0;
  }

  addWide() {
    this.runs += 1;
    this.extras += 1;
    this.wides += 1;
    this.lastBallResult = 'WIDE';
    this.ballLog.push('wd');
  }

  addBall() {
    this.ballsFaced++;
    this.batsmanBalls++;
    this.ballLog.push(this.lastBallResult);
  }

  getOversString() {
    const completedOvers = Math.floor(this.ballsFaced / 6);
    const ballsInOver = this.ballsFaced % 6;
    return `${completedOvers}.${ballsInOver}`;
  }

  getRunRate() {
    const overs = this.ballsFaced / 6;
    if (overs === 0) return 0;
    return (this.runs / overs).toFixed(2);
  }

  getStrikeRate() {
    if (this.batsmanBalls === 0) return 0;
    return ((this.batsmanRuns / this.batsmanBalls) * 100).toFixed(1);
  }

  setTarget(target) {
    this._target = target;
  }

  getTarget() {
    return this._target;
  }

  isTargetReached() {
    return this._target !== null && this.runs >= this._target;
  }

  getRunsNeeded() {
    if (this._target === null) return null;
    return Math.max(0, this._target - this.runs);
  }

  isInningsOver() {
    if (this.isTargetReached()) return true;
    return this.wickets >= 10 || this.ballsFaced >= this.totalOvers * 6;
  }

  addBowlerBall(runsConceded) {
    this.bowlerBalls++;
    this.bowlerRunsConceded += runsConceded;
    this._currentOverRuns += runsConceded;
    if (this.bowlerBalls % 6 === 0) {
      if (this._currentOverRuns === 0) this.bowlerMaidens++;
      this._currentOverRuns = 0;
    }
  }

  addBowlerWicket() {
    this.bowlerWickets++;
  }

  getBowlerOversString() {
    const completed = Math.floor(this.bowlerBalls / 6);
    const partial = this.bowlerBalls % 6;
    return `${completed}.${partial}`;
  }

  getBowlerEconomy() {
    const overs = this.bowlerBalls / 6;
    if (overs === 0) return '0.00';
    return (this.bowlerRunsConceded / overs).toFixed(2);
  }

  getBowlerFigures() {
    return `${this.bowlerWickets}/${this.bowlerRunsConceded}`;
  }

  getSummary() {
    return {
      runs: this.runs,
      wickets: this.wickets,
      overs: this.getOversString(),
      runRate: this.getRunRate(),
      fours: this.fours,
      sixes: this.sixes,
      wides: this.wides,
      extras: this.extras,
      balls: this.ballsFaced,
      strikeRate: ((this.runs / Math.max(this.ballsFaced, 1)) * 100).toFixed(1),
      bowlerFigures: this.getBowlerFigures(),
      bowlerOvers: this.getBowlerOversString(),
      bowlerEconomy: this.getBowlerEconomy(),
      bowlerMaidens: this.bowlerMaidens,
    };
  }
}
