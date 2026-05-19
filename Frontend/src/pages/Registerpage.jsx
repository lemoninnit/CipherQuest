import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/cipherQuestApi';
import { useAuth } from '../context/AuthContext';
import './Registerpage.css';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm]       = useState({ username: '', email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await authApi.register(form.username, form.email, form.password);
      login(data.token, data.user);
      navigate('/loading');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="cipher-bg register-page">
      <section className="register-illustration">
        <div className="illustration-wrapper">
          <div className="terminal-mockup">
            <div className="terminal-header">
              <div className="terminal-dot dot-red"></div>
              <div className="terminal-dot dot-yellow"></div>
              <div className="terminal-dot dot-green"></div>
              <span className="terminal-title">Console::CipherQuest_Deployer_v2.0</span>
            </div>
            <div className="terminal-body">
              <div className="terminal-line">
                <span className="terminal-prompt">$</span>
                <span>Accessing secure deployment host...</span>
              </div>
              <div className="terminal-line success">
                <span className="terminal-prompt">$</span>
                <span>Host access granted. Initializing operative profile schema...</span>
              </div>
              <div className="terminal-line">
                <span className="terminal-prompt">$</span>
                <span>Configuring database container tables: Users, Scores, badgelist.</span>
              </div>
              <div className="terminal-line success">
                <span className="terminal-prompt">$</span>
                <span>Database mapped. [OK]</span>
              </div>
              <div className="terminal-line warning">
                <span className="terminal-prompt">$</span>
                <span>Deploying custom Caesar decryptor tools.</span>
              </div>
              <div className="terminal-line">
                <span className="terminal-prompt">$</span>
                <span>Status: Awaiting registration parameters...<span className="terminal-cursor"></span></span>
              </div>
            </div>
          </div>
          
          <div className="illustration-text">
            <h2>Join the <span className="highlight-cyan">Cipher Network</span></h2>
            <p>
              Create your operative account and start decrypting.
              Learn ciphers, claim XP, and climb the scoreboard.
            </p>
          </div>
        </div>
      </section>

      <section className="register-form-section">
        <div className="maze-pattern absolute-full opacity-10"></div>
        <div className="glass-card register-card">
          <div className="register-header">
            <div className="register-logo">
              <span className="material-symbols-outlined fill-1 icon-48">enhanced_encryption</span>
              <span className="logo-text">CipherQuest</span>
            </div>
            <h1>Create Operative</h1>
            <p>Enter your credentials to begin</p>
          </div>

          {error && <div className="register-error">{error}</div>}

          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-group">
              <label>Operative ID</label>
              <div className="input-wrapper neon-glow-focus">
                <div className="input-icon">
                  <span className="material-symbols-outlined icon-20">person</span>
                </div>
                <input
                  required name="username" type="text"
                  placeholder="johndoe@gmail.com"
                  value={form.username} onChange={onChange}
                  minLength={3} maxLength={30}
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
                  required name="email" type="email"
                  placeholder="operative@cipherquest.io"
                  value={form.email} onChange={onChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Access Cipher (Password)</label>
              <div className="input-wrapper neon-glow-focus">
                <div className="input-icon">
                  <span className="material-symbols-outlined icon-20">lock</span>
                </div>
                <input
                  required name="password" type="password"
                  placeholder="••••••"
                  value={form.password} onChange={onChange}
                  minLength={6}
                />
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Registering…' : 'Deploy Operative'}
            </button>
          </form>

          <p className="register-footer">
            Already have an account?{' '}
            <Link to="/" className="register-link">Log In</Link>
          </p>
        </div>
      </section>
    </main>
  );
};

export default RegisterPage;