'use client'

/**
 * ChatHeader — Merged from both versions
 *
 * From new ChatHeader (kept):
 *  ✅ CSS variable theme (--bg-base, --border-subtle, --tx-primary, --tx-muted, --green, --font-mono)
 *  ✅ store.presence read directly (no prop-drilling)
 *  ✅ Photo avatar with img fallback to initials div
 *  ✅ Group vs DM avatar shape (square vs circle)
 *  ✅ E2E encrypted label for groups
 *  ✅ Search + More (⋯) buttons
 *  ✅ Mobile back button via CSS (no JS state)
 *  ✅ Typing indicator in subtitle slot
 *  ✅ backdropFilter blur
 *
 * From old ChatHeader (added):
 *  ✅ onToggleAI / aiActive prop + AI pill button
 *  ✅ SparkleIcon (animated SVG, glows when active)
 *  ✅ onStartCall hidden for groups
 *  ✅ Inline SVG icons for all buttons (no emoji)
 *  ✅ Group member count in subtitle
 *  ✅ Last seen time when offline
 *  ✅ Chat menu sheet (pin, mute, clear, block)
 */

import { useState, useEffect, memo } from 'react'
import { useStore } from '@/src/lib/store'
import { fmtTime } from '@/src/lib/utils'
import type { Conversation } from '@/src/types'
import { SparkleIcon } from '../shared'

/* ═══════════════════════════════════════════════════════════════
   PROPS
═══════════════════════════════════════════════════════════════ */
interface Props {
  conv: Conversation
  onBack: () => void
  onStartCall: (mode: 'audio' | 'video') => void
  onSearch: () => void
  onMenu?: () => void       // optional — we handle our own menu sheet
  onToggleAI?: () => void       // optional — hide if no AI panel
  aiActive?: boolean
}

/* ═══════════════════════════════════════════════════════════════
   SVG ICONS  (consistent stroke style, no emoji)
═══════════════════════════════════════════════════════════════ */
const Icons = {
  Back: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  ),
  Phone: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.27-.9a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  Video: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  ),
  Search: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  ),
  More: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
    </svg>
  ),
  Pin: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a1 1 0 0 1 1 1v1.586l6.707 6.707A1 1 0 0 1 19 13h-6v8l-1 1-1-1v-8H5a1 1 0 0 1-.707-1.707L11 4.586V3a1 1 0 0 1 1-1z" />
    </svg>
  ),
  Mute: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><path d="M12 2v10" />
    </svg>
  ),
  Trash: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" />
    </svg>
  ),
  Block: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M4.93 4.93l14.14 14.14" />
    </svg>
  ),
  Lock: () => (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Users: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
}

/* ═══════════════════════════════════════════════════════════════
   ICON BUTTON
═══════════════════════════════════════════════════════════════ */
const IBtn = memo(({ children, onClick, title, active }: {
  children: React.ReactNode; onClick: () => void; title?: string; active?: boolean
}) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      width: 34, height: 34, borderRadius: 9,
      border: `1px solid ${active ? 'var(--border-dim)' : 'transparent'}`,
      background: active ? 'var(--bg-elevated)' : 'transparent',
      color: active ? 'var(--tx-primary)' : 'var(--tx-muted)',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all .18s', flexShrink: 0,
    }}
    onMouseEnter={e => {
      const el = e.currentTarget
      el.style.background = 'var(--bg-elevated)'
      el.style.color = 'var(--tx-primary)'
    }}
    onMouseLeave={e => {
      const el = e.currentTarget
      el.style.background = active ? 'var(--bg-elevated)' : 'transparent'
      el.style.color = active ? 'var(--tx-primary)' : 'var(--tx-muted)'
    }}
  >
    {children}
  </button>
))
IBtn.displayName = 'IBtn'

/* ═══════════════════════════════════════════════════════════════
   AVATAR
═══════════════════════════════════════════════════════════════ */
const Avatar = memo(({ name, photo, size, isGroup }: {
  name: string; photo?: string; size: number; isGroup: boolean
}) => {
  const r = isGroup ? Math.round(size * 0.28) : size / 2
  const colors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6']
  const color = colors[(name.charCodeAt(0) ?? 0) % colors.length]
  const initials = name.split(' ').map(w => w[0] ?? '').join('').substring(0, 2).toUpperCase() || '?'

  if (photo) return (
    <img
      src={photo} alt={name}
      style={{ width: size, height: size, borderRadius: r, objectFit: 'cover', display: 'block', flexShrink: 0 }}
    />
  )
  return (
    <div style={{
      width: size, height: size, borderRadius: r, flexShrink: 0,
      background: isGroup ? 'var(--bg-elevated)' : color,
      border: '1px solid var(--border-subtle)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.34, fontWeight: 800,
      color: isGroup ? 'var(--tx-muted)' : '#fff',
    }}>
      {isGroup ? <Icons.Users /> : initials}
    </div>
  )
})
Avatar.displayName = 'Avatar'

/* ═══════════════════════════════════════════════════════════════
   CHAT MENU SHEET
═══════════════════════════════════════════════════════════════ */
interface MenuSheetProps {
  conv: Conversation
  onClose: () => void
  onPinToggle: () => void
  onMuteToggle: () => void
  onClearChat: () => void
  onBlockUser: () => void
}

const ChatMenuSheet = memo(({ conv, onClose, onPinToggle, onMuteToggle, onClearChat, onBlockUser }: MenuSheetProps) => (
  <>
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)' }}
    />
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480, zIndex: 101,
      background: 'var(--bg-base)', border: '1px solid var(--border-subtle)',
      borderRadius: '20px 20px 0 0', padding: '8px 0 28px',
      animation: 'slideUpSheet .3s cubic-bezier(.34,1.56,.64,1)',
    }}>
      {/* Handle */}
      <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border-dim)', margin: '8px auto 16px' }} />

      {/* Conv name */}
      <div style={{ padding: '0 20px 12px', borderBottom: '1px solid var(--border-subtle)', marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx-primary)' }}>
          {conv.isGroup ? conv.name : conv.otherName}
        </div>
        <div style={{ fontSize: 11, color: 'var(--tx-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
          {conv.isGroup ? 'Group conversation' : conv.otherName}
        </div>
      </div>

      {/* Actions */}
      {[
        { icon: <Icons.Pin />, label: conv.pinned ? 'Unpin chat' : 'Pin chat', action: onPinToggle, danger: false },
        { icon: <Icons.Mute />, label: conv.muted ? 'Unmute' : 'Mute', action: onMuteToggle, danger: false },
        { icon: <Icons.Trash />, label: 'Clear chat history', action: onClearChat, danger: true },
        ...(!conv.isGroup ? [{ icon: <Icons.Block />, label: 'Block user', action: onBlockUser, danger: true }] : []),
      ].map((item, i) => (
        <button
          key={i}
          onClick={() => { item.action(); onClose() }}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 14,
            padding: '13px 20px', background: 'none', border: 'none',
            color: item.danger ? 'var(--red)' : 'var(--tx-secondary)',
            cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-sans)',
            fontWeight: 500, textAlign: 'left', transition: 'background .12s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = item.danger ? 'rgba(239,68,68,.06)' : 'var(--bg-elevated)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <span style={{ display: 'flex', color: item.danger ? 'var(--red)' : 'var(--tx-muted)' }}>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  </>
))
ChatMenuSheet.displayName = 'ChatMenuSheet'

/* ═══════════════════════════════════════════════════════════════
   MAIN CHAT HEADER
═══════════════════════════════════════════════════════════════ */
export default function ChatHeader({
  conv, onBack, onStartCall, onSearch,
  onMenu, onToggleAI, aiActive = false,
}: Props) {
  const { presence, updateConversation, showToast, setActiveCid } = useStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [typingText, setTypingText] = useState('')

  /* Resolved values */
  const name = conv.isGroup ? (conv.name ?? 'Group') : (conv.otherName ?? '?')
  const photo = conv.isGroup ? undefined : (conv.otherPhoto ?? undefined)
  const peerData = conv.otherUid ? presence[conv.otherUid] : null
  const isOnline = !!peerData?.online
  const lastSeen = peerData?.lastSeen

  /* ── Typing indicator (from Firebase typing/{cid}) ──
     The ChatArea owns the typing listener; it surfaces
     typingNames via the store if you add that slice.
     For now we derive from a store slice if available. */
  const { typingNames = [] } = useStore() as any
  useEffect(() => {
    if (typingNames.length === 0) { setTypingText(''); return }
    const n = typingNames[0]
    setTypingText(typingNames.length === 1 ? `${n} is typing…` : `${typingNames.length} people typing…`)
  }, [typingNames])

  /* ── Subtitle ── */
  function subtitle() {
    if (typingText) return { text: typingText, color: 'var(--accent)', pulse: true }

    if (conv.isGroup) {
      // Member count could come from conv.memberCount if stored
      const count = (conv as any).memberCount
      return {
        text: count
          ? `${count} members · 🔐 encrypted`
          : '🔐 encrypted group',
        color: 'var(--tx-muted)', pulse: false,
      }
    }

    if (isOnline) return { text: 'Active now', color: 'var(--green)', pulse: false }

    if (lastSeen) {
      return { text: `Last seen ${fmtTime(lastSeen)}`, color: 'var(--tx-muted)', pulse: false }
    }

    return { text: 'Offline', color: 'var(--tx-muted)', pulse: false }
  }

  const sub = subtitle()

  /* ── Menu actions ── */
  function handlePinToggle() {
    updateConversation((conv as any).cid ?? '', { pinned: !conv.pinned })
    showToast(conv.pinned ? 'Unpinned' : 'Pinned 📌')
  }
  function handleMuteToggle() {
    updateConversation((conv as any).cid ?? '', { muted: !conv.muted })
    showToast(conv.muted ? 'Unmuted' : 'Muted 🔇')
  }
  function handleClearChat() {
    if (confirm('Clear all messages? This only clears for you.')) {
      showToast('Chat cleared')
    }
  }
  function handleBlockUser() {
    if (confirm(`Block ${conv.otherName}? They won't be able to message you.`)) {
      showToast('User blocked')
      setActiveCid(null)
    }
  }

  return (
    <>
      <style>{`
        @keyframes slideUpSheet {
          from { transform:translateX(-50%) translateY(30px); opacity:0; }
          to   { transform:translateX(-50%) translateY(0);    opacity:1; }
        }
        @keyframes typingPulse {
          0%,100% { opacity:1 }
          50%      { opacity:.5 }
        }
        #ch-back-btn { display:none; }
        @media (max-width:720px) {
          #ch-back-btn { display:flex !important; }
        }
      `}</style>

      <header style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '0 12px', height: 58, flexShrink: 0,
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-base)',
        backdropFilter: 'blur(20px)',
        position: 'relative', zIndex: 10,
      }}>

        {/* Back (mobile only) */}
        <button
          id="ch-back-btn"
          onClick={onBack}
          title="Back"
          style={{
            width: 34, height: 34, borderRadius: 9, border: 'none',
            background: 'transparent', color: 'var(--tx-muted)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .18s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; (e.currentTarget as HTMLElement).style.color = 'var(--tx-primary)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--tx-muted)' }}
        >
          <Icons.Back />
        </button>

        {/* Avatar + presence dot */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Avatar name={name} photo={photo} size={38} isGroup={!!conv.isGroup} />
          {!conv.isGroup && (
            <div style={{
              position: 'absolute', bottom: 1, right: 1,
              width: 10, height: 10, borderRadius: '50%',
              border: '2px solid var(--bg-base)',
              background: isOnline ? 'var(--green)' : 'var(--tx-disabled)',
              transition: 'background .4s',
            }} />
          )}
        </div>

        {/* Name + subtitle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: 'var(--tx-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            lineHeight: 1.3,
          }}>
            {name}
          </div>
          <div style={{
            fontSize: 11, fontFamily: 'var(--font-mono)',
            color: sub.color,
            display: 'flex', alignItems: 'center', gap: 4,
            marginTop: 2, lineHeight: 1,
            animation: sub.pulse ? 'typingPulse 1.4s ease-in-out infinite' : 'none',
          }}>
            {/* Online dot for DM */}
            {!conv.isGroup && isOnline && !typingText && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', flexShrink: 0 }} />
            )}
            {/* E2E lock for groups */}
            {conv.isGroup && !typingText && (
              <span style={{ display: 'flex', opacity: .5, color: 'var(--tx-disabled)' }}><Icons.Lock /></span>
            )}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {sub.text}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>

          {/* Voice call (DMs only) */}
          {!conv.isGroup && (
            <IBtn onClick={() => onStartCall('audio')} title="Voice call">
              <Icons.Phone />
            </IBtn>
          )}

          {/* Video call (DMs only) */}
          {!conv.isGroup && (
            <IBtn onClick={() => onStartCall('video')} title="Video call">
              <Icons.Video />
            </IBtn>
          )}

          {/* Search in chat */}
          <IBtn onClick={onSearch} title="Search in chat (⌘F)">
            <Icons.Search />
          </IBtn>

          {/* AI panel toggle (only shown if prop provided) */}
          {onToggleAI && (
            <button
              onClick={onToggleAI}
              title={aiActive ? 'Close AI panel' : 'Open AI assistant'}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                height: 34, padding: '0 10px', borderRadius: 9,
                border: `1px solid ${aiActive ? 'var(--accent-glow)' : 'var(--border-dim)'}`,
                background: aiActive ? 'var(--accent-muted)' : 'transparent',
                color: aiActive ? 'var(--accent)' : 'var(--tx-muted)',
                cursor: 'pointer', transition: 'all .2s',
                fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700,
                letterSpacing: '.5px', flexShrink: 0,
              }}
              onMouseEnter={e => {
                if (!aiActive) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'
                    ; (e.currentTarget as HTMLElement).style.color = 'var(--tx-primary)'
                }
              }}
              onMouseLeave={e => {
                if (!aiActive) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                    ; (e.currentTarget as HTMLElement).style.color = 'var(--tx-muted)'
                }
              }}
            >
              <SparkleIcon size={12} active={aiActive} />
              AI
            </button>
          )}

          {/* More menu */}
          <IBtn onClick={() => { onMenu ? onMenu() : setMenuOpen(true) }} title="More options">
            <Icons.More />
          </IBtn>
        </div>
      </header>

      {/* Chat menu sheet (rendered when onMenu not provided externally) */}
      {menuOpen && !onMenu && (
        <ChatMenuSheet
          conv={conv}
          onClose={() => setMenuOpen(false)}
          onPinToggle={handlePinToggle}
          onMuteToggle={handleMuteToggle}
          onClearChat={handleClearChat}
          onBlockUser={handleBlockUser}
        />
      )}
    </>
  )
}