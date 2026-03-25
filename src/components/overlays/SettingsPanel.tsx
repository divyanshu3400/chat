'use client'
import { useState } from 'react'
import { useStore } from '@/src/store/store'
import { Prefs, UserPreferencesRecord } from '@/src/types/pb-collections.types'

interface Props {
  open: boolean
  onClose: () => void
  onSignOut: () => void
}

export default function SettingsPanel({ open, onClose, onSignOut }: Props) {
  const { prefs, setPrefs } = useStore()
  const [signingOut, setSigningOut] = useState(false)
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)

  /* ── Logout handler ── */
  async function handleSignOut() {
    setSigningOut(true)
    try {
      onSignOut()
    } catch {
      setSigningOut(false)
      setShowSignOutConfirm(false)
    }
  }

  function Toggle({ k, label, desc, icon }: { k: keyof Prefs; label: string; desc: string; icon: string }) {
    const on = prefs[k] as boolean
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', borderRadius: 10,
        background: on ? 'var(--ac-tint)' : 'transparent',
        transition: 'background .2s',
        cursor: 'pointer',
      }}
        onClick={() => setPrefs({ [k]: !on } as Partial<Prefs>)}
      >
        <span style={{ fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx1)', lineHeight: 1.3 }}>{label}</div>
          <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
        </div>
        {/* Toggle pill */}
        <div style={{
          width: 38, height: 22, borderRadius: 11, flexShrink: 0,
          background: on ? 'var(--ac)' : 'var(--border)',
          position: 'relative', transition: 'background .22s',
        }}>
          <div style={{
            position: 'absolute', top: 3, left: on ? 19 : 3,
            width: 16, height: 16, borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,.25)',
            transition: 'left .22s cubic-bezier(.4,0,.2,1)',
          }} />
        </div>
      </div>
    )
  }

  const accents: Array<{ key: UserPreferencesRecord['accent']; color: string; label: string }> = [
    { key: 'indigo', color: '#6366f1', label: 'Indigo' },
    { key: 'violet', color: '#8b5cf6', label: 'Violet' },
    { key: 'rose', color: '#f43f5e', label: 'Rose' },
    { key: 'cyan', color: '#06b6d4', label: 'Cyan' },
    { key: 'amber', color: '#f59e0b', label: 'Amber' },
    { key: 'emerald', color: '#10b981', label: 'Emerald' },
  ]

  const themes: Array<{ key: UserPreferencesRecord['theme']; label: string; icon: string }> = [
    { key: 'light', label: 'Light', icon: '☀️' },
    { key: 'dark', label: 'Dark', icon: '🌙' },
    { key: 'system', label: 'System', icon: '💻' },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,.45)',
          backdropFilter: 'blur(4px)',
          zIndex: 200,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity .25s',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(360px, 100vw)',
        background: 'var(--bg)',
        borderLeft: '1px solid var(--border)',
        zIndex: 201,
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .3s cubic-bezier(.4,0,.2,1)',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px 14px',
          borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0,
          background: 'var(--bg)',
          zIndex: 1,
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx1)', letterSpacing: '-.3px' }}>
            Settings
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'var(--bg2)', border: 'none',
              color: 'var(--tx2)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, transition: 'background .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg2)')}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Theme */}
          <Section label="Theme">
            <div style={{ display: 'flex', gap: 8 }}>
              {themes.map(t => (
                <button
                  key={t.key}
                  onClick={() => setPrefs({ theme: t.key })}
                  style={{
                    flex: 1, padding: '8px 4px', borderRadius: 10,
                    border: `1.5px solid ${prefs.theme === t.key ? 'var(--ac)' : 'var(--border)'}`,
                    background: prefs.theme === t.key ? 'var(--ac-tint)' : 'var(--bg2)',
                    color: prefs.theme === t.key ? 'var(--ac)' : 'var(--tx2)',
                    cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    transition: 'all .18s',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Accent */}
          <Section label="Accent Color">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {accents.map(a => (
                <button
                  key={a.key}
                  onClick={() => setPrefs({ accent: a.key })}
                  title={a.label}
                  style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: a.color, cursor: 'pointer', border: 'none',
                    outline: prefs.accent === a.key ? `3px solid ${a.color}` : '3px solid transparent',
                    outlineOffset: 2,
                    transform: prefs.accent === a.key ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all .18s',
                    position: 'relative',
                  }}
                >
                  {prefs.accent === a.key && (
                    <span style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 13, fontWeight: 700,
                    }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </Section>

          {/* Notifications */}
          <Section label="Notifications">
            <Toggle k="sound" label="Sound effects" desc="Play sound for new messages" icon="🔔" />
            <Toggle k="push" label="Push notifications" desc="Get notified when app is closed" icon="📱" />
          </Section>

          {/* Chat */}
          <Section label="Chat">
            <Toggle k="enterSend" label="Enter to send" desc="Shift+Enter for new line" icon="⏎" />
            <Toggle k="readReceipts" label="Read receipts" desc="Show when you've read messages" icon="👁" />
            <Toggle k="aiSuggest" label="AI suggestions" desc="Show AI command hints while typing" icon="✨" />
          </Section>

          {/* Account */}
          <Section label="Account">
            <button
              onClick={() => setShowSignOutConfirm(true)}
              style={{
                width: '100%', padding: '11px 14px',
                borderRadius: 10, border: '1.5px solid var(--border)',
                background: 'transparent',
                color: '#ef4444',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all .18s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#fef2f2'
                e.currentTarget.style.borderColor = '#ef4444'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'var(--border)'
              }}
            >
              <span style={{ fontSize: 15 }}>🚪</span>
              Sign out
            </button>
          </Section>

        </div>
      </div>

      {/* Sign out confirm dialog */}
      {showSignOutConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}>
          <div
            onClick={() => !signingOut && setShowSignOutConfirm(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(6px)' }}
          />
          <div style={{
            position: 'relative', zIndex: 1,
            background: 'var(--bg)',
            borderRadius: 16, padding: '28px 24px',
            width: 'min(320px, 100%)',
            border: '1px solid var(--border)',
            boxShadow: '0 20px 60px rgba(0,0,0,.3)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx1)', marginBottom: 6 }}>
              Sign out?
            </div>
            <div style={{ fontSize: 13, color: 'var(--tx3)', marginBottom: 24, lineHeight: 1.5 }}>
              You'll be logged out of your account on this device.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowSignOutConfirm(false)}
                disabled={signingOut}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  border: '1.5px solid var(--border)',
                  background: 'var(--bg2)', color: 'var(--tx2)',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  opacity: signingOut ? .5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  border: 'none',
                  background: '#ef4444', color: '#fff',
                  cursor: signingOut ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: 600,
                  opacity: signingOut ? .7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'opacity .15s',
                }}
              >
                {signingOut ? (
                  <>
                    <span style={{
                      width: 13, height: 13, border: '2px solid rgba(255,255,255,.4)',
                      borderTopColor: '#fff', borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin .7s linear infinite',
                    }} />
                    Signing out…
                  </>
                ) : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 700, color: 'var(--tx3)',
        letterSpacing: '1.2px', textTransform: 'uppercase',
        marginBottom: 8, paddingLeft: 4,
      }}>
        {label}
      </div>
      <div style={{
        background: 'var(--bg2)', borderRadius: 12,
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  )
}
