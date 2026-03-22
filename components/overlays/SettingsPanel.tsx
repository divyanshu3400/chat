'use client'
import { useStore } from '@/lib/store'
import type { Prefs } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onSignOut: () => void
}

export default function SettingsPanel({ open, onClose, onSignOut }: Props) {
  const { prefs, setPrefs } = useStore()

  function Toggle({ k, label, desc }: { k: keyof Prefs; label: string; desc: string }) {
    const on = prefs[k] as boolean
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
          <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>{desc}</div>
        </div>
        <button
          className={`toggle ${on ? 'on' : 'off'}`}
          onClick={() => setPrefs({ [k]: !on } as Partial<Prefs>)}
        />
      </div>
    )
  }

  const accents: Array<{ key: Prefs['accent']; color: string }> = [
    { key: 'indigo',  color: '#6366f1' },
    { key: 'violet',  color: '#8b5cf6' },
    { key: 'rose',    color: '#f43f5e' },
    { key: 'cyan',    color: '#06b6d4' },
    { key: 'amber',   color: '#f59e0b' },
    { key: 'emerald', color: '#10b981' },
  ]

  return (
    <div className={`panel-overlay${open ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="panel-box">
        <div className="panel-title">
          Settings
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--tx3)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* Appearance */}
        <Section label="Appearance">
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'var(--mono)' }}>
            Accent Color
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {accents.map(a => (
              <button
                key={a.key}
                onClick={() => setPrefs({ accent: a.key })}
                style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: a.color, cursor: 'pointer',
                  border: prefs.accent === a.key ? '2px solid #fff' : '2px solid transparent',
                  transform: prefs.accent === a.key ? 'scale(1.2)' : 'scale(1)',
                  transition: 'all .2s',
                }}
                title={a.key}
              />
            ))}
          </div>
        </Section>

        {/* Notifications */}
        <Section label="Notifications">
          <Toggle k="sound" label="Sound" desc="Play sound for new messages" />
          <Toggle k="push" label="Push Notifications" desc="Get notified when app is closed" />
        </Section>

        {/* Chat */}
        <Section label="Chat">
          <Toggle k="enterSend" label="Enter to send" desc="Shift+Enter for newline" />
          <Toggle k="aiSuggest" label="AI Suggestions" desc="Show /ai command hints while typing" />
          <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <Toggle k="readReceipts" label="Read Receipts" desc="Show when you've read messages" />
          </div>
        </Section>

        {/* Account */}
        <Section label="Account">
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', cursor: 'pointer' }}
            onClick={onSignOut}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ac3)' }}>Sign Out</div>
            <span style={{ color: 'var(--tx3)' }}>→</span>
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx3)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'var(--mono)' }}>
        {label}
      </div>
      {children}
    </div>
  )
}
