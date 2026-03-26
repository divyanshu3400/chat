'use client'

import { useState, useEffect, memo } from 'react'
import type { ConversationState } from '@/src/store/store'
import { ArrowLeft, Ban, Lock, MicOff, MoreVertical, Phone, Pin, Trash2, Video } from 'lucide-react'
import { useStore } from '@/src/store/store'
import { Avatar } from '../shared'

/* ═══════════════════════════════════════════════════════════════
   PROPS
═══════════════════════════════════════════════════════════════ */
interface Props {
  conv: ConversationState
  onBack: () => void
  onStartCall: (mode: 'audio' | 'video') => void
  onSearch?: () => void
  onMenu?: () => void
  onToggleAI?: () => void
  aiActive?: boolean
}

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

const ChatMenuSheet = memo(({ conv, onClose, onPinToggle, onMuteToggle, onClearChat, onBlockUser }: MenuSheetProps) => {
  const isGroup = conv.bundle.conversation.type === 'group'
  const displayName = isGroup
    ? (conv.bundle.conversation.name ?? 'Group')
    : (conv.otherUser?.name ?? conv.otherUser?.username ?? conv.otherUser?.email ?? '?')

  const actions = [
    { icon: <Pin size={16} />, label: conv.bundle.conversation.is_archived ? 'Unpin chat' : 'Pin chat', action: onPinToggle, danger: false },
    { icon: <MicOff size={16} />, label: conv.bundle.conversation.is_muted ? 'Unmute notifications' : 'Mute notifications', action: onMuteToggle, danger: false },
    { icon: <Trash2 size={16} />, label: 'Clear chat history', action: onClearChat, danger: true },
    ...(!isGroup ? [{ icon: <Ban size={16} />, label: 'Block user', action: onBlockUser, danger: true }] : []),
  ]

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 300,
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          animation: 'fadein .2s ease',
        }}
        
      />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '100%', maxWidth: 500,
        zIndex: 301,
        background: 'var(--bg)',
        borderTop: '1px solid var(--border-subtle)',
        borderRadius: '22px 22px 0 0',
        padding: '0 0 calc(env(safe-area-inset-bottom) + 20px)',
        animation: 'sheetUp .32s cubic-bezier(.34,1.4,.64,1)',
        boxShadow: '0 -8px 40px rgba(0,0,0,.18)',
      }}>
        {/* Drag handle */}
        <div style={{
          width: 40, height: 4, borderRadius: 2,
          background: 'var(--border-dim)',
          margin: '12px auto 0',
        }} />

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px 14px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'var(--bg-elevated)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
          }}>
            {isGroup ? '👥' : '💬'}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx-primary)', letterSpacing: '-.2px' }}>
              {displayName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--tx-muted)', marginTop: 1 }}>
              {isGroup ? 'Group conversation' : 'Direct message'}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '6px 0' }}>
          {actions.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.action(); onClose() }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                padding: '13px 20px', background: 'none', border: 'none',
                color: item.danger ? 'var(--red, #ef4444)' : 'var(--tx-secondary)',
                cursor: 'pointer', fontSize: 14, fontWeight: 500,
                textAlign: 'left', transition: 'background .12s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background =
                  item.danger ? 'rgba(239,68,68,.07)' : 'var(--bg-elevated)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'none'
              }}
            >
              <span style={{
                width: 34, height: 34, borderRadius: 10,
                background: item.danger ? 'rgba(239,68,68,.1)' : 'var(--bg-elevated)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: item.danger ? 'var(--red, #ef4444)' : 'var(--tx-muted)',
                flexShrink: 0,
              }}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Cancel */}
        <div style={{ padding: '4px 16px 0' }}>
          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '13px', borderRadius: 14,
              border: '1.5px solid var(--border-subtle)',
              background: 'var(--bg-elevated)', color: 'var(--tx-secondary)',
              cursor: 'pointer', fontSize: 14, fontWeight: 600,
              fontFamily: 'inherit', transition: 'background .15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover, var(--bg-elevated))' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  )
})
ChatMenuSheet.displayName = 'ChatMenuSheet'

/* ═══════════════════════════════════════════════════════════════
   ACTION BUTTON
═══════════════════════════════════════════════════════════════ */
interface ActionBtnProps {
  onClick: () => void
  title: string
  children: React.ReactNode
  variant?: 'default' | 'call' | 'video' | 'more'
}

function ActionBtn({ onClick, title, children, variant = 'default' }: ActionBtnProps) {
  const isCall = variant === 'call'
  const isVideo = variant === 'video'
  const isMore = variant === 'more'

  const base: React.CSSProperties = {
    width: 36, height: 36,
    borderRadius: isMore ? 10 : 11,
    border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all .18s cubic-bezier(.4,0,.2,1)',
    flexShrink: 0,
    position: 'relative',
    outline: 'none',
  }

  const bgMap = {
    default: 'transparent',
    call: 'rgba(34,197,94,.12)',
    video: 'rgba(59,130,246,.1)',
    more: 'var(--bg-elevated)',
  }

  const colorMap = {
    default: 'var(--tx-muted)',
    call: 'var(--green, #22c55e)',
    video: 'var(--blue, #3b82f6)',
    more: 'var(--tx-secondary)',
  }

  return (
    <button
      title={title}
      onClick={onClick}
      style={{ ...base, background: bgMap[variant], color: colorMap[variant] }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.background = isCall ? 'rgba(34,197,94,.22)'
          : isVideo ? 'rgba(59,130,246,.18)'
            : isMore ? 'var(--bg-hover, var(--bg-elevated))'
              : 'var(--bg-elevated)'
        el.style.color = isCall ? 'var(--green, #22c55e)'
          : isVideo ? 'var(--blue, #3b82f6)'
            : 'var(--tx-primary)'
        el.style.transform = 'scale(1.07)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.background = bgMap[variant]
        el.style.color = colorMap[variant]
        el.style.transform = 'scale(1)'
      }}
      onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(.93)' }}
      onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.07)' }}
    >
      {children}
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ONLINE PULSE DOT
═══════════════════════════════════════════════════════════════ */
function OnlineDot({ online }: { online: boolean }) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, right: 0,
      width: 11, height: 11, borderRadius: '50%',
      border: '2.5px solid var(--bg)',
      background: online ? 'var(--green, #22c55e)' : 'var(--tx-disabled, #9ca3af)',
      transition: 'background .4s',
    }}>
      {online && (
        <div style={{
          position: 'absolute', inset: -2, borderRadius: '50%',
          border: '2px solid var(--green, #22c55e)',
          animation: 'onlinePing 2.4s ease-out infinite',
          opacity: 0,
        }} />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN CHAT HEADER
═══════════════════════════════════════════════════════════════ */
export default function ChatHeader({ conv, onBack, onStartCall, onMenu }: Props) {
  const { presence, updateConversation, showToast, setActiveCid } = useStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [typingText, setTypingText] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const isGroup = conv.bundle.conversation.type === 'group'
  const name = isGroup
    ? (conv.bundle.conversation.name ?? 'Group')
    : (conv.otherUser?.name ?? conv.otherUser?.username ?? conv.otherUser?.email ?? '?')
  const photo = isGroup
    ? undefined
    : (conv.otherUser?.avatar
      ? `https://tech.kasheemilk.com/pb/api/files/users/${conv.otherUser.id}/${conv.otherUser.avatar}`
      : undefined)

  const peerData = conv.otherUser?.id ? presence[conv.otherUser.id] : null
  const isOnline = !!peerData?.online
  const lastSeen = peerData?.lastSeen

  const { typingNames = [] } = useStore() as any
  useEffect(() => {
    if (!typingNames.length) { setTypingText(''); return }
    setTypingText(
      typingNames.length === 1
        ? `${typingNames[0]} is typing…`
        : `${typingNames.length} people typing…`
    )
  }, [typingNames])

  /* ── Subtitle ── */
  function subtitle() {
    if (typingText) return { text: typingText, color: 'var(--accent)', pulse: true }
    if (isGroup) {
      const count = conv.bundle.members?.length
      return { text: count ? `${count} members` : 'Group', color: 'var(--tx-muted)', pulse: false }
    }
    if (isOnline) return { text: 'Active now', color: 'var(--green, #22c55e)', pulse: false }
    if (lastSeen) return { text: `Last seen ${lastSeen}`, color: 'var(--tx-muted)', pulse: false }
    return { text: 'Offline', color: 'var(--tx-muted)', pulse: false }
  }
  const sub = subtitle()

  /* ── Menu actions ── */
  function handlePinToggle() {
    updateConversation(conv.bundle.conversation.id, { is_archived: !conv.bundle.conversation.is_archived })
    showToast(!conv.bundle.conversation.is_archived ? 'Chat pinned 📌' : 'Chat unpinned')
  }
  function handleMuteToggle() {
    updateConversation(conv.bundle.conversation.id, { is_muted: !conv.bundle.conversation.is_muted })
    showToast(conv.bundle.conversation.is_muted ? 'Notifications on 🔔' : 'Notifications muted 🔇')
  }
  function handleClearChat() {
    if (confirm('Clear all messages? This only clears for you.')) showToast('Chat cleared')
  }
  function handleBlockUser() {
    const pName = conv.otherUser?.name ?? conv.otherUser?.username ?? 'this user'
    if (confirm(`Block ${pName}?`)) { showToast('User blocked'); setActiveCid(null) }
  }

  return (
    <>
      <style>{`
        @keyframes sheetUp {
          from { transform:translateX(-50%) translateY(24px); opacity:0 }
          to   { transform:translateX(-50%) translateY(0);    opacity:1 }
        }
        @keyframes fadein  { from { opacity:0 } to { opacity:1 } }
        @keyframes onlinePing {
          0%   { transform:scale(1);   opacity:.6 }
          70%  { transform:scale(2.2); opacity:0  }
          100% { transform:scale(2.2); opacity:0  }
        }
        @keyframes typingPulse {
          0%,100% { opacity:1   }
          50%     { opacity:.45 }
        }
        @keyframes headerIn {
          from { opacity:0; transform:translateY(-6px) }
          to   { opacity:1; transform:translateY(0)    }
        }
        #ch-back-btn { display:none !important }
        @media (max-width:720px) {
          #ch-back-btn { display:flex !important }
        }
        .ch-action-divider {
          width:1px; height:20px; background:var(--border-subtle);
          flex-shrink:0; border-radius:1px;
        }
      `}</style>

      <header style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 18px 0 18px',
        height: 62,
        flexShrink: 0,
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg)',
        // backdropFilter: 'blur(24px)',
        // WebkitBackdropFilter: 'blur(24px)',
        position: 'relative', zIndex: 10,
        animation: mounted ? 'headerIn .3s ease both' : 'none',
      }}>

        {/* ── Back (mobile only) ── */}
        <button
          id="ch-back-btn"
          onClick={onBack}
          title="Back"
          style={{
            width: 36, height: 36, borderRadius: 10,
            border: 'none', background: 'transparent',
            color: 'var(--tx-muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .18s', flexShrink: 0,
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'var(--bg-elevated)'
            el.style.color = 'var(--tx-primary)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'transparent'
            el.style.color = 'var(--tx-muted)'
          }}
        >
          <ArrowLeft size={18} />
        </button>

        {/* ── Avatar + presence ── */}
        <div
          style={{
            position: 'relative', flexShrink: 0, cursor: 'pointer',
            borderRadius: '50%',
            transition: 'transform .18s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.06)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
        >
          <Avatar name={name} photo={photo} size={36} isGroup={isGroup} />
          {!isGroup && <OnlineDot online={isOnline} />}
        </div>

        {/* ── Name + subtitle ── */}
        <div style={{ flex: 1, minWidth: 0, paddingLeft: 2 }}>
          <div style={{
            fontSize: 14, fontWeight: 700,
            color: 'var(--tx-primary)',
            letterSpacing: '-.25px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            lineHeight: 1.25,
          }}>
            {name}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            marginTop: 2.5, lineHeight: 1,
          }}>
            {/* E2E lock badge for groups */}
            {isGroup && !typingText && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: 9, fontWeight: 700, letterSpacing: '.4px',
                textTransform: 'uppercase',
                color: 'var(--tx-disabled)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 4, padding: '1px 5px',
              }}>
                <Lock size={8} /> E2E
              </span>
            )}

            {/* Online dot for DMs */}
            {!isGroup && isOnline && !typingText && (
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--green, #22c55e)',
                display: 'inline-block', flexShrink: 0,
              }} />
            )}

            <span style={{
              fontSize: 11,
              color: sub.color,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontWeight: typingText ? 500 : 400,
              animation: sub.pulse ? 'typingPulse 1.4s ease-in-out infinite' : 'none',
              fontFamily: 'var(--font-mono)',
            }}>
              {sub.text}
            </span>
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0,
        }}>
          {/* Voice call — DMs only */}
          {!isGroup && (
            <ActionBtn onClick={() => onStartCall('audio')} title="Voice call" variant="call">
              <Phone size={17} strokeWidth={2} />
            </ActionBtn>
          )}

          {/* Video call — DMs only */}
          {!isGroup && (
            <ActionBtn onClick={() => onStartCall('video')} title="Video call" variant="video">
              <Video size={17} strokeWidth={2} />
            </ActionBtn>
          )}

          {/* Divider between calls and more */}
          {!isGroup && <div className="ch-action-divider" />}

          {/* More */}
          <ActionBtn
            onClick={() => onMenu ? onMenu() : setMenuOpen(true)}
            title="More options"
            variant="more"
          >
            <MoreVertical size={17} strokeWidth={2} />
          </ActionBtn>
        </div>
      </header>

      {/* Menu sheet */}
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