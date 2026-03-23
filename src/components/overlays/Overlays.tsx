'use client'
import { useEffect, useState } from 'react'
import { useStore } from '@/src/lib/store'

// ── LIGHTBOX ──────────────────────────────────────────────────
export function Lightbox() {
  const { lightboxUrl, setLightboxUrl } = useStore()
  if (!lightboxUrl) return null
  return (
    <div
      onClick={() => setLightboxUrl(null)}
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'rgba(0,0,0,.95)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <button
        onClick={() => setLightboxUrl(null)}
        style={{
          position: 'absolute', top: 16, right: 16,
          background: 'var(--glass2)', border: '1px solid var(--border)',
          color: 'var(--tx)', width: 36, height: 36, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 18, backdropFilter: 'blur(8px)',
        }}
      >✕</button>
      <img
        src={lightboxUrl}
        alt=""
        style={{ maxWidth: '96vw', maxHeight: '92dvh', borderRadius: 14, objectFit: 'contain' }}
        onClick={e => e.stopPropagation()}
      />
    </div>
  )
}

// ── STORY VIEWER ──────────────────────────────────────────────
export function StoryViewer() {
  const { storyViewerOpen, setStoryViewerOpen, activeStory, me } = useStore()
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!storyViewerOpen) { setProgress(0); return }
    const start = Date.now()
    const dur = 5000
    const raf = requestAnimationFrame(function tick() {
      const pct = Math.min((Date.now() - start) / dur * 100, 100)
      setProgress(pct)
      if (pct < 100) requestAnimationFrame(tick)
      else setStoryViewerOpen(false)
    })
    return () => cancelAnimationFrame(raf)
  }, [storyViewerOpen, activeStory])

  if (!storyViewerOpen || !activeStory) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 600,
      background: '#000', display: 'flex', flexDirection: 'column',
    }}>
      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 4, padding: '12px 16px 8px' }}>
        <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,.3)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#fff', borderRadius: 2, width: `${progress}%`, transition: 'none' }} />
        </div>
      </div>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 16px', position: 'absolute', top: 32, left: 0, right: 0,
      }}>
        <img src={activeStory.photoURL} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff' }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', flex: 1 }}>{activeStory.displayName}</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'rgba(255,255,255,.6)' }}>
          {new Date(activeStory.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <button onClick={() => setStoryViewerOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>✕</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <img src={activeStory.imageURL} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        <div
          style={{ position: 'absolute', left: 0, top: 0, width: '40%', height: '100%', cursor: 'pointer' }}
          onClick={() => setStoryViewerOpen(false)}
        />
        <div
          style={{ position: 'absolute', right: 0, top: 0, width: '40%', height: '100%', cursor: 'pointer' }}
          onClick={() => setStoryViewerOpen(false)}
        />
      </div>

      {/* Reply */}
      <div style={{ padding: '12px 16px', display: 'flex', gap: 8, background: 'rgba(0,0,0,.4)' }}>
        <input
          placeholder="Reply to story…"
          style={{ flex: 1, background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', padding: '10px 14px', borderRadius: 20, outline: 'none', fontFamily: 'var(--font)', fontSize: 14 }}
        />
        <button style={{
          width: 42, height: 42, flexShrink: 0, borderRadius: 'var(--r)',
          background: 'linear-gradient(135deg,var(--ac),var(--ac2))',
          border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16,
        }}>↑</button>
      </div>
    </div>
  )
}

// ── TOAST ────────────────────────────────────────────────────
export function Toast() {
  const { toastMsg } = useStore()
  return (
    <div className={`toast${toastMsg ? ' show' : ''}`}>
      {toastMsg}
    </div>
  )
}
