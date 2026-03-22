'use client'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Conversation, Message, Prefs, Story, Bookmark } from '@/types'
import { DEFAULT_PREFS } from '@/types'
import { ref, onValue, update, remove, off } from 'firebase/database'
import { getFirebaseDB } from '@/lib/firebase'
import { CipherUser } from '@/src/types'

/* ═══════════════════════════════════════════════════════════════
   TAB TYPE  (extended to match Sidebar)
═══════════════════════════════════════════════════════════════ */
export type SbTab = 'all' | 'dms' | 'groups' | 'starred' | 'unread'
// Legacy aliases kept for backward compat
// 'chats' → 'dms'  (old sidebar used 'chats', new uses 'dms')

/* ═══════════════════════════════════════════════════════════════
   STORE INTERFACE
═══════════════════════════════════════════════════════════════ */
interface CipherStore {
  // ── AUTH ────────────────────────────────────────────────────
  me: CipherUser | null
  setMe: (u: CipherUser | null) => void

  // ── CRYPTO ──────────────────────────────────────────────────
  myKP: CryptoKeyPair | null
  setMyKP: (kp: CryptoKeyPair) => void
  sharedKeys: Record<string, CryptoKey>
  setSharedKey: (cid: string, k: CryptoKey) => void

  // ── CONVERSATIONS ────────────────────────────────────────────
  conversations: Record<string, Conversation>
  setConversations: (c: Record<string, Conversation>) => void

  /** Patch or delete a conversation locally + Firebase */
  updateConversation: (cid: string, patch: Partial<Conversation> | null) => void

  /** Async loading state for initial conversation fetch */
  convsLoading: boolean
  setConvsLoading: (v: boolean) => void

  /** Error message if conversation fetch failed */
  convsError: string | null
  setConvsError: (e: string | null) => void

  /**
   * Re-attach the Firebase realtime listener for conversations.
   * Call this from the error-state retry button.
   * Requires `me` to be set — no-ops otherwise.
   */
  refetchConvs: () => void

  /** Internal: store the unsubscribe fn so we can detach on re-fetch */
  _convsUnsub: (() => void) | null
  _setConvsUnsub: (fn: (() => void) | null) => void

  // ── SIDEBAR UI ───────────────────────────────────────────────
  activeCid: string | null
  setActiveCid: (cid: string | null) => void
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
  sbTab: SbTab
  setSbTab: (t: SbTab) => void
  searchQuery: string
  setSearchQuery: (q: string) => void

  // ── MESSAGES ────────────────────────────────────────────────
  messages: Record<string, Message>
  setMessages: (msgs: Record<string, Message>) => void
  replyTo: { id: string; text: string; senderName: string } | null
  setReplyTo: (r: CipherStore['replyTo']) => void
  editMsgId: string | null
  setEditMsgId: (id: string | null) => void

  // ── ATTACHMENT ──────────────────────────────────────────────
  attFile: File | null
  attType: string | null
  setAttachment: (f: File | null, t: string | null) => void

  // ── OVERLAYS ────────────────────────────────────────────────
  callOverlayOpen: boolean
  setCallOverlayOpen: (v: boolean) => void
  lightboxUrl: string | null
  setLightboxUrl: (url: string | null) => void
  storyViewerOpen: boolean
  setStoryViewerOpen: (v: boolean) => void
  activeStory: Story | null
  setActiveStory: (s: Story | null) => void

  // ── DATA ────────────────────────────────────────────────────
  stories: Story[]
  setStories: (s: Story[]) => void
  bookmarks: Record<string, Bookmark>
  setBookmarks: (b: Record<string, Bookmark>) => void
  presence: Record<string, { online: boolean; lastSeen?: number }>
  setPresence: (uid: string, data: { online: boolean; lastSeen?: number }) => void

  // ── PREFS ────────────────────────────────────────────────────
  prefs: Prefs
  setPrefs: (p: Partial<Prefs>) => void

  // ── TOAST ────────────────────────────────────────────────────
  toastMsg: string
  showToast: (msg: string) => void
}

/* ═══════════════════════════════════════════════════════════════
   STORE IMPLEMENTATION
═══════════════════════════════════════════════════════════════ */
export const useStore = create<CipherStore>()(
  subscribeWithSelector((set, get) => ({

    /* ── AUTH ── */
    me: null,
    setMe: me => set({ me }),

    /* ── CRYPTO ── */
    myKP: null,
    setMyKP: myKP => set({ myKP }),
    sharedKeys: {},
    setSharedKey: (cid, k) =>
      set(s => ({ sharedKeys: { ...s.sharedKeys, [cid]: k } })),

    /* ── CONVERSATIONS ── */
    conversations: {},
    setConversations: conversations => set({ conversations }),

    updateConversation: (cid, patch) => {
      const me = get().me
      if (!me) return

      if (patch === null) {
        // Delete
        set(s => {
          const next = { ...s.conversations }
          delete next[cid]
          return { conversations: next }
        })
        try {
          const db = getFirebaseDB()
          remove(ref(db, `conversations/${me.uid}/${cid}`))
        } catch { /* silently ignore — user already sees optimistic update */ }
      } else {
        // Patch locally (optimistic)
        set(s => ({
          conversations: {
            ...s.conversations,
            [cid]: { ...s.conversations[cid], ...patch },
          },
        }))
        // Persist to Firebase
        try {
          const db = getFirebaseDB()
          update(ref(db, `conversations/${me.uid}/${cid}`), patch)
        } catch { /* optimistic update already applied */ }
      }
    },

    /* ── LOADING / ERROR ── */
    convsLoading: false,
    setConvsLoading: convsLoading => set({ convsLoading }),

    convsError: null,
    setConvsError: convsError => set({ convsError }),

    /* ── REFETCH ── */
    _convsUnsub: null,
    _setConvsUnsub: fn => set({ _convsUnsub: fn }),

    refetchConvs: () => {
      const { me, _convsUnsub, _setConvsUnsub, setConvsLoading, setConvsError, setConversations } = get()
      if (!me) return

      // Detach old listener
      _convsUnsub?.()

      setConvsLoading(true)
      setConvsError(null)

      try {
        const db = getFirebaseDB()
        const convRef = ref(db, `conversations/${me.uid}`)

        const unsub = onValue(
          convRef,
          snap => {
            const raw = (snap.val() ?? {}) as Record<string, Conversation>
            setConversations(raw)
            setConvsLoading(false)
            setConvsError(null)
          },
          err => {
            console.error('[store] conversations listener error:', err)
            setConvsLoading(false)
            setConvsError('Failed to load conversations. Tap to retry.')
          }
        )

        // Store unsubscribe so we can detach on retry / sign-out
        _setConvsUnsub(() => off(convRef))
      } catch (err) {
        console.error('[store] refetchConvs error:', err)
        setConvsLoading(false)
        setConvsError('Connection error. Tap to retry.')
      }
    },

    /* ── SIDEBAR UI ── */
    activeCid: null,
    setActiveCid: activeCid => set({ activeCid }),
    sidebarOpen: false,
    setSidebarOpen: sidebarOpen => set({ sidebarOpen }),
    sbTab: 'all',
    setSbTab: sbTab => set({ sbTab }),
    searchQuery: '',
    setSearchQuery: searchQuery => set({ searchQuery }),

    /* ── MESSAGES ── */
    messages: {},
    setMessages: messages => set({ messages }),
    replyTo: null,
    setReplyTo: replyTo => set({ replyTo }),
    editMsgId: null,
    setEditMsgId: editMsgId => set({ editMsgId }),

    /* ── ATTACHMENT ── */
    attFile: null,
    attType: null,
    setAttachment: (attFile, attType) => set({ attFile, attType }),

    /* ── OVERLAYS ── */
    callOverlayOpen: false,
    setCallOverlayOpen: callOverlayOpen => set({ callOverlayOpen }),
    lightboxUrl: null,
    setLightboxUrl: lightboxUrl => set({ lightboxUrl }),
    storyViewerOpen: false,
    setStoryViewerOpen: storyViewerOpen => set({ storyViewerOpen }),
    activeStory: null,
    setActiveStory: activeStory => set({ activeStory }),

    /* ── DATA ── */
    stories: [],
    setStories: stories => set({ stories }),
    bookmarks: {},
    setBookmarks: bookmarks => set({ bookmarks }),
    presence: {},
    setPresence: (uid, data) =>
      set(s => ({ presence: { ...s.presence, [uid]: data } })),

    /* ── PREFS ── */
    prefs: (() => {
      // Hydrate from localStorage on first render (client only)
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('cipher_prefs')
          if (stored) return { ...DEFAULT_PREFS, ...JSON.parse(stored) }
        } catch { /* ignore */ }
      }
      return DEFAULT_PREFS
    })(),

    setPrefs: p => {
      const prefs = { ...get().prefs, ...p }
      set({ prefs })
      if (typeof window !== 'undefined') {
        localStorage.setItem('cipher_prefs', JSON.stringify(prefs))
        // Apply theme tokens immediately
        const root = document.documentElement
        root.setAttribute('data-accent', prefs.accent ?? 'indigo')
        if (prefs.theme) root.setAttribute('data-theme', prefs.theme)
      }
    },

    /* ── TOAST ── */
    toastMsg: '',
    showToast: msg => {
      set({ toastMsg: msg })
      // Clear any existing timer before setting a new one
      clearTimeout((get() as any)._toastTimer)
      const timer = setTimeout(() => set({ toastMsg: '' }), 2800)
      set({ _toastTimer: timer } as any)
    },
  }))
)

/* ═══════════════════════════════════════════════════════════════
   AUTO-REFETCH WHEN me CHANGES
   Attaches the conversations listener as soon as the user signs in,
   and detaches on sign-out so we never leak listeners.
═══════════════════════════════════════════════════════════════ */
useStore.subscribe(
  state => state.me,
  me => {
    if (me) {
      // Signed in → start listener
      useStore.getState().refetchConvs()
    } else {
      // Signed out → detach listener + clear state
      const { _convsUnsub, _setConvsUnsub } = useStore.getState()
      _convsUnsub?.()
      _setConvsUnsub(null)
      useStore.setState({
        conversations: {},
        activeCid: null,
        messages: {},
        presence: {},
        stories: [],
        bookmarks: {},
        sharedKeys: {},
        replyTo: null,
        editMsgId: null,
        attFile: null,
        attType: null,
        convsLoading: false,
        convsError: null,
        sidebarOpen: false,
        searchQuery: '',
      })
    }
  }
)

/* ═══════════════════════════════════════════════════════════════
   SELECTOR HOOKS  (avoid re-renders in components that only need
   one slice of state)
═══════════════════════════════════════════════════════════════ */

/** Returns only auth state — re-renders only on sign-in/out */
export const useMe = () => useStore(s => s.me)

/** Returns prefs — re-renders only when prefs change */
export const usePrefs = () => useStore(s => s.prefs)

/** Returns a single conversation by id */
export const useConversation = (cid: string) =>
  useStore(s => s.conversations[cid] ?? null)

/** Returns the active conversation */
export const useActiveConversation = () =>
  useStore(s => (s.activeCid ? s.conversations[s.activeCid] ?? null : null))

/** Returns conversations + loading/error state as a group */
export const useConversations = () =>
  useStore(s => ({
    conversations: s.conversations,
    convsLoading: s.convsLoading,
    convsError: s.convsError,
    refetchConvs: s.refetchConvs,
    updateConversation: s.updateConversation,
  }))

/** Returns toast message */
export const useToast = () => useStore(s => s.toastMsg)