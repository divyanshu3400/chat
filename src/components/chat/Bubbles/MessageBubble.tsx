'use client'

import { memo, useCallback, useRef, useState } from 'react'

import { fmtTime } from '@/src/lib/utils'
import { useDecrypted } from '@/src/store/store'
import type { MessageBundle } from '@/src/store/store'
import { ReactionRow } from './ReactionRow'
import styles from './MessageBubble.module.css'
import { ReplyQuote, Ticks } from '../ui'
import { MessageContent } from './MessageContent'

const EMOJIS = ['â¤ï¸', 'ðŸ˜‚', 'ðŸ˜®', 'ðŸ˜¢', 'ðŸ˜¡', 'ðŸ‘', 'ðŸ‘Ž', 'ðŸŽ‰', 'ðŸ”¥', 'ðŸ¤¯'] as const

export interface MessageBubbleViewModel {
  uid: string
  senderName: string
  senderPhoto: string
  text: string
  type: string
  url?: string
  fileName?: string
  fileSize?: string
  encrypted: boolean
  edited: boolean
  editedAt?: string
  deleted: boolean
  duration?: string
  replyTo?: {
    id: string
    text: string
    senderName: string
    type: string
    mediaThumb?: string
  }
  thumbnailUrl?: string
  ts: string
  status: string
  reactions: Record<string, string | null>
  forwardedFrom?: string | null
  hasAttachments?: boolean
  linkPreview?: {
    url: string
    title: string
    description?: string
    image?: string
    siteName?: string
  }
  raw?: MessageBundle['message']
}

const ForwardedBadge = memo(function ForwardedBadge() {
  return (
    <div className={styles.forwardedBadge}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
        <polyline points="15 10 20 15 15 20" />
        <path d="M4 4v7a4 4 0 0 0 4 4h12" />
      </svg>
      Forwarded
    </div>
  )
})

export interface BubbleProps {
  id: string
  msg: MessageBubbleViewModel
  isMine: boolean
  isGroup: boolean
  isFirst: boolean
  isLast: boolean
  cid: string
  onCtx: (
    e: { clientX: number; clientY: number },
    id: string,
    msg: MessageBubbleViewModel,
    isMine: boolean,
    text: string,
  ) => void
  onReact: (id: string, emoji: string) => void
  onShowReactors: (emoji: string, users: Array<{ id: string; name: string }>) => void
  onScrollTo: (id: string) => void
  onLightbox: (url: string, type?: 'image' | 'video') => void
  swipeX: number
}

function buildReactionUsers(reactions: Record<string, string | null>, emoji: string) {
  return Object.entries(reactions)
    .filter(([, value]) => value === emoji)
    .map(([id]) => ({ id, name: id }))
}

function isMediaMessage(msg: MessageBubbleViewModel): boolean {
  return ['image', 'audio', 'video', 'gif', 'file','pdf'].includes(msg.type) || !!msg.hasAttachments
}

export const MessageBubble = memo(function MessageBubble({
  id,
  msg,
  isMine,
  isGroup,
  isFirst,
  isLast,
  cid,
  onCtx,
  onReact,
  onShowReactors,
  onScrollTo,
  onLightbox,
  swipeX,
}: BubbleProps) {
  const decryptedText = useDecrypted(id)
  const [showPicker, setShowPicker] = useState(false)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    longPressTimer.current = setTimeout(() => {
      const touch = event.touches[0]
      onCtx({ clientX: touch.clientX, clientY: touch.clientY }, id, msg, isMine, decryptedText)
    }, 500)
  }, [decryptedText, id, isMine, msg, onCtx])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }
  }, [])

  const swipeAbs = Math.abs(swipeX)
  const swipeActive = swipeAbs > 12
  const mediaMessage = isMediaMessage(msg)
  const messageTime = fmtTime(msg.ts)

  if (msg.deleted) {
    return (
      <div id={`mg_${id}`} className={`${styles.row} ${isMine ? styles.rowMine : styles.rowTheirs}`}>
        <div className={`${styles.deletedBubble} ${isMine ? styles.deletedMine : styles.deletedTheirs}`}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
          Message deleted
        </div>
      </div>
    )
  }

  if (msg.type === 'system') {
    return (
      <div id={`mg_${id}`} className={styles.systemRow}>
        <span className={styles.systemPill}>{msg.text}</span>
      </div>
    )
  }

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

          <div
            ref={bubbleRef}
            onContextMenu={(event) => {
              event.preventDefault()
              onCtx(event, id, msg, isMine, decryptedText)
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onDoubleClick={() => setShowPicker((current) => !current)}
          >

            <MessageContent
              cid={cid}
              id={id}
              mine={isMine}
              msg={{
                ...msg,
                text: decryptedText,
              } as never}
              onLightbox={onLightbox}
              decryptedText={decryptedText}
            />

            {!mediaMessage && (
              <div className={`${styles.footer} ${isMine ? styles.footerMine : styles.footerTheirs}`}>
                {msg.edited && <span className={styles.footerEdited}>edited</span>}
                <span className={styles.footerTime}>{messageTime}</span>
                {isMine && <Ticks status={msg.status as never} />}
              </div>
            )}

            {mediaMessage && (
              <div className={styles.mediaBadge}>
                {msg.edited && <span className={styles.mediaBadgeEdited}>edited</span>}
                <span className={styles.mediaBadgeTime}>{messageTime}</span>
                {isMine && <Ticks status={msg.status as never} />}
              </div>
            )}

            {showPicker && (
              <div
                className={`${styles.pickerWrap} ${isMine ? styles.pickerWrapMine : styles.pickerWrapTheirs}`}
                onClick={(event) => event.stopPropagation()}
              >
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact(id, emoji)
                      setShowPicker(false)
                    }}
                    className={styles.pickerBtn}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {Object.keys(msg.reactions).length > 0 && (
            <ReactionRow
              id={id}
              reactions={msg.reactions as Record<string, string>}
              mine={isMine}
              onReact={(emoji) => onReact(id, emoji)}
              onShowReactors={(emoji) => onShowReactors(emoji, buildReactionUsers(msg.reactions, emoji))}
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
  return (
    prev.id === next.id &&
    prev.swipeX === next.swipeX &&
    prev.isFirst === next.isFirst &&
    prev.isLast === next.isLast &&
    prev.isMine === next.isMine &&
    prev.msg === next.msg &&
    prev.onCtx === next.onCtx &&
    prev.onReact === next.onReact &&
    prev.onScrollTo === next.onScrollTo &&
    prev.onLightbox === next.onLightbox &&
    prev.onShowReactors === next.onShowReactors
  )
})

