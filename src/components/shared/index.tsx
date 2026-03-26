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
            width: 28, height: 28, borderRadius: 9, border: 'none', flexShrink: 0,
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
