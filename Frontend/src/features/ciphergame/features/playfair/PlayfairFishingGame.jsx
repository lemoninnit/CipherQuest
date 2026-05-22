import React from 'react';
import { PLAYFAIR_LEVELS } from './PlayfairLevels';
import { generateMatrix } from './PlayfairHelpers';

export default function PlayfairFishingGame({
  tier,
  levelIndex,
  onBackToStages
}) {
  const level = PLAYFAIR_LEVELS[tier][levelIndex];
  const matrix = generateMatrix(level.key);

  return (
    <div className="playfair-game">

      <div className="hud">
        <button onClick={onBackToStages}>← Back</button>
        <h2>Playfair Cipher</h2>
      </div>

      <div className="matrix">
        {matrix.map((row, i) => (
          <div key={i} className="row">
            {row.map((c, j) => (
              <span key={j}>{c}</span>
            ))}
          </div>
        ))}
      </div>

      <div className="hint">
        💡 {level.hint}
      </div>

      <div className="note">
        Playfair fishing mechanics coming next (key collection system)
      </div>

    </div>
  );
}