import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/cipherQuestApi';
import { useAuth } from '../context/AuthContext';
import './Registerpage.css';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm]       = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // Whether the confirm field has been interacted with. Lets us stay quiet
  // about a mismatch until they have actually finished typing it.
  const [confirmTouched, setConfirmTouched] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear a stale "do not match" banner as soon as they start correcting it.
    if (name === 'password' || name === 'confirmPassword') setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { username, email, password, confirmPassword } = form;
    // Validate that both Access Ciphers match before spending a request on the
    // server. The server re-checks this (see UserService.register) — this is
    // purely to give immediate, friendly feedback.
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

  // Live mismatch feedback. Only meaningful once they have typed something in
  // the confirm field, otherwise the banner fires while the first cipher is
  // still being composed.
  const confirmMismatch =
    form.confirmPassword.length > 0 && form.confirmPassword !== form.password;
  const showMismatch = confirmMismatch && (confirmTouched || error !== '');

  return (
    <main className="cipher-bg register-page">
      <section className="register-illustration">
        <div className="maze-pattern absolute-full opacity-20"></div>
        
        {/* FIXED: Elements grouped correctly inside the wrapper to match login page hierarchy */}
        <div className="illustration-wrapper">
          <div className="illustration-container">
            <img
              alt="Cyber Illustration"
              className="illustration-img"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJplOW3jHAzhEHHJnd3e4AaV2j0x6GKok6WTaxHd3yBcrkrcyIBUkIZr6zWiVlfebMU5Ad3rQW391Mzsndv1Tj31LnnIwTSi4NZU5u_4AtDZTBYLd6YbxUfNyAin9D6D_h7UbE1J9773B51ntMAan9C6v1xjjlyc8E2dmr15EWeiPFyl8nASh7dfagv47pSHc6GTLXqPmSUCdIgiaLZn7JQ5BK1a9nUq8evVM6naOsUELNzU7SpZK_JG7M-1ZGNxk860IDRzKiPSw"
            />  
            <div className="blur-circle-primary" />
            <div className="blur-circle-secondary" />
            <div className="icon-card-primary animate-pulse">
              <span className="material-symbols-outlined icon-40">enhanced_encryption</span>
            </div>
            <div className="icon-card-secondary">
              <span className="material-symbols-outlined icon-32">military_tech</span>
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
        <div className="maze-pattern absolute-full opacity-10"></div>
        <div className="register-card">
          <div className="register-header">
            <div className="register-logo">
              <span className="material-symbols-outlined fill-1">enhanced_encryption</span>
              <span className="logo-text">CipherQuest</span>
            </div>
            <h1>Create Operative</h1>
            <p>Enter your credentials to begin</p>
          </div>

          {error && <div className="register-error">{error}</div>}

          <form onSubmit={handleSubmit} className="register-form" autoComplete="off">
            <div className="form-group">
              <label>Operative ID</label>
              <div className="input-wrapper neon-glow-focus">
                <div className="input-icon">
                  <span className="material-symbols-outlined icon-20">person</span>
                </div>
                <input
                  required name="username" type="text"
                  placeholder="Choose an operative ID"
                  value={form.username} onChange={onChange}
                  minLength={3} maxLength={30}
                  autoComplete="off"
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
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Access Cipher (Password)</label>
              <div className="input-wrapper neon-glow-focus has-toggle">
                <div className="input-icon">
                  <span className="material-symbols-outlined icon-20">lock</span>
                </div>
                <input
                  required name="password" type={showPassword ? 'text' : 'password'}
                  placeholder="••••••"
                  value={form.password} onChange={onChange}
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  <span className="material-symbols-outlined icon-20">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="register-confirm-password">Confirm Access Cipher</label>
              <div className="input-wrapper neon-glow-focus has-toggle">
                <div className="input-icon">
                  <span className="material-symbols-outlined icon-20">lock_reset</span>
                </div>
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
                  className="password-toggle"
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
                <p id="register-confirm-error" className="register-field-error" role="alert">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
                  Access Ciphers do not match.
                </p>
              )}
              {!confirmMismatch && form.confirmPassword.length > 0 && (
                <p className="register-field-success" role="status">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                  Access Ciphers match.
                </p>
              )}
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
