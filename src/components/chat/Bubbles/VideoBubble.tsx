'use client'

import { memo, useMemo, useRef, useState } from 'react'
import styles from './VideoBubble.module.css'

interface Props {
    url: string
    width?: number
    height?: number
    thumbnailUrl?: string
    duration?: number | string
    mine: boolean
    onLightbox: (url: string, type: 'video') => void
}

function fmtDur(s: number | string) {
    const totalSeconds = Number(s)
    if (Number.isNaN(totalSeconds)) return '0:00'

    const m = Math.floor(totalSeconds / 60)
    const sec = Math.floor(totalSeconds % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
}

export const VideoBubble = memo(({ url, width, height, thumbnailUrl, duration, mine, onLightbox }: Props) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [thumbLoaded, setThumbLoaded] = useState(false)

    const { paddingTop, maxWidth } = useMemo(() => {
        const rawRatio = width && height ? width / height : 16 / 9
        const ratio = Math.min(Math.max(rawRatio, 0.5), 2)
        const aspect = rawRatio < 0.82 ? 'portrait' : rawRatio > 1.38 ? 'landscape' : 'square'
        const nextMaxWidth = aspect === 'portrait'
            ? 'min(58vw, 250px)'
            : aspect === 'landscape'
                ? 'min(80vw, 370px)'
                : 'min(70vw, 310px)'

        return {
            paddingTop: `${(1 / ratio) * 100}%`,
            maxWidth: nextMaxWidth,
        }
    }, [height, width])

    return (
        <div
            className={`${styles.wrap} ${mine ? styles.mine : styles.theirs}`}
            style={{ maxWidth }}
            onClick={() => onLightbox(url, 'video')}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter') onLightbox(url, 'video') }}
            aria-label="Play video"
        >
            <div className={styles.ratioBox} style={{ paddingTop }}>
                {thumbnailUrl ? (
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

                <div className={styles.overlay}>
                    <div className={styles.playRing}>
                        <div className={styles.playBtn}>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {duration && (
                    <div className={styles.durationBadge}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="10" height="10">
                            <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        </svg>
                        {fmtDur(duration)}
                    </div>
                )}

                <div className={styles.topGrad} />
            </div>
        </div>
    )
})

VideoBubble.displayName = 'VideoBubble'
