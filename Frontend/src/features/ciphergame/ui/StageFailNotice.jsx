import StageLostScreen from './StageLostScreen';

/**
 * SCORING SYSTEM - failure feedback (spec 7 / 18).
 *
 * A thin wrapper over the shared losing screen. Every game now renders its own
 * losing screen when it loses a stage and passes `showNotice: false`, so this
 * is the fallback path. It is kept as its own module so CipherGame keeps
 * rendering one named failure dialog regardless of which game is mounted, and
 * so the notice data shape stays in a single place.
 *
 * Losing a stage also costs ONE server session heart, and the attempt cannot be
 * retried: the stage session is closed, so the only way forward is back to the
 * roadmap. When that heart was the last one, every stage is locked until the
 * cooldown ends - the card shows that wait with a live countdown.
 */
export default function StageFailNotice({ notice, onDismiss }) {
  if (!notice) return null;

  return (
    <StageLostScreen
      open
      reason="You ran out of attempts on this stage."
      heartsLeft={notice.heartsLeft}
      maxHearts={notice.maxHearts ?? 3}
      lockedOut={notice.lockedOut}
      cooldownEndTime={notice.cooldownEndTime}
      totalScore={notice.totalScore}
      onExit={onDismiss}
      exitLabel="Got it"
      showExitIcon={false}
    />
  );
}
