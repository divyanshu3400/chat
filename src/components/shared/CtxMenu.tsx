import type { MessageBundle } from "@/src/types/pb-chat.types"
import { memo } from "react"

export interface CtxTarget {
    x: number
    y: number
    id: string
    msg: MessageBundle
    isMine: boolean
    text: string
}

interface MenuItem {
    key: string
    icon: string
    label: string
    sep?: boolean
    red?: boolean
}

/* ═══════════════════════════════════════════════════════════════
   CONTEXT MENU
═══════════════════════════════════════════════════════════════ */
export const CtxMenu = memo(({ ctx, onAction }: {
    ctx: CtxTarget
    onAction: (action: string) => void
}) => {
    const items: MenuItem[] = [
        { key: 'reply', icon: '↩️', label: 'Reply' },
        { key: 'react', icon: '😊', label: 'React' },
        { key: 'star', icon: '⭐', label: 'Star' },
        { key: 'copy', icon: '📋', label: 'Copy' },
        { key: 'forward', icon: '↗️', label: 'Forward' },
        { key: 'info', icon: 'ℹ️', label: 'Info' },
        ...(ctx.isMine ? [
            { key: 'edit', icon: '✏️', label: 'Edit', sep: true },
            { key: 'delete', icon: '🗑', label: 'Delete for everyone', red: true },
        ] : [
            { key: 'report', icon: '🚩', label: 'Report', sep: true, red: true },
        ]),
    ]

    /* Position: keep in viewport */
    const W = typeof window !== 'undefined' ? window.innerWidth : 400
    const H = typeof window !== 'undefined' ? window.innerHeight : 800
    const mW = 190, mH = items.length * 42 + 12
    const x = Math.min(ctx.x, W - mW - 8)
    const y = Math.min(ctx.y, H - mH - 8)

    return (
        <div style={{
            position: 'fixed', left: x, top: y, zIndex: 400,
            background: 'var(--s2)', border: '1px solid var(--bd2)',
            borderRadius: 16, padding: 6, minWidth: mW,
            boxShadow: '0 12px 40px rgba(0,0,0,.55)',
            backdropFilter: 'blur(20px)',
            animation: 'ctxIn .15s ease both',
        }}>
            {items.map((item, i) => (
                <div key={item.key}>
                    {item.sep && <div style={{ height: 1, background: 'var(--bd)', margin: '4px 0' }} />}
                    <div
                        onClick={() => onAction(item.key)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '9px 13px', borderRadius: 10, cursor: 'pointer',
                            fontSize: 13, fontWeight: 500, color: item.red ? 'var(--ac3)' : 'var(--tx)',
                            transition: 'background .12s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--s3)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                        <span style={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</span>
                        {item.label}
                    </div>
                </div>
            ))}
        </div>
    )
})
CtxMenu.displayName = 'CtxMenu'



