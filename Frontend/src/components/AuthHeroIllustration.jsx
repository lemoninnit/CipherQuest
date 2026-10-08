import React from 'react';
import './AuthHeroIllustration.css';

const HEX_CODES = [
  { code: '5A', top: '6%', left: '24%' },
  { code: '9F', top: '10%', left: '56%' },
  { code: '7E', top: '16%', left: '16%' },
  { code: '42', top: '25%', left: '52%' },
  { code: '0x', top: '35%', left: '12%' },
  { code: '8A', top: '44%', left: '8%' },
  { code: 'A7', top: '42%', left: '46%' },
  { code: '2C', top: '52%', left: '38%' },
  { code: 'B4', top: '58%', left: '6%' },
  { code: 'B1', top: '68%', left: '32%' },
  { code: 'F3', top: '75%', left: '26%' },
  { code: 'E8', top: '85%', left: '55%' },
];

const AuthHeroIllustration = ({
  badgeText = 'SECURE // SESSION',
  titleLine1 = 'Master the',
  titleLine2 = 'Decryption Grid',
  description = "Join the elite ranks of operatives in the world's most immersive cryptographic arcade. Solve complex puzzles, claim badges, and secure the network.",
  stats = [
    { value: '128', unit: '-bit', label: 'ENCRYPTED GRID' },
    { value: '12k+', unit: '', label: 'OPERATIVES' },
    { value: '99.9%', unit: '', label: 'UPTIME' },
  ],
}) => {
  return (
    <div className="auth-hero-panel">
      {/* Background glow pools */}
      <div className="auth-hero-glow-top" />
      <div className="auth-hero-glow-bottom" />

      {/* Scattered background hex markers */}
      <div className="auth-hex-layer" aria-hidden="true">
        {HEX_CODES.map((item, index) => (
          <span
            key={index}
            className="auth-hex-item"
            style={{ top: item.top, left: item.left }}
          >
            {item.code}
          </span>
        ))}
      </div>

      {/* Main Isometric Graphic Scene - Scaled up & Centered */}
      <div className="auth-iso-scene">
        <svg
          viewBox="50 45 440 280"
          className="auth-iso-svg"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Glow filters */}
            <filter id="cq-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="16" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="cq-soft-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Gradients */}
            <linearGradient id="topFaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#00e5ff" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>

            <linearGradient id="leftFaceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#082848" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#021224" stopOpacity="0.98" />
            </linearGradient>

            <linearGradient id="rightFaceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0c3258" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#04162c" stopOpacity="0.98" />
            </linearGradient>

            <radialGradient id="platformGlowGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.9" />
              <stop offset="35%" stopColor="#00b4d8" stopOpacity="0.5" />
              <stop offset="70%" stopColor="#0077b6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="tileGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0c2240" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#040e1d" stopOpacity="0.96" />
            </linearGradient>
          </defs>

          {/* Dotted Elliptical Orbit Rings */}
          <ellipse
            cx="270"
            cy="140"
            rx="172"
            ry="62"
            transform="rotate(-15 270 140)"
            fill="none"
            stroke="rgba(0, 229, 255, 0.4)"
            strokeDasharray="5 8"
            strokeWidth="1.6"
            className="iso-orbit-ring"
          />
          <ellipse
            cx="270"
            cy="140"
            rx="205"
            ry="76"
            transform="rotate(-15 270 140)"
            fill="none"
            stroke="rgba(0, 229, 255, 0.15)"
            strokeDasharray="3 10"
            strokeWidth="1.2"
            className="iso-orbit-ring-outer"
          />

          {/* Glowing Platform Light Pool */}
          <g className="iso-glow-group">
            <ellipse
              cx="270"
              cy="278"
              rx="150"
              ry="42"
              fill="url(#platformGlowGrad)"
              filter="url(#cq-glow)"
              className="iso-pulse-glow"
            />
            <ellipse
              cx="270"
              cy="274"
              rx="85"
              ry="24"
              fill="#00e5ff"
              opacity="0.45"
              filter="url(#cq-soft-glow)"
            />
          </g>

          {/* Isometric Diamond Platform Grid */}
          <g className="iso-grid-group">
            <path
              d="M 270 150 L 415 222 L 270 294 L 125 222 Z"
              fill="rgba(3, 14, 30, 0.5)"
              stroke="rgba(0, 229, 255, 0.48)"
              strokeWidth="1.6"
            />
            {/* Grid lines inside platform */}
            <path
              d="M 161 204 L 306 276 M 197 186 L 342 258 M 233 168 L 378 240"
              stroke="rgba(0, 229, 255, 0.22)"
              strokeWidth="1.2"
            />
            <path
              d="M 378 204 L 233 276 M 342 186 L 197 258 M 306 168 L 161 240"
              stroke="rgba(0, 229, 255, 0.22)"
              strokeWidth="1.2"
            />

            {/* Glowing intersection nodes */}
            <circle cx="270" cy="222" r="2.8" fill="#00e5ff" opacity="0.7" />
            <circle cx="197" cy="222" r="2.8" fill="#00e5ff" opacity="0.6" />
            <circle cx="342" cy="222" r="2.8" fill="#00e5ff" opacity="0.6" />
            <circle
              cx="342"
              cy="258"
              r="3.8"
              fill="#00e5ff"
              filter="url(#cq-soft-glow)"
            />
          </g>

          {/* Floating Isometric 3D Cube */}
          <g className="iso-cube-group">
            {/* Top Face */}
            <path
              d="M 270 88 L 328 119 L 270 150 L 212 119 Z"
              fill="url(#topFaceGrad)"
              stroke="#a5f3fc"
              strokeWidth="1.6"
            />
            {/* Beacon Pip on top face */}
            <circle
              cx="270"
              cy="119"
              r="4"
              fill="#ffffff"
              filter="url(#cq-soft-glow)"
            />
            <circle cx="270" cy="119" r="1.8" fill="#00e5ff" />

            {/* Left Face with '01' */}
            <path
              d="M 212 119 L 270 150 L 270 243 L 212 212 Z"
              fill="url(#leftFaceGrad)"
              stroke="rgba(0, 229, 255, 0.88)"
              strokeWidth="1.6"
            />
            <text
              fill="#a5f3fc"
              fontSize="17"
              fontWeight="800"
              fontFamily="Outfit, var(--font-body), sans-serif"
              textAnchor="middle"
              transform="translate(241, 187) skewY(30) scale(0.92, 1)"
            >
              01
            </text>

            {/* Right Face with '7F' */}
            <path
              d="M 270 150 L 328 119 L 328 212 L 270 243 Z"
              fill="url(#rightFaceGrad)"
              stroke="rgba(0, 229, 255, 0.88)"
              strokeWidth="1.6"
            />
            <text
              fill="#a5f3fc"
              fontSize="17"
              fontWeight="800"
              fontFamily="Outfit, var(--font-body), sans-serif"
              textAnchor="middle"
              transform="translate(299, 187) skewY(-30) scale(0.92, 1)"
            >
              7F
            </text>
          </g>

          {/* Floating Icon Tile 1 (Key - Top Left) */}
          <g className="iso-tile-1">
            <rect
              x="94"
              y="72"
              width="46"
              height="46"
              rx="11"
              fill="url(#tileGrad)"
              stroke="rgba(0, 229, 255, 0.5)"
              strokeWidth="1.6"
            />
            <path
              d="M 124 91 C 124 87.7 121.3 85 118 85 C 114.7 85 112 87.7 112 91 C 112 93.5 113.5 95.7 115.7 96.6 L 115.7 105 L 119 105 L 119 102 L 121 102 L 121 99 L 119 99 L 119 96.8 C 122 95.9 124 93.7 124 91 Z M 118 89 C 119.1 89 120 89.9 120 91 C 120 92.1 119.1 93 118 93 C 116.9 93 116 92.1 116 91 C 116 89.9 116.9 89 118 89 Z"
              fill="#00e5ff"
              transform="rotate(-45 117 95)"
            />
          </g>

          {/* Floating Icon Tile 2 (Lock - Top Right) */}
          <g className="iso-tile-2">
            <rect
              x="394"
              y="62"
              width="46"
              height="46"
              rx="11"
              fill="url(#tileGrad)"
              stroke="rgba(0, 229, 255, 0.5)"
              strokeWidth="1.6"
            />
            <path
              d="M 417 79 C 414.8 79 413 80.8 413 83 L 413 85 L 412 85 C 410.9 85 410 85.9 410 87 L 410 95 C 410 96.1 410.9 97 412 97 L 422 97 C 423.1 97 424 96.1 424 95 L 424 87 C 424 85.9 423.1 85 422 85 L 421 85 L 421 83 C 421 80.8 419.2 79 417 79 Z M 417 81 C 418.1 81 419 81.9 419 83 L 419 85 L 415 85 L 415 83 C 415 81.9 415.9 81 417 81 Z M 417 89 C 417.8 89 418.5 89.7 418.5 90.5 C 418.5 91.1 418.1 91.6 417.6 91.9 L 418 94 L 416 94 L 416.4 91.9 C 415.9 91.6 415.5 91.1 415.5 90.5 C 415.5 89.7 416.2 89 417 89 Z"
              fill="#00e5ff"
            />
          </g>

          {/* Floating Icon Tile 3 (Badge / Ribbon - Bottom Left) */}
          <g className="iso-tile-3">
            <circle
              cx="117"
              cy="236"
              r="3.8"
              fill="#00e5ff"
              filter="url(#cq-soft-glow)"
            />
            <rect
              x="94"
              y="252"
              width="46"
              height="46"
              rx="11"
              fill="url(#tileGrad)"
              stroke="rgba(0, 229, 255, 0.5)"
              strokeWidth="1.6"
            />
            <path
              d="M 117 263 C 113.7 263 111 265.7 111 269 C 111 271.3 112.3 273.3 114.2 274.3 L 112 285 L 117 282 L 122 285 L 119.8 274.3 C 121.7 273.3 123 271.3 123 269 C 123 265.7 120.3 263 117 263 Z M 117 266 C 118.7 266 120 267.3 120 269 C 120 270.7 118.7 272 117 272 C 115.3 272 114 270.7 114 269 C 114 267.3 115.3 266 117 266 Z"
              fill="#00e5ff"
            />
          </g>

          {/* Floating Icon Tile 4 (Shield - Bottom Right) */}
          <g className="iso-tile-4">
            <rect
              x="406"
              y="222"
              width="46"
              height="46"
              rx="11"
              fill="url(#tileGrad)"
              stroke="rgba(0, 229, 255, 0.5)"
              strokeWidth="1.6"
            />
            <path
              d="M 429 232 L 419 236.5 L 419 243 C 419 249.2 423.3 255 429 256.5 C 434.7 255 439 249.2 439 243 L 439 236.5 L 429 232 Z M 427.5 249.5 L 423.5 245.5 L 425 244 L 427.5 246.5 L 433 241 L 434.5 242.5 L 427.5 249.5 Z"
              fill="#00e5ff"
            />
          </g>

          {/* Floating ambient glow beads */}
          <circle
            cx="60"
            cy="255"
            r="3.8"
            fill="#00e5ff"
            filter="url(#cq-soft-glow)"
          />
          <circle
            cx="165"
            cy="185"
            r="3.2"
            fill="#00e5ff"
            filter="url(#cq-soft-glow)"
          />
        </svg>
      </div>

      {/* Hero Text Content */}
      <div className="auth-hero-content">
        <div className="auth-pill-tag">
          <span className="auth-pill-dot" />
          <span className="auth-pill-label">{badgeText}</span>
        </div>

        <h1 className="auth-hero-title">
          {titleLine1}{' '}
          <span className="auth-hero-cyan-gradient">{titleLine2}</span>
        </h1>

        <p className="auth-hero-desc">{description}</p>

        {/* Stats Row */}
        <div className="auth-hero-stats">
          {stats.map((stat, idx) => (
            <div key={idx} className="auth-stat-item">
              <div className="auth-stat-value">
                {stat.value}
                {stat.unit && <span className="auth-stat-unit">{stat.unit}</span>}
              </div>
              <div className="auth-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuthHeroIllustration;
