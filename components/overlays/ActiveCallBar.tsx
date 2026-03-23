/**
 * components/overlays/ActiveCallBar.tsx
 *
 * Sticky topbar shown when an AUDIO call is minimized.
 * Sits just below the StatusBar (top: 36px).
 * Shows: avatar · name · timer · mute · end · expand buttons.
 *
 * For VIDEO calls use FloatingCallPiP instead.
 */

'use client'

import { memo, useEffect, useState } from 'react'
import { useActiveCall } from '@/hooks/useActiveCall'
import { CallData } from '@/types'

interface Props {
    callData: CallData
    onExpand: () => void   /* click → back to fullscreen CallOverlay */
    onEnd: () => void
    onToggleMute: () => void
}

/* ── Inline timer ── */
const MiniTimer = memo(({ running }: { running: boolean }) => {
    const [secs, setSecs] = useState(0)
    useEffect(() => {
        if (!running) { setSecs(0); return }
        const t = setInterval(() => setSecs(s => s + 1), 1000)
        return () => clearInterval(t)
    }, [running])
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return (
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--tx3)', letterSpacing: 1 }}>
            {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
        </span>
    )
})
MiniTimer.displayName = 'MiniTimer'

/* ── Pulse dot ── */
const PulseDot = () => (
    <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8, flexShrink: 0 }}>
        <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'var(--green)', opacity: .7,
            animation: 'ping 1.8s ease-out infinite',
        }} />
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
    </span>
)

/* ── Main component ── */
export default function ActiveCallBar({ callData, onExpand, onEnd, onToggleMute }: Props) {
    const { muted } = useActiveCall()

    const name = callData.isIncoming
        ? (callData.callerName ?? 'Unknown')
        : callData.peerName
    const photo = callData.isIncoming
        ? callData.callerPhoto
        : callData.peerPhoto

    const initials = name.split(' ').map(w => w[0] ?? '').join('').substring(0, 2).toUpperCase()

    return (
        <>
            <style>{`
        @keyframes barIn { from{opacity:0;transform:translateY(-100%)} to{opacity:1;transform:translateY(0)} }
      `}</style>

            <div
                onClick={onExpand}
                style={{
                    position: 'fixed',
                    top: 36,         /* below StatusBar */
                    left: 0,
                    right: 0,
                    zIndex: 600,
                    height: 44,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '0 14px',
                    background: 'linear-gradient(90deg, rgba(0,245,160,.12) 0%, rgba(11,14,26,.96) 40%)',
                    borderBottom: '1px solid rgba(0,245,160,.18)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    cursor: 'pointer',
                    animation: 'barIn .25s ease',
                    userSelect: 'none',
                }}
            >
                {/* Pulse indicator */}
                <PulseDot />

                {/* Avatar */}
                <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                    border: '1.5px solid var(--green)',
                }}>
                    {photo
                        ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{
                            width: '100%', height: '100%',
                            background: 'rgba(0,245,160,.18)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700, color: 'var(--green)',
                        }}>{initials}</div>
                    }
                </div>

                {/* Name + timer */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                        {name}
                    </span>
                    <MiniTimer running />
                </div>

                {/* Tap to expand hint */}
                <span style={{ fontSize: 10, color: 'var(--tx3)', fontFamily: 'var(--mono)', flexShrink: 0, marginRight: 4 }}>
                    tap to expand
                </span>

                {/* Mute button */}
                <button
                    onClick={e => { e.stopPropagation(); onToggleMute() }}
                    title={muted ? 'Unmute' : 'Mute'}
                    style={{
                        width: 32, height: 32, borderRadius: '50%',
                        border: `1px solid ${muted ? 'var(--ac-glow)' : 'var(--border)'}`,
                        background: muted ? 'var(--ac-dim)' : 'var(--bg3)',
                        color: muted ? 'var(--ac)' : 'var(--tx3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', flexShrink: 0, fontSize: 13,
                        transition: 'all .15s',
                    }}
                >
                    {muted ? '🔇' : '🎤'}
                </button>

                {/* End call button */}
                <button
                    onClick={e => { e.stopPropagation(); onEnd() }}
                    title="End call"
                    style={{
                        width: 32, height: 32, borderRadius: '50%',
                        border: 'none',
                        background: 'var(--ac3)',
                        color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', flexShrink: 0, fontSize: 13,
                        boxShadow: '0 2px 8px var(--ac3-dim)',
                        transition: 'transform .15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = '')}
                >
                    📞
                </button>
            </div>
        </>
    )
}