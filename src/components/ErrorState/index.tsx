import { memo } from "react";

/* ═══════════════════════════════════════════════════════════════
   ERROR STATE
═══════════════════════════════════════════════════════════════ */
const ErrorState = memo(({ message, onRetry }: { message: string; onRetry?: () => void }) => (
    <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        padding: '40px 32px', textAlign: 'center',
    }}>
        {/* Warning icon */}
        <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(239,68,68,.08)',
            border: '1px solid rgba(239,68,68,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
        }}>⚠️</div>

        <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx-primary)', marginBottom: 6 }}>
                Failed to load
            </div>
            <div style={{ fontSize: 12, color: 'var(--tx-muted)', lineHeight: 1.7, maxWidth: 220, fontFamily: 'var(--font-mono)' }}>
                {message}
            </div>
        </div>

        {onRetry && (
            <button
                onClick={onRetry}
                style={{
                    padding: '9px 24px', borderRadius: 10,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-dim)',
                    color: 'var(--tx-secondary)', fontFamily: 'var(--font-sans)',
                    fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    transition: 'all .18s', display: 'flex', alignItems: 'center', gap: 7,
                }}
                onMouseEnter={e => {
                    const el = e.currentTarget
                    el.style.borderColor = 'var(--accent-glow)'
                    el.style.color = 'var(--accent)'
                }}
                onMouseLeave={e => {
                    const el = e.currentTarget
                    el.style.borderColor = 'var(--border-dim)'
                    el.style.color = 'var(--tx-secondary)'
                }}
            >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                    <path d="M8 16H3v5" />
                </svg>
                Retry
            </button>
        )}
    </div>
))
ErrorState.displayName = 'ErrorState'
