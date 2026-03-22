import { memo } from "react";

export interface ReactorSheet {
    emoji: string
    users: { uid: string; name: string; photo: string }[]
}


/* ═══════════════════════════════════════════════════════════════
   REACTOR SHEET (who reacted with an emoji)
═══════════════════════════════════════════════════════════════ */
export const ReactorSheet = memo(({ sheet, onClose }: { sheet: ReactorSheet; onClose: () => void }) => (
    <div
        onClick={onClose}
        style={{
            position: 'fixed', inset: 0, zIndex: 350,
            background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-end', padding: 16,
        }}
    >
        <div
            onClick={e => e.stopPropagation()}
            style={{
                width: '100%', maxWidth: 480, margin: '0 auto',
                background: 'var(--s1)', border: '1px solid var(--bd)',
                borderRadius: 20, padding: 20,
                animation: 'panelUp .3s cubic-bezier(.34,1.56,.64,1)',
            }}
        >
            <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 8 }}>{sheet.emoji}</div>
            <div style={{ fontSize: 13, fontWeight: 700, textAlign: 'center', marginBottom: 14, color: 'var(--tx2)' }}>
                {sheet.users.length} reaction{sheet.users.length !== 1 ? 's' : ''}
            </div>
            {sheet.users.map(u => (
                <div key={u.uid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--bd)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--s3)', overflow: 'hidden' }}>
                        {u.photo && <img src={u.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</span>
                </div>
            ))}
        </div>
    </div>
))
ReactorSheet.displayName = 'ReactorSheet'
