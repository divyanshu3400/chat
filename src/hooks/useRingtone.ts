import { useRef, useCallback, useEffect } from 'react'

/* ─── Tone configs ───────────────────────────────────────────────────── */

interface ToneConfig {
  frequencies: number[]
  burstMs: number
  pauseMs: number
  gainPeak: number
  fadeMs: number
}

const RINGTONE: ToneConfig = {
  frequencies: [440, 480],
  burstMs: 800,
  pauseMs: 1200,
  gainPeak: 0.22,
  fadeMs: 40,
}

const RINGBACK: ToneConfig = {
  frequencies: [440],
  burstMs: 400,
  pauseMs: 4600,
  gainPeak: 0.10,
  fadeMs: 30,
}

/* ═══════════════════════════════════════════════════════════════════════
   HOOK
═══════════════════════════════════════════════════════════════════════ */
export function useRingtone() {
  const ctxRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const activeRef = useRef(false)
  const unlockedRef = useRef(false)

  /* ── 🔓 Unlock AudioContext on first user interaction ── */
  useEffect(() => {
    const unlock = async () => {
      try {
        const ctx = new AudioContext()
        await ctx.resume()
        await ctx.close()
        unlockedRef.current = true
        console.log('[Audio] unlocked')
      } catch {
        console.warn('[Audio] unlock failed')
      }

      window.removeEventListener('click', unlock)
      window.removeEventListener('touchstart', unlock)
    }

    window.addEventListener('click', unlock)
    window.addEventListener('touchstart', unlock)

    return () => {
      window.removeEventListener('click', unlock)
      window.removeEventListener('touchstart', unlock)
    }
  }, [])

  /* ── Stop all tones ── */
  const stop = useCallback(() => {
    activeRef.current = false
    clearTimeout(timerRef.current)
    ctxRef.current?.close().catch(() => { })
    ctxRef.current = null
  }, [])

  /* ── Play one burst ── */
  function playBurst(ctx: AudioContext, cfg: ToneConfig) {
    const now = ctx.currentTime

    cfg.frequencies.forEach(freq => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type = 'sine'
      osc.frequency.value = freq

      // smooth envelope
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(cfg.gainPeak, now + cfg.fadeMs / 1000)
      gain.gain.setValueAtTime(
        cfg.gainPeak,
        now + (cfg.burstMs - cfg.fadeMs) / 1000
      )
      gain.gain.linearRampToValueAtTime(0, now + cfg.burstMs / 1000)

      osc.start(now)
      osc.stop(now + cfg.burstMs / 1000)
    })
  }

  /* ── Scheduler ── */
  async function schedule(cfg: ToneConfig) {
    if (!activeRef.current) return

    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext()
    }

    const ctx = ctxRef.current

    /* ❗ Fix: handle autoplay restriction safely */
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch {
        // avoid infinite console spam
        console.warn('[Audio] blocked (no user gesture yet)')
        return
      }
    }

    playBurst(ctx, cfg)

    timerRef.current = setTimeout(
      () => schedule(cfg),
      cfg.burstMs + cfg.pauseMs
    )
  }

  /* ── Public API ── */
  const startRingtone = useCallback(() => {
    stop()
    activeRef.current = true

    if (!unlockedRef.current) {
      console.warn('[Audio] waiting for user interaction...')
    }

    schedule(RINGTONE)
  }, [stop])

  const startRingback = useCallback(() => {
    stop()
    activeRef.current = true

    if (!unlockedRef.current) {
      console.warn('[Audio] waiting for user interaction...')
    }

    schedule(RINGBACK)
  }, [stop])

  return { startRingtone, startRingback, stop }
}