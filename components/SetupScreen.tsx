'use client'
import { useState } from 'react'

interface Props {
  onComplete: () => void
}

export default function SetupScreen({ onComplete }: Props) {
  const [form, setForm] = useState({
    apiKey: '', authDomain: '', databaseURL: '', projectId: '',
    storageBucket: '', messagingSenderId: '', appId: '', vapidKey: '',
  })
  const [warn, setWarn] = useState('')

  const fields = [
    { key: 'apiKey', label: 'apiKey' },
    { key: 'authDomain', label: 'authDomain' },
    { key: 'databaseURL', label: 'databaseURL' },
    { key: 'projectId', label: 'projectId' },
    { key: 'storageBucket', label: 'storageBucket' },
    { key: 'messagingSenderId', label: 'messagingSenderId' },
    { key: 'appId', label: 'appId' },
    { key: 'vapidKey', label: 'VAPID key (push notifications — optional)' },
  ] as const

  function saveConfig() {
    const required = fields.slice(0, 7)
    for (const f of required) {
      if (!form[f.key].trim()) { setWarn(`Fill in: ${f.key}`); return }
    }
    const cfg = {
      apiKey: form.apiKey, authDomain: form.authDomain,
      databaseURL: form.databaseURL, projectId: form.projectId,
      storageBucket: form.storageBucket, messagingSenderId: form.messagingSenderId,
      appId: form.appId, vapidKey: form.vapidKey,
    }
    localStorage.setItem('cipher_cfg', JSON.stringify(cfg))
    onComplete()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'var(--bg)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', overflowY: 'auto',
    }}>
      <div style={{
        width: '100%', maxWidth: 500,
        background: 'var(--glass)', border: '1px solid var(--border2)',
        borderRadius: 'var(--r3)', padding: '32px',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{
          fontSize: 28, fontWeight: 900,
          background: 'linear-gradient(135deg,var(--ac),var(--ac2))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text', marginBottom: 4,
        }}>⚡ Cipher</div>
        <div style={{ fontSize: 12, color: 'var(--tx3)', marginBottom: 28, fontFamily: 'var(--mono)' }}>
          // owner setup — do this once
        </div>

        {warn && (
          <div style={{
            background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.2)',
            borderRadius: 'var(--r)', padding: '10px 14px',
            fontSize: 12, color: '#fb7185', marginBottom: 12,
          }}>{warn}</div>
        )}

        <SetupSection label="How it works" accent>
          <p style={{ fontSize: 12, color: 'var(--tx)', lineHeight: 1.8 }}>
            Fill in Firebase keys → save → everyone else just signs in with Google.{' '}
            <strong style={{ color: 'var(--ac)' }}>Zero setup for end users.</strong>
          </p>
        </SetupSection>

        <SetupSection label="Step 01 — Firebase Project">
          <p style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.8 }}>
            Go to <code style={codeStyle}>console.firebase.google.com</code> → Add project →
            Enable Auth (Google), Realtime Database, Storage → Add authorized domain.
          </p>
        </SetupSection>

        <SetupSection label="Step 02 — Config Keys">
          <p style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.8, marginBottom: 12 }}>
            Project settings → Your apps → Web app → Copy values below
          </p>
          {fields.map(f => (
            <input
              key={f.key}
              className="field-input"
              placeholder={f.label}
              value={form[f.key]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
            />
          ))}
        </SetupSection>

        <SetupSection label="Step 03 — Rules">
          <p style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.8 }}>
            DB Rules: <code style={codeStyle}>{`{"rules":{".read":"auth!=null",".write":"auth!=null"}}`}</code><br />
            Storage: <code style={codeStyle}>allow read, write: if request.auth != null;</code>
          </p>
        </SetupSection>

        <button className="btn-primary" onClick={saveConfig} style={{ marginTop: 4 }}>
          ⚡ Save Config &amp; Continue
        </button>
        <div style={{ fontSize: 11, color: 'var(--tx3)', textAlign: 'center', marginTop: 8, fontFamily: 'var(--mono)' }}>
          Keys are stored locally — never sent anywhere
        </div>
      </div>
    </div>
  )
}

function SetupSection({ label, children, accent }: {
  label: string; children: React.ReactNode; accent?: boolean
}) {
  return (
    <div style={{
      background: accent ? 'rgba(99,102,241,.06)' : 'var(--glass)',
      border: `1px solid ${accent ? 'rgba(99,102,241,.2)' : 'var(--border)'}`,
      borderRadius: 'var(--r2)', padding: 16, marginBottom: 12,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: 'var(--ac)',
        letterSpacing: '1.5px', textTransform: 'uppercase',
        marginBottom: 10, fontFamily: 'var(--mono)',
      }}>{label}</div>
      {children}
    </div>
  )
}

const codeStyle: React.CSSProperties = {
  background: 'var(--glass2)', padding: '2px 7px',
  borderRadius: 6, color: 'var(--ac2)',
  fontFamily: 'var(--mono)', fontSize: 11,
}
