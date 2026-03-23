/**
 * lib/store/ui.ts
 *
 * Architecture:
 *  1. createBooleanSlice  — generic reusable factory for any boolean flag map
 *  2. createStateSlice    — generic reusable factory for any typed value
 *  3. useCipherUIStore    — composed UI store for CipherApp
 *
 * Extending: import the factories and compose your own slice in any other
 * store file — no copy-paste needed.
 */

import { CallData } from '@/src/types'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

/* ═══════════════════════════════════════════════════════════════════════
   GENERIC FACTORIES
   These are the reusable building blocks. They return a slice initialiser
   compatible with Zustand's `set` / `get` signature so you can spread
   them into any store.
═══════════════════════════════════════════════════════════════════════ */

/**
 * createBooleanSlice
 * ------------------
 * Manages a fixed set of named boolean flags.
 *
 * Usage:
 *   const panelSlice = createBooleanSlice({ settings: false, profile: false })
 *   // gives: panels.settings, panels.profile
 *   //        setPanel('settings', true)
 *   //        togglePanel('settings')
 *   //        resetPanels()
 *
 * @param defaults  Record of flag name → initial boolean value
 */
export function createBooleanSlice<K extends string>(defaults: Record<K, boolean>) {
    type State = {
        flags: Record<K, boolean>
        setFlag: (key: K, value: boolean) => void
        toggleFlag: (key: K) => void
        resetFlags: () => void
        /** Open exactly one flag, close all others */
        openOnly: (key: K) => void
    }

    const initialFlags = { ...defaults } as Record<K, boolean>

    const slice = (set: (fn: (s: State) => Partial<State>) => void): State => ({
        flags: initialFlags,

        setFlag: (key, value) =>
            set(s => ({ flags: { ...s.flags, [key]: value } })),

        toggleFlag: key =>
            set(s => ({ flags: { ...s.flags, [key]: !s.flags[key] } })),

        resetFlags: () =>
            set(() => ({ flags: { ...initialFlags } })),

        openOnly: key =>
            set(() => ({
                flags: Object.fromEntries(
                    (Object.keys(defaults) as K[]).map(k => [k, k === key])
                ) as Record<K, boolean>,
            })),
    })

    return slice
}

/**
 * createStateSlice
 * ----------------
 * Manages a single typed value with set / reset helpers.
 *
 * Usage:
 *   const screenSlice = createStateSlice<Screen>('auth')
 *   // gives: value, setValue(x), resetValue()
 */
export function createStateSlice<T>(initial: T) {
    type State = {
        value: T
        setValue: (v: T) => void
        resetValue: () => void
    }

    const slice = (set: (fn: (s: State) => Partial<State>) => void): State => ({
        value: initial,
        setValue: v => set(() => ({ value: v })),
        resetValue: () => set(() => ({ value: initial })),
    })

    return slice
}

/* ═══════════════════════════════════════════════════════════════════════
   DOMAIN TYPES  (keep co-located so the store is self-contained)
═══════════════════════════════════════════════════════════════════════ */

export type Screen = 'setup' | 'auth' | 'app'

export type PanelKey = 'settings' | 'profile' | 'newChat' | 'newGroup' | 'bookmarks'

/** Position + id of the conversation that triggered a context menu */
export interface ConvCtx {
    cid: string
    x: number
    y: number
}

/* ═══════════════════════════════════════════════════════════════════════
   CIPHER UI STORE
   Composed from generic slices + CipherApp-specific state.
═══════════════════════════════════════════════════════════════════════ */

interface CipherUIState {
    /* ── Screen router ─────────────────────────────────────────────── */
    screen: Screen
    setScreen: (s: Screen) => void

    /* ── One-shot boot flag ────────────────────────────────────────── */
    setupDone: boolean
    markSetupDone: () => void

    /* ── AI features ───────────────────────────────────────────────── */
    aiPanelOpen: boolean
    globalAiActive: boolean
    smartReply: string | undefined
    toggleAiPanel: () => void
    setAiPanelOpen: (v: boolean) => void
    toggleGlobalAi: () => void
    setSmartReply: (text: string | undefined) => void
    clearSmartReply: () => void

    /* ── Overlay panels (settings / profile / newChat …) ───────────── */
    panels: Record<PanelKey, boolean>
    openPanel: (key: PanelKey) => void
    closePanel: (key: PanelKey) => void
    togglePanel: (key: PanelKey) => void
    closeAllPanels: () => void

    /* ── Call overlay ──────────────────────────────────────────────── */
    callData: CallData | null
    setCallData: (data: CallData | null) => void
    endCall: () => void

    /* ── Sidebar conversation context menu ────────────────────────── */
    convCtx: ConvCtx | null
    openConvCtx: (ctx: ConvCtx) => void
    closeConvCtx: () => void
}

const PANEL_DEFAULTS: Record<PanelKey, boolean> = {
    settings: false,
    profile: false,
    newChat: false,
    newGroup: false,
    bookmarks: false,
}

export const useCipherUIStore = create<CipherUIState>()(
    devtools(
        (set) => ({
            /* ── Screen ─────────────────────────────────────────────────── */
            screen: 'auth',
            setScreen: (s) => set({ screen: s }, false, 'setScreen'),

            /* ── Setup ──────────────────────────────────────────────────── */
            setupDone: false,
            markSetupDone: () => set({ setupDone: true }, false, 'markSetupDone'),

            /* ── AI ─────────────────────────────────────────────────────── */
            aiPanelOpen: false,
            globalAiActive: true,
            smartReply: undefined,

            toggleAiPanel: () => set(s => ({ aiPanelOpen: !s.aiPanelOpen }), false, 'toggleAiPanel'),
            setAiPanelOpen: (v) => set({ aiPanelOpen: v }, false, 'setAiPanelOpen'),
            toggleGlobalAi: () => set(s => ({ globalAiActive: !s.globalAiActive }), false, 'toggleGlobalAi'),
            setSmartReply: (text) => set({ smartReply: text }, false, 'setSmartReply'),
            clearSmartReply: () => set({ smartReply: undefined }, false, 'clearSmartReply'),

            /* ── Panels ─────────────────────────────────────────────────── */
            panels: { ...PANEL_DEFAULTS },

            openPanel: (key) =>
                set(s => ({ panels: { ...s.panels, [key]: true } }), false, `openPanel/${key}`),

            closePanel: (key) =>
                set(s => ({ panels: { ...s.panels, [key]: false } }), false, `closePanel/${key}`),

            togglePanel: (key) =>
                set(s => ({ panels: { ...s.panels, [key]: !s.panels[key] } }), false, `togglePanel/${key}`),

            closeAllPanels: () =>
                set({ panels: { ...PANEL_DEFAULTS } }, false, 'closeAllPanels'),

            /* ── Call ───────────────────────────────────────────────────── */
            callData: null,
            setCallData: (data) => set({ callData: data }, false, 'setCallData'),
            endCall: () => set({ callData: null }, false, 'endCall'),

            /* ── Conv context menu ──────────────────────────────────────── */
            convCtx: null,
            openConvCtx: (ctx) => set({ convCtx: ctx }, false, 'openConvCtx'),
            closeConvCtx: () => set({ convCtx: null }, false, 'closeConvCtx'),
        }),
        { name: 'CipherUI', enabled: process.env.NODE_ENV === 'development' }
    )
)

/* ═══════════════════════════════════════════════════════════════════════
   SELECTOR HOOKS  (prevents unnecessary re-renders — components only
   subscribe to the slice they actually need)
═══════════════════════════════════════════════════════════════════════ */

/** Current app screen */
export const useScreen = () => useCipherUIStore(s => ({ screen: s.screen, setScreen: s.setScreen }))

/** AI panel + global AI toggle */
export const useAiUI = () => useCipherUIStore(s => ({
    aiPanelOpen: s.aiPanelOpen,
    globalAiActive: s.globalAiActive,
    smartReply: s.smartReply,
    toggleAiPanel: s.toggleAiPanel,
    setAiPanelOpen: s.setAiPanelOpen,
    toggleGlobalAi: s.toggleGlobalAi,
    setSmartReply: s.setSmartReply,
    clearSmartReply: s.clearSmartReply,
}))

/** Overlay panels */
export const usePanels = () => useCipherUIStore(s => ({
    panels: s.panels,
    openPanel: s.openPanel,
    closePanel: s.closePanel,
    togglePanel: s.togglePanel,
    closeAllPanels: s.closeAllPanels,
}))

/** Call overlay */
export const useCallUI = () => useCipherUIStore(s => ({
    callData: s.callData,
    setCallData: s.setCallData,
    endCall: s.endCall,
}))

/** Boot flag */
export const useSetupDone = () => useCipherUIStore(s => ({
    setupDone: s.setupDone,
    markSetupDone: s.markSetupDone,
}))

/** Sidebar conversation context menu */
export const useConvCtx = () => useCipherUIStore(s => ({
    convCtx: s.convCtx,
    openConvCtx: s.openConvCtx,
    closeConvCtx: s.closeConvCtx,
}))