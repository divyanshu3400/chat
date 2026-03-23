/**
 * hooks/useActiveCall.ts
 *
 * Manages the "minimized call" state — whether the call is fullscreen
 * or running in the background (PiP / topbar).
 *
 * Used by:
 *   CallOverlay.tsx     — shows a "minimize" button when connected
 *   FloatingCallPiP.tsx — video call floating window
 *   ActiveCallBar.tsx   — audio call sticky topbar
 *   CipherApp.tsx       — decides which background UI to render
 */

import { create } from 'zustand'

interface ActiveCallState {
  /** Is the call currently minimized (running in background)? */
  minimized:    boolean
  /** Mute state — shared between fullscreen and minimized UI */
  muted:        boolean
  /** Camera state — shared between fullscreen and minimized UI */
  camOff:       boolean

  setMinimized: (v: boolean)  => void
  setMuted:     (v: boolean)  => void
  setCamOff:    (v: boolean)  => void
  /** Call ended — reset everything */
  reset:        () => void
}

export const useActiveCall = create<ActiveCallState>()(set => ({
  minimized: false,
  muted:     false,
  camOff:    false,

  setMinimized: v  => set({ minimized: v }),
  setMuted:     v  => set({ muted: v }),
  setCamOff:    v  => set({ camOff: v }),
  reset:        () => set({ minimized: false, muted: false, camOff: false }),
}))