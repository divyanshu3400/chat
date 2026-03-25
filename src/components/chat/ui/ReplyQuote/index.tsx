'use client'

import { memo } from 'react'

import { useDecrypted } from '@/src/store/store'
import styles from '../../Bubbles/MessageBubble.module.css'

export interface ReplyQuotePreview {
    id: string
    text: string
    senderName: string
    type: string
    mediaThumb?: string
    deleted?: boolean
}

interface ReplyQuoteProps {
    replyTo?: ReplyQuotePreview | null
    mine: boolean
    onScrollTo: (id: string) => void
}

function getReplyPreview(replyTo: ReplyQuotePreview): string {
    if (replyTo.deleted) return 'Message unavailable'

    const text = replyTo.text?.trim()
    if (text) return text

    switch (replyTo.type) {
        case 'image':
            return 'Photo'
        case 'video':
            return 'Video'
        case 'audio':
            return 'Audio'
        case 'file':
            return 'File'
        case 'gif':
            return 'GIF'
        case 'poll':
            return 'Poll'
        case 'system':
            return 'System message'
        default:
            return 'Message'
    }
}

function getReplySender(replyTo: ReplyQuotePreview): string {
    return replyTo.senderName?.trim() || 'Unknown'
}

export const ReplyQuote = memo(function ReplyQuote({
    replyTo,
    mine,
    onScrollTo,
}: ReplyQuoteProps) {
    if (!replyTo?.id) return null

    const decryptedText = useDecrypted(replyTo.id)
    const preview = getReplyPreview({
        ...replyTo,
        text: decryptedText || replyTo.text,
    })
    const sender = getReplySender(replyTo)

    return (
        <button
            type="button"
            onClick={() => onScrollTo(replyTo.id)}
            className={`${styles.replyQuote} ${mine ? styles.replyQuoteMine : styles.replyQuoteTheirs}`}
        >
            <div className={styles.replyBar} />
            <div className={styles.replyInner}>
                {!!replyTo.mediaThumb && (
                    <img src={replyTo.mediaThumb} alt="" className={styles.replyThumb} />
                )}
                <div className={styles.replyTextWrap}>
                    <span className={styles.replySender}>{sender}</span>
                    <span className={styles.replyText}>{preview}</span>
                </div>
            </div>
        </button>
    )
})
