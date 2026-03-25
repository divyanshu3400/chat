'use client'

import { useRef, memo } from 'react'
import { fmtTime } from '@/src/lib/utils'
import { Avatar } from '../shared'
import styles from './Sidebar.module.css'
import { BellOff, Lock, Pin } from 'lucide-react'

interface ConversationRowItem {
    id: string
    isGroup: boolean
    archived: boolean
    name?: string
    otherUid?: string
    otherName?: string
    otherPhoto?: string
    lastMsg?: string
    updatedAt?: number
    unread?: number
    pinned?: boolean
    muted?: boolean
    starred?: boolean
}

/* ── Conversation Row ── */
interface ConvRowProps {
    cid: string
    conv: ConversationRowItem
    isActive: boolean
    isOnline: boolean
    focused: boolean
    onOpen: (cid: string) => void
    onCtx: (cid: string, x: number, y: number) => void
}

export const ConvRow = memo(({ cid, conv, isActive, isOnline, focused, onOpen, onCtx }: ConvRowProps) => {
    const name = conv.isGroup ? (conv.name ?? 'Group') : (conv.otherName ?? 'Unknown')
    const photo = conv.isGroup ? undefined : conv.otherPhoto ?? undefined
    const unread = conv.unread ?? 0
    const preview = conv.lastMsg ? conv.lastMsg.substring(0, 42) : 'No messages yet'

    const lpRef = useRef<ReturnType<typeof setTimeout>>()
    function onTouchStart(e: React.TouchEvent) {
        lpRef.current = setTimeout(() => {
            const t = e.touches[0]
            onCtx(cid, t.clientX, t.clientY)
        }, 500)
    }
    function onTouchEnd() { clearTimeout(lpRef.current) }

    return (
        <div
            role="button"
            tabIndex={0}
            aria-selected={isActive}
            onClick={() => onOpen(cid)}
            onContextMenu={e => { e.preventDefault(); onCtx(cid, e.clientX, e.clientY) }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onOpen(cid) }}
            className={[
                styles.convRow,
                isActive ? styles.convRowActive : styles.convRowDefault,
                focused && !isActive ? styles.convRowFocused : '',
                conv.archived ? styles.convRowArchived : '',
            ].filter(Boolean).join(' ')}
        >
            {/* Active glow bar */}
            {isActive && <div className={styles.convActiveBar} />}

            <div className={styles.avatarWrap}>
                <Avatar name={name} photo={photo} size={46} isGroup={conv.isGroup} />
                {!conv.isGroup && (
                    <div className={`${styles.presenceDot} ${isOnline ? styles.presenceDotOnline : styles.presenceDotOffline}`} />
                )}
            </div>

            <div className={styles.convText}>
                <div className={styles.convNameRow}>
                    <span className={[
                        styles.convName,
                        unread > 0 ? styles.convNameUnread : '',
                        isActive ? styles.convNameActive : '',
                    ].filter(Boolean).join(' ')}>
                        {name}
                    </span>
                    <span className={styles.convTime}>{conv.updatedAt ? fmtTime(conv.updatedAt) : ''}</span>
                </div>
                <div className={styles.convPreviewRow}>
                    <span className={styles.convPreview}>
                        <span className={styles.lockIcon}><Lock /></span>
                        <span className={styles.previewText}>{preview}</span>
                    </span>
                    <div className={styles.convMeta}>
                        {conv.muted && (
                            <span className={styles.metaIcon}>
                                <BellOff size={16} />
                            </span>
                        )}

                        {conv.pinned && (
                            <span className={`${styles.metaIcon} ${styles.pinIcon}`}>
                                <Pin size={16} />
                            </span>
                        )}

                        {unread > 0 && (
                            <span className={`${styles.unreadBadge} ${conv.muted ? styles.unreadBadgeMuted : ''}`}>
                                {unread > 99 ? '99+' : unread}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
})
ConvRow.displayName = 'ConvRow'

