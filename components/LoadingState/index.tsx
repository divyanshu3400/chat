import { memo } from "react"

/* ═══════════════════════════════════════════════════════════════
   LOADING STATE
═══════════════════════════════════════════════════════════════ */
const LoadingState = memo(() => (
    <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 20,
        position: 'relative', overflow: 'hidden',
    }}>
        {/* Ambient glow */}
        <div style={{
            position: 'absolute', top: '40%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 260, height: 260, borderRadius: '50%',
            background: 'radial-gradient(circle,rgba(99,102,241,.07) 0%,transparent 70%)',
            pointerEvents: 'none',
        }} />

        {/* Spinning ring */}
        <div style={{ position: 'relative', width: 56, height: 56 }}>
            <svg width="56" height="56" viewBox="0 0 56 56" style={{ animation: 'spin 1.2s linear infinite' }}>
                <circle cx="28" cy="28" r="22"
                    fill="none" stroke="var(--border-dim)" strokeWidth="3" />
                <circle cx="28" cy="28" r="22"
                    fill="none" stroke="url(#spin-g)" strokeWidth="3"
                    strokeLinecap="round" strokeDasharray="40 100"
                    style={{ animation: 'spinDash 1.2s ease-in-out infinite' }} />
                <defs>
                    <linearGradient id="spin-g" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                </defs>
            </svg>
        </div>

        <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx-secondary)', marginBottom: 6 }}>
                Loading conversations
            </div>
            <div style={{ fontSize: 12, color: 'var(--tx-muted)', fontFamily: 'var(--font-mono)' }}>
                Decrypting your messages…
            </div>
        </div>

        {/* Skeleton rows */}
        <div style={{ width: '100%', maxWidth: 260, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[80, 65, 75].map((w, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 1 - i * .22 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-elevated)', flexShrink: 0, animation: 'skelPulse 1.6s ease-in-out infinite', animationDelay: `${i * .15}s` }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ height: 11, width: `${w}%`, borderRadius: 6, background: 'var(--bg-elevated)', marginBottom: 6, animation: 'skelPulse 1.6s ease-in-out infinite', animationDelay: `${i * .15 + .1}s` }} />
                        <div style={{ height: 9, width: `${w - 15}%`, borderRadius: 6, background: 'var(--bg-elevated)', animation: 'skelPulse 1.6s ease-in-out infinite', animationDelay: `${i * .15 + .2}s` }} />
                    </div>
                </div>
            ))}
        </div>
    </div>
))
LoadingState.displayName = 'LoadingState'
