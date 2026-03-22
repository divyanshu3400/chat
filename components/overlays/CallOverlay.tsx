'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useStore } from '@/lib/store'
import { Icon } from '../shared'
import { useWebRTC } from '@/hooks/useWebRTC'
import { useRingtone } from '@/hooks/useRingtone'
import { getDatabase, ref, onValue, off } from 'firebase/database'
import { getApp } from 'firebase/app'
import { CallData } from '@/types'
import { CallAvatar, CallTimer, CtrlBtn, QualityBars } from '../CallTimer'
import { getStatusLabel } from '@/src/lib/utils'


interface Props {
  callData: CallData | null
  onEnd: () => void
  onAccept: () => void
  onReject: () => void
}

export default function CallOverlay({ callData, onEnd, onAccept, onReject }: Props) {
  const { callOverlayOpen, showToast, me } = useStore()
  const { startRingtone, startRingback, stop: stopRingtone } = useRingtone()

  const [muted, setMuted] = useState(false)
  const [camOff, setCamOff] = useState(false)
  const [speakerOff, setSpeakerOff] = useState(false)

  const {
    localRef, remoteRef,
    connected, quality, callStatus,
    startCaller, startCallee,
    toggleMute, toggleCam,
    hangup, releaseMedia,
  } = useWebRTC()

  /* Stable refs for caller/callee UIDs — avoids stale closures */
  const callerUidRef = useRef(callData?.callerUid ?? '')
  const calleeUidRef = useRef(callData?.calleeUid ?? '')
  useEffect(() => {
    callerUidRef.current = callData?.callerUid ?? ''
    calleeUidRef.current = callData?.calleeUid ?? ''
  }, [callData?.callerUid, callData?.calleeUid])

  const isVideo = (callData?.mode ?? 'audio') === 'video'
  const isIncoming = callData?.isIncoming ?? false
  const cid = callData?.cid ?? ''

  /* ── OUTGOING: start ringback + WebRTC ─────────────────────────── */
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

  /* ── INCOMING: play ringtone until accepted ─────────────────────── */
  useEffect(() => {
    if (!callOverlayOpen || !isIncoming || connected) return
    startRingtone()
    return () => stopRingtone()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callOverlayOpen, isIncoming, connected])

  /* ── Stop ringback when call connects (caller side) ─────────────── */
  useEffect(() => {
    if (connected) stopRingtone()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected])

  /* ── Listen for remote hangup ───────────────────────────────────── */
  useEffect(() => {
    if (!callOverlayOpen || !cid) return

    const db = getDatabase(getApp())
    const statusRef = ref(db, `calls/${cid}/status`)

    /* FIX: read the CURRENT status first. If it's already 'ended'
       (leftover from a previous call), ignore it entirely.
       Only react to transitions that happen AFTER we subscribe. */
    let initialLoadDone = false

    const unsub = onValue(statusRef, snap => {
      const status = snap.val()

      /* Skip the first emit which is the current DB value */
      if (!initialLoadDone) {
        initialLoadDone = true
        /* If the call doc already says 'ended' when we arrive,
           that's stale data from a previous call — ignore it */
        return
      }

      if (status === 'ended') {
        stopRingtone()
        showToast('Call ended by other party')
        onEnd()
      }
    })

    return () => off(statusRef, 'value', unsub as any)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callOverlayOpen, cid])

  /* ── Accept ─────────────────────────────────────────────────────── */
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

  /* ── Reject ─────────────────────────────────────────────────────── */
  async function handleReject() {
    stopRingtone()
    await hangup(cid)
    onReject()
  }

  /* ── End ────────────────────────────────────────────────────────── */
  async function handleEnd() {
    stopRingtone()
    await hangup(cid)
    setMuted(false); setCamOff(false); setSpeakerOff(false)
    onEnd()
  }

  /* ── Mute / cam ──────────────────────────────────────────────────── */
  function handleToggleMute() { toggleMute(!muted); setMuted(m => !m) }
  function handleToggleCam() { toggleCam(!camOff); setCamOff(c => !c) }

  /* ── GUARD — after all hooks ─────────────────────────────────────── */
  if (!callOverlayOpen || !callData) return null

  /* Derived display values */
  const displayName = isIncoming ? (callData.callerName ?? 'Unknown') : callData.peerName
  const displayPhoto = isIncoming ? (callData.callerPhoto ?? undefined) : callData.peerPhoto
  const videoActive = connected && isVideo
  const isRinging = !connected && (callStatus === 'ringing' || callStatus === 'idle')

  /* ── RENDER ──────────────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @keyframes callPulse { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.7);opacity:0} }
        @keyframes callIn    { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }
        @keyframes callSlide { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── FULL SCREEN OVERLAY ── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 700,
        background: 'linear-gradient(160deg,#05071a 0%,#0b0d20 50%,#07091a 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
        animation: 'callIn .3s ease',
      }}>

        {/* Ambient blobs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', top: '-15%', left: '-15%', background: 'radial-gradient(circle,var(--ac-dim) 0%,transparent 65%)', filter: 'blur(50px)' }} />
          <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', bottom: '-10%', right: '-10%', background: 'radial-gradient(circle,rgba(124,110,255,.06) 0%,transparent 65%)', filter: 'blur(50px)' }} />
        </div>

        {/* Remote video — fills screen, pointer-events:none so buttons work */}
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            display: videoActive ? 'block' : 'none',
            opacity: .9,
            pointerEvents: 'none',
          }}
        />

        {/* Local video PiP — only show when video is active AND cam is on */}
        {isVideo && videoActive && !camOff && (
          <div style={{
            position: 'absolute', bottom: 110, right: 16,
            zIndex: 20,
            width: 100, height: 140,
            borderRadius: 14, overflow: 'hidden',
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

        {/* ════════════════════════════════════════════════════════
            INCOMING CALL SCREEN
            Shows ONLY while isIncoming AND not yet connected.
            Has its own avatar + name + decline/accept.
            Completely replaces the outgoing call info while visible.
        ════════════════════════════════════════════════════════ */}
        {isIncoming && !connected && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 15,
            background: 'rgba(5,7,26,.94)',
            backdropFilter: 'blur(16px)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 20,
            animation: 'callIn .25s ease',
          }}>
            <CallAvatar
              name={callData.callerName ?? 'Unknown'}
              photo={callData.callerPhoto}
              size={96}
              ringing
            />

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: -.5, marginBottom: 8 }}>
                {callData.callerName ?? 'Unknown'}
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,.07)',
                border: '1px solid rgba(255,255,255,.12)',
                borderRadius: 20, padding: '5px 14px',
                fontFamily: 'var(--mono)', fontSize: 11,
                color: 'rgba(255,255,255,.55)',
                letterSpacing: .4,
              }}>
                {isVideo ? <Icon.Video /> : <Icon.Phone />}
                <span>{isVideo ? 'Incoming video call' : 'Incoming voice call'}</span>
              </div>
            </div>

            {/* Accept / Decline */}
            <div style={{ display: 'flex', gap: 36, marginTop: 12 }}>
              <CtrlBtn onClick={handleReject} danger size={68} label="Decline">
                <Icon.PhoneOff />
              </CtrlBtn>
              <CtrlBtn onClick={handleAccept} accept size={68} label="Accept">
                <Icon.Phone />
              </CtrlBtn>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            OUTGOING / CONNECTED INFO HEADER
            Shows for:
              • Outgoing calls (always)
              • Incoming calls AFTER connected (incoming accepted)
            Hidden while incoming is ringing (the block above covers it)
        ════════════════════════════════════════════════════════ */}
        {(!isIncoming || connected) && (
          <div style={{
            position: 'relative', zIndex: 10,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 16,
            width: '100%',
            paddingTop: videoActive ? 20 : 80,
            paddingLeft: 20, paddingRight: 20,
            marginBottom: 'auto',
            animation: 'callSlide .4s ease',
            /* Fade info section under video — controls still rendered below */
            opacity: videoActive ? 0 : 1,
            pointerEvents: videoActive ? 'none' : 'auto',
            transition: 'opacity .5s, padding-top .4s',
            textAlign: 'center',
          }}>
            <CallAvatar
              name={displayName}
              photo={displayPhoto}
              size={90}
              ringing={isRinging}
            />

            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: -.5, marginBottom: 8 }}>
                {displayName}
              </div>

              {/* Status / timer row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                {connected
                  ? <CallTimer running={connected} />
                  : <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'rgba(255,255,255,.5)' }}>
                    {getStatusLabel(callStatus, isIncoming)}
                  </span>
                }
                {connected && (
                  <>
                    <span style={{ color: 'rgba(255,255,255,.2)', fontSize: 10 }}>·</span>
                    <QualityBars level={quality} />
                  </>
                )}
              </div>

              {/* Mode pill */}
              <div style={{
                marginTop: 10,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,.07)',
                border: '1px solid rgba(255,255,255,.1)',
                borderRadius: 20, padding: '4px 12px',
                fontFamily: 'var(--mono)', fontSize: 10,
                color: 'rgba(255,255,255,.5)', letterSpacing: .5,
              }}>
                {isVideo ? <Icon.Video /> : <Icon.Phone />}
                <span>{isVideo ? 'Video call' : 'Voice call'}</span>
                {connected && (
                  <span style={{ color: 'var(--ac)', marginLeft: 4 }}>● E2E encrypted</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            CONTROLS BAR
            Shows for:
              • Outgoing calls (always — End button visible from start)
              • After incoming call is accepted
            Hidden while incoming is ringing
        ════════════════════════════════════════════════════════ */}
        {(!isIncoming || connected) && (
          <div style={{
            position: 'relative', zIndex: 20,
            marginTop: 'auto',
            width: '100%',
            paddingBottom: 52, paddingTop: videoActive ? 40 : 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 22,
            animation: 'callSlide .4s ease',
            /* Frosted gradient so buttons readable over bright video */
            background: videoActive
              ? 'linear-gradient(to top,rgba(5,7,26,.9) 0%,rgba(5,7,26,.55) 60%,transparent 100%)'
              : 'transparent',
          }}>

            {/* Secondary row (speaker + flip) — only when connected */}
            {connected && (
              <div style={{ display: 'flex', gap: 20 }}>
                <CtrlBtn
                  onClick={() => setSpeakerOff(s => !s)}
                  active={speakerOff}
                  size={46}
                  label={speakerOff ? 'Speaker off' : 'Speaker'}
                >
                  {speakerOff ? <Icon.VolumeOff /> : <Icon.Volume />}
                </CtrlBtn>
                {isVideo && (
                  <CtrlBtn onClick={() => showToast('Camera switched')} size={46} label="Flip">
                    <Icon.Flip />
                  </CtrlBtn>
                )}
              </div>
            )}

            {/* Primary row — Mute · End · Cam/Speaker */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <CtrlBtn
                onClick={handleToggleMute}
                active={muted}
                size={54}
                label={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <Icon.MicOff /> : <Icon.Mic />}
              </CtrlBtn>

              <CtrlBtn onClick={handleEnd} danger size={68} label="End">
                <Icon.PhoneOff />
              </CtrlBtn>

              {isVideo
                ? <CtrlBtn
                  onClick={handleToggleCam}
                  active={camOff}
                  size={54}
                  label={camOff ? 'Show cam' : 'Hide cam'}
                >
                  {camOff ? <Icon.VideoOff /> : <Icon.Video />}
                </CtrlBtn>
                : <CtrlBtn
                  onClick={() => setSpeakerOff(s => !s)}
                  active={speakerOff}
                  size={54}
                  label="Speaker"
                >
                  {speakerOff ? <Icon.VolumeOff /> : <Icon.Volume />}
                </CtrlBtn>
              }
            </div>
          </div>
        )}

      </div>
    </>
  )
}