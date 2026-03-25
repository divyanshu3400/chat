// 'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import s from './AuthScreen.module.css';
import { useAuthStore } from '../store/auth.store';
import { Backpack, Check, Eye, EyeOff, LockIcon, LucideMailWarning, Mail, Phone, Shield, SkipBack, User } from 'lucide-react';
import { useScreen } from '../lib/ui';

type MfaMethod = 'totp' | 'email';

function getStrength(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
}

const STRENGTH_CLASSES = ['', s.strengthWeak, s.strengthFair, s.strengthGood, s.strengthStrong];

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.8 2.5 30.3 0 24 0 14.8 0 6.9 5.4 3 13.3l7.8 6C12.7 13.2 17.9 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.6 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.2-10.1 7.2-17z" />
      <path fill="#FBBC05" d="M10.8 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6L2.5 13.4A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.5 10.7l8.3-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.1 0-11.3-3.7-13.2-9L2.5 35.7C6.4 43.3 14.6 48 24 48z" />
    </svg>
  );
}


export default function AuthScreen() {
  const {
    initialized,
    status,
    user,
    error,
    otpCooldown,
    initialize,
    clearError,
    clearMfa,
    loginWithPassword,
    loginWithGoogle,
    register,
    logout,
    requestPasswordReset,
    requestEmailOtp,
    verifyEmailOtp,
  } = useAuthStore(
    useShallow((state) => ({
      initialized: state.initialized,
      status: state.status,
      user: state.user,
      error: state.error,
      otpCooldown: state.otpCooldown,
      initialize: state.initialize,
      clearError: state.clearError,
      clearMfa: state.clearMfa,
      loginWithPassword: state.loginWithPassword,
      loginWithGoogle: state.loginWithGoogle,
      register: state.register,
      logout: state.logout,
      requestPasswordReset: state.requestPasswordReset,
      requestEmailOtp: state.requestEmailOtp,
      verifyEmailOtp: state.verifyEmailOtp,
    })),
  );
  const { screen, setScreen } = useScreen();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [mfaMethod, setMfaMethod] = useState<MfaMethod>('totp');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!initialized) return;
    if (status === 'mfa_required') {
      setScreen('mfa');
    }
    if (status === 'authenticated') {
      clearMfa();
    }
  }, [initialized, status, clearMfa]);

  const isBusy = status === 'loading' || status === 'initializing';
  const otherAccount = user?.email ?? user?.name ?? null;
  const isLogin = activeTab === 'login';
  const pwStrength = getStrength(password);

  const canSubmitOtp = useMemo(() => otp.join('').length === 6, [otp]);

  const resetOtp = useCallback(() => {
    setOtp(['', '', '', '', '', '']);
    otpRefs.current[0]?.focus();
  }, []);

  const handleEmailLogin = useCallback(async () => {
    if (!email.trim() || !password) {
      clearError();
      return;
    }

    try {
      await loginWithPassword({
        identity: email.trim(),
        password,
      });
    } catch {
      // state already handled in store
    }
  }, [clearError, email, loginWithPassword, password]);

  const handleRegister = useCallback(async () => {
    if (!name.trim() || !email.trim() || password.length < 8 || password !== confirmPw) {
      return;
    }

    try {
      await register({
        name: name.trim(),
        username: email.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
        passwordConfirm: confirmPw,
      });
    } catch {
      // store handles error
    }
  }, [confirmPw, email, name, password, register]);

  const handleForgotPassword = useCallback(async () => {
    if (!email.trim()) return;

    try {
      await requestPasswordReset(email.trim());
      setScreen('forgot-success');
    } catch {
      // store handles error
    }
  }, [email, requestPasswordReset]);

  const handleSendEmailOtp = useCallback(async () => {
    if (!email.trim()) return;

    try {
      await requestEmailOtp(email.trim());
    } catch {
      // store handles error
    }
  }, [email, requestEmailOtp]);

  const handleMfaVerify = useCallback(async () => {
    const code = otp.join('');
    if (code.length < 6) return;

    try {
      await verifyEmailOtp(code);
      resetOtp();
    } catch {
      resetOtp();
    }
  }, [otp, resetOtp, verifyEmailOtp]);

  const handleOtpChange = useCallback((index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    setOtp((current) => {
      const next = [...current];
      next[index] = value.slice(-1);
      return next;
    });

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleOtpKeyDown = useCallback(
    (index: number, event: React.KeyboardEvent) => {
      if (event.key === 'Backspace' && !otp[index] && index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    },
    [otp],
  );
  return (
    <div className={s.root}>
      {/* Left side - Branding (hidden on mobile) */}
      <div className={s.brandingSide}>
        <div className={s.brandingVignette} />

        <div className={s.brandingContent}>
          <div className={s.brandingLogoWrap}>
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className={s.pulseRing}
                style={{
                  inset: -(index + 1) * 16,
                  animationDelay: `${index * 0.6}s`,
                  animationDuration: `${2.2 + index * 0.8}s`,
                }}
              />
            ))}
            <img
              src="/icon-192.svg"
              alt="Logo"
              width={72}
              height={72}
              className={s.logoIcon}
            />
          </div>

          <div className={s.brandingText}>
            <h1 className={s.brandingTitle}>Cipher</h1>
            <p className={s.brandingSubtitle}>The AI-era messenger</p>
            <p className={s.brandingDescription}>
              Experience secure, end-to-end encrypted communication powered by advanced AI.
              Your conversations, your privacy, your control.
            </p>
          </div>

          <div className={s.brandingFeatures}>
            <div className={s.featureItem}>
              <div className={s.featureIcon}>
                <Shield />
              </div>
              <div className={s.featureText}>
                <p className={s.featureName}>End-to-End Encrypted</p>
                <p className={s.featureDesc}>Military-grade encryption on every message</p>
              </div>
            </div>

            <div className={s.featureItem}>
              <div className={s.featureIcon}>
                <Mail />
              </div>
              <div className={s.featureText}>
                <p className={s.featureName}>AI-Powered</p>
                <p className={s.featureDesc}>Intelligent assistance meets privacy</p>
              </div>
            </div>

            <div className={s.featureItem}>
              <div className={s.featureIcon}>
                <Phone />
              </div>
              <div className={s.featureText}>
                <p className={s.featureName}>Cross-Platform</p>
                <p className={s.featureDesc}>Seamless sync across all your devices</p>
              </div>
            </div>
          </div>

          <div className={s.brandingFooter}>
            <p className={s.brandingFooterText}>
              Join thousands using Cipher for secure communication
            </p>
          </div>
        </div>

        <div className={s.brandingDecoration}>
          <svg className={s.decorSvg} viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="grad1" cx="40%" cy="40%">
                <stop offset="0%" stopColor="rgba(99, 102, 241, 0.2)" />
                <stop offset="100%" stopColor="rgba(6, 182, 212, 0.05)" />
              </radialGradient>
              <filter id="blur">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
              </filter>
            </defs>
            <circle cx="200" cy="200" r="150" fill="url(#grad1)" filter="url(#blur)" />
            <circle cx="100" cy="120" r="80" fill="rgba(99, 102, 241, 0.08)" opacity="0.5" />
            <circle cx="300" cy="280" r="100" fill="rgba(6, 182, 212, 0.08)" opacity="0.4" />
            <path d="M 100 200 Q 200 150 300 200 T 400 200" stroke="rgba(99, 102, 241, 0.15)" strokeWidth="2" fill="none" />
          </svg>
        </div>
      </div>

      {/* Right side - Form */}
      <div className={s.formSide}>
        <div className={s.formContainer}>
          <div className={s.mobileLogoWrap}>
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className={s.pulseRing}
                style={{
                  inset: -(index + 1) * 16,
                  animationDelay: `${index * 0.6}s`,
                  animationDuration: `${2.2 + index * 0.8}s`,
                }}
              />
            ))}

            {/* The Logo */}
            <img
              src="/icon-192.svg"
              alt="Logo"
              width={72}
              height={72}
              className={s.logoIcon}
            />
          </div>

          <div className={s.mobileTagline}>
            <span className={s.mobileWordmark}>Cipher</span>
            <span className={s.mobileSubtext}>Secure & private</span>
          </div>

          <div className={s.card}>
            {screen === 'mfa' && (
              <div className={s.mfaPanel}>
                <button className={s.backBtn} onClick={() => setScreen('landing')}>
                  <SkipBack /> Back
                </button>
                <p className={s.mfaTitle}>Two-factor verification</p>
                <p className={s.mfaSubtitle}>Choose how you want to verify your identity</p>

                <div className={s.mfaOptions}>
                  <button
                    className={`${s.mfaOption} ${mfaMethod === 'totp' ? s.mfaOptionActive : ''}`}
                    onClick={() => setMfaMethod('totp')}
                  >
                    <div className={s.mfaOptionIcon}><Phone /></div>
                    Authenticator app
                  </button>
                  <button
                    className={`${s.mfaOption} ${mfaMethod === 'email' ? s.mfaOptionActive : ''}`}
                    onClick={() => {
                      setMfaMethod('email');
                      if (otpCooldown === 0) void handleSendEmailOtp();
                    }}
                  >
                    <div className={s.mfaOptionIcon}><Mail /></div>
                    Email OTP
                  </button>
                </div>

                {error && <div className={s.errorBox}>{error}</div>}

                <div className={s.otpRow}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        otpRefs.current[index] = element;
                      }}
                      className={s.otpBox}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(event) => handleOtpChange(index, event.target.value)}
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      autoFocus={index === 0}
                    />
                  ))}
                </div>

                {mfaMethod === 'email' && (
                  <div className={s.otpResend}>
                    {otpCooldown > 0 ? (
                      `Resend in ${otpCooldown}s`
                    ) : (
                      <button className={s.otpResendBtn} onClick={() => void handleSendEmailOtp()}>
                        Resend code
                      </button>
                    )}
                  </div>
                )}

                <button
                  className={s.btnPrimary}
                  onClick={() => void handleMfaVerify()}
                  disabled={isBusy || !canSubmitOtp}
                >
                  {isBusy ? <div className={s.spinner} /> : <><Shield /> Verify &amp; sign in</>}
                </button>
              </div>
            )}

            {screen === 'forgot-success' && (
              <div className={s.successBox}>
                <div className={s.successIcon}><Check /></div>
                <p className={s.successTitle}>Check your inbox</p>
                <p className={s.successSub}>
                  Password reset link sent to
                  <br />
                  <strong style={{ color: '#f1f5f9' }}>{email}</strong>
                </p>
                <button
                  className={s.btnPrimary}
                  style={{ marginTop: 16 }}
                  onClick={() => {
                    setScreen('landing');
                    setActiveTab('login');
                  }}
                >
                  Back to sign in
                </button>
              </div>
            )}

            {screen === 'forgot' && (
              <>
                <button className={s.backBtn} onClick={() => setScreen('landing')}>
                  <Backpack /> Back
                </button>
                <div className={s.cardHeader}>
                  <h2 className={s.cardTitle}>Reset password</h2>
                  <p className={s.cardSubtitle}>We'll send a reset link to your email</p>
                </div>
                {error && <div className={s.errorBox}>{error}</div>}
                <div className={s.fieldGroup}>
                  <div className={s.fieldWrap}>
                    <span className={s.fieldIcon}><Mail /></span>
                    <input
                      className={s.field}
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') void handleForgotPassword();
                      }}
                    />
                  </div>
                </div>
                <button className={s.btnPrimary} onClick={() => void handleForgotPassword()} disabled={isBusy}>
                  {isBusy ? <div className={s.spinner} /> : 'Send reset link'}
                </button>
              </>
            )}

            {screen === 'auth' && (
              <>
                {otherAccount && status === 'authenticated' && (
                  <div className={s.securityBanner}>
                    <span className={s.securityBannerIcon}><LucideMailWarning /></span>
                    <div className={s.securityBannerText}>
                      <strong style={{ color: 'rgba(245,158,11,.9)' }}>{otherAccount}</strong> is already signed in on this browser.
                      <button className={s.securityBannerAction} onClick={logout}>
                        Sign out existing account first →
                      </button>
                    </div>
                  </div>
                )}

                <div className={s.tabs}>
                  <button
                    className={`${s.tab} ${activeTab === 'login' ? s.tabActive : ''}`}
                    onClick={() => {
                      setActiveTab('login');
                      clearError();
                    }}
                  >
                    Sign in
                  </button>
                  <button
                    className={`${s.tab} ${activeTab === 'register' ? s.tabActive : ''}`}
                    onClick={() => {
                      setActiveTab('register');
                      clearError();
                    }}
                  >
                    Create account
                  </button>
                </div>

                <div className={s.cardHeader}>
                  <h2 className={s.cardTitle}>{isLogin ? 'Welcome back' : 'Cipher'}</h2>
                  <p className={s.cardSubtitle}>
                    {isLogin
                      ? 'Sign in to your encrypted workspace'
                      : 'Create your end-to-end encrypted account'}
                  </p>
                </div>

                {error && <div className={s.errorBox}>{error}</div>}

                <div className={s.fieldGroup}>
                  {!isLogin && (
                    <div className={s.fieldWrap}>
                      <span className={s.fieldIcon}><User /></span>
                      <input
                        className={s.field}
                        type="text"
                        placeholder="Full name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                      />
                    </div>
                  )}

                  <div className={s.fieldWrap}>
                    <span className={s.fieldIcon}><Mail /></span>
                    <input
                      className={s.field}
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>

                  <div>
                    <div className={s.fieldWrap}>
                      <span className={s.fieldIcon}><LockIcon /></span>
                      <input
                        className={s.field}
                        type={showPw ? 'text' : 'password'}
                        placeholder="Password"
                        value={password}
                        style={{ paddingRight: 42 }}
                        onChange={(event) => setPassword(event.target.value)}
                        onKeyDown={(event) => {
                          if (isLogin && event.key === 'Enter') void handleEmailLogin();
                        }}
                      />
                      <button className={s.fieldSuffix} onClick={() => setShowPw((value) => !value)} tabIndex={-1}>
                        {showPw ? <EyeOff /> : <Eye />}
                      </button>
                    </div>

                    {!isLogin && password && (
                      <div className={s.strengthWrap}>
                        {[1, 2, 3, 4].map((index) => (
                          <div
                            key={index}
                            className={`${s.strengthBar} ${index <= pwStrength ? STRENGTH_CLASSES[pwStrength] : ''}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {!isLogin && (
                    <div className={s.fieldWrap}>
                      <span className={s.fieldIcon}><LockIcon /></span>
                      <input
                        className={`${s.field} ${confirmPw && confirmPw !== password ? s.fieldError : ''}`}
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Confirm password"
                        value={confirmPw}
                        style={{ paddingRight: 42 }}
                        onChange={(event) => setConfirmPw(event.target.value)}
                      />
                      <button className={s.fieldSuffix} onClick={() => setShowConfirm((value) => !value)} tabIndex={-1}>
                        {showConfirm ? <EyeOff /> : <Eye />}
                      </button>
                    </div>
                  )}
                </div>

                {isLogin && (
                  <div className={s.forgotWrap}>
                    <button
                      className={s.forgotLink}
                      onClick={() => {
                        setScreen('forgot');
                        clearError();
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <button
                  className={s.btnPrimary}
                  onClick={() => void (isLogin ? handleEmailLogin() : handleRegister())}
                  disabled={isBusy}
                >
                  {isBusy ? <div className={s.spinner} /> : isLogin ? 'Sign in' : 'Create account'}
                </button>

                <div className={s.divider}>
                  <div className={s.dividerLine} />
                  <span className={s.dividerText}>or</span>
                  <div className={s.dividerLine} />
                </div>

                <button
                  className={s.btnGoogle}
                  onClick={() => void loginWithGoogle()}
                  disabled={isBusy}
                >
                  {isBusy ? <div className={s.spinner} /> : <><GoogleIcon /> Continue with Google</>}
                </button>

                <div className={s.e2eBadge}>
                  <Shield />
                  <span>End-to-end encrypted · Zero knowledge</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}