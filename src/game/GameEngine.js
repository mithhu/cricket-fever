import { GAME_STATE, SHOTS } from '../utils/constants.js';
import { PhysicsEngine } from './PhysicsEngine.js';
import { ScoreManager } from './ScoreManager.js';
import { InputManager } from './InputManager.js';
import { AIBowler } from '../ai/AIBowler.js';
import { HighScoreManager } from './HighScoreManager.js';

const CATCH_HAND_RADIUS = 0.8;

export class GameEngine {
  constructor({ ball, batsman, bowler, fielders, gameCamera, scoreboard, shotSelector, mainMenu }) {
    this.ball = ball;
    this.batsman = batsman;
    this.bowler = bowler;
    this.fielders = fielders;
    this.gameCamera = gameCamera;
    this.scoreboard = scoreboard;
    this.shotSelector = shotSelector;
    this.mainMenu = mainMenu;

    this.physics = new PhysicsEngine();
    this.input = new InputManager();
    this.aiBowler = new AIBowler();
    this.highScores = new HighScoreManager();
    this.scoreManager = null;

    this.state = GAME_STATE.MENU;
    this._waitTimer = 0;
    this._ballTimer = 0;
    this._deliveryData = null;
    this._shotPlayed = false;
    this._shotResult = null;
    this._ballDoneTimer = 0;
    this._ballSettleTimer = 0;
    this._eventPopupTimer = 0;
    this._chaseSent = false;
    this._intercepted = false;
    this._catchingFielder = null;
    this._catchAttempted = false;

    this.ballEventEl = document.getElementById('ball-event');
    this.resultScreen = document.getElementById('result-screen');
    this.finalScoreEl = document.getElementById('final-score');
    this.finalDetailsEl = document.getElementById('final-details');
    this.playAgainBtn = document.getElementById('btn-play-again');
    this.mainMenuBtn = document.getElementById('btn-main-menu');
    this.endGameBtn = document.getElementById('btn-end-game');
    this.pauseBtn = document.getElementById('btn-pause');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.resumeBtn = document.getElementById('btn-resume');
    this.pauseMenuBtn = document.getElementById('btn-pause-menu');
    this.newHsBadge = document.getElementById('new-hs-badge');
    this.resultHighScore = document.getElementById('result-high-score');

    this._lastOvers = 5;
    this._paused = false;

    this.playAgainBtn.addEventListener('click', () => {
      this.resultScreen.style.display = 'none';
      this.startMatch(this._lastOvers, this._playerName);
    });
    this.mainMenuBtn.addEventListener('click', () => this._showMenu());
    this.endGameBtn.addEventListener('click', () => this._endGameEarly());
    this.pauseBtn.addEventListener('click', () => this._togglePause());
    this.resumeBtn.addEventListener('click', () => this._togglePause());
    this.pauseMenuBtn.addEventListener('click', () => {
      this._paused = false;
      this.pauseOverlay.style.display = 'none';
      this._showMenu();
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.state !== GAME_STATE.MENU && this.state !== GAME_STATE.RESULT) {
        this._togglePause();
      }
    });
  }

  _togglePause() {
    this._paused = !this._paused;
    if (this._paused) {
      this.pauseOverlay.style.display = 'flex';
      this.pauseBtn.textContent = 'Resume';
    } else {
      this.pauseOverlay.style.display = 'none';
      this.pauseBtn.textContent = 'Pause';
    }
  }

  startMatch(overs, playerName) {
    this._paused = false;
    this.pauseOverlay.style.display = 'none';
    this.pauseBtn.textContent = 'Pause';
    this._lastOvers = overs;
    this._playerName = playerName || 'Unknown';
    this.scoreManager = new ScoreManager(overs);
    this.state = GAME_STATE.WAITING;
    this._waitTimer = 0;
    this.scoreboard.setPlayerName(this._playerName);
    this.scoreboard.show();
    this.shotSelector.show();
    this.endGameBtn.style.display = 'block';
    this.pauseBtn.style.display = 'block';
    this.scoreboard.update(this.scoreManager);
    this.batsman.resetPose();
    this.bowler.resetPosition();
    this.ball.reset();
    this.fielders.returnToPositions();
    this.gameCamera.resetForNewBall();
    this._startNewBall();
  }

  _startNewBall() {
    this.state = GAME_STATE.WAITING;
    this._waitTimer = 0;
    this._shotPlayed = false;
    this._shotResult = null;
    this._ballSettleTimer = 0;
    this._chaseSent = false;
    this._intercepted = false;
    this._catchingFielder = null;
    this._catchAttempted = false;
    this.ball.reset();
    this.batsman.resetPose();
    this.input.reset();
    this.gameCamera.resetForNewBall();
    this.fielders.returnToPositions();
  }

  _endGameEarly() {
    this.ball.reset();
    this.bowler.resetPosition();
    this.batsman.resetPose();
    this._showResult();
  }

  _showMenu() {
    this.state = GAME_STATE.MENU;
    this.resultScreen.style.display = 'none';
    this.scoreboard.hide();
    this.shotSelector.hide();
    this.endGameBtn.style.display = 'none';
    this.pauseBtn.style.display = 'none';
    this.ball.reset();
    this.bowler.resetPosition();
    this.batsman.resetPose();
    this.fielders.returnToPositions();
    this.highScores.renderToMenu();
    this._refreshPlayerCards();
    document.getElementById('main-menu').style.display = 'flex';
  }

  _refreshPlayerCards() {
    if (this.mainMenu) {
      this.mainMenu.setBestScores(this.highScores.getBestByPlayer());
      this.mainMenu.renderCards();
    }
  }

  update(dt) {
    if (this._paused) return;

    this.fielders.update(
      dt,
      this.ball.position,
      this.ball.active,
      this.ball.hasBeenHit
    );

    switch (this.state) {
      case GAME_STATE.MENU:
        break;

      case GAME_STATE.WAITING: {
        this._waitTimer += dt;
        this.shotSelector.update(this.input.getShotDirection());
        const wmov = this.input.getMovement();
        if (wmov.x !== 0 || wmov.z !== 0) {
          this.batsman.moveInCrease(wmov.x, wmov.z, dt);
        }
        if (this._waitTimer >= 1.0) {
          this._beginBowling();
        }
        break;
      }

      case GAME_STATE.BOWLING:
        this._updateBowling(dt);
        break;

      case GAME_STATE.BATTING:
        this._updateBatting(dt);
        break;

      case GAME_STATE.BALL_DONE:
        this._updateBallDone(dt);
        break;

      case GAME_STATE.RESULT:
        break;
    }

    if (this._eventPopupTimer > 0) {
      this._eventPopupTimer -= dt;
      if (this._eventPopupTimer <= 0) {
        this.ballEventEl.style.display = 'none';
      }
    }
  }

  _beginBowling() {
    this.state = GAME_STATE.BOWLING;
    this._ballTimer = 0;
    this._shotPlayed = false;

    this.bowler.startBowling((releasePos) => {
      this._deliveryData = this.aiBowler.generateDelivery(releasePos);
      this.ball.launch(releasePos, this._deliveryData.velocity);
    });
  }

  _updateBowling(dt) {
    this.bowler.update(dt);
    this.ball.update(dt);
    this.batsman.update(dt);
    this.shotSelector.update(this.input.getShotDirection());

    if (!this._shotPlayed) {
      const mov = this.input.getMovement();
      if (mov.x !== 0 || mov.z !== 0) {
        this.batsman.moveInCrease(mov.x, mov.z, dt);
      }
    }

    if (this.ball.active) {
      this.gameCamera.followBall(this.ball.position, false);
    }

    if (!this._shotPlayed) {
      const trigger = this.input.consumeShotTrigger();
      if (trigger) {
        if (this.ball.active) {
          this._attemptShot(trigger);
        } else {
          this.batsman.playShot(trigger.shot);
          this._shotPlayed = false;
        }
      }
    }

    if (this.ball.active && !this.ball.hasBeenHit) {
      if (this.physics.checkBowled(this.ball)) {
        this._handleWicket('bowled');
        return;
      }
      if (this.ball.position.z > this.batsman.group.position.z + 8) {
        this._handleDotBall();
        return;
      }
    }

    if (this.ball.active && this.ball.hasBeenHit) {
      this.state = GAME_STATE.BATTING;
    }
  }

  _attemptShot(trigger) {
    this._shotPlayed = true;

    const timing = this.physics.calculateTimingQuality(this.ball);
    this.batsman.playShot(trigger.shot);

    if (timing === 'miss') {
      return;
    }

    const velocity = this.physics.calculateShotVelocity(trigger.shot, trigger.lofted, timing);
    if (velocity) {
      this.ball.hitByBat(velocity);
      this._shotResult = {
        type: 'hit',
        shot: trigger.shot,
        timing,
        lofted: trigger.lofted,
      };
    }
  }

  _updateBatting(dt) {
    this.ball.update(dt);
    this.batsman.update(dt);
    this.bowler.update(dt);
    this.gameCamera.followBall(this.ball.position, true);

    // Send fielders chasing once after ball is hit
    if (!this._chaseSent && this.ball.hasBeenHit) {
      this.fielders.chaseBall(this.ball.position, this.ball.velocity);
      this._chaseSent = true;
    }

    // Check boundary first
    if (this.ball.isSix()) {
      this._handleBoundary(6);
      return;
    }
    if (this.ball.isFour()) {
      this._handleBoundary(4);
      return;
    }

    // Catch logic: ball must literally fall into a fielder's hands
    if (this._catchingFielder) {
      // Catching animation in progress — ball sticks to fielder's hands
      const cf = this._catchingFielder;
      this.ball.position.set(cf.group.position.x, cf.group.position.y + 1.6, cf.group.position.z);
      this.ball.mesh.position.copy(this.ball.position);
      this.ball.velocity.set(0, 0, 0);
      if (this.fielders.isCatchComplete(cf)) {
        this._catchingFielder = null;
        this._handleWicket('caught');
        return;
      }
    } else if (!this._catchAttempted
               && this.ball.position.y > 1.2 && this.ball.position.y < 2.2
               && this.ball.velocity.y < -1.0) {
      // Check ONCE as ball drops through hand-height (1.2-2.2m)
      this._catchAttempted = true;
      // Only lofted shots can be caught
      if (this._shotResult && this._shotResult.lofted) {
        const catchOpp = this.fielders.checkCatchOpportunity(this.ball.position);
        if (catchOpp && catchOpp.distance < CATCH_HAND_RADIUS) {
          this._catchingFielder = catchOpp.fielder;
          this.fielders.triggerCatch(catchOpp.fielder);
          this.ball.active = false;
          this.ball.mesh.visible = true;
          return;
        }
      }
    }

    // Check if a fielder intercepted the ball on the ground
    if (!this._intercepted && this.ball.position.y < 0.5) {
      const intercept = this.fielders.checkIntercept(this.ball.position);
      if (intercept) {
        this._intercepted = true;
        if (intercept.isDive) {
          this.fielders.triggerDive(intercept.fielder);
        }
        // Ball is stopped by the fielder
        this.ball.velocity.set(0, 0, 0);
        this.ball.settled = true;
      }
    }

    // Ball settled on field
    if (this.ball.settled || this._ballSettledTimeout(dt)) {
      const runs = this.physics.estimateRuns(this.ball);
      this._handleRuns(runs);
    }
  }

  _ballSettledTimeout(dt) {
    this._ballSettleTimer += dt;
    if (this._ballSettleTimer > 6) {
      this._ballSettleTimer = 0;
      return true;
    }
    return false;
  }

  _handleBoundary(runs) {
    this.scoreManager.addRuns(runs);
    this.scoreManager.addBall();
    this.scoreboard.update(this.scoreManager);
    this._showBallEvent(runs === 6 ? 'SIX!' : 'FOUR!');
    this._ballSettleTimer = 0;
    this._finishBall();
  }

  _handleRuns(runs) {
    this.scoreManager.addRuns(runs);
    this.scoreManager.addBall();
    this.scoreboard.update(this.scoreManager);
    if (runs === 0) {
      this._showBallEvent('DOT');
    } else {
      this._showBallEvent(`${runs} run${runs > 1 ? 's' : ''}`);
    }
    this._ballSettleTimer = 0;
    this._finishBall();
  }

  _handleDotBall() {
    this.scoreManager.addRuns(0);
    this.scoreManager.addBall();
    this.scoreManager.lastBallResult = 'dot';
    this.scoreboard.update(this.scoreManager);
    this._showBallEvent('DOT');
    this._finishBall();
  }

  _handleWicket(type) {
    this.scoreManager.addWicket(type);
    this.scoreManager.addBall();
    this.scoreboard.update(this.scoreManager);
    this._showBallEvent(`WICKET!\n${type.toUpperCase()}`);
    this._ballSettleTimer = 0;
    this._finishBall();
  }

  _finishBall() {
    this.state = GAME_STATE.BALL_DONE;
    this._ballDoneTimer = 0;
    this.fielders.returnToPositions();
  }

  _updateBallDone(dt) {
    this._ballDoneTimer += dt;
    this.batsman.update(dt);
    this.bowler.update(dt);

    if (this._ballDoneTimer >= 2.0) {
      if (this.scoreManager.isInningsOver()) {
        this._showResult();
      } else {
        this._startNewBall();
      }
    }
  }

  _showResult() {
    this.state = GAME_STATE.RESULT;
    const summary = this.scoreManager.getSummary();
    summary.playerName = this._playerName;

    const { rank, isNew } = this.highScores.submit(summary);

    this.finalScoreEl.textContent = `${summary.runs}/${summary.wickets}`;
    this.finalDetailsEl.innerHTML = [
      `Overs: ${summary.overs}`,
      `Run Rate: ${summary.runRate}`,
      `Fours: ${summary.fours} | Sixes: ${summary.sixes}`,
      `Strike Rate: ${summary.strikeRate}`,
    ].join('<br>');

    if (isNew && rank === 1) {
      this.newHsBadge.style.display = 'block';
    } else {
      this.newHsBadge.style.display = 'none';
    }

    const highest = this.highScores.getHighest();
    if (highest && !(isNew && rank === 1)) {
      this.resultHighScore.textContent = `Best: ${highest.name || '—'} — ${highest.runs}/${highest.wickets}`;
    } else {
      this.resultHighScore.textContent = '';
    }

    this.scoreboard.hide();
    this.shotSelector.hide();
    this.endGameBtn.style.display = 'none';
    this.pauseBtn.style.display = 'none';
    this.resultScreen.style.display = 'flex';
  }

  _showBallEvent(text) {
    this.ballEventEl.textContent = text;
    this.ballEventEl.style.display = 'block';
    this._eventPopupTimer = 1.5;
  }
}
