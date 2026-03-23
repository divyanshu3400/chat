import { fmtDur } from "@/src/lib/utils";
import { memo, useMemo, useRef, useState } from "react";

/* ── AUDIO PLAYER ── */
export const AudioPlayer = memo(({ url, duration, mine }: { url: string; duration?: number; mine: boolean }) => {
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
                setProgress(a.duration ? a.currentTime / a.duration * 100 : 0)
                setElapsed(fmtDur(Math.floor(a.currentTime)))
            }
            audioRef.current.onended = () => setPlaying(false)
        }
        if (playing) { audioRef.current.pause(); setPlaying(false) }
        else { audioRef.current.play(); setPlaying(true) }
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

    const col = mine ? 'rgba(255,255,255,.7)' : 'var(--tx2)'

    /* Fake waveform bars (deterministic from URL) */
    const bars = useMemo(() => {
        let h = 0
        for (let i = 0; i < url.length; i++) h = ((h << 5) - h) + url.charCodeAt(i)
        return Array.from({ length: 28 }, (_, i) => {
            const v = Math.sin((h + i * 137) * 0.1) * 0.5 + 0.5
            return Math.max(0.15, v)
        })
    }, [url])

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200, padding: '2px 0' }}>
            {/* Play/Pause */}
            <button onClick={togglePlay} style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: mine ? 'rgba(255,255,255,.2)' : 'var(--s3)',
                color: mine ? '#fff' : 'var(--tx)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, flexShrink: 0, transition: 'transform .15s',
            }}>
                {playing ? '⏸' : '▶'}
            </button>

            {/* Waveform + scrub */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div
                    onClick={seek}
                    style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28, cursor: 'pointer' }}
                >
                    {bars.map((h, i) => {
                        const played = i / bars.length * 100 <= progress
                        return (
                            <div key={i} style={{
                                width: 3, borderRadius: 2, flexShrink: 0,
                                height: `${h * 28}px`,
                                background: played
                                    ? (mine ? 'rgba(255,255,255,.9)' : 'var(--ac)')
                                    : (mine ? 'rgba(255,255,255,.25)' : 'var(--bd2)'),
                                transition: 'background .1s',
                            }} />
                        )
                    })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: col }}>
                        {elapsed}
                    </span>
                    <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: col }}>
                        {duration ?? ''}
                    </span>
                </div>
            </div>

            {/* Speed */}
            <button onClick={cycleSpeed} style={{
                background: 'none', border: `1px solid ${mine ? 'rgba(255,255,255,.3)' : 'var(--bd)'}`,
                borderRadius: 6, padding: '2px 5px',
                fontSize: 9, fontFamily: 'var(--mono)',
                color: col, cursor: 'pointer',
            }}>
                {speed}×
            </button>
        </div>
    )
})
AudioPlayer.displayName = 'AudioPlayer'
