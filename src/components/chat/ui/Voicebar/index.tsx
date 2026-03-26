import React, { useEffect, useState } from 'react'
import styles from './VoiceBar.module.css'

const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

function VoiceBar({
  elapsed,
  onStop,
  onCancel,
}: {
  elapsed: number
  onStop: () => void
  onCancel: () => void
}) {
  const [waveHeights, setWaveHeights] = useState<number[]>(
    Array(24).fill(0.3)
  )

  // Simulate responsive wave animation
  useEffect(() => {
    const interval = setInterval(() => {
      setWaveHeights(
        Array(24)
          .fill(0)
          .map(() => Math.random() * 0.7 + 0.3)
      )
    }, 150)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={styles.voiceBarContainer}>
      {/* Background gradient */}
      <div className={styles.voiceBarBg} />

      <div className={styles.voiceBar}>
        {/* Left: Cancel button */}
        <button
          onClick={onCancel}
          className={styles.voiceBtn}
          data-action="cancel"
          title="Cancel recording"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Center: Recording indicator + Wave + Timer */}
        <div className={styles.voiceCenter}>
          {/* Recording indicator dot */}
          <div className={styles.recordingIndicator}>
            <div className={styles.recordingPulse} />
            <div className={styles.recordingDot} />
          </div>

          {/* Animated wave */}
          <div className={styles.voiceWave}>
            {waveHeights.map((height, i) => (
              <span
                key={i}
                className={styles.waveBar}
                style={{
                  height: `${height * 100}%`,
                  opacity: 0.6 + height * 0.4,
                }}
              />
            ))}
          </div>

          {/* Timer */}
          <div className={styles.voiceTime}>
            <span className={styles.timeValue}>{fmt(elapsed)}</span>
          </div>
        </div>

        {/* Right: Send button */}
        <button
          onClick={onStop}
          className={styles.voiceBtn}
          data-action="send"
          title="Send voice message"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default VoiceBar