import { Message } from '@/types'
import { memo, useRef, useState } from 'react'
import { AudioPlayer } from './AudioPlayer'
import { PollBubble } from './PollBubble'
import { fmtTime, mdRender } from '@/lib/utils'
import { ReactionRow } from './ReactionRow'
import styles from './MessageBubble.module.css'

const EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍', '👎', '🎉', '🔥', '🤯']

/* ═══════════════════════════════════════════════════════════════
   TICKS  (read receipts)
═══════════════════════════════════════════════════════════════ */
const Ticks = memo(({ status }: { status?: string }) => {
    const cls =
        status === 'read' ? styles.tickRead :
            status === 'delivered' ? styles.tickDelivered :
                styles.tickSent
    const sym = status === 'sent' ? '✓' : '✓✓'
    return <span className={`${styles.tick} ${cls}`}>{sym}</span>
})
Ticks.displayName = 'Ticks'

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
    function onTouchStart(e: React.TouchEvent) {
        lpTimer.current = setTimeout(() => {
            const t = e.touches[0]
            onCtx({ clientX: t.clientX, clientY: t.clientY }, id, msg, isMine, decryptedText)
        }, 550)
    }
    function onTouchEnd() { clearTimeout(lpTimer.current) }

    /* Swipe-to-reply */
    const swipeAbs = Math.abs(swipeX)
    const swipeActive = swipeAbs > 12

    /* File download */
    async function downloadFile() {
        if (!msg.url) return
        setDlProgress(0)
        const res = await fetch(msg.url)
        if (!res.ok || !res.body) { setDlProgress(null); throw new Error('Failed') }
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
    }

    /* ── DELETED ── */
    if (msg.deleted) {
        return (
            <div
                id={`mg_${id}`}
                className={`${styles.deleted} ${isMine ? styles.deletedMine : styles.deletedTheirs}`}
            >
                <div className={styles.deletedBubble}>🚫 This message was deleted</div>
            </div>
        )
    }

    /* Bubble border-radius — tail on last, flush on grouped */
    const r = 18
    const rTail = 4
    const borderRadius = isMine
        ? `${r}px ${r}px ${isLast ? rTail : r}px ${r}px`
        : `${r}px ${r}px ${r}px ${isLast ? rTail : r}px`

    /* ── CONTENT ── */
    function renderContent() {
        switch (msg.type) {

            case 'image':
                return (
                    <div
                        onClick={() => onLightbox(msg.url!, 'image')}
                        className={styles.mediaWrap}
                        style={{ maxWidth: 260 }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={msg.url}
                            alt="image"
                            loading="lazy"
                            className={styles.mediaImg}
                        />
                    </div>
                )

            case 'video':
                return (
                    <div
                        onClick={() => onLightbox(msg.url!, 'video')}
                        className={styles.videoWrap}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <video
                            src={msg.url}
                            muted
                            playsInline
                            className={styles.videoEl}
                        />
                        <div className={styles.videoOverlay}>
                            <div className={styles.playBtn}>▶</div>
                        </div>
                    </div>
                )

            case 'audio':
                return <AudioPlayer url={msg.url!} duration={msg.duration} mine={isMine} />

            case 'gif':
                return (
                    <div
                        onClick={() => onLightbox(msg.url!, 'image')}
                        className={styles.mediaWrap}
                        style={{ maxWidth: 240, position: 'relative' }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={msg.url} alt="GIF" style={{ width: '100%', display: 'block' }} />
                        <div className={styles.gifBadge}>GIF</div>
                    </div>
                )

            case 'file':
                return (
                    <div className={styles.file}>
                        <div className={isMine ? styles.fileIconMine : styles.fileIconTheirs}>📎</div>
                        <div className={styles.fileInfo}>
                            <div className={styles.fileName}>{msg.fileName ?? 'file'}</div>
                            <div className={styles.fileMeta}>{msg.fileSize ?? ''}</div>
                            {dlProgress !== null ? (
                                <div className={isMine ? styles.progressTrackMine : styles.progressTrackTheirs}>
                                    <div
                                        className={styles.progressFill}
                                        style={{ width: `${dlProgress}%` }}
                                    />
                                </div>
                            ) : (
                                <button
                                    onClick={downloadFile}
                                    className={isMine ? styles.dlBtnMine : styles.dlBtnTheirs}
                                >
                                    ↓ Download
                                </button>
                            )}
                        </div>
                    </div>
                )

            case 'poll':
                return <PollBubble id={id} msg={msg} mine={isMine} cid={cid} />

            case 'system':
                return (
                    <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--tx3)', padding: '4px 0', fontStyle: 'italic' }}>
                        {msg.text}
                    </div>
                )

            default: // text / markdown
                return (
                    <div
                        className={styles.textContent}
                        dangerouslySetInnerHTML={{ __html: decryptedText || mdRender(msg.text ?? '') }}
                    />
                )
        }
    }

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
                padding: `${isFirst ? 6 : 2}px 12px ${isLast ? 2 : 1}px`,
                transform: swipeActive
                    ? `translateX(${isMine ? -swipeAbs * 0.35 : swipeAbs * 0.35}px)`
                    : 'none',
                transition: swipeActive ? 'none' : 'transform 0.2s ease',
            }}
        >
            {/* Group sender name */}
            {isGroup && isFirst && !isMine && (
                <div className={styles.senderName}>{msg.senderName}</div>
            )}

            <div className={`${styles.bubbleOuter} ${isMine ? styles.bubbleOuterMine : styles.bubbleOuterTheirs}`}>

                {/* Avatar (group, others side) */}
                {isGroup && !isMine && (
                    <div className={styles.avatarWrap}>
                        {isFirst ? (
                            msg.senderPhoto
                                ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={msg.senderPhoto} alt="" className={styles.avatarImg} />
                                ) : (
                                    <div className={styles.avatarInitial}>
                                        {(msg.senderName ?? '?')[0].toUpperCase()}
                                    </div>
                                )
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

                        {/* Footer — time + ticks (text/audio/file/poll only) */}
                        {!isMediaType && isLast && (
                            <div className={styles.footer}>
                                {msg.edited && <span className={styles.footerEdited}>edited</span>}
                                <span className={styles.footerTime}>{fmtTime(msg.ts as number)}</span>
                                {isMine && <Ticks status={msg.status} />}
                            </div>
                        )}

                        {/* Media timestamp badge */}
                        {isMediaType && (
                            <div className={styles.mediaBadge}>
                                <span className={styles.mediaBadgeTime}>{fmtTime(msg.ts as number)}</span>
                                {isMine && <Ticks status={msg.status} />}
                            </div>
                        )}

                        {/* Quick reaction picker (double-tap) */}
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