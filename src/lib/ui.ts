import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

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


export type Screen = 'setup' | 'auth' | 'app' | 'mfa' |'forgot-success' | 'landing' | 'forgot'

export type PanelKey = 'settings' | 'profile' | 'newChat' | 'newGroup' | 'bookmarks'

/** Position + id of the conversation that triggered a context menu */
export interface ConvCtx {
    cid: string
    x: number
    y: number
}

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