import { memo } from "react";
import { Camera } from "lucide-react";
import type { UploadEntry } from "@/src/store/store";

/* ── UPLOAD PROGRESS BUBBLE ── */
export const UploadBubble = memo(({ entry, onCancel }: { entry: UploadEntry; onCancel: () => void }) => (
    <div style={{
        background: 'var(--s2)', border: '1px solid var(--bd)',
        borderRadius: 16, borderBottomRightRadius: 4,
        padding: 12, minWidth: 200, maxWidth: 280,
        alignSelf: 'flex-end', marginRight: 44,
    }}>
        {entry.preview && (
            <div style={{
                width: '100%', height: 120, borderRadius: 10, overflow: 'hidden',
                marginBottom: 10, position: 'relative',
            }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={entry.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(2px) brightness(.6)' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}><Camera /></div>
            </div>
        )}
        <div style={{ fontSize: 12, color: 'var(--tx2)', marginBottom: 8, fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.file.name}
        </div>
        {/* Progress bar */}
        <div style={{ height: 4, background: 'var(--bd)', borderRadius: 2, marginBottom: 6, overflow: 'hidden' }}>
            <div style={{
                height: '100%', borderRadius: 2,
                background: entry.status === 'failed'
                    ? 'var(--ac3)'
                    : 'linear-gradient(90deg,var(--ac),var(--ac2))',
                width: `${entry.progress}%`,
                transition: 'width .3s ease',
            }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: entry.status === 'failed' ? 'var(--ac3)' : 'var(--tx3)' }}>
                {entry.status === 'failed' ? '✕ Upload failed' : `${entry.progress}%`}
            </span>
            <button onClick={onCancel} style={{
                background: 'none', border: '1px solid var(--bd)', borderRadius: 6,
                padding: '3px 8px', fontSize: 11, color: 'var(--tx3)', cursor: 'pointer',
                fontFamily: 'var(--mono)',
            }}>
                {entry.status === 'failed' ? '↺ Retry' : '✕'}
            </button>
        </div>
    </div>
))
UploadBubble.displayName = 'UploadBubble'
