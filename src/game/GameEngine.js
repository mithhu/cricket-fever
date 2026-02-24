import { GAME_STATE, SHOTS } from '../utils/constants.js';
import { PhysicsEngine } from './PhysicsEngine.js';
import { ScoreManager } from './ScoreManager.js';
import { InputManager } from './InputManager.js';
import { AIBowler } from '../ai/AIBowler.js';
import { HighScoreManager } from './HighScoreManager.js';
import { SoundManager } from '../audio/SoundManager.js';
import { Commentary } from '../ui/Commentary.js';

const CATCH_HAND_RADIUS = 0.8;

export class GameEngine {
  constructor({ ball, batsman, bowler, fielders, gameCamera, scoreboard, shotSelector, mainMenu, pitch }) {
    this.ball = ball;
    this.batsman = batsman;
    this.bowler = bowler;
    this.fielders = fielders;
    this.gameCamera = gameCamera;
    this.scoreboard = scoreboard;
    this.shotSelector = shotSelector;
    this.mainMenu = mainMenu;
    this.pitch = pitch;

    this.physics = new PhysicsEngine();
    this.input = new InputManager();
    this.aiBowler = new AIBowler();
    this.highScores = new HighScoreManager();
    this.sound = new SoundManager();
    this.commentary = new Commentary();
    this.scoreManager = null;
    this._bouncePlayed = false;

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
    this.timingEl = document.getElementById('timing-indicator');
    this.runCounterEl = document.getElementById('run-counter');
    this.boundaryFlash = document.getElementById('boundary-flash');
    this.powerMeter = document.getElementById('power-meter');
    this.powerFill = document.getElementById('power-fill');
    this.powerLabel = document.getElementById('power-label');
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
    this.touchController = null;
    this._slowMo = false;
    this._slowMoTimer = 0;
    this._slowMoScale = 1;
    this.replayLabel = document.getElementById('replay-label');

    // Two-player state
    this._isTwoPlayer = false;
    this._wasTwoPlayer = false;
    this._currentInnings = 0;
    this._player1Name = '';
    this._player2Name = '';
    this._battingOrder = [];
    this._innings1Summary = null;

    // Two-player UI elements
    this.tossScreen = document.getElementById('toss-screen');
    this.tossTitle = document.getElementById('toss-title');
    this.tossDetail = document.getElementById('toss-detail');
    this.tossContinueBtn = document.getElementById('btn-toss-continue');
    this.inningsBreak = document.getElementById('innings-break');
    this.ibSummary = document.getElementById('ib-summary');
    this.ibDetails = document.getElementById('ib-details');
    this.ibTarget = document.getElementById('ib-target');
    this.ibContinueBtn = document.getElementById('btn-ib-continue');

    this.tossContinueBtn.addEventListener('click', () => this._onTossContinue());
    this.ibContinueBtn.addEventListener('click', () => this._onInningsBreakContinue());

    this.playAgainBtn.addEventListener('click', () => {
      this.resultScreen.style.display = 'none';
      document.querySelector('#result-screen h2').textContent = 'INNINGS OVER';
      if (this._wasTwoPlayer) {
        this.startTwoPlayerMatch(this._lastOvers, this._player1Name, this._player2Name, this._difficulty);
      } else {
        this.startMatch(this._lastOvers, this._playerName, this._difficulty);
      }
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

    this.muteBtn = document.getElementById('btn-mute');
    if (this.muteBtn) {
      this.muteBtn.addEventListener('click', () => {
        const muted = this.sound.toggleMute();
        this.muteBtn.textContent = muted ? 'Unmute' : 'Mute';
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.state !== GAME_STATE.MENU && this.state !== GAME_STATE.RESULT) {
        this._togglePause();
      }
      if (e.code === 'KeyM' && e.target.tagName !== 'INPUT') {
        const muted = this.sound.toggleMute();
        if (this.muteBtn) this.muteBtn.textContent = muted ? 'Unmute' : 'Mute';
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

  startMatch(overs, playerName, difficulty) {
    if (!this._isTwoPlayer) this._wasTwoPlayer = false;
    this._paused = false;
    this.pauseOverlay.style.display = 'none';
    this.pauseBtn.textContent = 'Pause';
    this._lastOvers = overs;
    this._playerName = playerName || 'Unknown';
    this._difficulty = difficulty || 'medium';
    this.aiBowler.setDifficulty(this._difficulty);
    this.fielders.setDifficulty(this._difficulty);
    this.scoreManager = new ScoreManager(overs);
    this.state = GAME_STATE.WAITING;
    this._waitTimer = 0;
    this.scoreboard.setPlayerName(this._playerName);
    this.scoreboard.show();
    this.shotSelector.show();
    this.endGameBtn.style.display = 'block';
    this.pauseBtn.style.display = 'block';
    if (this.muteBtn) this.muteBtn.style.display = 'block';
    this.scoreboard.update(this.scoreManager);
    this.batsman.resetPose();
    this.bowler.resetPosition();
    this.ball.reset();
    this.fielders.returnToPositions();
    this.gameCamera.resetForNewBall();
    this.sound.startAmbientCrowd();
    if (this.touchController) this.touchController.show();
    this._startNewBall();
  }

  startTwoPlayerMatch(overs, player1, player2, difficulty) {
    this._isTwoPlayer = true;
    this._wasTwoPlayer = true;
    this._lastOvers = overs;
    this._player1Name = player1;
    this._player2Name = player2;
    this._difficulty = difficulty || 'medium';
    this._currentInnings = 0;
    this._innings1Summary = null;

    // Random toss to decide batting order
    const firstBatter = Math.random() < 0.5 ? player1 : player2;
    const secondBatter = firstBatter === player1 ? player2 : player1;
    this._battingOrder = [firstBatter, secondBatter];

    this.state = GAME_STATE.TOSS;
    this.tossTitle.textContent = `${firstBatter} wins the toss!`;
    this.tossDetail.textContent = `${firstBatter} will bat first`;
    this.tossScreen.style.display = 'flex';
  }

  _onTossContinue() {
    this.tossScreen.style.display = 'none';
    this._currentInnings = 1;
    const batter = this._battingOrder[0];
    this.startMatch(this._lastOvers, batter, this._difficulty);
  }

  _onInningsBreakContinue() {
    this.inningsBreak.style.display = 'none';
    this._currentInnings = 2;
    const batter = this._battingOrder[1];
    const target = this._innings1Summary.runs + 1;
    this.startMatch(this._lastOvers, batter, this._difficulty);
    this.scoreManager.setTarget(target);
    this.scoreboard.setTarget(target);
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
    this._bouncePlayed = false;
    this._interceptRuns = undefined;
    this.ball.reset();
    if (this.pitch) this.pitch.resetBails();
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
    this._isTwoPlayer = false;
    this._wasTwoPlayer = false;
    this.sound.stopAmbientCrowd();
    this.resultScreen.style.display = 'none';
    this.tossScreen.style.display = 'none';
    this.inningsBreak.style.display = 'none';
    this.scoreboard.hide();
    this.shotSelector.hide();
    this.endGameBtn.style.display = 'none';
    this.pauseBtn.style.display = 'none';
    if (this.muteBtn) this.muteBtn.style.display = 'none';
    if (this.touchController) this.touchController.hide();
    this.ball.reset();
    this.bowler.resetPosition();
    this.batsman.resetPose();
    this.fielders.returnToPositions();
    this.highScores.renderToMenu();
    this._refreshPlayerCards();
    document.getElementById('main-menu').style.display = 'flex';
    document.querySelector('#result-screen h2').textContent = 'INNINGS OVER';
  }

  _refreshPlayerCards() {
    if (this.mainMenu) {
      this.mainMenu.setBestScores(this.highScores.getBestByPlayer());
      this.mainMenu.renderCards();
    }
  }

  update(dt) {
    if (this._paused) return;
    dt = this.applySlowMo(dt);

    this.fielders.update(
      dt,
      this.ball.position,
      this.ball.active,
      this.ball.hasBeenHit
    );

    switch (this.state) {
      case GAME_STATE.MENU:
      case GAME_STATE.TOSS:
      case GAME_STATE.INNINGS_BREAK:
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

    this.commentary.update(dt);

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
      this.sound.playBowlRelease();
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
      if (!this._bouncePlayed && this.ball.hasBounced) {
        this._bouncePlayed = true;
        this.sound.playBounce();
      }
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
      this._showTimingIndicator('miss', 'clean');
      return;
    }

    const ballRelativeX = this.ball.position.x - this.batsman.group.position.x;
    const reach = this.physics.checkShotReach(trigger.shot, ballRelativeX);

    if (reach === 'air') {
      this._showTimingIndicator(timing, 'air');
      this.commentary.onMiss();
      return;
    }

    this._showTimingIndicator(timing, reach);

    let velocity = this.physics.calculateShotVelocity(trigger.shot, trigger.lofted, timing);
    if (velocity) {
      if (reach === 'edge') {
        velocity.multiplyScalar(0.25);
        velocity.x += (Math.random() - 0.5) * 4;
        velocity.y = Math.min(velocity.y, 2);
        this.sound.playEdge();
      }
      this.ball.hitByBat(velocity);
      if (reach !== 'edge') this.sound.playBatCrack();
      this._showPowerMeter(velocity);
      this._shotResult = {
        type: 'hit',
        shot: trigger.shot,
        timing,
        lofted: reach === 'edge' ? false : trigger.lofted,
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
      this.fielders.snapshotPositions();
      this.fielders.chaseBall(this.ball.position, this.ball.velocity);
      this.fielders.recordShotDirection(this.ball.velocity.x * 2, this.ball.velocity.z * 2);
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
      const cf = this._catchingFielder;
      this.ball.position.set(cf.group.position.x, cf.group.position.y + 1.6, cf.group.position.z);
      this.ball.mesh.position.copy(this.ball.position);
      this.ball.velocity.set(0, 0, 0);
      if (this.fielders.didDropCatch(cf)) {
        this._catchingFielder = null;
        this._showBallEvent('DROPPED!');
        this.commentary.onDrop && this.commentary.onDrop();
        this.ball.velocity.set((Math.random() - 0.5) * 3, 1, (Math.random() - 0.5) * 3);
        this.ball.active = true;
        this.ball.settled = false;
        cf.willDrop = false;
      } else if (this.fielders.isCatchComplete(cf)) {
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
        // Estimate runs BEFORE stopping the ball (based on how far it traveled)
        const distFromCenter = this.ball.getDistanceFromCenter();
        let interceptRuns = 0;
        if (distFromCenter > 40) interceptRuns = 2;
        else if (distFromCenter > 20) interceptRuns = 1;
        this._interceptRuns = interceptRuns;

        this.ball.velocity.set(0, 0, 0);
        this.ball.settled = true;
        this.fielders.startReturnThrow(intercept.fielder);
      }
    }

    // Check for overthrow
    if (this.fielders.isOverthrow()) {
      const extra = this.fielders.getOverthrowRuns();
      this.fielders.consumeOverthrow();
      this.scoreManager.addRuns(extra);
      this.scoreboard.update(this.scoreManager);
      this._showBallEvent(`OVERTHROW! +${extra}`);
      this._showRunCounter(extra);
      this.commentary.onRuns(extra);
    }

    // Ball settled on field
    if (this.ball.settled || this._ballSettledTimeout(dt)) {
      let runs;
      if (this._intercepted && this._interceptRuns !== undefined) {
        runs = this._interceptRuns;
      } else {
        runs = this.physics.estimateRuns(this.ball, this.fielders);
      }
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
    if (this._isTwoPlayer && this.scoreManager.isTargetReached()) {
      this._showBallEvent('TARGET REACHED!');
    } else {
      this._showBallEvent(runs === 6 ? 'SIX!' : 'FOUR!');
    }
    this._showRunCounter(runs);
    this._showBoundaryFlash(runs === 6);
    this.sound.playBoundaryCheer(runs === 6);
    if (runs === 6) this.commentary.onSix(); else this.commentary.onFour();
    this._triggerSlowMo(runs === 6 ? 1.5 : 1.0);
    this._ballSettleTimer = 0;
    this._finishBall();
  }

  _handleRuns(runs) {
    this.scoreManager.addRuns(runs);
    this.scoreManager.addBall();
    this.scoreboard.update(this.scoreManager);
    if (this._isTwoPlayer && this.scoreManager.isTargetReached()) {
      this._showBallEvent('TARGET REACHED!');
      this._showRunCounter(runs);
      this.sound.playBoundaryCheer(false);
    } else if (runs === 0) {
      this._showBallEvent('DOT');
      this.sound.playDotBall();
      this.commentary.onDot();
    } else {
      this._showBallEvent(`${runs} run${runs > 1 ? 's' : ''}`);
      this._showRunCounter(runs);
      this.commentary.onRuns(runs);
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
    this.sound.playDotBall();
    this.commentary.onDot();
    this._finishBall();
  }

  _handleWicket(type) {
    this.scoreManager.addWicket(type);
    this.scoreManager.addBall();
    this.scoreboard.update(this.scoreManager);
    this._showBallEvent(`WICKET!\n${type.toUpperCase()}`);
    if (type === 'bowled') {
      this.sound.playWicketFall();
      this.commentary.onBowled();
      if (this.pitch) this.pitch.triggerBailsFly();
    } else {
      this.sound.playCatchCheer();
      this.commentary.onCaught();
    }
    this._triggerSlowMo(1.5);
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
    if (this.pitch) this.pitch.updateBails(dt);

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
    this.sound.stopAmbientCrowd();
    const summary = this.scoreManager.getSummary();
    summary.playerName = this._playerName;

    // Two-player: after 1st innings, show innings break instead of final result
    if (this._isTwoPlayer && this._currentInnings === 1) {
      this._innings1Summary = summary;
      this.state = GAME_STATE.INNINGS_BREAK;
      this.scoreboard.hide();
      this.shotSelector.hide();
      this.endGameBtn.style.display = 'none';
      this.pauseBtn.style.display = 'none';
      if (this.muteBtn) this.muteBtn.style.display = 'none';
      if (this.touchController) this.touchController.hide();

      const target = summary.runs + 1;
      this.ibSummary.textContent = `${this._battingOrder[0]}: ${summary.runs}/${summary.wickets}`;
      this.ibDetails.textContent = `Overs: ${summary.overs} | RR: ${summary.runRate}`;
      this.ibTarget.textContent = `Target: ${target} runs`;
      this.inningsBreak.style.display = 'flex';
      return;
    }

    // Two-player: after 2nd innings, show final match result
    if (this._isTwoPlayer && this._currentInnings === 2) {
      this._showTwoPlayerResult(summary);
      return;
    }

    // Solo mode result
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
    if (this.muteBtn) this.muteBtn.style.display = 'none';
    if (this.touchController) this.touchController.hide();
    this.resultScreen.style.display = 'flex';
  }

  _showTwoPlayerResult(innings2Summary) {
    const p1 = this._battingOrder[0];
    const p2 = this._battingOrder[1];
    const i1 = this._innings1Summary;
    const i2 = innings2Summary;

    let headline;
    if (i2.runs >= i1.runs + 1) {
      const wicketsLeft = 10 - i2.wickets;
      headline = `${p2} wins by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}!`;
    } else if (i2.runs === i1.runs) {
      headline = 'Match Tied!';
    } else {
      const margin = i1.runs - i2.runs;
      headline = `${p1} wins by ${margin} run${margin !== 1 ? 's' : ''}!`;
    }

    this.newHsBadge.style.display = 'none';
    this.resultHighScore.textContent = '';
    document.querySelector('#result-screen h2').textContent = headline;
    this.finalScoreEl.textContent = '';
    this.finalDetailsEl.innerHTML = [
      `<strong>${p1}:</strong> ${i1.runs}/${i1.wickets} (${i1.overs} ov)`,
      `RR: ${i1.runRate} | 4s: ${i1.fours} | 6s: ${i1.sixes}`,
      '',
      `<strong>${p2}:</strong> ${i2.runs}/${i2.wickets} (${i2.overs} ov)`,
      `RR: ${i2.runRate} | 4s: ${i2.fours} | 6s: ${i2.sixes}`,
    ].join('<br>');

    this.scoreboard.hide();
    this.shotSelector.hide();
    this.endGameBtn.style.display = 'none';
    this.pauseBtn.style.display = 'none';
    if (this.muteBtn) this.muteBtn.style.display = 'none';
    if (this.touchController) this.touchController.hide();
    this.resultScreen.style.display = 'flex';
    this._isTwoPlayer = false;
  }

  _triggerSlowMo(duration) {
    this._slowMo = true;
    this._slowMoTimer = duration;
    this._slowMoScale = 0.2;
    if (this.replayLabel) this.replayLabel.style.display = 'block';
  }

  applySlowMo(dt) {
    if (!this._slowMo) return dt;
    this._slowMoTimer -= dt;
    if (this._slowMoTimer <= 0) {
      this._slowMo = false;
      this._slowMoScale = 1;
      if (this.replayLabel) this.replayLabel.style.display = 'none';
      return dt;
    }
    return dt * this._slowMoScale;
  }

  _showBallEvent(text) {
    this.ballEventEl.textContent = text;
    this.ballEventEl.style.display = 'block';
    this._eventPopupTimer = 1.5;
  }

  _showBoundaryFlash(isSix) {
    this.boundaryFlash.className = isSix ? 'six' : 'four';
    this.boundaryFlash.style.opacity = '1';
    setTimeout(() => { this.boundaryFlash.style.opacity = '0'; }, 300);
  }

  _showPowerMeter(velocity) {
    if (!velocity) return;
    const speed = velocity.length();
    // Max around 45 m/s
    const pct = Math.min(speed / 45, 1) * 100;
    this.powerMeter.style.display = 'block';
    this.powerLabel.style.display = 'block';
    this.powerFill.style.height = `${pct}%`;
    if (pct > 75) {
      this.powerFill.style.background = 'linear-gradient(to top, #ff4444, #ff8844)';
    } else if (pct > 40) {
      this.powerFill.style.background = 'linear-gradient(to top, #ffaa33, #ffdd44)';
    } else {
      this.powerFill.style.background = 'linear-gradient(to top, #44aa66, #88dd88)';
    }
    clearTimeout(this._powerTimeout);
    this._powerTimeout = setTimeout(() => {
      this.powerMeter.style.display = 'none';
      this.powerLabel.style.display = 'none';
    }, 2500);
  }

  _showTimingIndicator(timing, reach) {
    const labels = {
      perfect: 'Perfect!',
      good: 'Good',
      early_late: 'Mistimed',
      miss: 'Missed!',
    };
    const label = reach === 'edge' ? 'Edge!' : (labels[timing] || '');
    const cssClass = reach === 'edge' ? 'edge' : timing;

    this.timingEl.textContent = label;
    this.timingEl.className = cssClass;
    this.timingEl.style.display = 'block';
    this.timingEl.style.animation = 'none';
    void this.timingEl.offsetHeight;
    this.timingEl.style.animation = '';
    setTimeout(() => { this.timingEl.style.display = 'none'; }, 700);
  }

  _showRunCounter(runs) {
    if (runs <= 0) return;
    this.runCounterEl.textContent = `+${runs}`;
    this.runCounterEl.style.display = 'block';
    this.runCounterEl.style.animation = 'none';
    void this.runCounterEl.offsetHeight;
    this.runCounterEl.style.animation = '';
    setTimeout(() => { this.runCounterEl.style.display = 'none'; }, 1300);
  }
}
