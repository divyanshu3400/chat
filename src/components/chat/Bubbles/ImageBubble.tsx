'use client'

import { memo, useMemo, useState } from 'react'
import styles from './ImageBubble.module.css'

interface Props {
    url: string
    width?: number
    height?: number
    mine: boolean
    onLightbox: (url: string, type: 'image') => void
}

export const ImageBubble = memo(({ url, width, height, mine, onLightbox }: Props) => {
    const [loaded, setLoaded] = useState(false)
    const [errored, setErrored] = useState(false)

    const { paddingTop, maxWidth } = useMemo(() => {
        const rawRatio = width && height ? width / height : 1.6
        const ratio = Math.min(Math.max(rawRatio, 0.5), 2)
        const aspect = rawRatio < 0.82 ? 'portrait' : rawRatio > 1.38 ? 'landscape' : 'square'
        const nextMaxWidth = aspect === 'portrait'
            ? 'min(58vw, 250px)'
            : aspect === 'landscape'
                ? 'min(78vw, 360px)'
                : 'min(68vw, 300px)'

        return {
            paddingTop: `${(1 / ratio) * 100}%`,
            maxWidth: nextMaxWidth,
        }
    }, [height, width])

    return (
        <div
            className={`${styles.wrap} ${mine ? styles.mine : styles.theirs}`}
            style={{ maxWidth }}
            onClick={() => !errored && onLightbox(url, 'image')}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter') onLightbox(url, 'image') }}
            aria-label="Open image"
        >
            <div className={styles.ratioBox} style={{ paddingTop }}>
                {!loaded && !errored && <div className={styles.shimmer} />}
                {errored ? (
                    <div className={styles.error}>
                        <span className={styles.errorIcon}>!</span>
                        <span className={styles.errorText}>Failed to load</span>
                    </div>
                ) : (
                    <img
                        src={url}
                        alt=""
                        loading="lazy"
                        className={`${styles.img} ${loaded ? styles.imgLoaded : ''}`}
                        onLoad={() => setLoaded(true)}
                        onError={() => setErrored(true)}
                    />
                )}
                {loaded && !errored && (
                    <>
                        <div className={styles.sheen} />
                        <div className={styles.zoomHint}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
                            </svg>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
})

ImageBubble.displayName = 'ImageBubble'
