import { fmtDur } from '@/src/lib/utils'
import { memo, useMemo, useRef, useState } from 'react'
import styles from './AudioPlayer.module.css'

export const AudioPlayer = memo(({ url, duration, mine }: { url: string; duration?: number | string; mine: boolean }) => {
    const [playing, setPlaying] = useState(false)
    const [progress, setProgress] = useState(0)
    const [speed, setSpeed] = useState(1)
    const [elapsed, setElapsed] = useState('0:00')
    const audioRef = useRef<HTMLAudioElement | null>(null)

    function togglePlay() {
        if (!audioRef.current) {
            audioRef.current = new Audio(url)
            audioRef.current.playbackRate = speed
            audioRef.current.ontimeupdate = () => {
                const a = audioRef.current!
                setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0)
                setElapsed(fmtDur(Math.floor(a.currentTime)))
            }
            audioRef.current.onended = () => setPlaying(false)
        }

        if (playing) {
            audioRef.current.pause()
            setPlaying(false)
        } else {
            void audioRef.current.play()
            setPlaying(true)
        }
    }

    function seek(e: React.MouseEvent<HTMLDivElement>) {
        if (!audioRef.current?.duration) return
        const rect = e.currentTarget.getBoundingClientRect()
        const pct = (e.clientX - rect.left) / rect.width
        audioRef.current.currentTime = pct * audioRef.current.duration
    }

    function cycleSpeed() {
        const speeds = [1, 1.5, 2]
        const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length]
        setSpeed(next)
        if (audioRef.current) audioRef.current.playbackRate = next
    }

    const bars = useMemo(() => {
        let h = 0
        for (let i = 0; i < url.length; i += 1) h = ((h << 5) - h) + url.charCodeAt(i)
        return Array.from({ length: 30 }, (_, i) => {
            const v = Math.sin((h + i * 137) * 0.1) * 0.5 + 0.5
            return Math.max(0.15, v)
        })
    }, [url])

    return (
        <div className={styles.root}>
            <button
                onClick={togglePlay}
                className={`${styles.playBtn} ${mine ? styles.playBtnMine : styles.playBtnTheirs}`}
                aria-label={playing ? 'Pause audio' : 'Play audio'}
            >
                {playing ? '||' : '>'}
            </button>

            <div className={styles.waveCluster}>
                <div onClick={seek} className={styles.waveform}>
                    {bars.map((heightFactor, i) => {
                        const played = (i / bars.length) * 100 <= progress
                        return (
                            <div
                                key={i}
                                className={`${styles.bar} ${played ? (mine ? styles.barPlayedMine : styles.barPlayedTheirs) : (mine ? styles.barIdleMine : styles.barIdleTheirs)}`}
                                style={{ height: `${heightFactor * 28}px` }}
                            />
                        )
                    })}
                </div>

                <div className={styles.metaRow}>
                    <div className={styles.timeGroup}>
                        <span className={`${styles.timePill} ${mine ? styles.timePillMine : styles.timePillTheirs}`}>{elapsed}</span>
                        {duration ? <span className={`${styles.timePill} ${mine ? styles.timePillMine : styles.timePillTheirs}`}>{duration}</span> : null}
                    </div>

                    <button
                        onClick={cycleSpeed}
                        className={`${styles.speedBtn} ${mine ? styles.speedBtnMine : styles.speedBtnTheirs}`}
                    >
                        {speed}x
                    </button>
                </div>
            </div>
        </div>
    )
})

AudioPlayer.displayName = 'AudioPlayer'
