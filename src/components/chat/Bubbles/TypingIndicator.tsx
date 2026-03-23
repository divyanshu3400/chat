import { memo } from "react"



/* ── TYPING INDICATOR ── */
export const TypingIndicator = memo(({ names }: { names: string[] }) => {
    const label = names.length === 1 ? `${names[0]} is typing`
        : names.length === 2 ? `${names[0]} and ${names[1]} are typing`
            : 'Several people are typing'
    return (
        <div style={{ padding: '0 20px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'var(--s2)', border: '1px solid var(--bd)',
                borderRadius: 16, borderBottomLeftRadius: 4,
                padding: '8px 14px',
            }}>
                {[0, 1, 2].map(i => (
                    <div key={i} style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: 'var(--tx3)',
                        animation: 'typBounce 1.2s ease infinite',
                        animationDelay: `${i * .18}s`,
                    }} />
                ))}
                <span style={{ fontSize: 11, color: 'var(--tx3)', fontFamily: 'var(--mono)', marginLeft: 6 }}>
                    {label}
                </span>
            </div>
        </div>
    )
})
TypingIndicator.displayName = 'TypingIndicator'
