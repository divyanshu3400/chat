'use client'

import { memo } from "react"
import styles from '../../Bubbles/MessageBubble.module.css'


/* ═══════════════════════════════════════════════════════════════
   TICKS
═══════════════════════════════════════════════════════════════ */
export const Ticks = memo(({ status }: { status?: string }) => {
    const cls =
        status === 'read' ? styles.tickRead :
            status === 'delivered' ? styles.tickDelivered :
                status === 'sending' ? styles.tickSending :
                    status === 'failed' ? styles.tickFailed :
                        styles.tickSent

    if (status === 'sending') {
        return <span className={`${styles.tick} ${cls}`}><span className={styles.tickSpinner} /></span>
    }
    if (status === 'failed') {
        return (
            <span className={`${styles.tick} ${cls}`}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
            </span>
        )
    }
    return (
        <span className={`${styles.tick} ${cls}`}>
            {status === 'sent' ? (
                <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
                    <path d="M1.5 5L5 8.5L11.5 1.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ) : (
                <svg width="17" height="10" viewBox="0 0 17 10" fill="none">
                    <path d="M1.5 5L5 8.5L11.5 1.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5.5 5L9 8.5L15.5 1.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
        </span>
    )
})
Ticks.displayName = 'Ticks'
