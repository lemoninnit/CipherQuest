import React from 'react';

const StageRoadmap = ({
  stages,
  activeDifficulty,
  onSelectStage,
  onOpenRecap,
  onBack
}) => {
  return (
    <div className="game-lobby">
      <div className="lobby-header-row">
        <button className="lobby-back-btn" onClick={onBack}>
          <span className="material-symbols-outlined">arrow_back</span>
          <span>Back to Difficulties</span>
        </button>
      </div>

      <div className="lobby-header" style={{ marginTop: '16px' }}>
        <span className="material-symbols-outlined fill-1 lobby-badge-icon stages">map</span>
        <h2 className="lobby-title" style={{ textTransform: 'capitalize' }}>{activeDifficulty} Shift Roadmap</h2>
        <p className="lobby-subtitle">Unlock sequential nodes by cracking cryptographic stages</p>
      </div>

      <div className="roadmap-container">
        {/* Connection Line */}
        <div className="roadmap-pathway-line">
          <div 
            className="roadmap-pathway-fill" 
            style={{ 
              width: `${Math.min(100, (stages.filter(s => s.completed).length / (stages.length - 1)) * 100)}%` 
            }} 
          />
        </div>

        {/* Nodes Grid */}
        <div className="roadmap-nodes-wrapper">
          {stages.map((stage) => {
            const isCompleted = stage.completed;
            const isPlayable = stage.playable;

            let nodeClass = 'roadmap-node locked';
            let iconText = 'lock';

            if (isCompleted) {
              nodeClass = 'roadmap-node completed';
              iconText = 'check_circle';
            } else if (isPlayable) {
              nodeClass = 'roadmap-node active pulse-glow';
              iconText = 'sports_esports';
            }

            return (
              <div key={stage.id} className="roadmap-node-container">
                <div 
                  className={nodeClass}
                  onClick={() => {
                    if (isCompleted) {
                      onOpenRecap(stage);
                    } else if (isPlayable) {
                      onSelectStage(stage.id);
                    }
                  }}
                >
                  <span className="material-symbols-outlined node-icon">{iconText}</span>
                  <div className="node-badge-id">{stage.id}</div>
                </div>
                <div className="node-info">
                  <h4 className="node-name">Stage {stage.id}</h4>
                  <p className="node-desc-text">
                    {isCompleted ? 'Decrypted Successfully' : isPlayable ? 'Ready to Deploy' : 'Encrypted Module'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StageRoadmap;
