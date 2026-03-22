import { memo } from "react";

/* ═══════════════════════════════════════════════════════════════
   LIGHTBOX
═══════════════════════════════════════════════════════════════ */
export const Lightbox = memo(({ url, type, onClose }: { url: string; type: 'image' | 'video'; onClose: () => void }) => (
    <div
        onClick={onClose}
        style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,.95)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
        }}
    >
        <button
            onClick={onClose}
            style={{
                position: 'absolute', top: 16, right: 16,
                background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)',
                color: '#fff', width: 36, height: 36, borderRadius: '50%',
                cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
        >✕</button>
        {type === 'image'
            ? <img src={url} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: '96vw', maxHeight: '92dvh', borderRadius: 12, objectFit: 'contain' }} />
            : <video src={url} controls autoPlay onClick={e => e.stopPropagation()} style={{ maxWidth: '96vw', maxHeight: '92dvh', borderRadius: 12 }} />
        }
    </div>
))
Lightbox.displayName = 'Lightbox'
