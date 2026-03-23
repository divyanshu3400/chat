import { Message } from '@/types'
import { memo, useRef, useState, useCallback } from 'react'
import { AudioPlayer } from './AudioPlayer'
import { PollBubble } from './PollBubble'
import { fmtTime, mdRender } from '@/lib/utils'
import { ReactionRow } from './ReactionRow'
import styles from './MessageBubble.module.css'

const EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍', '👎', '🎉', '🔥', '🤯']
const READ_MORE_THRESHOLD = 320 // chars before collapsing

/* ═══════════════════════════════════════════════════════════════
   TICKS
═══════════════════════════════════════════════════════════════ */
const Ticks = memo(({ status }: { status?: string }) => {
    const cls =
        status === 'read' ? styles.tickRead :
            status === 'delivered' ? styles.tickDelivered :
                styles.tickSent
    return (
        <span className={`${styles.tick} ${cls}`}>
            {status === 'sent' ? (
                <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                    <path d="M1 4.5L4.5 8L11 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ) : (
                <svg width="16" height="9" viewBox="0 0 16 9" fill="none">
                    <path d="M1 4.5L4.5 8L11 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5 4.5L8.5 8L15 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
        </span>
    )
})
Ticks.displayName = 'Ticks'

/* ═══════════════════════════════════════════════════════════════
   READ MORE WRAPPER
═══════════════════════════════════════════════════════════════ */
const ReadMoreText = memo(({ html, isMine }: { html: string; isMine: boolean }) => {
    const isLong = html.replace(/<[^>]+>/g, '').length > READ_MORE_THRESHOLD
    const [expanded, setExpanded] = useState(false)

    return (
        <div className={styles.readMoreRoot}>
            <div
                className={[
                    styles.textContent,
                    isLong && !expanded ? styles.textCollapsed : ''
                ].join(' ')}
                dangerouslySetInnerHTML={{ __html: html }}
            />
            {isLong && (
                <button
                    className={`${styles.readMoreBtn} ${isMine ? styles.readMoreBtnMine : styles.readMoreBtnTheirs}`}
                    onClick={() => setExpanded(p => !p)}
                >
                    {expanded ? 'Show less ↑' : 'Read more ↓'}
                </button>
            )}
        </div>
    )
})
ReadMoreText.displayName = 'ReadMoreText'

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */
export interface BubbleProps {
    id: string
    msg: Message
    isMine: boolean
    isGroup: boolean
    isFirst: boolean
    isLast: boolean
    decryptedText: string
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
    id, msg, isMine, isGroup, isFirst, isLast,
    decryptedText, cid,
    onCtx, onReact, onShowReactors, onScrollTo, onLightbox, swipeX,
}: BubbleProps) => {
    const [showPicker, setShowPicker] = useState(false)
    const [dlProgress, setDlProgress] = useState<number | null>(null)
    const bubbleRef = useRef<HTMLDivElement>(null)

    /* Touch long-press */
    const lpTimer = useRef<ReturnType<typeof setTimeout>>()
    const onTouchStart = useCallback((e: React.TouchEvent) => {
        lpTimer.current = setTimeout(() => {
            const t = e.touches[0]
            onCtx({ clientX: t.clientX, clientY: t.clientY }, id, msg, isMine, decryptedText)
        }, 500)
    }, [id, msg, isMine, decryptedText, onCtx])
    const onTouchEnd = useCallback(() => clearTimeout(lpTimer.current), [])

    /* Swipe-to-reply */
    const swipeAbs = Math.abs(swipeX)
    const swipeActive = swipeAbs > 12

    /* File download */
    const downloadFile = useCallback(async () => {
        if (!msg.url) return
        setDlProgress(0)
        const res = await fetch(msg.url)
        if (!res.ok || !res.body) { setDlProgress(null); return }
        const total = Number(res.headers.get('content-length') ?? 0)
        const reader = res.body.getReader()
        const chunks: ArrayBuffer[] = []
        let received = 0
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            if (!value) continue
            chunks.push(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength))
            received += value.byteLength
            if (total) setDlProgress(Math.round((received / total) * 100))
        }
        const blob = new Blob(chunks)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = msg.fileName ?? 'file'; a.click()
        URL.revokeObjectURL(url)
        setDlProgress(null)
    }, [msg.url, msg.fileName])

    /* ── DELETED ── */
    if (msg.deleted) {
        return (
            <div id={`mg_${id}`} className={`${styles.row} ${isMine ? styles.rowMine : styles.rowTheirs}`}
                style={{ padding: '2px 12px' }}>
                <div className={`${styles.deletedBubble} ${isMine ? styles.deletedMine : styles.deletedTheirs}`}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                    <span>Message deleted</span>
                </div>
            </div>
        )
    }

    /* Bubble border-radius */
    const r = 20
    const rTail = 5
    const borderRadius = isMine
        ? `${r}px ${r}px ${isLast ? rTail : r}px ${r}px`
        : `${r}px ${r}px ${r}px ${isLast ? rTail : r}px`

    /* ── CONTENT ── */
    const renderContent = useCallback(() => {
        switch (msg.type) {
            case 'image':
                return (
                    <div onClick={() => onLightbox(msg.url!, 'image')} className={styles.mediaWrap}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={msg.url} alt="" loading="lazy" className={styles.mediaImg} />
                        <div className={styles.mediaSheen} />
                    </div>
                )

            case 'video':
                return (
                    <div onClick={() => onLightbox(msg.url!, 'video')} className={styles.videoWrap}>
                        <video src={msg.url} muted playsInline className={styles.videoEl} />
                        <div className={styles.videoOverlay}>
                            <div className={styles.playBtn}>
                                <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                )

            case 'audio':
                return <AudioPlayer url={msg.url!} duration={msg.duration} mine={isMine} />

            case 'gif':
                return (
                    <div onClick={() => onLightbox(msg.url!, 'image')} className={styles.mediaWrap} style={{ position: 'relative', maxWidth: 240 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={msg.url} alt="GIF" style={{ width: '100%', display: 'block', borderRadius: 12 }} />
                        <div className={styles.gifBadge}>GIF</div>
                    </div>
                )

            case 'file':
                return (
                    <div className={styles.file}>
                        <div className={`${styles.fileIconWrap} ${isMine ? styles.fileIconMine : styles.fileIconTheirs}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                            </svg>
                        </div>
                        <div className={styles.fileInfo}>
                            <div className={styles.fileName}>{msg.fileName ?? 'file'}</div>
                            <div className={styles.fileMeta}>{msg.fileSize ?? ''}</div>
                            {dlProgress !== null ? (
                                <div className={styles.progressTrack}>
                                    <div className={styles.progressFill} style={{ width: `${dlProgress}%` }} />
                                    <span className={styles.progressLabel}>{dlProgress}%</span>
                                </div>
                            ) : (
                                <button onClick={downloadFile} className={`${styles.dlBtn} ${isMine ? styles.dlBtnMine : styles.dlBtnTheirs}`}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                                    </svg>
                                    Download
                                </button>
                            )}
                        </div>
                    </div>
                )

            case 'poll':
                return <PollBubble id={id} msg={msg} mine={isMine} cid={cid} />

            default: {
                const html = decryptedText || mdRender(msg.text ?? '')
                return <ReadMoreText html={html} isMine={isMine} />
            }
        }
    }, [msg, isMine, cid, id, dlProgress, decryptedText, onLightbox, downloadFile])

    /* ── SYSTEM MESSAGE ── */
    if (msg.type === 'system') {
        return (
            <div id={`mg_${id}`} className={styles.systemRow}>
                <span className={styles.systemPill}>{msg.text}</span>
            </div>
        )
    }

    /* ── NORMAL MESSAGE ── */
    const isMediaType = msg.type === 'image' || msg.type === 'video' || msg.type === 'gif'

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
            {/* Sender name in groups */}
            {isGroup && isFirst && !isMine && (
                <div className={styles.senderName}>{msg.senderName}</div>
            )}

            <div className={`${styles.bubbleOuter} ${isMine ? styles.bubbleOuterMine : styles.bubbleOuterTheirs}`}>

                {/* Avatar */}
                {isGroup && !isMine && (
                    <div className={styles.avatarWrap}>
                        {isFirst ? (
                            msg.senderPhoto
                                ? <img src={msg.senderPhoto} alt="" className={styles.avatarImg} /> // eslint-disable-line
                                : <div className={styles.avatarInitial}>{(msg.senderName ?? '?')[0].toUpperCase()}</div>
                        ) : (
                            <div className={styles.avatarSpacer} />
                        )}
                    </div>
                )}

                <div className={`${styles.bubbleCol} ${isMine ? styles.bubbleColMine : styles.bubbleColTheirs}`}>

                    {/* Reply quote */}
                    {msg.replyTo && (
                        <div
                            onClick={() => onScrollTo(msg.replyTo!.id)}
                            className={`${styles.replyQuote} ${isMine ? styles.replyQuoteMine : styles.replyQuoteTheirs}`}
                        >
                            <div className={`${styles.replySender} ${isMine ? styles.replySenderMine : styles.replySenderTheirs}`}>
                                {msg.replyTo.senderName}
                            </div>
                            <div className={styles.replyText}>{msg.replyTo.text}</div>
                        </div>
                    )}

                    {/* Main bubble */}
                    <div
                        ref={bubbleRef}
                        onContextMenu={e => { e.preventDefault(); onCtx(e, id, msg, isMine, decryptedText) }}
                        onTouchStart={onTouchStart}
                        onTouchEnd={onTouchEnd}
                        onDoubleClick={() => setShowPicker(p => !p)}
                        className={[
                            styles.bubble,
                            isMediaType ? styles.bubblePadMedia : styles.bubblePadText,
                            isMine ? styles.bubbleMine : styles.bubbleTheirs,
                        ].join(' ')}
                        style={{ borderRadius }}
                    >
                        {renderContent()}

                        {/* Footer */}
                        {!isMediaType && (
                            <div className={styles.footer}>
                                {msg.edited && <span className={styles.footerEdited}>edited</span>}
                                <span className={styles.footerTime}>{fmtTime(msg.ts as number)}</span>
                                {isMine && <Ticks status={msg.status} />}
                            </div>
                        )}

                        {/* Media badge */}
                        {isMediaType && (
                            <div className={styles.mediaBadge}>
                                <span className={styles.mediaBadgeTime}>{fmtTime(msg.ts as number)}</span>
                                {isMine && <Ticks status={msg.status} />}
                            </div>
                        )}

                        {/* Emoji picker */}
                        {showPicker && (
                            <div className={`${styles.pickerWrap} ${isMine ? styles.pickerWrapMine : styles.pickerWrapTheirs}`}>
                                {EMOJIS.map(e => (
                                    <button
                                        key={e}
                                        onClick={() => { onReact(id, e); setShowPicker(false) }}
                                        className={styles.pickerBtn}
                                    >{e}</button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Reactions */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <ReactionRow
                            id={id}
                            reactions={msg.reactions as Record<string, string>}
                            mine={isMine}
                            onReact={e => onReact(id, e)}
                            onShowReactors={onShowReactors}
                        />
                    )}
                </div>
            </div>
        </div>
    )
})
MessageBubble.displayName = 'MessageBubble'