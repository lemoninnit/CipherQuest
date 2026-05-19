import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/cipherQuestApi';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm]       = useState({ username: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await authApi.login(form.username, form.password);
      login(data.token, data.user);
      navigate('/loading');
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="cipher-bg login-page">
      <section className="login-illustration">
        <div className="illustration-wrapper">
          <div className="terminal-mockup">
            <div className="terminal-header">
              <div className="terminal-dot dot-red"></div>
              <div className="terminal-dot dot-yellow"></div>
              <div className="terminal-dot dot-green"></div>
              <span className="terminal-title">Console::CipherQuest_Kernel_v2.0</span>
            </div>
            <div className="terminal-body">
              <div className="terminal-line">
                <span className="terminal-prompt">$</span>
                <span>Initializing decryption engine protocols...</span>
              </div>
              <div className="terminal-line success">
                <span className="terminal-prompt">$</span>
                <span>Connection established on SSL port 8080.</span>
              </div>
              <div className="terminal-line">
                <span className="terminal-prompt">$</span>
                <span>Loading Caesar, Vigenère & Playfair components...</span>
              </div>
              <div className="terminal-line success">
                <span className="terminal-prompt">$</span>
                <span>Decryptors loaded successfully. [OK]</span>
              </div>
              <div className="terminal-line warning">
                <span className="terminal-prompt">$</span>
                <span>Decrypting system segment blanks: WATER -&gt; BFSJW</span>
              </div>
              <div className="terminal-line">
                <span className="terminal-prompt">$</span>
                <span>Status: Awaiting Operative ID input<span className="terminal-cursor"></span></span>
              </div>
            </div>
          </div>
          <div className="illustration-text">
            <h2>Master the <span className="highlight-cyan">Decryption Grid</span></h2>
            <p>
              Join the elite ranks of operatives in the world's most immersive cryptographic arcade.
              Solve complex puzzles, claim badges, and secure the network.
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

          {error && (
            <div className="login-error">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>Operative ID</label>
              <div className="input-wrapper neon-glow-focus">
                <div className="input-icon">
                  <span className="material-symbols-outlined icon-20">person</span>
                </div>
                <input
                  required
                  name="username"
                  placeholder="e.g. NeoCipher_42"
                  type="text"
                  value={form.username}
                  onChange={onChange}
                />
              </div>
            </div>

            <div className="form-group">
              <div className="label-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Access Cipher</label>
                <Link to="/reset-password" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 600 }}>
                  Forgot Access Cipher?
                </Link>
              </div>
              <div className="input-wrapper neon-glow-focus">
                <div className="input-icon">
                  <span className="material-symbols-outlined icon-20">lock</span>
                </div>
                <input
                  required
                  name="password"
                  placeholder="••••••••"
                  type="password"
                  value={form.password}
                  onChange={onChange}
                />
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Authenticating…' : 'Initialize Session'}
            </button>
          </form>

          <div className="divider">
            <div className="divider-line"></div>
            <span>NEW OPERATIVE?</span>
            <div className="divider-line"></div>
          </div>

          <div className="alternate-access">
            <Link to="/register" className="btn-primary-outline" style={{ textDecoration: 'none', textAlign: 'center' }}>
              Create New Operative
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default LoginPage;