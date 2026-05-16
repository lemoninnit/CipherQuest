import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/loading');
  };

  return (
    <main className="cipher-bg login-page">
      <section className="login-illustration">
        <div className="maze-pattern absolute-full opacity-20"></div>
        <div className="illustration-wrapper">
          <div className="illustration-container">
            <img 
              alt="Cyber Illustration" 
              className="illustration-img" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJplOW3jHAzhEHHJnd3e4AaV2j0x6GKok6WTaxHd3yBcrkrcyIBUkIZr6zWiVlfebMU5Ad3rQW391Mzsndv1Tj31LnnIwTSi4NZU5u_4AtDZTBYLd6YbxUfNyAin9D6D_h7UbE1J9773B51ntMAan9C6v1xjjlyc8E2dmr15EWeiPFyl8nASh7dfagv47pSHc6GTLXqPmSUCdIgiaLZn7JQ5BK1a9nUq8evVM6naOsUELNzU7SpZK_JG7M-1ZGNxk860IDRzKiPSw" 
            />
            <div className="blur-circle-primary"></div>
            <div className="blur-circle-secondary"></div>
            <div className="icon-card-primary animate-pulse">
              <span className="material-symbols-outlined icon-40">enhanced_encryption</span>
            </div>
            <div className="icon-card-secondary">
              <span className="material-symbols-outlined icon-32">military_tech</span>
            </div>
          </div>
          <div className="illustration-text">
            <h2>Master the Encryption</h2>
            <p>
              Join the elite rank of operatives in the world's most immersive cryptographic arcade. Solve ciphers, earn badges, and climb the global leaderboard.
            </p>
          </div>
        </div>
      </section>

      <section className="login-form-section">
        <div className="maze-pattern md-hidden absolute-full opacity-10"></div>
        <div className="glass-card login-card">
          <div className="login-header">
            <div className="login-logo">
              <span className="material-symbols-outlined fill-1 icon-48">enhanced_encryption</span>
              <span className="logo-text">CipherQuest</span>
            </div>
            <h1>Welcome Back, Decoder</h1>
            <p>Identify yourself to enter the grid</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>Operative ID</label>
              <div className="input-wrapper neon-glow-focus">
                <div className="input-icon">
                  <span className="material-symbols-outlined icon-20">person</span>
                </div>
                <input required placeholder="e.g. NeoCipher_42" type="text" />
              </div>
            </div>
            <div className="form-group">
              <div className="label-row">
                <label>Access Cipher</label>
                <a href="#">Lost Key?</a>
              </div>
              <div className="input-wrapper neon-glow-focus">
                <div className="input-icon">
                  <span className="material-symbols-outlined icon-20">lock</span>
                </div>
                <input required placeholder="••••••••" type="password" />
              </div>
            </div>
            <button type="submit" className="submit-btn">
              Initialize Session
            </button>
          </form>

          <div className="divider">
            <div className="divider-line"></div>
            <span>OR ALTERNATE ACCESS</span>
            <div className="divider-line"></div>
          </div>

          <div className="alternate-access">
            <button onClick={() => navigate('/loading')} className="btn-primary-outline">
              Create New Operative
            </button>
            <button onClick={() => navigate('/loading')} className="btn-secondary-outline">
              Access as Guest
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default LoginPage;
