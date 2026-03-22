// ── Shared UI primitives ─────────────────────────────────────────────────────

import { memo } from "react";

export const Avatar = memo(({ name, photo, size = 40, isGroup = false, ring = false }: {
    name: string; photo?: string; size?: number; isGroup?: boolean; ring?: boolean
}) => {
    const initials = name.split(' ').map(w => w[0] ?? '').join('').substring(0, 2).toUpperCase() || '?'
    // Deterministic color from name
    const colors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6']
    const color = colors[(name.charCodeAt(0) ?? 0) % colors.length]
    const r = isGroup ? Math.round(size * 0.3) : size / 2

    return (
        <div style={{
            width: size, height: size, borderRadius: r, flexShrink: 0, position: 'relative',
            outline: ring ? '2.5px solid var(--accent)' : 'none',
            outlineOffset: ring ? 2 : 0,
            boxShadow: ring ? '0 0 0 4px rgba(99,102,241,.15)' : 'none',
        }}>
            {photo
                ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', borderRadius: r, objectFit: 'cover', display: 'block' }} />
                : <div style={{
                    width: '100%', height: '100%', borderRadius: r,
                    background: isGroup ? 'var(--bg-elevated)' : color,
                    border: '1px solid var(--border-subtle)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: size * 0.35, fontWeight: 800, color: isGroup ? 'var(--tx-muted)' : '#fff',
                    letterSpacing: -0.5,
                }}>
                    {isGroup ? '⊞' : initials}
                </div>
            }
        </div>
    )
})
Avatar.displayName = 'Avatar'


export function IconBtn({ icon, title, onClick }: { icon: string; title: string; onClick: () => void }) {
    return (
        <button
            title={title}
            onClick={onClick}
            style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'none', border: 'none',
                color: 'var(--tx-muted)', cursor: 'pointer',
                fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'var(--transition)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; (e.currentTarget as HTMLElement).style.color = 'var(--tx-primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--tx-muted)' }}
        >
            {icon}
        </button>
    )
}

export function AIThinkingDots({ label }: { label: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0' }}>
            <div style={{ display: 'flex', gap: 3 }}>
                {[0, 1, 2].map(i => (
                    <div key={i} style={{
                        width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)',
                        animation: `ai-thinking 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                ))}
            </div>
            <span style={{ fontSize: 11, color: 'var(--tx-muted)', fontFamily: 'var(--font-mono)' }}>{label}</span>
        </div>
    )
}

export function NeuralIcon({ size = 24 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="3" />
            <circle cx="4" cy="6" r="2" />
            <circle cx="20" cy="6" r="2" />
            <circle cx="4" cy="18" r="2" />
            <circle cx="20" cy="18" r="2" />
            <line x1="9" y1="11" x2="6" y2="7.5" />
            <line x1="15" y1="11" x2="18" y2="7.5" />
            <line x1="9" y1="13" x2="6" y2="16.5" />
            <line x1="15" y1="13" x2="18" y2="16.5" />
        </svg>
    )
}

export function SparkleIcon({ size = 14, active }: { size?: number; active?: boolean }) {
    return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill={active ? 'var(--accent)' : 'currentColor'}>
            <path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5z" />
        </svg>
    )
}


/* ═══════════════════════════════════════════════════════════════
   SVG ICON SET  (inline — zero deps, consistent stroke style)
═══════════════════════════════════════════════════════════════ */
export const Icon = {
    Edit: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    ),
    Group: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    Settings: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    ),
    Search: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
    ),
    X: () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
        </svg>
    ),
    Plus: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
        </svg>
    ),
    Pin: () => (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a1 1 0 0 1 1 1v1.586l6.707 6.707A1 1 0 0 1 19 13h-6v8l-1 1-1-1v-8H5a1 1 0 0 1-.707-1.707L11 4.586V3a1 1 0 0 1 1-1z" />
        </svg>
    ),
    Mute: () => (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><path d="M12 2v10" />
        </svg>
    ),
    Archive: () => (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><path d="M10 12h4" />
        </svg>
    ),
    Trash: () => (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
        </svg>
    ),
    Lightning: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
    ),
    Lock: () => (
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    ),
    Phone: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.27-.9a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
    ),
    PhoneOff: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-.9a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91" />
            <line x1="23" y1="1" x2="1" y2="23" />
        </svg>
    ),
    Mic: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
    ),
    MicOff: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
    ),
    Video: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
    ),
    VideoOff: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
            <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
    ),
    Volume: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
    ),
    VolumeOff: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
    ),
    Flip: () => (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 .49-3.39" />
        </svg>
    ),

}

/* ═══════════════════════════════════════════════════════════════
   ICON BUTTON
═══════════════════════════════════════════════════════════════ */
export const IBtn = memo(({ children, onClick, title, active, danger, badge }: {
    children: React.ReactNode; onClick: () => void; title?: string
    active?: boolean; danger?: boolean; badge?: number
}) => (
    <button
        onClick={onClick}
        title={title}
        style={{
            width: 32, height: 32, borderRadius: 9, border: 'none', flexShrink: 0,
            background: active ? 'var(--bg-elevated)' : 'transparent',
            color: danger ? 'var(--red)' : active ? 'var(--accent)' : 'var(--tx-muted)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .18s', position: 'relative',
        }}
        onMouseEnter={e => {
            const el = e.currentTarget
            el.style.background = danger ? 'rgba(239,68,68,.1)' : 'var(--bg-elevated)'
            el.style.color = danger ? 'var(--red)' : 'var(--tx-primary)'
        }}
        onMouseLeave={e => {
            const el = e.currentTarget
            el.style.background = active ? 'var(--bg-elevated)' : 'transparent'
            el.style.color = danger ? 'var(--red)' : active ? 'var(--accent)' : 'var(--tx-muted)'
        }}
    >
        {children}
        {badge != null && badge > 0 && (
            <span style={{
                position: 'absolute', top: -3, right: -3,
                background: 'var(--accent)', color: '#000',
                fontSize: 8, fontWeight: 800, fontFamily: 'var(--font-mono)',
                width: 14, height: 14, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{badge > 9 ? '9+' : badge}</span>
        )}
    </button>
))
IBtn.displayName = 'IBtn'
