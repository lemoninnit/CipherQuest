import StageLostScreen from './StageLostScreen';
import '../CipherGame.css';

/**
 * GAME OVER overlay for the fishing games, shown when in-game attempts run out.
 *
 * All of the wording, the heart display, the lockout countdown and the single
 * "what now" action live in StageLostScreen, which every cipher shares. This
 * file only supplies the fishing-specific reason line and the exit target, so
 * losing a stage reads identically no matter which game produced it.
 *
 * NO RETRY BY DESIGN: losing a stage is final for that attempt. The server has
 * already spent one session heart (ScoringService.failStage) and the stage
 * session is closed, so the only way forward is back to the roadmap. Offering a
 * retry here used to hand the player an unscored re-roll of a lost stage.
 *
 * @param {boolean} open        Whether the overlay is visible.
 * @param {object}  stageLoss   Authoritative post-loss heart state from
 *                              `failStage` (null until a loss is charged, in
 *                              which case the live profile is used).
 * @param {Function} onExit     Leave to the stage roadmap.
 */
export default function FishingGameOverOverlay({ open, stageLoss, onExit }) {
  return (
    <StageLostScreen
      open={open}
      reason="You ran out of attempts before catching the cipher."
      heartsLeft={stageLoss?.heartsLeft ?? null}
      maxHearts={stageLoss?.maxHearts ?? 3}
      lockedOut={stageLoss?.lockedOut ?? false}
      cooldownEndTime={stageLoss?.cooldownEndTime ?? null}
      totalScore={stageLoss?.totalScore ?? null}
      onExit={onExit}
    />
  );
}
