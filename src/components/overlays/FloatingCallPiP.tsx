'use client'

import {
    useRef, useState, useEffect, useCallback,
    memo, type PointerEvent as PE,
} from 'react'
import {
    useCallData, useCallingStore,
    useMuted, useCamOff, useCallActions,
    useLocalVideoRef, useRemoteVideoRef,
} from '@/src/hooks/useCallingStore'

/* ── Types ── */
type Mode = 'small' | 'medium' | 'free'
type Corner = 'tl' | 'tr' | 'bl' | 'br'
type ResizeDir = 'se' | 'sw' | 'ne' | 'nw' | 'e' | 'w' | 's' | 'n'
interface Dims { w: number; h: number }
interface Pos { x: number; y: number }

const DIMS: Record<Exclude<Mode, 'free'>, Dims> = {
    small: { w: 200, h: 140 },
    medium: { w: 360, h: 240 },
}
const FREE_DEFAULT: Dims = { w: 400, h: 280 }
const MIN_FREE: Dims = { w: 280, h: 190 }
const PAD = 14
const TOP_OFF = 36 + PAD

/* ── Snap helpers ── */
function getSnapPos(corner: Corner, dims: Dims): Pos {
    const vw = window.innerWidth, vh = window.innerHeight
    switch (corner) {
        case 'tl': return { x: PAD, y: TOP_OFF }
        case 'tr': return { x: vw - dims.w - PAD, y: TOP_OFF }
        case 'bl': return { x: PAD, y: vh - dims.h - PAD }
        case 'br': return { x: vw - dims.w - PAD, y: vh - dims.h - PAD }
    }
}

function nearestCorner(x: number, y: number, dims: Dims): Corner {
    const vw = window.innerWidth, vh = window.innerHeight
    const cx = x + dims.w / 2, cy = y + dims.h / 2
    return cx < vw / 2 ? (cy < vh / 2 ? 'tl' : 'bl') : (cy < vh / 2 ? 'tr' : 'br')
}

/* ── Mini timer ── */
const MiniTimer = memo(({ running }: { running: boolean }) => {
    const [secs, setSecs] = useState(0)
    useEffect(() => {
        if (!running) { setSecs(0); return }
        const t = setInterval(() => setSecs(s => s + 1), 1000)
        return () => clearInterval(t)
    }, [running])
    const m = Math.floor(secs / 60), s = secs % 60
    return (
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(255,255,255,.75)', letterSpacing: 1 }}>
            {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
        </span>
    )
})
MiniTimer.displayName = 'MiniTimer'

/* ── Icon button ── */
const IBtn = memo(({ onClick, danger, active, title, size = 32, children }: {
    onClick: (e: React.MouseEvent) => void
    danger?: boolean; active?: boolean; title?: string; size?: number
    children: React.ReactNode
}) => (
    <button
        onClick={onClick} title={title}
        style={{
            width: size, height: size, borderRadius: '50%',
            border: active ? '1px solid var(--ac-glow)' : '1px solid rgba(255,255,255,.18)',
            background: danger ? 'var(--ac3)' : active ? 'var(--ac-dim)' : 'rgba(0,0,0,.5)',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            transition: 'transform .12s, background .12s',
            flexShrink: 0, padding: 0,
        } as React.CSSProperties}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.12)')}
        onMouseLeave={e => (e.currentTarget.style.transform = '')}
    >{children}</button>
))
IBtn.displayName = 'IBtn'

/* ── SVG icons ── */
const IcoPhone = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10.7 11.7A10 10 0 0 1 1.5 3.5M5 3a2 2 0 0 0-.3 1 6.5 6.5 0 0 0 .3 1.6 1 1 0 0 1-.2 1L4 7.5M12.5 12.5l-.8-.9a1 1 0 0 0-1-.2 6.5 6.5 0 0 1-1.6.3 1 1 0 0 1-.8-1v-.2M14.5 11.5v2a1 1 0 0 1-1 1 9.8 9.8 0 0 1-3-.8" /><path d="M1 1l14 14" /></svg>
const IcoMic = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="5.5" y="1" width="5" height="8" rx="2.5" /><path d="M2.5 8A5.5 5.5 0 0 0 8 13.5 5.5 5.5 0 0 0 13.5 8" /><path d="M8 13.5V15M5.5 15h5" /></svg>
const IcoMicOff = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5.5 5v4a2.5 2.5 0 0 0 3.6 2.3M8 1a2.5 2.5 0 0 1 2.5 2.5v2.5" /><path d="M2.5 8A5.5 5.5 0 0 0 8 13.5 5.5 5.5 0 0 0 13.5 8" /><path d="M8 13.5V15M5.5 15h5" /><path d="M1 1l14 14" /></svg>
const IcoCam = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="1" y="4.5" width="9" height="7" rx="1.5" /><path d="M10 6.5l5-2v7l-5-2V6.5Z" /></svg>
const IcoCamOff = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10 6.5l5-2v7l-5-2" /><rect x="1" y="4.5" width="9" height="7" rx="1.5" /><path d="M1 1l14 14" /></svg>
const IcoExpand = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9.5 1.5H14.5V6.5M6.5 14.5H1.5V9.5M14.5 1.5L9 7M7 9L1.5 14.5" /></svg>

/* ── Resize handle ── */
function ResizeHandle({ dir, onResizeStart }: {
    dir: ResizeDir
    onResizeStart: (e: React.PointerEvent, dir: ResizeDir) => void
}) {
    const cursors: Record<ResizeDir, string> = { se: 'se-resize', sw: 'sw-resize', ne: 'ne-resize', nw: 'nw-resize', e: 'e-resize', w: 'w-resize', s: 's-resize', n: 'n-resize' }
    const style: React.CSSProperties = { position: 'absolute', zIndex: 20, cursor: cursors[dir] }
    if (dir === 'se') Object.assign(style, { right: 0, bottom: 0, width: 14, height: 14 })
    if (dir === 'sw') Object.assign(style, { left: 0, bottom: 0, width: 14, height: 14 })
    if (dir === 'ne') Object.assign(style, { right: 0, top: 0, width: 14, height: 14 })
    if (dir === 'nw') Object.assign(style, { left: 0, top: 0, width: 14, height: 14 })
    if (dir === 'e') Object.assign(style, { right: 0, top: 14, width: 6, bottom: 14 })
    if (dir === 'w') Object.assign(style, { left: 0, top: 14, width: 6, bottom: 14 })
    if (dir === 's') Object.assign(style, { bottom: 0, left: 14, height: 6, right: 14 })
    if (dir === 'n') Object.assign(style, { top: 0, left: 14, height: 6, right: 14 })
    return <div style={style} onPointerDown={e => { e.stopPropagation(); onResizeStart(e, dir) }} />
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT — no props needed, all from store
═══════════════════════════════════════════════════════════════ */
export default function FloatingCallPiP() {
    const callData = useCallData()
    const muted = useMuted()
    const camOff = useCamOff()
    const connected = useCallingStore(s => s.connected)

    /* ── Video ref callbacks from store ── */
    const setLocalVideoEl = useLocalVideoRef()
    const setRemoteVideoEl = useRemoteVideoRef()

    const { endCall, toggleMute, toggleCam, expand } = useCallActions()

    const [mode, setMode] = useState<Mode>('medium')
    const [corner, setCorner] = useState<Corner>('tr')
    const [pos, setPos] = useState<Pos>({ x: 0, y: 0 })
    const [freeDims, setFreeDims] = useState<Dims>(FREE_DEFAULT)
    const [showCtrl, setShowCtrl] = useState(false)

    const isDragging = useRef(false)
    const isResizing = useRef(false)
    const resizeDir = useRef<ResizeDir>('se')
    const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 })
    const resizeStart = useRef({ mx: 0, my: 0, px: 0, py: 0, pw: 0, ph: 0 })
    const windowRef = useRef<HTMLDivElement>(null)
    const hideTimer = useRef<ReturnType<typeof setTimeout>>()

    const dims: Dims = mode === 'free' ? freeDims : DIMS[mode]

    useEffect(() => { setPos(getSnapPos('tr', dims)) }, [])
    useEffect(() => { setPos(getSnapPos(corner, mode === 'free' ? freeDims : DIMS[mode])) }, [mode])
    useEffect(() => {
        function onResize() { setPos(getSnapPos(corner, mode === 'free' ? freeDims : DIMS[mode])) }
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [corner, mode, freeDims])

    const showControls = useCallback(() => {
        setShowCtrl(true)
        clearTimeout(hideTimer.current)
        hideTimer.current = setTimeout(() => setShowCtrl(false), 2800)
    }, [])

    function onPointerDown(e: PE<HTMLDivElement>) {
        if ((e.target as HTMLElement).closest('button')) return
        if (isResizing.current) return
        isDragging.current = true
        dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
        windowRef.current?.setPointerCapture(e.pointerId)
        e.currentTarget.style.transition = 'none'
    }

    function onPointerMove(e: PE<HTMLDivElement>) {
        if (isDragging.current) {
            const nx = dragStart.current.px + (e.clientX - dragStart.current.mx)
            const ny = dragStart.current.py + (e.clientY - dragStart.current.my)
            setPos({ x: Math.max(0, Math.min(nx, window.innerWidth - dims.w)), y: Math.max(36, Math.min(ny, window.innerHeight - dims.h)) })
        }
        if (isResizing.current && mode === 'free') {
            const dx = e.clientX - resizeStart.current.mx
            const dy = e.clientY - resizeStart.current.my
            const dir = resizeDir.current
            let nw = resizeStart.current.pw, nh = resizeStart.current.ph
            let nx = resizeStart.current.px, ny = resizeStart.current.py
            if (dir.includes('e')) nw = Math.max(MIN_FREE.w, resizeStart.current.pw + dx)
            if (dir.includes('s')) nh = Math.max(MIN_FREE.h, resizeStart.current.ph + dy)
            if (dir.includes('w')) { nw = Math.max(MIN_FREE.w, resizeStart.current.pw - dx); nx = resizeStart.current.px + (resizeStart.current.pw - nw) }
            if (dir.includes('n')) { nh = Math.max(MIN_FREE.h, resizeStart.current.ph - dy); ny = resizeStart.current.py + (resizeStart.current.ph - nh) }
            setFreeDims({ w: nw, h: nh }); setPos({ x: nx, y: ny })
        }
    }

    function onPointerUp(e: PE<HTMLDivElement>) {
        if (isDragging.current) {
            isDragging.current = false
            const c = nearestCorner(pos.x, pos.y, dims)
            setCorner(c); setPos(getSnapPos(c, dims))
            if (windowRef.current) windowRef.current.style.transition = ''
        }
        if (isResizing.current) isResizing.current = false
    }

    function onResizeStart(e: PE, dir: ResizeDir) {
        isResizing.current = true; resizeDir.current = dir
        resizeStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y, pw: freeDims.w, ph: freeDims.h }
        windowRef.current?.setPointerCapture(e.pointerId)
    }

    function cycleMode() { setMode(m => m === 'small' ? 'medium' : m === 'medium' ? 'free' : 'small') }

    if (!callData) return null

    const name = callData.isIncoming ? (callData.callerName ?? 'Unknown') : callData.peerName
    const photo = callData.isIncoming ? (callData.callerPhoto ?? undefined) : callData.peerPhoto
    const initials = name.split(' ').map(w => w[0] ?? '').join('').substring(0, 2).toUpperCase()
    const isSmall = mode === 'small'
    const isMedium = mode === 'medium' || mode === 'free'
    const ctrlSize = isSmall ? 28 : 32

    return (
        <>
            <style>{`
        @keyframes pipIn { from{opacity:0;transform:scale(.88)} to{opacity:1;transform:scale(1)} }
        @keyframes pipPulse { 0%,100%{opacity:1} 50%{opacity:.45} }
      `}</style>

            <div
                ref={windowRef}
                onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
                onMouseEnter={showControls} onMouseMove={showControls} onTouchStart={showControls}
                style={{
                    position: 'fixed', left: pos.x, top: pos.y, width: dims.w, height: dims.h,
                    zIndex: 650, borderRadius: isSmall ? 14 : 18, overflow: 'hidden',
                    background: '#05071a',
                    boxShadow: '0 12px 48px rgba(0,0,0,.75),0 0 0 1px rgba(255,255,255,.1)',
                    cursor: isDragging.current ? 'grabbing' : 'grab',
                    userSelect: 'none', touchAction: 'none',
                    animation: 'pipIn .3s cubic-bezier(.34,1.56,.64,1)',
                    transition: isDragging.current || isResizing.current
                        ? 'none'
                        : 'left .22s cubic-bezier(.4,0,.2,1),top .22s cubic-bezier(.4,0,.2,1),width .2s ease,height .2s ease',
                }}
            >
                {/* REMOTE VIDEO — fills entire PiP */}
                <video
                    ref={setRemoteVideoEl}     /* ← store ref callback, auto-binds stream */
                    autoPlay playsInline
                    style={{
                        position: 'absolute', inset: 0,
                        width: '100%', height: '100%',
                        objectFit: 'contain',          /* ← contain fixes mobile zoom */
                        background: '#000',
                        pointerEvents: 'none', zIndex: 1,
                    }}
                />

                {/* FALLBACK BG when no remote video yet */}
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 0,
                    background: 'linear-gradient(160deg,#05071a,#0c0e24)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                    <div style={{
                        width: isSmall ? 38 : 52, height: isSmall ? 38 : 52,
                        borderRadius: '50%', overflow: 'hidden',
                        border: '2px solid var(--ac-glow)', background: 'var(--bg3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: isSmall ? 14 : 18, fontWeight: 700, color: 'var(--ac)', flexShrink: 0,
                    }}>
                        {photo ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
                    </div>
                    {!isSmall && <span style={{ fontSize: 11, color: 'var(--tx3)', fontFamily: 'var(--mono)' }}>Connecting…</span>}
                </div>

                {/* LOCAL VIDEO PiP — medium + free mode */}
                {isMedium && !camOff && (
                    <div style={{
                        position: 'absolute', bottom: isSmall ? 6 : 10, right: isSmall ? 6 : 10,
                        width: isSmall ? 50 : 72, height: isSmall ? 70 : 96,
                        borderRadius: 8, overflow: 'hidden', zIndex: 3,
                        border: '1.5px solid rgba(255,255,255,.22)',
                        boxShadow: '0 2px 10px rgba(0,0,0,.5)',
                    }}>
                        <video
                            ref={setLocalVideoEl}   /* ← store ref callback, auto-binds stream */
                            autoPlay muted playsInline
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                    </div>
                )}

                {/* TOP STRIP */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 4,
                    background: 'linear-gradient(to bottom,rgba(0,0,0,.7) 0%,transparent 100%)',
                    padding: isSmall ? '7px 9px 10px' : '10px 12px 14px',
                    display: 'flex', alignItems: 'center', gap: 7,
                }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0, animation: 'pipPulse 2s ease infinite' }} />
                    <span style={{ flex: 1, fontSize: isSmall ? 10 : 12, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name}
                    </span>
                    <MiniTimer running={connected} />
                </div>

                {/* CONTROLS */}
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 5,
                    background: 'linear-gradient(to top,rgba(0,0,0,.8) 0%,transparent 100%)',
                    padding: isSmall ? '12px 8px 8px' : '18px 10px 10px',
                    display: 'flex', alignItems: 'center',
                    justifyContent: isSmall ? 'center' : 'space-between',
                    gap: isSmall ? 8 : 6,
                    opacity: showCtrl ? 1 : 0, transition: 'opacity .2s ease',
                    pointerEvents: showCtrl ? 'auto' : 'none',
                }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <IBtn onClick={e => { e.stopPropagation(); toggleMute() }} active={muted} title={muted ? 'Unmute' : 'Mute'} size={ctrlSize}>
                            {muted ? <IcoMicOff /> : <IcoMic />}
                        </IBtn>
                        <IBtn onClick={e => { e.stopPropagation(); toggleCam() }} active={camOff} title={camOff ? 'Show cam' : 'Hide cam'} size={ctrlSize}>
                            {camOff ? <IcoCamOff /> : <IcoCam />}
                        </IBtn>
                    </div>
                    <IBtn onClick={e => { e.stopPropagation(); endCall() }} danger title="End call" size={isSmall ? 32 : 38}>
                        <IcoPhone />
                    </IBtn>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <IBtn onClick={e => { e.stopPropagation(); expand() }} title="Expand" size={ctrlSize}>
                            <IcoExpand />
                        </IBtn>
                        {!isSmall && (
                            <IBtn onClick={e => { e.stopPropagation(); cycleMode() }} title="Change size" size={ctrlSize}>
                                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                    <rect x="1.5" y="1.5" width="13" height="13" rx="2" /><path d="M5.5 1.5v13M1.5 5.5h4M1.5 10.5h4" />
                                </svg>
                            </IBtn>
                        )}
                    </div>
                </div>

                {/* Drag indicator */}
                <div style={{
                    position: 'absolute', top: 5, left: '50%', transform: 'translateX(-50%)',
                    width: 28, height: 3, borderRadius: 2,
                    background: 'rgba(255,255,255,.2)', zIndex: 6,
                    opacity: showCtrl ? 0 : 0.55, transition: 'opacity .2s',
                    pointerEvents: 'none',
                }} />

                {/* Resize handles (free mode) */}
                {mode === 'free' && (
                    (['se', 'sw', 'ne', 'nw', 'e', 'w', 's', 'n'] as ResizeDir[]).map(dir => (
                        <ResizeHandle key={dir} dir={dir} onResizeStart={onResizeStart} />
                    ))
                )}
            </div>
        </>
    )
}