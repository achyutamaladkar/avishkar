import React, { useState } from 'react';
import { Eye, EyeOff, LogIn, Mail, Orbit, Lock, User } from 'lucide-react';

export interface UserSession {
  name: string;
  gmail: string;
  signedInAt: string;
}

interface LoginPageProps {
  onLogin: (user: UserSession) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [gmail, setGmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedGmail = gmail.trim().toLowerCase();

    if (!trimmedName) {
      setError('Please enter your name.');
      return;
    }

    if (!/^[^\s@]+@gmail\.com$/i.test(trimmedGmail)) {
      setError('Please enter a valid Gmail address (e.g. alex@gmail.com).');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError(null);
    onLogin({
      name: trimmedName,
      gmail: trimmedGmail,
      signedInAt: new Date().toISOString(),
    });
  };

  return (
    <div className="login-shell">
      <div className="panel login-card">
        <div className="login-brand">
          <div className="brand-mark" aria-hidden="true">
            <Orbit size={24} />
          </div>
          <div>
            <h1>OrbitView</h1>
            <p className="brand-subtitle">
              Live SGP4 satellite pass predictor &amp; sky-track planner
            </p>
          </div>
        </div>

        <div className="login-intro">
          <p className="eyebrow">Sign In</p>
          <h2>Welcome back</h2>
          <p className="muted">
            Enter your name, Gmail address, and password to open OrbitView.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="login-name">Name</label>
            <div className="input-with-icon">
              <User size={16} className="input-icon" aria-hidden="true" />
              <input
                id="login-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="login-gmail">Gmail</label>
            <div className="input-with-icon">
              <Mail size={16} className="input-icon" aria-hidden="true" />
              <input
                id="login-gmail"
                type="email"
                value={gmail}
                onChange={(e) => setGmail(e.target.value)}
                placeholder="you@gmail.com"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="login-password">Password</label>
            <div className="input-with-icon password-input-wrap">
              <Lock size={16} className="input-icon" aria-hidden="true" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary login-submit-btn">
            <LogIn size={16} aria-hidden="true" />
            <span>Log in to OrbitView</span>
          </button>
        </form>

        <p className="login-note muted">
          Prototype sign-in stores your session locally in this browser.
        </p>
      </div>
    </div>
  );
};
