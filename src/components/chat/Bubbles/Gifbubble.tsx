'use client'

import { memo, useState } from 'react'
import styles from './GifBubble.module.css'

interface Props {
  url: string
  mine: boolean
  onLightbox: (url: string, type: 'image') => void
}

export const GifBubble = memo(({ url, mine, onLightbox }: Props) => {
  const [loaded, setLoaded] = useState(false)

  return (
    <div
      className={`${styles.wrap} ${mine ? styles.mine : styles.theirs}`}
      onClick={() => onLightbox(url, 'image')}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onLightbox(url, 'image') }}
      aria-label="Open GIF"
    >
      {!loaded && <div className={styles.shimmer} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="GIF"
        className={`${styles.img} ${loaded ? styles.imgLoaded : ''}`}
        onLoad={() => setLoaded(true)}
      />
      <div className={styles.badge}>
        <span className={styles.badgeDot} />
        GIF
      </div>
      <div className={styles.sheen} />
    </div>
  )
})

GifBubble.displayName = 'GifBubble'