/**
 * hooks/useRingtone.ts
 *
 * Generates ringtone + ringback tones via Web Audio API.
 * No external audio files required — synthesised in the browser.
 *
 * Ringtone  = CALLEE hears this (incoming call ringing)
 * Ringback  = CALLER hears this (waiting for answer)
 */

import { useRef, useCallback } from 'react'

/* ─── Tone configs ───────────────────────────────────────────────────── */

const RINGTONE: ToneConfig = {
  frequencies: [440, 480],   /* dual-tone — classic phone bell */
  burstMs:     800,
  pauseMs:     1200,
  gainPeak:    0.22,
  fadeMs:      40,
}

const RINGBACK: ToneConfig = {
  frequencies: [440],
  burstMs:     400,
  pauseMs:     4600,
  gainPeak:    0.10,          /* quieter — just a waiting cue */
  fadeMs:      30,
}

interface ToneConfig {
  frequencies: number[]
  burstMs:     number
  pauseMs:     number
  gainPeak:    number
  fadeMs:      number
}

/* ═══════════════════════════════════════════════════════════════════════
   HOOK
═══════════════════════════════════════════════════════════════════════ */
export function useRingtone() {
  const ctxRef    = useRef<AudioContext | null>(null)
  const timerRef  = useRef<ReturnType<typeof setTimeout>>()
  const activeRef = useRef(false)

  /* ── Stop all tones ── */
  const stop = useCallback(() => {
    activeRef.current = false
    clearTimeout(timerRef.current)
    ctxRef.current?.close().catch(() => {})
    ctxRef.current = null
  }, [])

  /* ── Play one burst of tones ── */
  function playBurst(ctx: AudioContext, cfg: ToneConfig) {
    const now = ctx.currentTime
    cfg.frequencies.forEach(freq => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      /* Smooth envelope — prevents click artefacts */
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(cfg.gainPeak, now + cfg.fadeMs / 1000)
      gain.gain.setValueAtTime(cfg.gainPeak, now + (cfg.burstMs - cfg.fadeMs) / 1000)
      gain.gain.linearRampToValueAtTime(0, now + cfg.burstMs / 1000)
      osc.start(now)
      osc.stop(now + cfg.burstMs / 1000)
    })
  }

  /* ── Looping scheduler ── */
  function schedule(cfg: ToneConfig) {
    if (!activeRef.current) return

    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext()
    }
    const ctx = ctxRef.current

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => playBurst(ctx, cfg)).catch(() => {})
    } else {
      playBurst(ctx, cfg)
    }

    timerRef.current = setTimeout(
      () => schedule(cfg),
      cfg.burstMs + cfg.pauseMs,
    )
  }

  /* ── Public API ── */
  const startRingtone = useCallback(() => {
    stop(); activeRef.current = true; schedule(RINGTONE)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stop])

  const startRingback = useCallback(() => {
    stop(); activeRef.current = true; schedule(RINGBACK)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stop])

  return { startRingtone, startRingback, stop }
}