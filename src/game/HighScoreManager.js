const STORAGE_KEY = 'cricket-fever-highscores';
const MAX_SCORES = 5;

export class HighScoreManager {
  constructor() {
    this.scores = this._load();
  }

  _load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch (_) { /* ignore */ }
    return [];
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.scores));
    } catch (_) { /* ignore */ }
  }

  // Submit a score, returns { rank, isNew } — rank is 1-based, isNew = true if it made the leaderboard
  submit(summary) {
    const entry = {
      name: summary.playerName || 'Unknown',
      runs: summary.runs,
      wickets: summary.wickets,
      overs: summary.overs,
      runRate: summary.runRate,
      fours: summary.fours,
      sixes: summary.sixes,
      strikeRate: summary.strikeRate,
      date: new Date().toLocaleDateString(),
    };

    // Insert in sorted position (highest runs first, then fewer wickets, then higher SR)
    let insertIdx = this.scores.length;
    for (let i = 0; i < this.scores.length; i++) {
      if (entry.runs > this.scores[i].runs ||
          (entry.runs === this.scores[i].runs && entry.wickets < this.scores[i].wickets)) {
        insertIdx = i;
        break;
      }
    }

    this.scores.splice(insertIdx, 0, entry);
    if (this.scores.length > MAX_SCORES) {
      this.scores.length = MAX_SCORES;
    }
    this._save();

    const isNew = insertIdx < MAX_SCORES;
    return { rank: insertIdx + 1, isNew };
  }

  getScores() {
    return this.scores;
  }

  getHighest() {
    return this.scores.length > 0 ? this.scores[0] : null;
  }

  getBestByPlayer() {
    const best = {};
    for (const s of this.scores) {
      const name = s.name || 'Unknown';
      if (!(name in best) || s.runs > best[name]) {
        best[name] = s.runs;
      }
    }
    return best;
  }

  renderToMenu() {
    const table = document.getElementById('hs-table');
    if (!table) return;

    if (this.scores.length === 0) {
      table.innerHTML = '<div class="hs-empty">No scores yet — play a match!</div>';
      return;
    }

    table.innerHTML = this.scores.map((s, i) => `
      <div class="hs-row">
        <span class="hs-rank">${i + 1}.</span>
        <span class="hs-name">${s.name || '—'}</span>
        <span class="hs-score">${s.runs}/${s.wickets}</span>
        <span class="hs-overs">${s.overs} ov</span>
        <span class="hs-rr">RR ${s.runRate}</span>
      </div>
    `).join('');
  }
}
