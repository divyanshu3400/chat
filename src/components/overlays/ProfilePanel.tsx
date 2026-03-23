'use client'
import { useRef, useState, useEffect } from 'react'
import { useStore } from '@/src/lib/store'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (name: string, status: string) => void
  onAvatarChange: (file: File) => void
}

const STATUS_PRESETS = ['🟢 Available', '🔴 Busy', '🟡 Away', '📵 DND', '💻 Coding', '🎧 In a call']

export default function ProfilePanel({ open, onClose, onSave, onAvatarChange }: Props) {
  const { me } = useStore()
  const [name, setName] = useState(me?.displayName ?? '')
  const [status, setStatus] = useState(me?.status ?? 'Available')
  const [activePreset, setActivePreset] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (me) { setName(me.displayName); setStatus(me.status ?? 'Available') } }, [me])

  return (
    <div className={`panel-overlay${open ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="panel-box">
        <div className="panel-title">
          My Profile
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--tx3)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
            {me?.photoURL
              ? <img src={me.photoURL} alt="" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--ac)', boxShadow: '0 0 0 4px var(--ac-glow)' }} />
              : <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--glass2)', border: '3px solid var(--ac)', boxShadow: '0 0 0 4px var(--ac-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800 }}>
                  {(me?.displayName ?? '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                </div>
            }
            <div style={{ position: 'absolute', bottom: 2, right: 2, width: 24, height: 24, borderRadius: '50%', background: 'var(--ac)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, border: '2px solid var(--bg)' }}>✏️</div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{me?.displayName}</div>
          <div style={{ fontSize: 12, color: 'var(--tx3)', fontFamily: 'var(--mono)' }}>{me?.email}</div>
        </div>

        {/* Display name */}
        <div style={{ marginBottom: 14 }}>
          <Label>Display Name</Label>
          <input className="field-input" placeholder="Your name…" value={name} onChange={e => setName(e.target.value)} style={{ marginBottom: 0 }} />
        </div>

        {/* Status */}
        <div style={{ marginBottom: 14 }}>
          <Label>Status</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {STATUS_PRESETS.map(s => (
              <button
                key={s}
                onClick={() => { setStatus(s); setActivePreset(s) }}
                style={{
                  padding: '5px 11px', borderRadius: 20, cursor: 'pointer', fontSize: 12, transition: 'all .2s',
                  border: `1px solid ${activePreset === s ? 'var(--ac)' : 'var(--border)'}`,
                  background: activePreset === s ? 'var(--ac-glow)' : 'var(--glass)',
                  color: 'var(--tx)',
                }}
              >{s}</button>
            ))}
          </div>
          <input className="field-input" placeholder="Custom status…" value={status} onChange={e => { setStatus(e.target.value); setActivePreset('') }} style={{ marginBottom: 0 }} />
        </div>

        <button className="btn-primary" onClick={() => { onSave(name, status); onClose() }}>
          Save Profile
        </button>

        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onAvatarChange(f); e.target.value = '' }} />
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'var(--mono)' }}>
      {children}
    </div>
  )
}
