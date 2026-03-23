'use client'

/**
 * FloatingCallWindow.tsx
 *
 * The single call component. Handles:
 *   • Full-screen incoming / outgoing / connected call UI
 *   • Minimize → defers to FloatingCallPiP (video) or ActiveCallBar (audio)
 *     which are rendered by CipherApp when minimized === true
 *
 * Architecture:
 *   useActiveCall()     — shared muted / camOff / minimized (Zustand)
 *   globalLocalRef      — shared video <video> ref (module singleton)
 *   globalRemoteRef     — shared video <video> ref (module singleton)
 *   useWebRTC()         — WebRTC + Firebase signaling
 *   useRingtone()       — Web Audio ringtone / ringback
 */

import { useEffect, useState, useCallback, useRef, memo } from 'react'
import { useStore } from '@/lib/store'
import { useWebRTC } from '@/hooks/useWebRTC'
import { useRingtone } from '@/hooks/useRingtone'
import { useActiveCall } from '@/hooks/useActiveCall'
import { globalLocalRef, globalRemoteRef, rebindStreams } from '@/hooks/useWebRTCRefs'
import { getDatabase, ref, onValue, off } from 'firebase/database'
import { getApp } from 'firebase/app'
import { Icon } from '@/components/shared/Icons'
import type { CallData } from '@/types'

/* ═══════════════════════════════════════════════════════════════
   PROPS
═══════════════════════════════════════════════════════════════ */
interface CallActions {
  toggleMute: (muted: boolean) => void
  toggleCam: (camOff: boolean) => void
  hangup: (cid: string) => Promise<void>
  releaseMedia: () => void
  pcRef: React.MutableRefObject<RTCPeerConnection | null>
}

interface Props {
  callData: CallData | null
  onEnd: () => void
  onAccept: () => void
  onReject: () => void
  /** CipherApp uses this to call toggleMute/toggleCam/hangup from minimized UI */
  onRegisterActions?: (actions: CallActions) => void
}

/* ═══════════════════════════════════════════════════════════════
   CALL TIMER
═══════════════════════════════════════════════════════════════ */
const CallTimer = memo(({ running }: { running: boolean }) => {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    if (!running) { setSecs(0); return }
    const t = setInterval(() => setSecs(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [running])
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return (
    <span style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'rgba(255,255,255,.75)', letterSpacing: 1 }}>
      {h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`}
    </span>
  )
})
CallTimer.displayName = 'CallTimer'

/* ═══════════════════════════════════════════════════════════════
   QUALITY BARS
═══════════════════════════════════════════════════════════════ */
const QualityBars = memo(({ level }: { level: 0 | 1 | 2 | 3 }) => (
  <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
    {[1, 2, 3].map(i => (
      <div key={i} style={{
        width: 3, height: 4 + i * 3, borderRadius: 2,
        background: i <= level ? 'var(--green)' : 'rgba(255,255,255,.25)',
        transition: 'background .3s',
      }} />
    ))}
  </div>
))
QualityBars.displayName = 'QualityBars'

/* ═══════════════════════════════════════════════════════════════
   CALL AVATAR  (with pulse rings while ringing)
═══════════════════════════════════════════════════════════════ */
const CallAvatar = memo(({ name, photo, size, ringing }: {
  name: string; photo?: string; size: number; ringing: boolean
}) => {
  const palette = ['var(--ac2)', 'var(--ac)', 'var(--ac4)', 'var(--ac5)', 'var(--ac3)']
  const color = palette[(name.charCodeAt(0) ?? 0) % palette.length]
  const initials = name.split(' ').map(w => w[0] ?? '').join('').substring(0, 2).toUpperCase() || '?'
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {ringing && [1, 2, 3].map(i => (
        <div key={i} style={{
          position: 'absolute', inset: -(i * 14), borderRadius: '50%',
          border: `1px solid rgba(0,245,255,${.22 - i * .06})`,
          animation: `callPulse ${1.6 + i * .55}s ease-out infinite`,
          animationDelay: `${i * .38}s`,
          pointerEvents: 'none',
        }} />
      ))}
      <div style={{
        width: size, height: size, borderRadius: '50%', overflow: 'hidden',
        border: '3px solid var(--ac-glow)',
        boxShadow: '0 0 0 4px var(--ac-dim)',
      }}>
        {photo
          ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', height: '100%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * .36, fontWeight: 800, color: '#fff' }}>
            {initials}
          </div>
        }
      </div>
    </div>
  )
})
CallAvatar.displayName = 'CallAvatar'

/* ═══════════════════════════════════════════════════════════════
   CONTROL BUTTON
═══════════════════════════════════════════════════════════════ */
const CtrlBtn = memo(({ onClick, active, danger, accept, size = 58, label, children }: {
  onClick: () => void; active?: boolean; danger?: boolean; accept?: boolean
  size?: number; label?: string; children: React.ReactNode
}) => {
  const bg = danger ? 'var(--ac3)'
    : accept ? 'var(--ac4)'
      : active ? 'var(--ac-dim)'
        : 'rgba(255,255,255,.14)'
  const shadow = danger ? '0 4px 20px var(--ac3-dim)'
    : accept ? '0 4px 20px rgba(0,245,160,.35)'
      : 'none'
  const border = active && !danger && !accept
    ? '1px solid var(--ac-glow)'
    : '1px solid rgba(255,255,255,.12)'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
      <button
        onClick={onClick}
        style={{
          width: size, height: size, borderRadius: '50%',
          border, background: bg, color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .18s', boxShadow: shadow,
          WebkitTapHighlightColor: 'transparent',
        } as React.CSSProperties}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={e => (e.currentTarget.style.transform = '')}
      >
        {children}
      </button>
      {label && (
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      )}
    </div>
  )
})
CtrlBtn.displayName = 'CtrlBtn'

/* ═══════════════════════════════════════════════════════════════
   STATUS LABEL
═══════════════════════════════════════════════════════════════ */
function getStatusLabel(status: string, isIncoming: boolean): string {
  switch (status) {
    case 'ringing': return isIncoming ? 'Incoming…' : 'Ringing…'
    case 'connecting': return 'Connecting…'
    case 'connected': return 'Connected'
    case 'failed': return 'Call failed'
    case 'ended': return 'Call ended'
    default: return isIncoming ? 'Incoming…' : 'Connecting…'
  }
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function FloatingCallWindow({ callData, onEnd, onAccept, onReject, onRegisterActions }: Props) {
  const { callOverlayOpen, showToast, me } = useStore()
  const { startRingtone, startRingback, stop: stopRingtone } = useRingtone()

  /* Shared call UI state — used by FloatingCallPiP + ActiveCallBar too */
  const {
    minimized, setMinimized,
    muted, setMuted,
    camOff, setCamOff,
    reset: resetCallUI,
  } = useActiveCall()

  /* Speaker stays local — it's device-specific, not shared */
  const [speakerOff, setSpeakerOff] = useState(false)

  /* Use global singleton refs so stream binding persists during minimize/expand */
  const localRef = globalLocalRef as React.RefObject<HTMLVideoElement>
  const remoteRef = globalRemoteRef as React.RefObject<HTMLVideoElement>

  const {
    pcRef,
    connected, quality, callStatus,
    startCaller, startCallee,
    toggleMute, toggleCam,
    hangup, releaseMedia,
  } = useWebRTC()

  /* Register WebRTC actions with CipherApp so minimized UI can call them
     without needing its own useWebRTC() instance (which would create a 2nd PC) */
  useEffect(() => {
    onRegisterActions?.({ toggleMute, toggleCam, hangup, releaseMedia, pcRef })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRegisterActions])

  /* Re-bind streams when <video> elements mount (handles minimize → expand) */
  useEffect(() => {
    rebindStreams(pcRef)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Stable refs for UIDs — avoids stale closures without adding callData to deps */
  const callerUidRef = useRef(callData?.callerUid ?? '')
  const calleeUidRef = useRef(callData?.calleeUid ?? '')
  useEffect(() => {
    callerUidRef.current = callData?.callerUid ?? ''
    calleeUidRef.current = callData?.calleeUid ?? ''
  }, [callData?.callerUid, callData?.calleeUid])

  const isVideo = (callData?.mode ?? 'audio') === 'video'
  const isIncoming = callData?.isIncoming ?? false
  const cid = callData?.cid ?? ''

  /* ── OUTGOING: start ringback + WebRTC ─────────────────────── */
  useEffect(() => {
    if (!callOverlayOpen || !callData || isIncoming || !cid) return
    startRingback()
    startCaller(
      cid, isVideo,
      callerUidRef.current || me?.uid || '',
      calleeUidRef.current,
    ).catch(err => {
      console.error('[Call] startCaller failed:', err)
      releaseMedia()
      stopRingtone()
      showToast('Could not access microphone / camera')
      onEnd()
    })
    return () => { stopRingtone(); hangup(cid) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callOverlayOpen, cid])

  /* ── INCOMING: play ringtone until accepted/rejected ──────── */
  useEffect(() => {
    if (!callOverlayOpen || !isIncoming || connected) return
    startRingtone()
    return () => stopRingtone()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callOverlayOpen, isIncoming, connected])

  /* ── Stop ringback when call connects ────────────────────── */
  useEffect(() => {
    if (connected) stopRingtone()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected])

  /* ── Remote hangup listener ──────────────────────────────── */
  useEffect(() => {
    if (!callOverlayOpen || !cid) return
    const db = getDatabase(getApp())
    const statusRef = ref(db, `calls/${cid}/status`)
    let initialLoadDone = false
    const unsub = onValue(statusRef, snap => {
      const status = snap.val()
      /* Skip first emit — it's the current DB value, not a new change */
      if (!initialLoadDone) { initialLoadDone = true; return }
      if (status === 'ended') {
        stopRingtone()
        showToast('Call ended.')
        resetCallUI()
        onEnd()
      }
    })
    return () => off(statusRef, 'value', unsub as any)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callOverlayOpen, cid])

  /* ── Accept ─────────────────────────────────────────────── */
  const handleAccept = useCallback(async () => {
    if (!cid) return
    stopRingtone()
    try {
      await startCallee(cid, isVideo)
      onAccept()
    } catch (err) {
      console.error('[Call] startCallee failed:', err)
      releaseMedia()
      showToast('Could not access microphone / camera')
      onReject()
    }
  }, [cid, isVideo, stopRingtone, startCallee, onAccept, releaseMedia, showToast, onReject])

  /* ── Reject ──────────────────────────────────────────────── */
  const handleReject = useCallback(async () => {
    stopRingtone()
    await hangup(cid)
    onReject()
  }, [cid, stopRingtone, hangup, onReject])

  /* ── End ─────────────────────────────────────────────────── */
  const handleEnd = useCallback(async () => {
    stopRingtone()
    releaseMedia()
    await hangup(cid)
    resetCallUI()
    setSpeakerOff(false)
    onEnd()
  }, [cid, stopRingtone, hangup, releaseMedia, resetCallUI, onEnd])

  /* ── Mute / cam ──────────────────────────────────────────── */
  const handleToggleMute = useCallback(() => {
    toggleMute(!muted)
    setMuted(!muted)
  }, [muted, toggleMute, setMuted])

  const handleToggleCam = useCallback(() => {
    toggleCam(!camOff)
    setCamOff(!camOff)
  }, [camOff, toggleCam, setCamOff])

  /* ── GUARD — after all hooks ─────────────────────────────── */
  if (!callOverlayOpen || !callData) return null

  /* When minimized: this renders null — CipherApp renders
     FloatingCallPiP (video) or ActiveCallBar (audio) instead */
  if (minimized) return null

  /* Derived */
  const displayName = isIncoming ? (callData.callerName ?? 'Unknown') : callData.peerName
  const displayPhoto = isIncoming ? (callData.callerPhoto ?? undefined) : callData.peerPhoto
  const videoActive = connected && isVideo
  const isRinging = !connected && (callStatus === 'ringing' || callStatus === 'idle')

  /* ═══════════════════════════════════════════════════════════
     RENDER — full-screen call UI
  ═══════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{`
        @keyframes callPulse { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.7);opacity:0} }
        @keyframes callIn    { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }
        @keyframes callSlide { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── BACKDROP ── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 700,
        background: 'linear-gradient(160deg,#05071a 0%,#0b0d20 50%,#07091a 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        overflow: 'hidden', animation: 'callIn .3s ease',
      }}>

        {/* Ambient blobs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', top: '-15%', left: '-15%', background: 'radial-gradient(circle,var(--ac-dim) 0%,transparent 65%)', filter: 'blur(50px)' }} />
          <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', bottom: '-10%', right: '-10%', background: 'radial-gradient(circle,rgba(124,110,255,.06) 0%,transparent 65%)', filter: 'blur(50px)' }} />
        </div>

        {/* Remote video */}
        <video
          ref={remoteRef}
          autoPlay playsInline
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: .9,
            display: videoActive ? 'block' : 'none',
            pointerEvents: 'none',
          }}
        />

        {/* Local video PiP — only when videoActive AND cam on */}
        {isVideo && videoActive && !camOff && (
          <div style={{
            position: 'absolute', bottom: 110, right: 16, zIndex: 20,
            width: 100, height: 140, borderRadius: 14, overflow: 'hidden',
            border: '2px solid rgba(255,255,255,.25)',
            boxShadow: '0 4px 24px rgba(0,0,0,.6)',
          }}>
            <video
              ref={localRef}
              autoPlay muted playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            INCOMING CALL SCREEN
            Only shown while isIncoming && !connected
        ════════════════════════════════════════════════════ */}
        {isIncoming && !connected && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 15,
            background: 'rgba(5,7,26,.94)', backdropFilter: 'blur(16px)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 20,
            animation: 'callIn .25s ease',
          }}>
            <CallAvatar name={callData.callerName ?? 'Unknown'} photo={callData.callerPhoto} size={96} ringing />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: -.5, marginBottom: 8 }}>
                {callData.callerName ?? 'Unknown'}
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)',
                borderRadius: 20, padding: '5px 14px',
                fontFamily: 'var(--mono)', fontSize: 11, color: 'rgba(255,255,255,.55)', letterSpacing: .4,
              }}>
                {isVideo ? <Icon.Video size={12} /> : <Icon.Phone size={12} />}
                <span>{isVideo ? 'Incoming video call' : 'Incoming voice call'}</span>
              </div>
            </div>
            {/* Accept / Decline */}
            <div style={{ display: 'flex', gap: 36, marginTop: 12 }}>
              <CtrlBtn onClick={handleReject} danger size={68} label="Decline">
                <Icon.PhoneOff size={22} />
              </CtrlBtn>
              <CtrlBtn onClick={handleAccept} accept size={68} label="Accept">
                <Icon.Phone size={22} />
              </CtrlBtn>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            CALL INFO HEADER
            Shown for outgoing + after incoming accepted
        ════════════════════════════════════════════════════ */}
        {(!isIncoming || connected) && (
          <div style={{
            position: 'relative', zIndex: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            width: '100%', padding: '0 20px', textAlign: 'center',
            paddingTop: videoActive ? 20 : 80,
            marginBottom: 'auto',
            animation: 'callSlide .4s ease',
            opacity: videoActive ? 0 : 1,
            pointerEvents: videoActive ? 'none' : 'auto',
            transition: 'opacity .5s, padding-top .4s',
          }}>
            <CallAvatar name={displayName} photo={displayPhoto} size={90} ringing={isRinging} />
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: -.5, marginBottom: 8 }}>
                {displayName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                {connected
                  ? <CallTimer running={connected} />
                  : <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'rgba(255,255,255,.5)' }}>
                    {getStatusLabel(callStatus, isIncoming)}
                  </span>
                }
                {connected && (
                  <><span style={{ color: 'rgba(255,255,255,.2)', fontSize: 10 }}>·</span><QualityBars level={quality} /></>
                )}
              </div>
              <div style={{
                marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)',
                borderRadius: 20, padding: '4px 12px',
                fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(255,255,255,.5)', letterSpacing: .5,
              }}>
                {isVideo ? <Icon.Video size={11} /> : <Icon.Phone size={11} />}
                <span>{isVideo ? 'Video call' : 'Voice call'}</span>
                {connected && <span style={{ color: 'var(--ac)', marginLeft: 4 }}>● E2E encrypted</span>}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            CONTROLS BAR
            Shown for outgoing + after incoming accepted
        ════════════════════════════════════════════════════ */}
        {(!isIncoming || connected) && (
          <div style={{
            position: 'relative', zIndex: 20,
            marginTop: 'auto', width: '100%',
            paddingBottom: 52, paddingTop: videoActive ? 40 : 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22,
            animation: 'callSlide .4s ease',
            background: videoActive
              ? 'linear-gradient(to top,rgba(5,7,26,.9) 0%,rgba(5,7,26,.55) 60%,transparent 100%)'
              : 'transparent',
          }}>

            {/* Secondary row — speaker / flip / MINIMIZE */}
            {connected && (
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <CtrlBtn onClick={() => setSpeakerOff(s => !s)} active={speakerOff} size={44} label={speakerOff ? 'Speaker off' : 'Speaker'}>
                  {speakerOff ? <Icon.VolumeOff size={18} /> : <Icon.Volume size={18} />}
                </CtrlBtn>
                {isVideo && (
                  <CtrlBtn onClick={() => showToast('Camera switched')} size={44} label="Flip">
                    <Icon.Flip size={18} />
                  </CtrlBtn>
                )}
                {/* MINIMIZE button — sends to background */}
                <CtrlBtn onClick={() => setMinimized(true)} size={44} label="Minimize">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                    <path d="M3 5l5 6 5-6" />
                  </svg>
                </CtrlBtn>
              </div>
            )}

            {/* Primary row — Mute · End · Cam/Speaker */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <CtrlBtn onClick={handleToggleMute} active={muted} size={54} label={muted ? 'Unmute' : 'Mute'}>
                {/* FIX: show MicOff when muted, Mic when active */}
                {muted ? <Icon.MicOff size={20} /> : <Icon.Mic size={20} />}
              </CtrlBtn>

              <CtrlBtn onClick={handleEnd} danger size={68} label="End">
                <Icon.PhoneOff size={24} />
              </CtrlBtn>

              {isVideo
                ? <CtrlBtn onClick={handleToggleCam} active={camOff} size={54} label={camOff ? 'Show cam' : 'Hide cam'}>
                  {camOff ? <Icon.VideoOff size={20} /> : <Icon.Video size={20} />}
                </CtrlBtn>
                : <CtrlBtn onClick={() => setSpeakerOff(s => !s)} active={speakerOff} size={54} label="Speaker">
                  {speakerOff ? <Icon.VolumeOff size={20} /> : <Icon.Volume size={20} />}
                </CtrlBtn>
              }
            </div>
          </div>
        )}

      </div>
    </>
  )
}

// 'use client'

// /**
//  * FloatingCallWindow.tsx - FIXED VERSION
//  * Issues fixed:
//  * 1. Local video always rendered (so ref always exists)
//  * 2. Stream binding via useEffect (when element available)
//  * 3. Proper cleanup on disconnect
//  * 4. Better error handling
//  */

// import { useEffect, useState, useCallback, useRef } from 'react'
// import { useStore } from '@/lib/store'
// import { useWebRTC } from '@/hooks/useWebRTC'
// import { useRingtone } from '@/hooks/useRingtone'
// import { useVideoDebug } from '@/hooks/useVideoDebug'
// import { getDatabase, ref, onValue, off } from 'firebase/database'
// import { getApp } from 'firebase/app'
// import { CallData } from '@/types'
// import { CallAvatar, CallTimer, CtrlBtn, QualityBars } from '../CallTimer'
// import { getStatusLabel } from '@/src/lib/utils'
// import styles from './FloatingCallWindow.module.css'
// import { useActiveCall } from '@/hooks/useActiveCall'
// import { Icon } from '../shared/Icons'

// interface Props {
//   callData: CallData | null
//   onEnd: () => void
//   onAccept: () => void
//   onReject: () => void
// }

// interface Position {
//   x: number
//   y: number
//   width: number
//   height: number
// }

// export default function FloatingCallWindow({ callData, onEnd, onAccept, onReject }: Props) {
//   const { callOverlayOpen, showToast, me } = useStore();
//   // 1b. Inside the component, destructure:
//   const {
//     minimized, setMinimized,
//     muted, setMuted,
//     camOff, setCamOff,
//     reset: resetCallUI,
//   } = useActiveCall()

//   const { startRingtone, startRingback, stop: stopRingtone } = useRingtone()

//   const [speakerOff, setSpeakerOff] = useState(false)
//   const [isMinimized, setIsMinimized] = useState(false)
//   const [position, setPosition] = useState<Position>({
//     x: typeof window !== 'undefined' ? window.innerWidth - 420 : 0,
//     y: 20,
//     width: 400,
//     height: 540,
//   })

//   const [isDragging, setIsDragging] = useState(false)
//   const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

//   const windowRef = useRef<HTMLDivElement>(null)
//   const headerRef = useRef<HTMLDivElement>(null)

//   const {
//     localRef, remoteRef,
//     connected, quality, callStatus,
//     startCaller, startCallee,
//     toggleMute, toggleCam,
//     hangup, releaseMedia,
//   } = useWebRTC()

//   // Debug video streams
//   useVideoDebug(localRef, remoteRef)

//   const callerUidRef = useRef(callData?.callerUid ?? '')
//   const calleeUidRef = useRef(callData?.calleeUid ?? '')

//   useEffect(() => {
//     callerUidRef.current = callData?.callerUid ?? ''
//     calleeUidRef.current = callData?.calleeUid ?? ''
//   }, [callData?.callerUid, callData?.calleeUid])

//   const isVideo = (callData?.mode ?? 'audio') === 'video'
//   const isIncoming = callData?.isIncoming ?? false
//   const cid = callData?.cid ?? ''
//   const videoActive = connected && isVideo

//   /* ── ENSURE REFS ARE PROPERLY BOUND ─────────────────────── */
//   useEffect(() => {
//     if (!localRef.current || !isVideo) return

//     // Try to bind stream if element exists and stream is available
//     const stream = (localRef.current as any).srcObject as MediaStream
//     if (!stream) {
//       console.warn('⚠️ [Call] Local video element exists but stream not yet bound')
//       console.log('[Call] Attempting to bind stream...')
//     }
//   }, [isVideo])

//   /* ── MOUSE DRAGGING ─────────────────────────────────────────── */
//   const handleMouseDown = (e: React.MouseEvent) => {
//     if (!headerRef.current?.contains(e.target as Node)) return

//     setIsDragging(true)
//     setDragOffset({
//       x: e.clientX - position.x,
//       y: e.clientY - position.y,
//     })
//   }

//   useEffect(() => {
//     if (!isDragging) return

//     const handleMouseMove = (e: MouseEvent) => {
//       setPosition(prev => ({
//         ...prev,
//         x: Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - prev.width)),
//         y: Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - prev.height)),
//       }))
//     }

//     const handleMouseUp = () => setIsDragging(false)

//     document.addEventListener('mousemove', handleMouseMove)
//     document.addEventListener('mouseup', handleMouseUp)

//     return () => {
//       document.removeEventListener('mousemove', handleMouseMove)
//       document.removeEventListener('mouseup', handleMouseUp)
//     }
//   }, [isDragging, dragOffset])

//   /* ── OUTGOING CALL ─────────────────────────────────────────── */
//   useEffect(() => {
//     if (!callOverlayOpen || !callData || isIncoming || !cid) return

//     console.log('🔴 [Call] Starting outgoing call...', { cid, isVideo })
//     startRingback()

//     startCaller(
//       cid, isVideo,
//       callerUidRef.current || me?.uid || '',
//       calleeUidRef.current,
//     ).catch(err => {
//       console.error('🔴 [Call] startCaller failed:', err)
//       releaseMedia()
//       stopRingtone()
//       showToast('Could not access microphone / camera')
//       onEnd()
//     })

//     return () => {
//       console.log('[Call] Cleaning up outgoing call')
//       stopRingtone()
//       // Don't call hangup here - it's called in handleEnd
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [callOverlayOpen, cid])

//   /* ── INCOMING CALL ─────────────────────────────────────────── */
//   useEffect(() => {
//     if (!callOverlayOpen || !isIncoming || connected) return
//     console.log('[Call] Playing ringtone for incoming call')
//     startRingtone()
//     return () => {
//       console.log('[Call] Stopping ringtone')
//       stopRingtone()
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [callOverlayOpen, isIncoming, connected])

//   /* ── STOP RINGBACK WHEN CONNECTED ──────────────────────────── */
//   useEffect(() => {
//     if (connected) {
//       console.log('✅ [Call] Connected - stopping ringback')
//       stopRingtone()
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [connected])

//   /* ── LISTEN FOR REMOTE HANGUP ──────────────────────────────── */
//   useEffect(() => {
//     if (!callOverlayOpen || !cid) return

//     const db = getDatabase(getApp())
//     const statusRef = ref(db, `calls/${cid}/status`)
//     let initialLoadDone = false

//     const unsub = onValue(statusRef, snap => {
//       const status = snap.val()
//       if (!initialLoadDone) {
//         initialLoadDone = true
//         return
//       }
//       if (status === 'ended') {
//         console.log('[Call] Remote peer ended call')
//         stopRingtone()
//         showToast('Call ended by other party')
//         onEnd()
//       }
//     })

//     return () => {
//       console.log('[Call] Unsubscribing from call status')
//       off(statusRef, 'value', unsub as any)
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [callOverlayOpen, cid])

//   const handleAccept = useCallback(async () => {
//     if (!cid) return
//     stopRingtone()
//     try {
//       console.log('✅ [Call] Accepting call...', { cid, isVideo })
//       await startCallee(cid, isVideo)
//       onAccept()
//     } catch (err) {
//       console.error('🔴 [Call] startCallee failed:', err)
//       releaseMedia()
//       showToast('Could not access microphone / camera')
//       onReject()
//     }
//   }, [cid, isVideo, stopRingtone, startCallee, onAccept, releaseMedia, showToast, onReject])

//   const handleReject = useCallback(async () => {
//     console.log('[Call] Rejecting call')
//     stopRingtone()
//     await hangup(cid)
//     onReject()
//   }, [cid, stopRingtone, hangup, onReject])

//   const handleEnd = useCallback(async () => {
//     console.log('[Call] Ending call - releasing all resources')
//     stopRingtone()
//     // Release media first
//     releaseMedia()
//     // Then hangup
//     await hangup(cid)
//     resetCallUI()
//     // Reset state
//     setMuted(false)
//     setCamOff(false)
//     setSpeakerOff(false)
//     console.log('✅ [Call] All resources released')
//     onEnd()
//   }, [cid, stopRingtone, hangup, releaseMedia, onEnd])

//   const handleToggleMute = useCallback(() => {
//     toggleMute(!muted)
//     setMuted(!muted)
//     console.log('[Call] Mute toggled:', !muted)
//   }, [muted, toggleMute])

//   const handleToggleCam = useCallback(() => {
//     toggleCam(!camOff)
//     setCamOff(!camOff)
//     console.log('[Call] Camera toggled:', !camOff)
//   }, [camOff, toggleCam])

//   if (!callOverlayOpen || !callData) return null

//   const displayName = isIncoming ? (callData.callerName ?? 'Unknown') : callData.peerName
//   const displayPhoto = isIncoming ? (callData.callerPhoto ?? undefined) : callData.peerPhoto
//   const isRinging = !connected && (callStatus === 'ringing' || callStatus === 'idle')

//   return (
//     <>
//       <style>{`
//         @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
//         @keyframes ringPulse { 0% { transform: scale(1); } 50% { transform: scale(1.08); } 100% { transform: scale(1); } }
//         @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
//       `}</style>

//       {/* Floating window - draggable */}
//       <div
//         ref={windowRef}
//         className={styles.window}
//         style={{
//           left: position.x,
//           top: position.y,
//           width: position.width,
//           height: position.height,
//           cursor: isDragging ? 'grabbing' : 'grab',
//         }}
//       >
//         {/* HEADER - Draggable area */}
//         <div
//           ref={headerRef}
//           className={styles.header}
//           onMouseDown={handleMouseDown}
//         >
//           <div className={styles.headerTitle}>
//             {isIncoming && !connected ? 'Incoming Call' : 'Video Call'}
//           </div>
//           <div className={styles.headerControls}>
//             <button
//               className={styles.headerBtn}
//               onClick={() => setIsMinimized(!isMinimized)}
//               title={isMinimized ? 'Restore' : 'Minimize'}
//             >
//               {isMinimized ? '🔽' : '➖'}
//             </button>
//             <button
//               className={styles.headerBtn}
//               onClick={handleEnd}
//               title="Close call"
//             >
//               ✕
//             </button>
//           </div>
//         </div>

//         {/* Content - Hidden when minimized */}
//         {!isMinimized && (
//           <div className={styles.content}>
//             {/* Video display area */}
//             <div className={styles.videoArea}>
//               {/* Remote video - Always visible when active */}
//               <video
//                 ref={remoteRef}
//                 autoPlay
//                 playsInline
//                 className={styles.video}
//                 onLoadedMetadata={() => console.log('✅ Remote video loaded')}
//                 onError={(e) => console.error('❌ Remote video error:', e)}
//                 style={{ display: videoActive ? 'block' : 'none' }}
//               />

//               {/* Local video (PiP) - ALWAYS RENDERED (not conditional!) */}
//               {isVideo && (
//                 <div
//                   className={styles.localPiP}
//                   style={{ display: connected ? 'block' : 'none' }}
//                 >
//                   <video
//                     ref={localRef}
//                     autoPlay
//                     muted
//                     playsInline
//                     className={styles.video}
//                     onLoadedMetadata={() => console.log('✅ Local video loaded and playing')}
//                     onError={(e) => console.error('❌ Local video error:', e)}
//                   />
//                   {camOff && <div className={styles.cameraOff}>📹 Camera off</div>}
//                 </div>
//               )}

//               {/* Incoming call screen */}
//               {isIncoming && !connected && (
//                 <div className={styles.incomingScreen}>
//                   <div style={{ animation: 'ringPulse 1.5s ease-in-out infinite' }}>
//                     <CallAvatar
//                       name={displayName}
//                       photo={displayPhoto}
//                       size={64}
//                       ringing
//                     />
//                   </div>
//                   <div style={{ textAlign: 'center', marginTop: 12 }}>
//                     <div className={styles.incomingName}>{displayName}</div>
//                     <div className={styles.incomingBadge}>
//                       {isVideo ? '📹 Video call' : '📞 Voice call'}
//                     </div>
//                   </div>
//                   <div className={styles.incomingControls}>
//                     <button
//                       className={`${styles.btn} ${styles.btnDanger}`}
//                       onClick={handleReject}
//                       title="Reject"
//                     >
//                       ✕
//                     </button>
//                     <button
//                       className={`${styles.btn} ${styles.btnAccept}`}
//                       onClick={handleAccept}
//                       title="Accept"
//                     >
//                       ✓
//                     </button>
//                   </div>
//                 </div>
//               )}

//               {/* Connected display */}
//               {(!isIncoming || connected) && !videoActive && (
//                 <div className={styles.audioScreen}>
//                   <CallAvatar
//                     name={displayName}
//                     photo={displayPhoto}
//                     size={56}
//                     ringing={isRinging}
//                   />
//                   <div className={styles.audioName}>{displayName}</div>
//                   {connected ? (
//                     <CallTimer running={true} />
//                   ) : (
//                     <div className={styles.statusText}>
//                       {getStatusLabel(callStatus, isIncoming)}
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>

//             {/* Controls */}
//             <div className={styles.controls}>
//               {/* Secondary controls - only when connected */}
//               {connected && (
//                 <div className={styles.secondaryControls}>
//                   <button
//                     className={`${styles.btn} ${speakerOff ? styles.btnActive : ''}`}
//                     onClick={() => setSpeakerOff(s => !s)}
//                     title="Speaker"
//                   >
//                     {speakerOff ? '🔇' : '🔊'}
//                   </button>
//                 </div>
//               )}

//               {/* Primary controls */}
//               <div className={styles.primaryControls}>
//                 <button
//                   className={`${styles.btn} ${muted ? styles.btnActive : ''}`}
//                   onClick={handleToggleMute}
//                   title={muted ? 'Unmute' : 'Mute'}
//                 >
//                   {muted ? <Icon.Mic /> : <Icon.MicOff />}
//                 </button>

//                 <button
//                   className={`${styles.btn} ${styles.btnDanger}`}
//                   onClick={handleEnd}
//                   title="End call"
//                 >
//                   <Icon.PhoneOff />
//                 </button>

//                 {isVideo && (
//                   <button
//                     className={`${styles.btn} ${camOff ? styles.btnActive : ''}`}
//                     onClick={handleToggleCam}
//                     title={camOff ? 'Show camera' : 'Hide camera'}
//                   >
//                     {camOff ? '🚫' : '📹'}
//                   </button>
//                 )}
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Minimized state */}
//         {isMinimized && (
//           <div className={styles.minimized}>
//             <span>{displayName}</span>
//             <span className={styles.status}>{connected ? '🟢' : '🟡'}</span>
//           </div>
//         )}
//       </div>
//     </>
//   )
// }