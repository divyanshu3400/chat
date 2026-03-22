import { memo } from "react"

/* ── DATE SEPARATOR ── */
export const DateSep = memo(({ label }: { label: string }) => (
    <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px', userSelect: 'none',
    }}>
        <div style={{ flex: 1, height: 1, background: 'var(--bd)' }} />
        <span style={{
            fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--tx3)',
            letterSpacing: '.5px', padding: '3px 10px',
            background: 'var(--s2)', border: '1px solid var(--bd)',
            borderRadius: 20,
        }}>{label}</span>
        <div style={{ flex: 1, height: 1, background: 'var(--bd)' }} />
    </div>
))
DateSep.displayName = 'DateSep'
