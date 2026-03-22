'use client'
import { useState } from 'react'

// ── NEW CHAT PANEL ────────────────────────────────────────────
interface NewChatProps { open: boolean; onClose: () => void; onStart: (email: string) => void }

export function NewChatPanel({ open, onClose, onStart }: NewChatProps) {
  const [email, setEmail] = useState('')
  return (
    <div className={`panel-overlay${open ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="panel-box">
        <div className="panel-title">
          New Chat
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--tx3)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <input
          className="field-input"
          placeholder="Enter email address…"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { onStart(email); setEmail(''); onClose() } }}
        />
        <button className="btn-primary" onClick={() => { onStart(email); setEmail(''); onClose() }}>
          Start Chat
        </button>
      </div>
    </div>
  )
}

// ── NEW GROUP PANEL ───────────────────────────────────────────
interface NewGroupProps { open: boolean; onClose: () => void; onCreate: (name: string, emails: string[]) => void }

export function NewGroupPanel({ open, onClose, onCreate }: NewGroupProps) {
  const [groupName, setGroupName] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [members, setMembers] = useState<string[]>([])

  function addMember() {
    const e = memberEmail.trim().toLowerCase()
    if (e && !members.includes(e)) { setMembers(m => [...m, e]); setMemberEmail('') }
  }

  function handleCreate() {
    if (!groupName.trim() || members.length < 1) return
    onCreate(groupName.trim(), members)
    setGroupName(''); setMembers([]); onClose()
  }

  return (
    <div className={`panel-overlay${open ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="panel-box">
        <div className="panel-title">
          New Group
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--tx3)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <input className="field-input" placeholder="Group name…" value={groupName} onChange={e => setGroupName(e.target.value)} />

        {/* Member tags */}
        {members.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {members.map(m => (
              <div key={m} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--ac-glow)', border: '1px solid var(--ac)',
                borderRadius: 20, padding: '3px 10px', fontSize: 12,
              }}>
                {m}
                <button onClick={() => setMembers(ms => ms.filter(x => x !== m))}
                  style={{ background: 'none', border: 'none', color: 'var(--tx3)', cursor: 'pointer', fontSize: 12 }}>✕</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            className="field-input"
            placeholder="Add member by email…"
            value={memberEmail}
            style={{ flex: 1, marginBottom: 0 }}
            onChange={e => setMemberEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addMember() }}
          />
          <button className="icon-btn" onClick={addMember} style={{ width: 42, height: 42 }}>＋</button>
        </div>

        <button className="btn-primary" onClick={handleCreate} disabled={!groupName.trim() || members.length < 1}>
          Create Group
        </button>
      </div>
    </div>
  )
}

// ── BOOKMARKS PANEL ───────────────────────────────────────────
interface BookmarksProps { open: boolean; onClose: () => void; bookmarks: Array<{ id: string; text: string; senderName: string; ts: number }> }

export function BookmarksPanel({ open, onClose, bookmarks }: BookmarksProps) {
  return (
    <div className={`panel-overlay${open ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="panel-box">
        <div className="panel-title">
          Bookmarks
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--tx3)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        {bookmarks.length === 0
          ? <div style={{ textAlign: 'center', color: 'var(--tx3)', padding: '32px', fontFamily: 'var(--mono)', fontSize: 12 }}>
              No bookmarked messages yet.<br />Long press a message and tap ⭐ Star.
            </div>
          : bookmarks.map(bm => (
            <div key={bm.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--tx)' }}>{bm.text}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--tx3)', marginTop: 3 }}>
                  {bm.senderName} · {new Date(bm.ts).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}
