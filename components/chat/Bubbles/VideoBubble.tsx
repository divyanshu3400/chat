'use client'

import { memo, useRef, useState } from 'react'
import styles from './VideoBubble.module.css'

interface Props {
    url: string
    width?: number
    height?: number
    thumbnailUrl?: string
    duration?: number
    mine: boolean
    onLightbox: (url: string, type: 'video') => void
}

function fmtDur(s: number) {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
}

export const VideoBubble = memo(({ url, width, height, thumbnailUrl, duration, mine, onLightbox }: Props) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [thumbLoaded, setThumbLoaded] = useState(false)

    const rawRatio = width && height ? width / height : 16 / 9
    const ratio = Math.min(Math.max(rawRatio, 0.5), 2)
    const paddingTop = `${(1 / ratio) * 100}%`

    return (
        <div
            className={`${styles.wrap} ${mine ? styles.mine : styles.theirs}`}
            onClick={() => onLightbox(url, 'video')}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter') onLightbox(url, 'video') }}
            aria-label="Play video"
        >
            <div className={styles.ratioBox} style={{ paddingTop }}>
                {/* Thumbnail or video poster */}
                {thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={thumbnailUrl}
                        alt=""
                        className={`${styles.thumb} ${thumbLoaded ? styles.thumbLoaded : ''}`}
                        onLoad={() => setThumbLoaded(true)}
                    />
                ) : (
                    <video
                        ref={videoRef}
                        src={url}
                        muted
                        playsInline
                        preload="metadata"
                        className={styles.thumb}
                    />
                )}

                {/* Overlay */}
                <div className={styles.overlay}>
                    <div className={styles.playRing}>
                        <div className={styles.playBtn}>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Duration badge */}
                {duration && (
                    <div className={styles.durationBadge}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="10" height="10">
                            <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        </svg>
                        {fmtDur(duration)}
                    </div>
                )}

                {/* Top-left gradient */}
                <div className={styles.topGrad} />
            </div>
        </div>
    )
})

VideoBubble.displayName = 'VideoBubble'