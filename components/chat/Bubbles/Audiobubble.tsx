'use client'

/**
 * AudioBubble — thin wrapper around your existing <AudioPlayer />.
 * Adds the mine/theirs shell styling so the player
 * integrates cleanly into the bubble system.
 */

import { memo } from 'react'
import styles from './AudioBubble.module.css'
import { AudioPlayer } from './AudioPlayer'

interface Props {
  url: string
  duration?: number
  mine: boolean
}

export const AudioBubble = memo(({ url, duration, mine }: Props) => (
  <div className={`${styles.wrap} ${mine ? styles.mine : styles.theirs}`}>
    <div className={styles.micRow}>
      <div className={styles.micIcon}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
        </svg>
      </div>
      <span className={styles.voiceLabel}>Voice message</span>
      {duration && (
        <span className={styles.duration}>
          {duration}
        </span>
      )}
    </div>
    <AudioPlayer url={url} duration={duration || 0} mine={mine} />
  </div>
))

AudioBubble.displayName = 'AudioBubble'