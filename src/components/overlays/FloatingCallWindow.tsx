'use client'

import { useEffect, useRef, useCallback } from 'react'
import { getDatabase, ref, onValue, off } from 'firebase/database'
import { getApp } from 'firebase/app'
import {
  useCallData,
  useCallStatus,
  useCallQuality,
  useConnected,
  useOverlayOpen,
  useMinimized,
  useMuted,
  useCamOff,
  useSpeakerOff,
  useCallActions,
  useLocalVideoRef,
  useRemoteVideoRef,
} from '@/src/hooks/useCallingStore'
import { useStore } from '@/src/lib/store'
import { useRingtone } from '@/src/hooks/useRingtone'
import { CallAvatar, CallTimer, CtrlBtn, QualityBars } from '../CallTimer'
import { FlipVertical, Mic, MicOff, PhoneIcon, PhoneOff, PhoneOffIcon, Video, VideoIcon, VideoOff, Volume, VolumeOff, VolumeOffIcon } from 'lucide-react'

/* ── Tiny helpers (unchanged from your original) ── */

function getStatusLabel(status: string, isIncoming: boolean) {
  if (status === 'ringing') return isIncoming ? 'Incoming…' : 'Ringing…'
  if (status === 'connecting') return 'Connecting…'
  if (status === 'connected') return 'Connected'
  if (status === 'failed') return 'Call failed'
  if (status === 'ended') return 'Call ended'
  return '…'
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function FloatingCallWindow() {
  /* ── Store state (fine-grained — no unnecessary re-renders) ── */
  const callData = useCallData()
  const callStatus = useCallStatus()
  const quality = useCallQuality()
  const connected = useConnected()
  const overlayOpen = useOverlayOpen()
  const minimized = useMinimized()
  const muted = useMuted()
  const camOff = useCamOff()
  const speakerOff = useSpeakerOff()

  /* ── Video ref callbacks — passed directly to <video ref={...}> ── */
  const setLocalVideoEl = useLocalVideoRef()
  const setRemoteVideoEl = useRemoteVideoRef()

  /* ── Actions from store ── */
  const {
    startCaller, acceptCall, rejectCall, endCall,
    toggleMute, toggleCam, toggleSpeaker, minimize,
  } = useCallActions()

  const { showToast, me } = useStore()
  const { startRingtone, startRingback, stop: stopRingtone } = useRingtone()

  /* ── Stable refs for UIDs ── */
  const callerUidRef = useRef(callData?.callerUid ?? '')
  const calleeUidRef = useRef(callData?.calleeUid ?? '')
  useEffect(() => {
    callerUidRef.current = callData?.callerUid ?? ''
    calleeUidRef.current = callData?.calleeUid ?? ''
  }, [callData?.callerUid, callData?.calleeUid])

  const isVideo = (callData?.mode ?? 'audio') === 'video'
  const isIncoming = callData?.isIncoming ?? false
  const cid = callData?.cid ?? ''

  /* ── OUTGOING: start ringback + WebRTC ── */
  useEffect(() => {
    if (!overlayOpen || !callData || isIncoming || !cid) return
    startRingback()
    startCaller(
      cid, isVideo,
      callerUidRef.current || me?.uid || '',
      calleeUidRef.current,
    ).catch(err => {
      console.error('[Call] startCaller failed:', err)
      stopRingtone()
      showToast('Could not access microphone / camera')
      endCall()
    })
    return () => { stopRingtone() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayOpen, cid])

  /* ── INCOMING: play ringtone until accepted/rejected ── */
  useEffect(() => {
    if (!overlayOpen || !isIncoming || connected) return
    startRingtone()
    return () => stopRingtone()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayOpen, isIncoming, connected])

  /* ── Stop ringback when call connects ── */
  useEffect(() => {
    if (connected) stopRingtone()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected])

  /* ── Remote hangup listener ── */
  useEffect(() => {
    if (!overlayOpen || !cid) return
    const db = getDatabase(getApp())
    const statusRef = ref(db, `calls/${cid}/status`)
    let initialLoadDone = false
    const unsub = onValue(statusRef, snap => {
      if (!initialLoadDone) { initialLoadDone = true; return }
      if (snap.val() === 'ended') {
        stopRingtone()
        showToast('Call ended.')
        endCall()
      }
    })
    return () => off(statusRef, 'value', unsub as any)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayOpen, cid])

  /* ── Accept ── */
  const handleAccept = useCallback(async () => {
    stopRingtone()
    try {
      await acceptCall()
    } catch {
      showToast('Could not access microphone / camera')
      rejectCall()
    }
  }, [acceptCall, rejectCall, stopRingtone, showToast])

  /* ── Reject ── */
  const handleReject = useCallback(async () => {
    stopRingtone()
    await rejectCall()
  }, [rejectCall, stopRingtone])

  /* ── End ── */
  const handleEnd = useCallback(async () => {
    stopRingtone()
    await endCall()
  }, [endCall, stopRingtone])

  /* ── Guard ── */
  if (!overlayOpen || !callData || minimized) return null

  /* ── Derived ── */
  const displayName = isIncoming ? (callData.callerName ?? 'Unknown') : callData.peerName
  const displayPhoto = isIncoming ? (callData.callerPhoto ?? undefined) : callData.peerPhoto
  const videoActive = connected && isVideo
  const isRinging = !connected && (callStatus === 'ringing' || callStatus === 'idle')

  /* ═══════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{`
        @keyframes callPulse { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.7);opacity:0} }
        @keyframes callIn    { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }
        @keyframes callSlide { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* BACKDROP */}
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

        {/* ── REMOTE VIDEO (full screen background) ── */}
        <video
          ref={setRemoteVideoEl}       /* ← store ref callback */
          autoPlay playsInline
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'contain',        /* ← contain fixes mobile zoom issue */
            background: '#000',
            opacity: .9,
            display: videoActive ? 'block' : 'none',
            pointerEvents: 'none',
          }}
        />

        {/* ── LOCAL VIDEO PiP
            Show when isVideo AND (ringing OR connecting OR connected) AND cam on.
            FIX: was only showing when videoActive (=connected). Now shows from
            the moment the call starts so caller sees their own preview. ── */}
        {isVideo && !camOff && (callStatus === 'ringing' || callStatus === 'connecting' || videoActive) && (
          <div style={{
            position: 'absolute', bottom: 110, right: 16, zIndex: 20,
            width: 100, height: 140, borderRadius: 14, overflow: 'hidden',
            border: '2px solid rgba(255,255,255,.25)',
            boxShadow: '0 4px 24px rgba(0,0,0,.6)',
          }}>
            <video
              ref={setLocalVideoEl}    /* ← store ref callback */
              autoPlay muted playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        )}

        {/* ── INCOMING CALL SCREEN ── */}
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
                {isVideo ? <VideoIcon size={12} /> : <PhoneIcon size={12} />}
                <span>{isVideo ? 'Incoming video call' : 'Incoming voice call'}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 36, marginTop: 12 }}>
              <CtrlBtn onClick={handleReject} danger size={68} label="Decline">
                <PhoneOffIcon size={22} />
              </CtrlBtn>
              <CtrlBtn onClick={handleAccept} accept size={68} label="Accept">
                <PhoneIcon size={22} />
              </CtrlBtn>
            </div>
          </div>
        )}

        {/* ── CALL INFO HEADER (outgoing + after accept) ── */}
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
            </div>
          </div>
        )}

        {/* ── CONTROLS BAR ── */}
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

            {connected && (
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <CtrlBtn onClick={toggleSpeaker} active={speakerOff} size={44} label={speakerOff ? 'Speaker off' : 'Speaker'}>
                  {speakerOff ? <VolumeOffIcon size={18} /> : <Volume size={18} />}
                </CtrlBtn>
                {isVideo && (
                  <CtrlBtn onClick={() => showToast('Camera switched')} size={44} label="Flip">
                    <FlipVertical size={18} />
                  </CtrlBtn>
                )}
                <CtrlBtn onClick={minimize} size={44} label="Minimize">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                    <path d="M3 5l5 6 5-6" />
                  </svg>
                </CtrlBtn>
              </div>
            )}

            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <CtrlBtn
                onClick={toggleMute}
                active={muted}
                size={54}
                label={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <MicOff size={20} /> : <Mic size={20} />}
              </CtrlBtn>

              <CtrlBtn
                onClick={handleEnd}
                danger
                size={68}
                label="End"
              >
                <PhoneOff size={24} />
              </CtrlBtn>

              {isVideo ? (
                <CtrlBtn
                  onClick={toggleCam}
                  active={camOff}
                  size={54}
                  label={camOff ? 'Show cam' : 'Hide cam'}
                >
                  {camOff ? <VideoOff size={20} /> : <Video size={20} />}
                </CtrlBtn>
              ) : (
                <CtrlBtn
                  onClick={toggleSpeaker}
                  active={speakerOff}
                  size={54}
                  label="Speaker"
                >
                  {speakerOff ? <VolumeOff size={20} /> : <Volume size={20} />}
                </CtrlBtn>
              )}
            </div>
          </div>
        )}

      </div>
    </>
  )
}