import React from 'react';

const CategorySelector = ({ onSelectCategory }) => {
  return (
    <div className="game-lobby">
      <div className="lobby-header">
        <span className="material-symbols-outlined fill-1 lobby-badge-icon">enhanced_encryption</span>
        <h2 className="lobby-title">Choose Cipher Category</h2>
        <p className="lobby-subtitle">Master cryptographic algorithms sequentially</p>
      </div>

      <div className="flow-grid">
        {/* Caesar Cipher Card */}
        <div className="flow-card active" onClick={() => onSelectCategory('caesar')}>
          <div className="flow-card-header">
            <div className="flow-icon-box caesar">
              <span className="material-symbols-outlined">sort_by_alpha</span>
            </div>
            <span className="flow-status active">AVAILABLE</span>
          </div>
          <h3 className="flow-card-title">Caesar Cipher</h3>
          <p className="flow-card-desc">
            Shift letters of the alphabet by a fixed numeric key. Learn the foundation of monoalphabetic substitution ciphers.
          </p>
          <div className="flow-card-footer">
            <span className="flow-stat">5 STAGES</span>
            <span className="flow-reward">+100 XP / Level</span>
          </div>
        </div>

        {/* Vigenere Cipher Card */}
        <div className="flow-card active" onClick={() => onSelectCategory('vigenere')}>
          <div className="flow-card-header">
            <div className="flow-icon-box vigenere">
              <span className="material-symbols-outlined">vpn_key</span>
            </div>
            <span className="flow-status active">AVAILABLE</span>
          </div>
          <h3 className="flow-card-title">Vigenère Cipher</h3>
          <p className="flow-card-desc">
            Learn polyalphabetic substitution using a repeating keyword. Decrypt repeating keyword shifts dynamically.
          </p>
          <div className="flow-card-footer">
            <span className="flow-stat">5 STAGES</span>
            <span className="flow-reward">+100 XP / Level</span>
          </div>
        </div>

        {/* Playfair Cipher Card */}
        <div className="flow-card active" onClick={() => onSelectCategory('playfair')}>
          <div className="flow-card-header">
            <div className="flow-icon-box playfair">
              <span className="material-symbols-outlined">grid_view</span>
            </div>
            <span className="flow-status active">AVAILABLE</span>
          </div>
          <h3 className="flow-card-title">Playfair Cipher</h3>
          <p className="flow-card-desc">
            Encrypt pairs of letters (digraphs) inside a 5×5 key matrix. Learn row, column, and rectangular swaps.
          </p>
          <div className="flow-card-footer">
            <span className="flow-stat">5 STAGES</span>
            <span className="flow-reward">+100 XP / Level</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategorySelector;
