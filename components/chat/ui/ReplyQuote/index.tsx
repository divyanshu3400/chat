import { useDecrypted } from "@/lib/store"
import { ReplyTo } from "@/types"
import { memo } from "react"
import styles from '../../Bubbles/MessageBubble.module.css'


const getReplyPreview = (replyTo: ReplyTo): string => {
    if (replyTo.deleted) return 'Message unavailable'

    const text = replyTo.text?.trim()
    if (text) return text

    switch (replyTo.type) {
        case 'image':
            return '📷 Photo'
        case 'video':
            return '🎥 Video'
        case 'audio':
            return '🎵 Audio'
        case 'file':
            return '📎 File'
        case 'gif':
            return 'GIF'
        case 'poll':
            return '📊 Poll'
        case 'system':
            return 'System message'
        default:
            return 'Message'
    }
}

const getReplySender = (replyTo: ReplyTo): string => {
    return replyTo.senderName?.trim() || 'Unknown'
}
interface ReplyQuoteProps {
    replyTo?: ReplyTo | null
    mine: boolean
    onScrollTo: (id: string) => void
}

export const ReplyQuote = memo(({ replyTo, mine, onScrollTo }: ReplyQuoteProps) => {
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