import { memo, useEffect, useState } from "react";
import { NeuralIcon } from "../shared";
const TAGS = [
    { label: 'E2E Encrypted', icon: '🔐' },
    { label: 'AI Insights', icon: '✦' },
    { label: 'Real-time', icon: '⚡' },
]

/* ═══════════════════════════════════════════════════════════════
   IDLE EMPTY STATE  (no chat selected)
═══════════════════════════════════════════════════════════════ */
const IdleState = memo(({ onNewChat, onNewGroup }: { onNewChat: () => void; onNewGroup?: () => void }) => {
    const [dotPhase, setDotPhase] = useState(0)

    /* Animated neural dots */
    useEffect(() => {
        const t = setInterval(() => setDotPhase(p => (p + 1) % 6), 800)
        return () => clearInterval(t)
    }, [])

    /* Animated node positions */
    const nodes = [
        { cx: 32, cy: 32, r: 3.5, primary: true },
        { cx: 14, cy: 20, r: 2.5, primary: false },
        { cx: 50, cy: 20, r: 2.5, primary: false },
        { cx: 10, cy: 40, r: 2, primary: false },
        { cx: 54, cy: 40, r: 2, primary: false },
        { cx: 24, cy: 52, r: 2, primary: false },
        { cx: 40, cy: 52, r: 2, primary: false },
    ]
    const edges = [
        [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 3], [2, 4], [3, 5], [4, 6]
    ]

    return (
        <div
            className="grid-bg"
            style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 0, position: 'relative', overflow: 'hidden',
                padding: '0 24px 40px',
            }}
        >
            {/* Radial glow */}
            <div style={{
                position: 'absolute', top: '35%', left: '50%',
                transform: 'translate(-50%,-50%)',
                width: 320, height: 320, borderRadius: '50%',
                background: 'radial-gradient(circle,rgba(99,102,241,.07) 0%,rgba(6,182,212,.04) 40%,transparent 70%)',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', top: '60%', left: '30%',
                width: 200, height: 200, borderRadius: '50%',
                background: 'radial-gradient(circle,rgba(16,185,129,.04) 0%,transparent 70%)',
                pointerEvents: 'none',
            }} />

            {/* Animated neural icon */}
            <div style={{
                animation: 'emptyFloat 4s ease-in-out infinite',
                position: 'relative', zIndex: 1, marginBottom: 28,
            }}>
                <NeuralIcon size={72} />

                {/* Animated connection graph underneath */}
                <svg
                    width="72" height="72" viewBox="0 0 64 64"
                    style={{ position: 'absolute', inset: 0, opacity: .35 }}
                >
                    {edges.map(([a, b], i) => {
                        const na = nodes[a], nb = nodes[b]
                        const active = (dotPhase + i) % 6 < 2
                        return (
                            <line key={i}
                                x1={na.cx} y1={na.cy} x2={nb.cx} y2={nb.cy}
                                stroke={active ? '#6366f1' : '#334155'}
                                strokeWidth={active ? 1 : .5}
                                style={{ transition: 'stroke .4s, stroke-width .4s' }}
                            />
                        )
                    })}
                    {nodes.map((n, i) => {
                        const lit = (dotPhase + i) % 6 < 2
                        return (
                            <circle key={i}
                                cx={n.cx} cy={n.cy} r={n.r}
                                fill={lit ? '#6366f1' : '#334155'}
                                style={{ transition: 'fill .4s' }}
                            />
                        )
                    })}
                </svg>
            </div>

            {/* Heading */}
            <div style={{ textAlign: 'center', position: 'relative', zIndex: 1, marginBottom: 24 }}>
                <h2 style={{
                    fontSize: 22, fontWeight: 800, letterSpacing: -.5,
                    color: 'var(--tx-primary)', marginBottom: 8, lineHeight: 1.2,
                }}>
                    Cipher AI Messenger
                </h2>
                <p style={{
                    fontSize: 13, color: 'var(--tx-muted)', lineHeight: 1.75,
                    maxWidth: 260, fontFamily: 'var(--font-sans)',
                }}>
                    End-to-end encrypted conversations<br />with AI-powered insights
                </p>
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 9, zIndex: 1, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 32 }}>
                {/* Primary: Start a Chat */}
                <button
                    onClick={onNewChat}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'linear-gradient(135deg,var(--accent),rgba(6,182,212,.8))',
                        color: '#fff', border: 'none',
                        borderRadius: 11, padding: '10px 22px',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        fontFamily: 'var(--font-sans)', transition: 'all .2s',
                        boxShadow: '0 4px 18px var(--accent-glow)',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '.9'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.transform = '' }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    New Chat
                </button>

                {/* Secondary: New Group */}
                {onNewGroup && (
                    <button
                        onClick={onNewGroup}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-dim)',
                            color: 'var(--tx-secondary)', borderRadius: 11,
                            padding: '10px 22px', fontSize: 13, fontWeight: 700,
                            cursor: 'pointer', fontFamily: 'var(--font-sans)',
                            transition: 'all .2s',
                        }}
                        onMouseEnter={e => {
                            const el = e.currentTarget as HTMLElement
                            el.style.borderColor = 'var(--accent-glow)'
                            el.style.color = 'var(--accent)'
                            el.style.transform = 'translateY(-1px)'
                        }}
                        onMouseLeave={e => {
                            const el = e.currentTarget as HTMLElement
                            el.style.borderColor = 'var(--border-dim)'
                            el.style.color = 'var(--tx-secondary)'
                            el.style.transform = ''
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        New Group
                    </button>
                )}
            </div>

            {/* Feature tags */}
            <div style={{
                position: 'absolute', bottom: 24,
                display: 'flex', gap: 20, alignItems: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 10,
                color: 'var(--tx-muted)',
            }}>
                {TAGS.map((tag, i) => (
                    <span
                        key={tag.label}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            animation: 'emptyFadeIn .4s ease both',
                            animationDelay: `${i * .12}s`,
                        }}
                    >
                        <span style={{
                            color: 'var(--accent)', fontSize: tag.icon.length > 1 ? 12 : 10,
                        }}>{tag.icon}</span>
                        {tag.label}
                    </span>
                ))}
            </div>
        </div>
    )
})
IdleState.displayName = 'IdleState'

