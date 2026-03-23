import { memo } from "react"

/* ── DATE SEPARATOR ── */
export const DateSep = memo(({ label }: { label: string }) => (
    <div style={{
        display: 'flex',
        justifyContent: 'center',   // 👈 center horizontally
        alignItems: 'center',
        padding: '10px 16px',
        userSelect: 'none',
    }}>
        <span style={{
            fontSize: 11,
            fontFamily: 'var(--mono)',
            color: 'var(--tx3)',
            letterSpacing: '.5px',
            padding: '3px 10px',
            background: 'var(--s2)',
            border: '1px solid var(--bd)',
            borderRadius: 20,
        }}>
            {label}
        </span>
    </div>
))
DateSep.displayName = 'DateSep'