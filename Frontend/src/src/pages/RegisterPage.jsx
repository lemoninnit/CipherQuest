import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi, saveToken } from '../api/cipherQuestApi';
import './RegisterPage.css';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm]     = useState({ username: '', email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const data = await authApi.register(form.username, form.email, form.password);
      saveToken(data.token);
      navigate('/loading');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="cipher-bg register-page">
      <section className="register-illustration">
        <div className="illustration-wrapper">
          <div className="illustration-container">
            <div className="blur-circle-primary" />
            <div className="blur-circle-secondary" />
            <div className="icon-card-primary animate-pulse">
              <span className="material-symbols-outlined icon-40">enhanced_encryption</span>
            </div>
            <div className="icon-card-secondary">
              <span className="material-symbols-outlined icon-32">phishing</span>
            </div>
          </div>
          <div className="illustration-text">
            <h2>Join the Cipher Pond</h2>
            <p>
              Create your operative account and start decrypting.
              Catch fish, earn XP, and climb the leaderboard.
            </p>
          </div>
        </div>
      </section>

      <section className="register-form-section">
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
                  placeholder="e.g. NeoCipher_42"
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
                  placeholder="Min. 6 characters"
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
