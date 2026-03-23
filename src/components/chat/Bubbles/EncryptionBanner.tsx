import { memo } from "react"

/* ── ENCRYPTION BANNER ── */
export const EncryptionBanner = memo(({ isGroup }: { isGroup: boolean }) => (
    <div style={{
        margin: '8px 16px 4px',
        background: 'rgba(16,185,129,.06)',
        border: '1px solid rgba(16,185,129,.15)',
        borderRadius: 14, padding: '12px 16px',
        display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
        <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>🔐</span>
        <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(16,185,129,.9)', marginBottom: 3 }}>
                {isGroup ? 'Group Chat' : 'End-to-end encrypted'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--tx3)', lineHeight: 1.6 }}>
                {isGroup
                    ? 'Messages are visible to all group members. Admins can manage members and settings.'
                    : 'Messages are secured with end-to-end encryption. Only you and the recipient can read them — not even Cipher.'}
            </div>
        </div>
    </div>
))
EncryptionBanner.displayName = 'EncryptionBanner'
