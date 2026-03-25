'use client'

import { memo } from 'react'
import { Archive, BellOff, Info, Pin, Trash2 } from 'lucide-react'

import styles from './Sidebar.module.css'
import { Avatar } from '../shared'

export interface ConversationContextMenuView {
  id: string
  name: string
  subtitle?: string
  photo?: string
  isGroup: boolean
  pinned: boolean
  muted: boolean
  archived: boolean
  memberCount?: number
  unsupportedActions?: Array<'pin'>
}

interface ConvCtxMenuProps {
  cid: string
  x: number
  y: number
  conv: ConversationContextMenuView | undefined
  onClose: () => void
  onAction: (cid: string, action: string) => void
}

export const ConvContextMenu = memo(function ConvContextMenu({
  cid,
  x,
  y,
  conv,
  onClose,
  onAction,
}: ConvCtxMenuProps) {
  if (!conv) return null

  const menuWidth = 220
  const menuHeight = 272
  const width = typeof window !== 'undefined' ? window.innerWidth : 400
  const height = typeof window !== 'undefined' ? window.innerHeight : 800
  const left = Math.min(x, width - menuWidth - 8)
  const top = Math.min(y, height - menuHeight - 8)
  const pinUnsupported = conv.unsupportedActions?.includes('pin') ?? false

  const items = [
    {
      key: 'pin',
      icon: <Pin size={16} />,
      label: conv.pinned ? 'Unpin' : 'Pin chat',
      danger: false,
      disabled: pinUnsupported,
      hint: pinUnsupported ? 'Not stored in PocketBase schema yet' : undefined,
    },
    {
      key: 'mute',
      icon: <BellOff size={16} />,
      label: conv.muted ? 'Unmute' : 'Mute notifications',
      danger: false,
      disabled: false,
      hint: undefined,
    },
    {
      key: 'archive',
      icon: <Archive size={16} />,
      label: conv.archived ? 'Unarchive' : 'Archive conversation',
      danger: false,
      disabled: false,
      hint: undefined,
    },
    {
      key: 'details',
      icon: <Info size={16} />,
      label: conv.isGroup ? 'Group details' : 'Chat details',
      danger: false,
      disabled: true,
      hint: 'Hook this to a details panel when ready',
    },
    {
      key: 'delete',
      icon: <Trash2 size={16} />,
      label: 'Delete chat',
      danger: true,
      disabled: false,
      hint: undefined,
    },
  ]

  return (
    <>
      <div onClick={onClose} className={styles.ctxBackdrop} />

      <div className={styles.ctxMenu} style={{ left, top }}>
        <div className={styles.ctxHeader}>
          <div className={styles.ctxHeaderAvatar}>
            <Avatar
              name={conv.name || (conv.isGroup ? 'Group' : 'User')}
              photo={conv.photo}
              size={32}
              isGroup={conv.isGroup}
            />
          </div>

          <div style={{ minWidth: 0 }}>
            <div className={styles.ctxHeaderName}>{conv.name}</div>
            {(conv.subtitle || conv.memberCount) && (
              <div className={styles.profileEmail}>
                {conv.subtitle || (conv.memberCount ? `${conv.memberCount} members` : '')}
              </div>
            )}
          </div>
        </div>

        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return
              onAction(cid, item.key)
              onClose()
            }}
            className={`${styles.ctxItem} ${item.danger ? styles.ctxItemDanger : ''}`}
            style={{
              opacity: item.disabled ? 0.55 : 1,
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              width: '100%',
              textAlign: 'left',
              background: 'transparent',
              border: 'none',
            }}
            title={item.hint}
          >
            <span className={styles.ctxItemIcon}>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.hint && (
              <span style={{ fontSize: 10, opacity: 0.6 }}>
                PB
              </span>
            )}
          </button>
        ))}
      </div>
    </>
  )
})
