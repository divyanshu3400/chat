'use client'

import { Message } from '@/src/types'
import { memo, useRef, useState, useCallback } from 'react'
import { fmtTime } from '@/src/lib/utils'
import { useDecrypted } from '@/src/lib/store'   // ← granular selector
import { ReactionRow } from './ReactionRow'
import styles from './MessageBubble.module.css'
import { MessageContent } from './Messagecontent'
import { ReplyQuote, Ticks } from '../ui'

const EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍', '👎', '🎉', '🔥', '🤯']


/* ═══════════════════════════════════════════════════════════════
   FORWARDED BADGE
═══════════════════════════════════════════════════════════════ */
const ForwardedBadge = memo(() => (
    <div className={styles.forwardedBadge}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
            <polyline points="15 10 20 15 15 20" /><path d="M4 4v7a4 4 0 0 0 4 4h12" />
        </svg>
        Forwarded
    </div>
))
ForwardedBadge.displayName = 'ForwardedBadge'

/* ═══════════════════════════════════════════════════════════════
   PROPS
   NOTE: decryptedText is intentionally REMOVED from props.
   Each bubble reads its own slice from the store.
═══════════════════════════════════════════════════════════════ */
export interface BubbleProps {
    id: string
    msg: Message
    isMine: boolean
    isGroup: boolean
    isFirst: boolean
    isLast: boolean
    cid: string
    onCtx: (e: { clientX: number; clientY: number }, id: string, msg: Message, isMine: boolean, text: string) => void
    onReact: (id: string, emoji: string) => void
    onShowReactors: (emoji: string, users: any[]) => void
    onScrollTo: (id: string) => void
    onLightbox: (url: string, type?: 'image' | 'video') => void
    swipeX: number
}

/* ═══════════════════════════════════════════════════════════════
   MESSAGE BUBBLE
═══════════════════════════════════════════════════════════════ */
export const MessageBubble = memo(({
    id, msg, isMine, isGroup, isFirst, isLast, cid,
    onCtx, onReact, onShowReactors, onScrollTo, onLightbox, swipeX,
}: BubbleProps) => {
    const decryptedText = useDecrypted(id)
    const [showPicker, setShowPicker] = useState(false)
    const bubbleRef = useRef<HTMLDivElement>(null)

    const lpTimer = useRef<ReturnType<typeof setTimeout>>()
    const onTouchStart = useCallback((e: React.TouchEvent) => {
        lpTimer.current = setTimeout(() => {
            const t = e.touches[0]
            onCtx({ clientX: t.clientX, clientY: t.clientY }, id, msg, isMine, decryptedText)
        }, 500)
    }, [id, msg, isMine, decryptedText, onCtx])
    const onTouchEnd = useCallback(() => clearTimeout(lpTimer.current), [])

    const swipeAbs = Math.abs(swipeX)
    const swipeActive = swipeAbs > 12

    /* ── DELETED ── */
    if (msg.deleted) {
        return (
            <div id={`mg_${id}`} className={`${styles.row} ${isMine ? styles.rowMine : styles.rowTheirs}`}>
                <div className={`${styles.deletedBubble} ${isMine ? styles.deletedMine : styles.deletedTheirs}`}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                    Message deleted
                </div>
            </div>
        )
    }

    /* ── SYSTEM ── */
    if (msg.type === 'system') {
        return (
            <div id={`mg_${id}`} className={styles.systemRow}>
                <span className={styles.systemPill}>{msg.text}</span>
            </div>
        )
    }

    const isMediaType = ['image','audio', 'video', 'gif', 'file'].includes(msg.type)

    return (
        <div
            id={`mg_${id}`}
            className={`${styles.row} ${isMine ? styles.rowMine : styles.rowTheirs}`}
            style={{
                paddingTop: isFirst ? 6 : 2,
                paddingBottom: isLast ? 4 : 1,
                paddingInline: 10,
                transform: swipeActive
                    ? `translateX(${isMine ? -swipeAbs * 0.35 : swipeAbs * 0.35}px)`
                    : 'none',
                transition: swipeActive ? 'none' : 'transform 0.22s cubic-bezier(.4,0,.2,1)',
            }}
        >
            {isGroup && isFirst && !isMine && (
                <div className={styles.senderName} style={{ marginLeft: isGroup ? 44 : 0 }}>
                    {msg.senderName}
                </div>
            )}

            <div className={`${styles.bubbleOuter} ${isMine ? styles.bubbleOuterMine : styles.bubbleOuterTheirs}`}>
                {isGroup && !isMine && (
                    <div className={styles.avatarWrap}>
                        {isFirst ? (
                            msg.senderPhoto
                                ? <img src={msg.senderPhoto} alt="" className={styles.avatarImg} />
                                : <div className={styles.avatarInitial}>{(msg.senderName ?? '?')[0].toUpperCase()}</div>
                        ) : (
                            <div className={styles.avatarSpacer} />
                        )}
                    </div>
                )}

                <div className={`${styles.bubbleCol} ${isMine ? styles.bubbleColMine : styles.bubbleColTheirs}`}>
                    {msg.forwardedFrom && <ForwardedBadge />}
                    {msg.replyTo && <ReplyQuote replyTo={msg.replyTo} mine={isMine} onScrollTo={onScrollTo} />}

                    {/* ── MAIN BUBBLE ── */}
                    <div
                        ref={bubbleRef}
                        onContextMenu={e => { e.preventDefault(); onCtx(e, id, msg, isMine, decryptedText) }}
                        onTouchStart={onTouchStart}
                        onTouchEnd={onTouchEnd}
                        onDoubleClick={() => setShowPicker(p => !p)}
                    >
                        <div className={styles.bubbleShine} />

                        <MessageContent
                            cid={cid}
                            id={id}
                            mine={isMine}
                            msg={msg}
                            onLightbox={onLightbox}
                            decryptedText={decryptedText}
                        />

                        {!isMediaType && (
                            <div className={`${styles.footer} ${isMine ? styles.footerMine : styles.footerTheirs}`}>
                                {msg.edited && <span className={styles.footerEdited}>edited</span>}
                                <span className={styles.footerTime}>{fmtTime(msg.ts as number)}</span>
                                {isMine && <Ticks status={msg.status} />}
                            </div>
                        )}

                        {isMediaType && (
                            <div className={styles.mediaBadge}>
                                {msg.edited && <span className={styles.mediaBadgeEdited}>edited</span>}
                                <span className={styles.mediaBadgeTime}>{fmtTime(msg.ts as number)}</span>
                                {isMine && <Ticks status={msg.status} />}
                            </div>
                        )}

                        {showPicker && (
                            <div
                                className={`${styles.pickerWrap} ${isMine ? styles.pickerWrapMine : styles.pickerWrapTheirs}`}
                                onClick={e => e.stopPropagation()}
                            >
                                {EMOJIS.map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => { onReact(id, emoji); setShowPicker(false) }}
                                        className={styles.pickerBtn}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <ReactionRow
                            id={id}
                            reactions={msg.reactions as Record<string, string>}
                            mine={isMine}
                            onReact={e => onReact(id, e)}
                            onShowReactors={onShowReactors}
                        />
                    )}

                    {msg.linkPreview && msg.type === 'text' && (
                        <a
                            href={msg.linkPreview.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${styles.linkPreview} ${isMine ? styles.linkPreviewMine : styles.linkPreviewTheirs}`}
                        >
                            {msg.linkPreview.image && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={msg.linkPreview.image} alt="" className={styles.linkPreviewImg} />
                            )}
                            <div className={styles.linkPreviewBody}>
                                {msg.linkPreview.siteName && (
                                    <span className={styles.linkPreviewSite}>{msg.linkPreview.siteName}</span>
                                )}
                                <span className={styles.linkPreviewTitle}>{msg.linkPreview.title}</span>
                                {msg.linkPreview.description && (
                                    <span className={styles.linkPreviewDesc}>{msg.linkPreview.description}</span>
                                )}
                            </div>
                        </a>
                    )}
                </div>
            </div>
        </div>
    )
}, (prev, next) => {
    // Custom memo comparator — only re-render if these props changed.
    // swipeX is the only high-frequency prop so it's fine to let it through.
    return (
        prev.id === next.id &&
        prev.swipeX === next.swipeX &&
        prev.isFirst === next.isFirst &&
        prev.isLast === next.isLast &&
        prev.isMine === next.isMine &&
        prev.msg === next.msg &&   // object reference equality — Firebase gives new refs on change
        prev.onCtx === next.onCtx &&
        prev.onReact === next.onReact &&
        prev.onScrollTo === next.onScrollTo &&
        prev.onLightbox === next.onLightbox &&
        prev.onShowReactors === next.onShowReactors
    )
})

MessageBubble.displayName = 'MessageBubble'