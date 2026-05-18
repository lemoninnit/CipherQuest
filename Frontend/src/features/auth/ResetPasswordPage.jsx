import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../shared/api/cipherQuestApi';
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
        <div className="maze-pattern absolute-full opacity-20"></div>
        <div className="illustration-wrapper">
          <div className="illustration-container">
            <img
              alt="Cyber Reset Illustration"
              className="illustration-img"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJplOW3jHAzhEHHJnd3e4AaV2j0x6GKok6WTaxHd3yBcrkrcyIBUkIZr6zWiVlfebMU5Ad3rQW391Mzsndv1Tj31LnnIwTSi4NZU5u_4AtDZTBYLd6YbxUfNyAin9D6D_h7UbE1J9773B51ntMAan9C6v1xjjlyc8E2dmr15EWeiPFyl8nASh7dfagv47pSHc6GTLXqPmSUCdIgiaLZn7JQ5BK1a9nUq8evVM6naOsUELNzU7SpZK_JG7M-1ZGNxk860IDRzKiPSw"
            />
            <div className="blur-circle-primary"></div>
            <div className="blur-circle-secondary"></div>
            <div className="icon-card-primary animate-pulse">
              <span className="material-symbols-outlined icon-40">key</span>
            </div>
            <div className="icon-card-secondary">
              <span className="material-symbols-outlined icon-32">published_with_changes</span>
            </div>
          </div>
          <div className="illustration-text">
            <h2>Re-secure your Identity</h2>
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
