'use client'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Conversation, Message, Prefs, Story, Bookmark, ReplyTo } from '@/src/types'
import { DEFAULT_PREFS } from '@/src/types'
import { ref, onValue, update, remove, off } from 'firebase/database'
import { getFirebaseDB } from '@/src/lib/firebase'
import { CipherUser } from '@/src/types'
import { shallow } from 'zustand/shallow'

export type SbTab = 'all' | 'dms' | 'groups' | 'starred' | 'unread'

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
  updateConversation: (cid: string, patch: Partial<Conversation> | null) => void
  convsLoading: boolean
  setConvsLoading: (v: boolean) => void
  convsError: string | null
  setConvsError: (e: string | null) => void
  refetchConvs: () => void
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
  /**
   * Keyed by cid so switching chats doesn't nuke state.
   * Each entry is a sorted [id, Message][] array.
   */
  messagesByCid: Record<string, [string, Message][]>
  setMessages: (cid: string, msgs: [string, Message][]) => void
  prependMessages: (cid: string, msgs: [string, Message][]) => void
  patchMessage: (cid: string, id: string, patch: Partial<Message>) => void

  /**
   * Decrypted/rendered text keyed by message id.
   * Stored flat (not per-cid) — ids are globally unique.
   */
  decryptedById: Record<string, string>
  setDecrypted: (batch: Record<string, string>) => void

  replyTo: ReplyTo | null
  setReplyTo: (r: CipherStore['replyTo']) => void
  editMsgId: string | null
  setEditMsgId: (id: string | null) => void

  // ── UPLOADS ────────────────────────────────────────────────
  uploads: UploadEntry[]
  addUpload: (entry: UploadEntry) => void
  updateUpload: (id: string, patch: Partial<UploadEntry>) => void
  removeUpload: (id: string) => void

  // ── TYPING ──────────────────────────────────────────────────
  typingByCid: Record<string, string[]>   // cid → [name, ...]
  setTyping: (cid: string, names: string[]) => void

  // ── SCROLL / SWIPE UI ───────────────────────────────────────
  /**
   * Swipe state stored here so ChatArea doesn't need local state
   * that triggers full re-renders on every touch pixel.
   * But we keep swipe as LOCAL state in ChatArea intentionally —
   * it's extremely high-frequency (every touchmove) and putting it
   * in global store would hammer all subscribers. Keep it local.
   */

  // ── ATTACHMENT ──────────────────────────────────────────────
  attFile: File | null
  attType: string | null
  setAttachment: (f: File | null, t: string | null) => void

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

  // ── PAGINATION ──────────────────────────────────────────────
  hasMoreByCid: Record<string, boolean>
  setHasMore: (cid: string, v: boolean) => void
  oldestTsByCid: Record<string, number>
  setOldestTs: (cid: string, ts: number) => void
}

// UploadEntry type — keep in store so ChatArea and UploadBubble share it
export interface UploadEntry {
  id: string
  file: File
  task: any          // firebase UploadTask
  progress: number
  status: 'uploading' | 'done' | 'failed'
  preview?: string
}

/* ═══════════════════════════════════════════════════════════════
   STORE
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
        set(s => {
          const next = { ...s.conversations }
          delete next[cid]
          return { conversations: next }
        })
        try { remove(ref(getFirebaseDB(), `conversations/${me.uid}/${cid}`)) } catch { /* */ }
      } else {
        set(s => ({
          conversations: { ...s.conversations, [cid]: { ...s.conversations[cid], ...patch } },
        }))
        try { update(ref(getFirebaseDB(), `conversations/${me.uid}/${cid}`), patch) } catch { /* */ }
      }
    },

    convsLoading: false,
    setConvsLoading: convsLoading => set({ convsLoading }),
    convsError: null,
    setConvsError: convsError => set({ convsError }),

    _convsUnsub: null,
    _setConvsUnsub: fn => set({ _convsUnsub: fn }),

    refetchConvs: () => {
      const { me, _convsUnsub, _setConvsUnsub, setConvsLoading, setConvsError, setConversations } = get()
      if (!me) return
      _convsUnsub?.()
      setConvsLoading(true)
      setConvsError(null)
      try {
        const db = getFirebaseDB()
        const convRef = ref(db, `conversations/${me.uid}`)
        onValue(
          convRef,
          snap => {
            setConversations((snap.val() ?? {}) as Record<string, Conversation>)
            setConvsLoading(false)
            setConvsError(null)
          },
          err => {
            console.error('[store] conversations listener error:', err)
            setConvsLoading(false)
            setConvsError('Failed to load conversations. Tap to retry.')
          }
        )
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
    messagesByCid: {},
    setMessages: (cid, msgs) =>
      set(s => ({ messagesByCid: { ...s.messagesByCid, [cid]: msgs } })),
    prependMessages: (cid, newMsgs) =>
      set(s => {
        const existing = s.messagesByCid[cid] ?? []
        const existingIds = new Set(existing.map(([id]) => id))
        const fresh = newMsgs.filter(([id]) => !existingIds.has(id))
        if (fresh.length === 0) return s   // nothing changed — no re-render
        return { messagesByCid: { ...s.messagesByCid, [cid]: [...fresh, ...existing] } }
      }),
    patchMessage: (cid, id, patch) =>
      set(s => {
        const msgs = s.messagesByCid[cid]
        if (!msgs) return s
        const idx = msgs.findIndex(([mid]) => mid === id)
        if (idx === -1) return s
        const next = [...msgs]
        next[idx] = [id, { ...next[idx][1], ...patch }]
        return { messagesByCid: { ...s.messagesByCid, [cid]: next } }
      }),

    decryptedById: {},
    setDecrypted: batch =>
      set(s => {
        // Only update entries that actually changed
        const changed: Record<string, string> = {}
        for (const [k, v] of Object.entries(batch)) {
          if (s.decryptedById[k] !== v) changed[k] = v
        }
        if (Object.keys(changed).length === 0) return s
        return { decryptedById: { ...s.decryptedById, ...changed } }
      }),

    replyTo: null,
    setReplyTo: replyTo => set({ replyTo }),
    editMsgId: null,
    setEditMsgId: editMsgId => set({ editMsgId }),

    /* ── UPLOADS ── */
    uploads: [],
    addUpload: entry => set(s => ({ uploads: [...s.uploads, entry] })),
    updateUpload: (id, patch) =>
      set(s => ({ uploads: s.uploads.map(e => e.id === id ? { ...e, ...patch } : e) })),
    removeUpload: id =>
      set(s => ({ uploads: s.uploads.filter(e => e.id !== id) })),

    /* ── TYPING ── */
    typingByCid: {},
    setTyping: (cid, names) =>
      set(s => {
        const prev = s.typingByCid[cid]
        // Skip update if same names (prevent re-render on every Firebase tick)
        if (prev && prev.length === names.length && prev.every((n, i) => n === names[i])) return s
        return { typingByCid: { ...s.typingByCid, [cid]: names } }
      }),

    /* ── ATTACHMENT ── */
    attFile: null,
    attType: null,
    setAttachment: (attFile, attType) => set({ attFile, attType }),

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
      set(s => {
        const prev = s.presence[uid]
        if (prev?.online === data.online && prev?.lastSeen === data.lastSeen) return s
        return { presence: { ...s.presence, [uid]: data } }
      }),

    /* ── PREFS ── */
    prefs: (() => {
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('cipher_prefs')
          if (stored) return { ...DEFAULT_PREFS, ...JSON.parse(stored) }
        } catch { /* */ }
      }
      return DEFAULT_PREFS
    })(),
    setPrefs: p => {
      const prefs = { ...get().prefs, ...p }
      set({ prefs })
      if (typeof window !== 'undefined') {
        localStorage.setItem('cipher_prefs', JSON.stringify(prefs))
        const root = document.documentElement
        root.setAttribute('data-accent', prefs.accent ?? 'indigo')
        if (prefs.theme) root.setAttribute('data-theme', prefs.theme)
      }
    },

    /* ── TOAST ── */
    toastMsg: '',
    showToast: msg => {
      set({ toastMsg: msg })
      clearTimeout((get() as any)._toastTimer)
      const timer = setTimeout(() => set({ toastMsg: '' }), 2800)
      set({ _toastTimer: timer } as any)
    },

    /* ── PAGINATION ── */
    hasMoreByCid: {},
    setHasMore: (cid, v) =>
      set(s => ({ hasMoreByCid: { ...s.hasMoreByCid, [cid]: v } })),
    oldestTsByCid: {},
    setOldestTs: (cid, ts) =>
      set(s => ({ oldestTsByCid: { ...s.oldestTsByCid, [cid]: ts } })),
  }))
)

/* ═══════════════════════════════════════════════════════════════
   AUTO-REFETCH
═══════════════════════════════════════════════════════════════ */
useStore.subscribe(
  state => state.me,
  me => {
    if (me) {
      useStore.getState().refetchConvs()
    } else {
      const { _convsUnsub, _setConvsUnsub } = useStore.getState()
      _convsUnsub?.()
      _setConvsUnsub(null)
      useStore.setState({
        conversations: {},
        activeCid: null,
        messagesByCid: {},
        decryptedById: {},
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
        typingByCid: {},
        uploads: [],
        hasMoreByCid: {},
        oldestTsByCid: {},
      })
    }
  }
)

/* ═══════════════════════════════════════════════════════════════
   GRANULAR SELECTOR HOOKS
   Each hook subscribes only to the slice it needs.
   Components using these will NOT re-render when unrelated
   state changes — this is the primary fix for unnecessary renders.
═══════════════════════════════════════════════════════════════ */

export const useMe = () => useStore(s => s.me)
export const usePrefs = () => useStore(s => s.prefs)
export const useConversation = (cid: string) => useStore(s => s.conversations[cid] ?? null)
export const useActiveConversation = () =>
  useStore(s => (s.activeCid ? s.conversations[s.activeCid] ?? null : null))
export const useConversations = () =>
  useStore(
    s => ({
      conversations: s.conversations,
      convsLoading: s.convsLoading,
      convsError: s.convsError,
      refetchConvs: s.refetchConvs,
      updateConversation: s.updateConversation,
    }),
    shallow   // ← object selector needs shallow equality
  )
export const useToast = () => useStore(s => s.toastMsg)

/** Returns messages for one chat — re-renders only when that chat's messages change */
export const useChatMessages = (cid: string) =>
  useStore(s => s.messagesByCid[cid] ?? [])

/** Returns decrypted text for a single message id — re-renders only when that id changes */
export const useDecrypted = (id?: string): string => {
  return useStore(s => {
    if (!id) return ''
    return s.decryptedById[id] ?? ''
  })
}

/** Returns typing names for one chat */
export const useTyping = (cid: string) =>
  useStore(s => s.typingByCid[cid] ?? [])

/** Returns uploads array — re-renders when any upload changes */
export const useUploads = () => useStore(s => s.uploads)

/** Returns presence for a single uid */
export const usePresence = (uid?: string) =>
  useStore(s => (uid ? s.presence[uid] : undefined))

/** Returns pagination state for one chat */
export const usePagination = (cid: string) =>
  useStore(
    s => ({
      hasMore: s.hasMoreByCid[cid] ?? true,
      oldestTs: s.oldestTsByCid[cid] ?? 0,
      setHasMore: s.setHasMore,
      setOldestTs: s.setOldestTs,
    }),
    shallow
  )