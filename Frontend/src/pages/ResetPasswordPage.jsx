import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/cipherQuestApi';
import './ResetPasswordPage.css';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', newPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const data = await authApi.resetPassword(form.username, form.email, form.newPassword);
      setSuccess(data.message || 'Access Cipher updated successfully!');
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Verification failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="cipher-bg reset-page">
      <section className="reset-illustration">
        <div className="illustration-wrapper">
          <div className="terminal-mockup">
            <div className="terminal-header">
              <div className="terminal-dot dot-red"></div>
              <div className="terminal-dot dot-yellow"></div>
              <div className="terminal-dot dot-green"></div>
              <span className="terminal-title">Console::CipherQuest_Security_v2.0</span>
            </div>
            <div className="terminal-body">
              <div className="terminal-line">
                <span className="terminal-prompt">$</span>
                <span>Initializing override protocol daemon...</span>
              </div>
              <div className="terminal-line success">
                <span className="terminal-prompt">$</span>
                <span>Operative identification request received.</span>
              </div>
              <div className="terminal-line">
                <span className="terminal-prompt">$</span>
                <span>Verifying comms channel signature...</span>
              </div>
              <div className="terminal-line success">
                <span className="terminal-prompt">$</span>
                <span>Verification channel ready. [OK]</span>
              </div>
              <div className="terminal-line warning">
                <span className="terminal-prompt">$</span>
                <span>Override: Overwriting Access Cipher hash value.</span>
              </div>
              <div className="terminal-line">
                <span className="terminal-prompt">$</span>
                <span>Status: Awaiting override inputs...<span className="terminal-cursor"></span></span>
              </div>
            </div>
          </div>
          <div className="illustration-text">
            <h2>Re-secure your <span className="highlight-cyan">Identity</span></h2>
            <p>
              Operatives who lose access to the grid can re-authenticate using their comms channel.
              Confirm your details to overwrite your security configuration.
            </p>
          </div>
        </div>
      </section>

      <section className="reset-form-section">
        <div className="maze-pattern md-hidden absolute-full opacity-10"></div>
        <div className="glass-card reset-card">
          <div className="reset-header">
            <div className="reset-logo">
              <span className="material-symbols-outlined fill-1 icon-48">enhanced_encryption</span>
              <span className="logo-text">CipherQuest</span>
            </div>
            <h1>Reset Access Cipher</h1>
            <p>Verify your Operative ID & Email to set a new password</p>
          </div>

          {error && <div className="reset-error">{error}</div>}
          {success && <div className="reset-success">{success} Redirecting to login...</div>}

          <form onSubmit={handleSubmit} className="reset-form">
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
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Comms Channel (Email)</label>
              <div className="input-wrapper neon-glow-focus">
                <div className="input-icon">
                  <span className="material-symbols-outlined icon-20">email</span>
                </div>
                <input
                  required
                  name="email"
                  placeholder="operative@cipherquest.io"
                  type="email"
                  value={form.email}
                  onChange={onChange}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label>New Access Cipher (Password)</label>
              <div className="input-wrapper neon-glow-focus">
                <div className="input-icon">
                  <span className="material-symbols-outlined icon-20">lock</span>
                </div>
                <input
                  required
                  name="newPassword"
                  placeholder="••••••••"
                  type="password"
                  value={form.newPassword}
                  onChange={onChange}
                  minLength={6}
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Re-writing Grid Access…' : 'Override Access Cipher'}
            </button>
          </form>

          <p className="reset-footer">
            Remembered your credentials?{' '}
            <Link to="/" className="reset-link">Log In</Link>
          </p>
        </div>
      </section>
    </main>
  );
};

export default ResetPasswordPage;
