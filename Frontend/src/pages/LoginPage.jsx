import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/cipherQuestApi';
import { useAuth } from '../context/AuthContext';
import AuthHeroIllustration from '../components/AuthHeroIllustration';
import './LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <main className="auth-page-container login-page">
      {/* Background ambient lighting */}
      <div className="auth-bg-orb-1" />
      <div className="auth-bg-orb-2" />

      {/* Left side Hero Illustration */}
      <AuthHeroIllustration
        badgeText="SECURE // SESSION"
        titleLine1="Master the"
        titleLine2="Decryption Grid"
        description="Join the elite ranks of operatives in the world's most immersive cryptographic arcade. Solve complex puzzles, claim badges, and secure the network."
        stats={[
          { value: '128', unit: '-bit', label: 'ENCRYPTED GRID' },
          { value: '12k+', unit: '', label: 'OPERATIVES' },
          { value: '99.9%', unit: '', label: 'UPTIME' },
        ]}
      />

      {/* Right side Login Form Card */}
      <section className="auth-form-section">
        <div className="auth-card">
          <div className="auth-card-header">
            <div className="auth-logo-pill">
              <div className="auth-logo-icon-box">
                <span className="material-symbols-outlined">lock</span>
              </div>
              <span className="auth-logo-text">CipherQuest</span>
            </div>
            <h1>Welcome Back, Decoder</h1>
            <p className="auth-card-subtitle">IDENTIFY YOURSELF TO ENTER THE GRID</p>
          </div>

          {error && <div className="auth-error-banner" role="alert">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form" autoComplete="off">
            <div className="auth-form-group">
              <label htmlFor="login-username">OPERATIVE ID</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <span className="material-symbols-outlined icon-20">person</span>
                </span>
                <input
                  id="login-username"
                  required
                  name="username"
                  type="text"
                  placeholder="Enter your operative ID"
                  value={form.username}
                  onChange={onChange}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="auth-form-group">
              <label htmlFor="login-password">ACCESS CIPHER</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <span className="material-symbols-outlined icon-20">key</span>
                </span>
                <input
                  id="login-password"
                  required
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={onChange}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  <span className="material-symbols-outlined icon-20">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              <Link to="/reset-password" className="auth-forgot-link">
                Forgot Access Cipher?
              </Link>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'INITIALIZING SESSION…' : 'INITIALIZE SESSION'}
            </button>
          </form>

          <div className="auth-divider">
            <div className="auth-divider-line"></div>
            <span>NEW OPERATIVE?</span>
            <div className="auth-divider-line"></div>
          </div>

          <Link to="/register" className="auth-outline-btn">
            <span className="material-symbols-outlined icon-20">person_add</span>
            CREATE NEW OPERATIVE
          </Link>
        </div>
      </section>
    </main>
  );
};

export default LoginPage;
