'use client'

import { memo, useState } from 'react'
import styles from './TextBubble.module.css'

interface Props {
    html: string
    mine: boolean
    /** Collapse long messages beyond this many chars */
    collapseThreshold?: number
}

const DEFAULT_THRESHOLD = 600

export const TextBubble = memo(({ html, mine, collapseThreshold = DEFAULT_THRESHOLD }: Props) => {
    const plainLength = html.replace(/<[^>]+>/g, '').length
    const isLong = plainLength > collapseThreshold
    const [expanded, setExpanded] = useState(!isLong)

    return (
        <div className={`${styles.wrap} ${mine ? styles.mine : styles.theirs}`}>
            {/* Corner accent dot */}
            <div className={styles.accentDot} />

            <div
                className={`${styles.content} ${!expanded ? styles.contentCollapsed : ''}`}
                dangerouslySetInnerHTML={{ __html: html }}
            />

            {isLong && (
                <button
                    onClick={() => setExpanded(v => !v)}
                    className={`${styles.expandBtn} ${mine ? styles.expandBtnMine : styles.expandBtnTheirs}`}
                >
                    {expanded ? (
                        <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12">
                                <polyline points="18 15 12 9 6 15" />
                            </svg>
                            Show less
                        </>
                    ) : (
                        <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                            Read more
                        </>
                    )}
                </button>
            )}
        </div>
    )
})

TextBubble.displayName = 'TextBubble'