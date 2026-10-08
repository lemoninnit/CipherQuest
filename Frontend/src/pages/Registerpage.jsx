import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/cipherQuestApi';
import { useAuth } from '../context/AuthContext';
import AuthHeroIllustration from '../components/AuthHeroIllustration';
import './Registerpage.css';

const getCipherStrength = (password) => {
  if (!password) return { score: 0, label: 'WEAK' };
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;

  score = Math.min(4, Math.max(1, score));
  const labels = {
    1: 'WEAK',
    2: 'MEDIUM',
    3: 'STRONG',
    4: 'ELITE',
  };
  return { score, label: labels[score] || 'WEAK' };
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'password' || name === 'confirmPassword') setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { username, email, password, confirmPassword } = form;

    if (confirmPassword !== password) {
      setError('Access Ciphers do not match. Please re-enter them to confirm.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await authApi.register(username, email, password, confirmPassword);
      login(data.token, data.user);
      navigate('/loading');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const confirmMismatch =
    form.confirmPassword.length > 0 && form.confirmPassword !== form.password;
  const showMismatch = confirmMismatch && (confirmTouched || error !== '');
  const { score: strengthScore, label: strengthLabel } = getCipherStrength(form.password);

  return (
    <main className="auth-page-container register-page">
      {/* Background ambient lighting */}
      <div className="auth-bg-orb-1" />
      <div className="auth-bg-orb-2" />

      {/* Left side Hero Illustration */}
      <AuthHeroIllustration
        badgeText="RECRUITMENT // ACTIVE"
        titleLine1="Join the"
        titleLine2="Cipher Quest"
        description="Decrypt layered puzzles, earn XP as you solve, and climb the leaderboard among the sharpest operatives on the grid."
        stats={[
          { value: '128', unit: '-bit', label: 'ENCRYPTED GRID' },
          { value: '12k+', unit: '', label: 'OPERATIVES' },
          { value: '99.9%', unit: '', label: 'UPTIME' },
        ]}
      />

      {/* Right side Register Form Card */}
      <section className="auth-form-section">
        <div className="auth-card">
          <div className="auth-card-header">
            <div className="auth-logo-pill">
              <div className="auth-logo-icon-box">
                <span className="material-symbols-outlined">lock</span>
              </div>
              <span className="auth-logo-text">CipherQuest</span>
            </div>
            <h1>Create Operative</h1>
            <p className="auth-card-subtitle">ENTER YOUR CREDENTIALS TO BEGIN</p>
          </div>

          {error && <div className="auth-error-banner" role="alert">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form" autoComplete="off">
            <div className="auth-form-group">
              <label htmlFor="register-username">OPERATIVE ID</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <span className="material-symbols-outlined icon-20">person</span>
                </span>
                <input
                  id="register-username"
                  required
                  name="username"
                  type="text"
                  placeholder="Choose an operative ID"
                  value={form.username}
                  onChange={onChange}
                  minLength={3}
                  maxLength={30}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="auth-form-group">
              <label htmlFor="register-email">COMMS CHANNEL (EMAIL)</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <span className="material-symbols-outlined icon-20">mail</span>
                </span>
                <input
                  id="register-email"
                  required
                  name="email"
                  type="email"
                  placeholder="operative@cipherquest.io"
                  value={form.email}
                  onChange={onChange}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="auth-form-group">
              <label htmlFor="register-password">ACCESS CIPHER (PASSWORD)</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <span className="material-symbols-outlined icon-20">key</span>
                </span>
                <input
                  id="register-password"
                  required
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••••"
                  value={form.password}
                  onChange={onChange}
                  minLength={6}
                  autoComplete="new-password"
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

              {/* Cipher Strength Meter */}
              <div className="cipher-strength-container">
                <div className="cipher-strength-bars">
                  <div className={`cipher-strength-bar ${strengthScore >= 1 ? 'bar-active' : ''}`} />
                  <div className={`cipher-strength-bar ${strengthScore >= 2 ? 'bar-active' : ''}`} />
                  <div className={`cipher-strength-bar ${strengthScore >= 3 ? 'bar-active' : ''}`} />
                  <div className={`cipher-strength-bar ${strengthScore >= 4 ? 'bar-active' : ''}`} />
                </div>
                <div className="cipher-strength-meta">
                  <span className="cipher-strength-label">CIPHER STRENGTH</span>
                  <span className={`cipher-strength-text ${strengthLabel.toLowerCase()}`}>
                    {strengthLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="auth-form-group">
              <label htmlFor="register-confirm-password">CONFIRM ACCESS CIPHER</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <span className="material-symbols-outlined icon-20">sync_lock</span>
                </span>
                <input
                  id="register-confirm-password"
                  required
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter cipher"
                  value={form.confirmPassword}
                  onChange={onChange}
                  onBlur={() => setConfirmTouched(true)}
                  minLength={6}
                  autoComplete="new-password"
                  disabled={loading}
                  aria-invalid={showMismatch}
                  aria-describedby={showMismatch ? 'register-confirm-error' : undefined}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                  aria-pressed={showConfirmPassword}
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                  disabled={loading}
                >
                  <span className="material-symbols-outlined icon-20">
                    {showConfirmPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>

              {showMismatch && (
                <p id="register-confirm-error" className="auth-field-error" role="alert">
                  <span className="material-symbols-outlined icon-16">error</span>
                  Access Ciphers do not match.
                </p>
              )}
              {!confirmMismatch && form.confirmPassword.length > 0 && (
                <p className="auth-field-success" role="status">
                  <span className="material-symbols-outlined icon-16">check_circle</span>
                  Access Ciphers match.
                </p>
              )}
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'DEPLOYING OPERATIVE…' : 'DEPLOY OPERATIVE'}
            </button>
          </form>

          <p className="auth-footer-text">
            Already have an account?{' '}
            <Link to="/" className="auth-link">Log In</Link>
          </p>
        </div>
      </section>
    </main>
  );
};

export default RegisterPage;
