const LINES = {
  six: [
    'That\'s gone all the way! SIX!',
    'Massive hit! Into the stands!',
    'What a shot! Maximum!',
    'That\'s out of the ground!',
    'Incredible power! SIX!',
  ],
  four: [
    'Races away to the boundary!',
    'Beautifully placed for FOUR!',
    'Through the gap, that\'s four!',
    'Timed to perfection!',
    'No stopping that one!',
  ],
  wicket_bowled: [
    'Bowled him! Timber!',
    'Clean bowled! What a delivery!',
    'Through the gate! He\'s gone!',
    'The stumps are shattered!',
    'Knocked \'em over!',
  ],
  wicket_caught: [
    'Caught! He has to walk!',
    'Taken cleanly! Great catch!',
    'In the air... and caught!',
    'Edged and taken!',
    'Safe hands! That\'s out!',
  ],
  dot: [
    'Dot ball.',
    'Left alone.',
    'Beaten!',
    'Good line and length.',
    'No run.',
    'Defended solidly.',
  ],
  runs_1: [
    'Quick single.',
    'Pushed into the gap for one.',
    'They scamper through for a single.',
  ],
  runs_2: [
    'Good running, they come back for two.',
    'Placed into the gap, two runs.',
    'Well run, that\'s two.',
  ],
  runs_3: [
    'Three runs! Excellent running!',
    'They push hard for three!',
    'Great placement, three runs.',
  ],
  miss: [
    'Swing and a miss!',
    'Big swing, no connection.',
    'Beaten outside off!',
  ],
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class Commentary {
  constructor() {
    this.el = document.getElementById('commentary-text');
    this._timer = 0;
    this._queue = [];
  }

  _show(text) {
    if (!this.el) return;
    this.el.textContent = text;
    this.el.style.opacity = '1';
    this._timer = 3.0;
  }

  onSix()         { this._show(pick(LINES.six)); }
  onFour()        { this._show(pick(LINES.four)); }
  onBowled()      { this._show(pick(LINES.wicket_bowled)); }
  onCaught()      { this._show(pick(LINES.wicket_caught)); }
  onDot()         { this._show(pick(LINES.dot)); }
  onMiss()        { this._show(pick(LINES.miss)); }

  onRuns(runs) {
    if (runs === 0) { this.onDot(); return; }
    const key = `runs_${Math.min(runs, 3)}`;
    if (LINES[key]) {
      this._show(pick(LINES[key]));
    } else {
      this._show(`${runs} runs!`);
    }
  }

  update(dt) {
    if (this._timer > 0) {
      this._timer -= dt;
      if (this._timer <= 0.5 && this.el) {
        this.el.style.opacity = String(Math.max(0, this._timer / 0.5));
      }
      if (this._timer <= 0 && this.el) {
        this.el.style.opacity = '0';
      }
    }
  }
}
