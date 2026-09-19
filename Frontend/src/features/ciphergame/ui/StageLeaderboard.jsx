import { useEffect, useState } from 'react';
import { scoringApi } from '../../../api/cipherQuestApi';
import { formatCompletionTime, formatMultiplier } from '../core/engine/scoring';
import './StageLeaderboard.css';

/**
 * SCORING SYSTEM — per-stage leaderboard (spec §19 / §24).
 *
 * Two SEPARATE rankings for a single stage; score and time are never combined:
 *   HIGHEST SCORE — ranked by score DESC
 *   FASTEST TIME  — ranked by completion_time_ms ASC
 */
const CATEGORIES = [
  { id: 'score', label: 'HIGHEST SCORE', icon: 'emoji_events' },
  { id: 'time',  label: 'FASTEST TIME',  icon: 'timer' },
];

const CIPHER_LABELS = { CAESAR: 'Caesar', VIGENERE: 'Vigenère', PLAYFAIR: 'Playfair' };

export default function StageLeaderboard({ stage, onClose }) {
  const { cipherType, difficultyTier, levelIndex } = stage || {};

  const [category, setCategory] = useState('score');

  // One state slot keyed by the requested stage/category, so `loading` can be
  // derived on render instead of being toggled synchronously inside the effect.
  const [data, setData] = useState({ key: null, entries: [], error: null });

  const requestKey = `${cipherType || ''}|${difficultyTier || ''}|${levelIndex ?? ''}|${category}`;
  const loading = data.key !== requestKey;
  const entries = data.entries;
  const error = data.error;

  useEffect(() => {
    if (!cipherType || !difficultyTier || levelIndex == null) return undefined;

    let ignore = false;

    scoringApi
      .getStageLeaderboard(cipherType, difficultyTier, levelIndex, category)
      .then((res) => {
        if (ignore) return;
        setData({ key: requestKey, entries: res?.entries || [], error: null });
      })
      .catch((err) => {
        if (ignore) return;
        console.warn('Stage leaderboard unavailable:', err.message);
        setData({
          key: requestKey,
          entries: [],
          error: err.message || 'Unable to retrieve stage rankings.',
        });
      });

    return () => { ignore = true; };
  }, [cipherType, difficultyTier, levelIndex, category, requestKey]);

  if (!stage) return null;

  const isTime = category === 'time';
  const stageLabel = `Stage ${(levelIndex ?? 0) + 1}`;
  const tierLabel = String(difficultyTier || '').toUpperCase();
  const cipherLabel = CIPHER_LABELS[String(cipherType || '').toUpperCase()] || cipherType;

  return (
    <div className="slb-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Stage leaderboard">
      <div className="slb-card" onClick={(e) => e.stopPropagation()}>
        <div className="slb-header">
          <div className="slb-header-text">
            <span className="material-symbols-outlined slb-header-icon">leaderboard</span>
            <div>
              <h2 className="slb-title">STAGE RANKINGS</h2>
              <p className="slb-subtitle">{cipherLabel} — {tierLabel} — {stageLabel}</p>
            </div>
          </div>
          <button className="slb-close-btn" onClick={onClose} aria-label="Close leaderboard">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Category selector: the two competitive metrics stay independent */}
        <div className="slb-tabs">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`slb-tab ${category === c.id ? 'active' : ''}`}
              onClick={() => setCategory(c.id)}
            >
              <span className="material-symbols-outlined">{c.icon}</span>
              {c.label}
            </button>
          ))}
        </div>

        <div className="slb-body">
          {loading && (
            <div className="slb-state">
              <span className="material-symbols-outlined slb-spinner">progress_activity</span>
              Retrieving rankings…
            </div>
          )}

          {!loading && error && (
            <div className="slb-state slb-state-error">
              <span className="material-symbols-outlined">wifi_off</span>
              {error}
            </div>
          )}

          {!loading && !error && entries.length === 0 && (
            <div className="slb-state">
              <span className="material-symbols-outlined">person_search</span>
              No records yet. Be the first to secure this stage.
            </div>
          )}

          {!loading && !error && entries.length > 0 && (
            <div className={`slb-table ${isTime ? 'slb-table-time' : ''}`}>
              <div className="slb-row slb-row-head">
                <span className="slb-col-rank">#</span>
                <span className="slb-col-name">Operative</span>
                {isTime && <span className="slb-col-score">Score</span>}
                <span className="slb-col-metric">{isTime ? 'Time' : 'Best Score'}</span>
              </div>
              {entries.map((entry) => (
                <div
                  key={`${entry.rank}-${entry.username}`}
                  className={`slb-row ${entry.isCurrentUser ? 'is-current' : ''}`}
                >
                  <span className={`slb-col-rank slb-rank-${entry.rank}`}>{entry.rank}</span>
                  <span className="slb-col-name">
                    {entry.username}
                    {entry.isCurrentUser && <span className="slb-you-tag">[You]</span>}
                  </span>
                  {isTime && (
                    <span className="slb-col-score">{(entry.score ?? 0).toLocaleString()}</span>
                  )}
                  <span className={`slb-col-metric ${isTime ? 'slb-time' : 'slb-score'}`}>
                    {isTime
                      ? formatCompletionTime(entry.timeMs)
                      : (entry.score ?? 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="slb-footer">
          <span className="slb-footer-note">
            Score and completion time are ranked separately — fastest time is not converted into score.
          </span>
          <span className="slb-footer-mult">
            Streak tiers up to {formatMultiplier(2)}
          </span>
        </div>
      </div>
    </div>
  );
}