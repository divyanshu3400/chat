import { memo, useEffect, useState } from "react";

/* ═══════════════════════════════════════════════════════════════
   CALL TIMER
═══════════════════════════════════════════════════════════════ */
export const CallTimer = memo(({ running }: { running: boolean }) => {
    const [secs, setSecs] = useState(0)
    useEffect(() => {
        if (!running) { setSecs(0); return }
        const t = setInterval(() => setSecs(s => s + 1), 1000)
        return () => clearInterval(t)
    }, [running])
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return (
        <span style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'rgba(255,255,255,.75)', letterSpacing: 1 }}>
            {h > 0
                ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
                : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
            }
        </span>
    )
})
CallTimer.displayName = 'CallTimer'
/* ═══════════════════════════════════════════════════════════════
   QUALITY BARS
═══════════════════════════════════════════════════════════════ */
export const QualityBars = memo(({ level }: { level: 0 | 1 | 2 | 3 }) => (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
        {[1, 2, 3].map(i => (
            <div key={i} style={{
                width: 3, height: 4 + i * 3, borderRadius: 2,
                background: i <= level ? 'var(--green)' : 'rgba(255,255,255,.25)',
                transition: 'background .3s',
            }} />
        ))}
    </div>
))
QualityBars.displayName = 'QualityBars'


/* ═══════════════════════════════════════════════════════════════
   AVATAR with pulse rings
═══════════════════════════════════════════════════════════════ */
export const CallAvatar = memo(({ name, photo, size, ringing }: {
    name: string; photo?: string; size: number; ringing: boolean
}) => {
    const palette = ['var(--ac2)', 'var(--ac)', 'var(--ac4)', 'var(--ac5)', 'var(--ac3)']
    const color = palette[(name.charCodeAt(0) ?? 0) % palette.length]
    const initials = name.split(' ').map(w => w[0] ?? '').join('').substring(0, 2).toUpperCase() || '?'

    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            {ringing && [1, 2, 3].map(i => (
                <div key={i} style={{
                    position: 'absolute',
                    inset: -(i * 14),
                    borderRadius: '50%',
                    border: `1px solid rgba(0,245,255,${.22 - i * .06})`,
                    animation: `callPulse ${1.6 + i * .55}s ease-out infinite`,
                    animationDelay: `${i * .38}s`,
                    pointerEvents: 'none',
                }} />
            ))}
            <div style={{
                width: size, height: size, borderRadius: '50%', overflow: 'hidden',
                border: '3px solid var(--ac-glow)',
                boxShadow: '0 0 0 4px var(--ac-dim)',
            }}>
                {photo
                    ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    : <div style={{ width: '100%', height: '100%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * .36, fontWeight: 800, color: '#fff' }}>
                        {initials}
                    </div>
                }
            </div>
        </div>
    )
})
CallAvatar.displayName = 'CallAvatar'

/* ═══════════════════════════════════════════════════════════════
   CONTROL BUTTON
═══════════════════════════════════════════════════════════════ */
export const CtrlBtn = memo(({ onClick, active, danger, accept, size = 58, label, children }: {
    onClick: () => void; active?: boolean; danger?: boolean; accept?: boolean
    size?: number; label?: string; children: React.ReactNode
}) => {
    const bg = danger ? 'var(--ac3)'
        : accept ? 'var(--ac4)'
            : active ? 'var(--ac-dim)'
                : 'rgba(255,255,255,.14)'
    const shadow = danger ? '0 4px 20px var(--ac3-dim)'
        : accept ? '0 4px 20px rgba(0,245,160,.35)'
            : 'none'
    const border = active && !danger && !accept ? '1px solid var(--ac-glow)' : '1px solid rgba(255,255,255,.12)'

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
            <button
                onClick={onClick}
                style={{
                    width: size, height: size, borderRadius: '50%',
                    border, background: bg, color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all .18s', boxShadow: shadow,
                    WebkitTapHighlightColor: 'transparent',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
                onMouseLeave={e => (e.currentTarget.style.transform = '')}
            >
                {children}
            </button>
            {label && (
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
                    {label}
                </span>
            )}
        </div>
    )
})
CtrlBtn.displayName = 'CtrlBtn'
