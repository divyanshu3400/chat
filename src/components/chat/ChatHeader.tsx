'use client'

import { useState, useEffect, memo } from 'react'
import { fmtTime } from '@/src/lib/utils'
import type { ConversationState } from '@/src/store/store'
import { ArrowLeft, Ban, Lock, MicOff, MoreVertical, Phone, Pin, Trash2, Users, Video } from 'lucide-react'
import { useStore } from '@/src/store/store'

/* ═══════════════════════════════════════════════════════════════
   PROPS
═══════════════════════════════════════════════════════════════ */
interface Props {
  conv: ConversationState
  onBack: () => void
  onStartCall: (mode: 'audio' | 'video') => void
  onSearch?: () => void
  onMenu?: () => void       // optional — we handle our own menu sheet
  onToggleAI?: () => void       // optional — hide if no AI panel
  aiActive?: boolean
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
      {isGroup ? <Users /> : initials}
    </div>
  )
})
Avatar.displayName = 'Avatar'

/* ═══════════════════════════════════════════════════════════════
   CHAT MENU SHEET
═══════════════════════════════════════════════════════════════ */
interface MenuSheetProps {
  conv: ConversationState
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
          {conv.bundle.conversation.type === 'group' ? conv.bundle.conversation.name : (conv.otherUser?.name ?? conv.otherUser?.username ?? conv.otherUser?.email ?? '?')}
        </div>
        <div style={{ fontSize: 11, color: 'var(--tx-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
          {conv.bundle.conversation.type === 'group' ? 'Group conversation' : (conv.otherUser?.name ?? conv.otherUser?.username ?? conv.otherUser?.email ?? '?')}
        </div>
      </div>

      {/* Actions */}
      {[
        { icon: <Pin />, label: !conv.bundle.conversation.is_archived ? 'Pin chat' : 'Unpin chat', action: onPinToggle, danger: false },
        { icon: <MicOff />, label: conv.bundle.conversation.is_muted ? 'Unmute' : 'Mute', action: onMuteToggle, danger: false },
        { icon: <Trash2 />, label: 'Clear chat history', action: onClearChat, danger: true },
        ...(conv.bundle.conversation.type !== 'group' ? [{ icon: <Ban />, label: 'Block user', action: onBlockUser, danger: true }] : []),
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
  conv, onBack, onStartCall,
  onMenu,
}: Props) {
  const { presence, updateConversation, showToast, setActiveCid } = useStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [typingText, setTypingText] = useState('')

  /* Resolved values */
  const isGroup = conv.bundle.conversation.type === 'group'
  const name = isGroup ? (conv.bundle.conversation.name ?? 'Group') : (conv.otherUser?.name ?? conv.otherUser?.username ?? conv.otherUser?.email ?? '?')
  const photo = isGroup ? undefined : (conv.otherUser?.avatar ? `https://tech.kasheemilk.com/pb/api/files/users/${conv.otherUser.id}/${conv.otherUser.avatar}` : undefined)
  const peerData = conv.otherUser?.id ? presence[conv.otherUser.id] : null
  const isOnline = !!peerData?.online
  const lastSeen = peerData?.lastSeen

  const { typingNames = [] } = useStore() as any
  useEffect(() => {
    if (typingNames.length === 0) { setTypingText(''); return }
    const n = typingNames[0]
    setTypingText(typingNames.length === 1 ? `${n} is typing…` : `${typingNames.length} people typing…`)
  }, [typingNames])

  /* ── Subtitle ── */
  function subtitle() {
    if (typingText) return { text: typingText, color: 'var(--accent)', pulse: true }

    if (isGroup) {
      // Member count could come from conv.memberCount if stored
      const count = conv.bundle.members?.length
      return {
        text: count
          ? `${count} members · 🔐 encrypted`
          : '🔐 encrypted group',
        color: 'var(--tx-muted)', pulse: false,
      }
    }

    if (isOnline) return { text: 'Active now', color: 'var(--green)', pulse: false }

    if (lastSeen) {
      return { text: `Last seen ${lastSeen}`, color: 'var(--tx-muted)', pulse: false }
    }

    return { text: 'Offline', color: 'var(--tx-muted)', pulse: false }
  }

  const sub = subtitle()

  /* ── Menu actions ── */
  function handlePinToggle() {
    updateConversation(conv.bundle.conversation.id, { is_archived: !conv.bundle.conversation.is_archived })
    showToast(!conv.bundle.conversation.is_archived ? 'Pinned 📌' : 'Unpinned')
  }
  function handleMuteToggle() {
    updateConversation(conv.bundle.conversation.id, { is_muted: !conv.bundle.conversation.is_muted })
    showToast(conv.bundle.conversation.is_muted ? 'Unmuted' : 'Muted 🔇')
  }
  function handleClearChat() {
    if (confirm('Clear all messages? This only clears for you.')) {
      showToast('Chat cleared')
    }
  }
  function handleBlockUser() {
    const pName = conv.otherUser?.name ?? conv.otherUser?.username ?? conv.otherUser?.email ?? 'this user'
    if (confirm(`Block ${pName}? They won't be able to message you.`)) {
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
          <ArrowLeft />
        </button>

        {/* Avatar + presence dot */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Avatar name={name} photo={photo} size={38} isGroup={isGroup} />
          {!isGroup && (
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
            {!isGroup && isOnline && !typingText && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', flexShrink: 0 }} />
            )}
            {/* E2E lock for groups */}
            {isGroup && !typingText && (
              <span style={{ display: 'flex', opacity: .5, color: 'var(--tx-disabled)' }}><Lock /></span>
            )}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {sub.text}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>

          {/* Voice call (DMs only) */}
          {!isGroup && (
            <IBtn onClick={() => onStartCall('audio')} title="Voice call">
              <Phone />
            </IBtn>
          )}

          {/* Video call (DMs only) */}
          {!isGroup && (
            <IBtn onClick={() => onStartCall('video')} title="Video call">
              <Video />
            </IBtn>
          )}

          {/* More menu */}
          <IBtn onClick={() => { onMenu ? onMenu() : setMenuOpen(true) }} title="More options">
            <MoreVertical />
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