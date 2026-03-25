'use client'

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'
import { useShallow } from 'zustand/react/shallow'

import { pb } from '@/src/lib/pb'
import { createChatService } from '@/src/services/pb-chat.service'
import type {
  ConversationBundle,
  MessageBundle,
} from '@/src/types/pb-chat.types'
import type {
  ConversationMembersRecord,
  ConversationsRecord,
  MessageEditsRecord,
  MessageReactionsRecord,
  MessagesRecord,
  PollVotesRecord,
  Prefs,
  PresenceRecord,
  ReadReceiptsRecord,
  StoriesRecord,
  TypingRecord,
  UsersRecord,
} from '@/src/types/pb-collections.types'
// import { type Prefs, DEFAULT_PREFS } from '@/src/types'

export type SbTab = 'all' | 'dms' | 'groups' | 'starred' | 'unread'

const chatService = createChatService(pb)
export const DEFAULT_PREFS: Prefs = {
  theme: 'dark',
  accent: 'indigo',
  sound: true,
  enterSend: true,
  aiSuggest: true,
  readReceipts: true,
  push: false,
}
export interface UploadEntry {
  id: string
  file: File
  task?: unknown
  progress: number
  status: 'uploading' | 'done' | 'failed'
  preview?: string
}

export interface ReplyTarget {
  messageId: string
  conversationId: string
  bundle?: MessageBundle | null
}

export interface ConversationStateItem {
  bundle: ConversationBundle
  otherUser: UsersRecord | null
  lastMessage: MessagesRecord | null
}

export interface MessageStateItem extends MessageBundle { }

interface CipherStore {
  me: UsersRecord | null
  setMe: (u: UsersRecord | null) => void

  myKP: CryptoKeyPair | null
  setMyKP: (kp: CryptoKeyPair | null) => void
  sharedKeys: Record<string, CryptoKey>
  setSharedKey: (cid: string, k: CryptoKey) => void

  conversations: Record<string, ConversationStateItem>
  setConversations: (c: Record<string, ConversationStateItem>) => void
  updateConversation: (cid: string, patch: Partial<ConversationsRecord> | null) => void
  convsLoading: boolean
  setConvsLoading: (v: boolean) => void
  convsError: string | null
  setConvsError: (e: string | null) => void
  refetchConvs: () => Promise<void>
  _convsUnsub: (() => void) | null
  _setConvsUnsub: (fn: (() => void) | null) => void

  activeCid: string | null
  setActiveCid: (cid: string | null) => void
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
  sbTab: SbTab
  setSbTab: (t: SbTab) => void
  searchQuery: string
  setSearchQuery: (q: string) => void

  messagesByCid: Record<string, MessageStateItem[]>
  setMessages: (cid: string, msgs: MessageStateItem[]) => void
  prependMessages: (cid: string, msgs: MessageStateItem[]) => void
  patchMessage: (cid: string, id: string, patch: Partial<MessagesRecord>) => void

  decryptedById: Record<string, string>
  setDecrypted: (batch: Record<string, string>) => void

  replyTo: ReplyTarget | null
  setReplyTo: (r: ReplyTarget | null) => void
  editMsgId: string | null
  setEditMsgId: (id: string | null) => void

  uploads: UploadEntry[]
  addUpload: (entry: UploadEntry) => void
  updateUpload: (id: string, patch: Partial<UploadEntry>) => void
  removeUpload: (id: string) => void

  typingByCid: Record<string, TypingRecord[]>
  setTyping: (cid: string, rows: TypingRecord[]) => void

  attFile: File | null
  attType: string | null
  setAttachment: (f: File | null, t: string | null) => void

  lightboxUrl: string | null
  setLightboxUrl: (url: string | null) => void
  storyViewerOpen: boolean
  setStoryViewerOpen: (v: boolean) => void
  activeStory: StoriesRecord | null
  setActiveStory: (s: StoriesRecord | null) => void

  stories: StoriesRecord[]
  setStories: (s: StoriesRecord[]) => void
  bookmarks: Record<string, MessageStateItem>
  setBookmarks: (b: Record<string, MessageStateItem>) => void
  presence: Record<string, PresenceRecord>
  setPresence: (uid: string, data: PresenceRecord) => void

  prefs: Prefs
  setPrefs: (p: Partial<Prefs>) => void

  toastMsg: string
  showToast: (msg: string) => void

  hasMoreByCid: Record<string, boolean>
  setHasMore: (cid: string, v: boolean) => void
  oldestTsByCid: Record<string, number>
  setOldestTs: (cid: string, ts: number) => void
}

function loadPrefs(): Prefs {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFS
  }

  try {
    const raw = localStorage.getItem('cipher_prefs')
    if (!raw) {
      return DEFAULT_PREFS
    }

    return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_PREFS
  }
}

function applyPrefsToDom(prefs: Prefs): void {
  if (typeof window === 'undefined') {
    return
  }

  const root = document.documentElement
  root.setAttribute('data-accent', prefs.accent)
  root.setAttribute('data-theme', prefs.theme)
}

async function buildConversationStateItem(
  meId: string,
  bundle: ConversationBundle,
): Promise<ConversationStateItem> {
  const { conversation, members } = bundle

  let otherUser: UsersRecord | null = null
  if (conversation.type === 'direct') {
    const otherMember = members.find((member) => member.user && member.user !== meId)
    if (otherMember?.user) {
      otherUser = await chatService.services.users.getById(otherMember.user).catch(() => null)
    }
  }

  const lastMessage = (
    await chatService.listMessages(conversation.id, {
      batch: 1,
    })
  )[0] ?? null

  return {
    bundle,
    otherUser,
    lastMessage,
  }
}

async function buildConversationMap(meId: string): Promise<Record<string, ConversationStateItem>> {
  const conversations = await chatService.listUserConversations(meId)

  const hydrated = await Promise.all(
    conversations.map(async (conversation) => {
      const members = await chatService.listConversationMembers(conversation.id)
      const item = await buildConversationStateItem(meId, { conversation, members })
      return [conversation.id, item] as const
    }),
  )

  return Object.fromEntries(hydrated)
}

export const useStore = create<CipherStore>()(
  subscribeWithSelector((set, get) => ({
    me: null,
    setMe: (me) => set({ me }),

    myKP: null,
    setMyKP: (myKP) => set({ myKP }),
    sharedKeys: {},
    setSharedKey: (cid, k) =>
      set((s) => ({ sharedKeys: { ...s.sharedKeys, [cid]: k } })),

    conversations: {},
    setConversations: (conversations) => set({ conversations }),

    updateConversation: (cid, patch) => {
      if (patch === null) {
        set((s) => {
          const next = { ...s.conversations }
          delete next[cid]
          return { conversations: next }
        })
        void chatService.deleteConversation(cid)
        return
      }

      set((s) => {
        const existing = s.conversations[cid]
        if (!existing) {
          return s
        }

        return {
          conversations: {
            ...s.conversations,
            [cid]: {
              ...existing,
              bundle: {
                ...existing.bundle,
                conversation: {
                  ...existing.bundle.conversation,
                  ...patch,
                },
              },
            },
          },
        }
      })

      void chatService.updateConversation(cid, patch)
    },

    convsLoading: false,
    setConvsLoading: (convsLoading) => set({ convsLoading }),
    convsError: null,
    setConvsError: (convsError) => set({ convsError }),

    _convsUnsub: null,
    _setConvsUnsub: (fn) => set({ _convsUnsub: fn }),

    refetchConvs: async () => {
      const me = get().me
      if (!me) {
        return
      }

      get()._convsUnsub?.()
      get()._setConvsUnsub(null)

      set({ convsLoading: true, convsError: null })

      try {
        const refresh = async () => {
          const map = await buildConversationMap(me.id)
          set({ conversations: map })
        }

        await refresh()
        set({ convsLoading: false })

        const unsubs = await Promise.all([
          chatService.subscribeConversations(() => {
            void refresh()
          }),
          chatService.services.conversation_members.subscribe(() => {
            void refresh()
          }),
        ])

        get()._setConvsUnsub(() => {
          for (const unsub of unsubs) {
            unsub()
          }
        })
      } catch (error) {
        console.error('[store] refetchConvs error:', error)
        set({
          convsLoading: false,
          convsError: 'Failed to load conversations. Tap to retry.',
        })
      }
    },

    activeCid: null,
    setActiveCid: (activeCid) => set({ activeCid }),
    sidebarOpen: false,
    setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    sbTab: 'all',
    setSbTab: (sbTab) => set({ sbTab }),
    searchQuery: '',
    setSearchQuery: (searchQuery) => set({ searchQuery }),

    messagesByCid: {},
    setMessages: (cid, msgs) =>
      set((s) => ({ messagesByCid: { ...s.messagesByCid, [cid]: msgs } })),
    prependMessages: (cid, incoming) =>
      set((s) => {
        const existing = s.messagesByCid[cid] ?? []
        const seen = new Set(existing.map((item) => item.message.id))
        const fresh = incoming.filter((item) => !seen.has(item.message.id))
        if (fresh.length === 0) {
          return s
        }
        return {
          messagesByCid: {
            ...s.messagesByCid,
            [cid]: [...fresh, ...existing],
          },
        }
      }),
    patchMessage: (cid, id, patch) =>
      set((s) => {
        const rows = s.messagesByCid[cid]
        if (!rows) {
          return s
        }

        const idx = rows.findIndex((item) => item.message.id === id)
        if (idx === -1) {
          return s
        }

        const next = [...rows]
        next[idx] = {
          ...next[idx],
          message: {
            ...next[idx].message,
            ...patch,
          },
        }

        return {
          messagesByCid: {
            ...s.messagesByCid,
            [cid]: next,
          },
        }
      }),

    decryptedById: {},
    setDecrypted: (batch) =>
      set((s) => {
        const changed: Record<string, string> = {}
        for (const [key, value] of Object.entries(batch)) {
          if (s.decryptedById[key] !== value) {
            changed[key] = value
          }
        }

        if (Object.keys(changed).length === 0) {
          return s
        }

        return {
          decryptedById: {
            ...s.decryptedById,
            ...changed,
          },
        }
      }),

    replyTo: null,
    setReplyTo: (replyTo) => set({ replyTo }),
    editMsgId: null,
    setEditMsgId: (editMsgId) => set({ editMsgId }),

    uploads: [],
    addUpload: (entry) => set((s) => ({ uploads: [...s.uploads, entry] })),
    updateUpload: (id, patch) =>
      set((s) => ({
        uploads: s.uploads.map((entry) =>
          entry.id === id ? { ...entry, ...patch } : entry,
        ),
      })),
    removeUpload: (id) =>
      set((s) => ({ uploads: s.uploads.filter((entry) => entry.id !== id) })),

    typingByCid: {},
    setTyping: (cid, rows) =>
      set((s) => {
        const prev = s.typingByCid[cid] ?? []
        const same =
          prev.length === rows.length &&
          prev.every((row, index) => row.id === rows[index]?.id && row.updated === rows[index]?.updated)

        if (same) {
          return s
        }

        return {
          typingByCid: {
            ...s.typingByCid,
            [cid]: rows,
          },
        }
      }),

    attFile: null,
    attType: null,
    setAttachment: (attFile, attType) => set({ attFile, attType }),

    lightboxUrl: null,
    setLightboxUrl: (lightboxUrl) => set({ lightboxUrl }),
    storyViewerOpen: false,
    setStoryViewerOpen: (storyViewerOpen) => set({ storyViewerOpen }),
    activeStory: null,
    setActiveStory: (activeStory) => set({ activeStory }),

    stories: [],
    setStories: (stories) => set({ stories }),
    bookmarks: {},
    setBookmarks: (bookmarks) => set({ bookmarks }),
    presence: {},
    setPresence: (uid, data) =>
      set((s) => {
        const prev = s.presence[uid]
        if (prev?.online === data.online && prev?.lastSeen === data.lastSeen && prev?.updated === data.updated) {
          return s
        }

        return {
          presence: {
            ...s.presence,
            [uid]: data,
          },
        }
      }),

    prefs: loadPrefs(),
    setPrefs: (patch) => {
      const prefs = { ...get().prefs, ...patch }
      set({ prefs })

      if (typeof window !== 'undefined') {
        localStorage.setItem('cipher_prefs', JSON.stringify(prefs))
        applyPrefsToDom(prefs)
      }
    },

    toastMsg: '',
    showToast: (msg) => {
      set({ toastMsg: msg })
      clearTimeout((get() as { _toastTimer?: ReturnType<typeof setTimeout> })._toastTimer)
      const timer = setTimeout(() => set({ toastMsg: '' }), 2800)
      set({ _toastTimer: timer } as never)
    },

    hasMoreByCid: {},
    setHasMore: (cid, v) =>
      set((s) => ({ hasMoreByCid: { ...s.hasMoreByCid, [cid]: v } })),
    oldestTsByCid: {},
    setOldestTs: (cid, ts) =>
      set((s) => ({ oldestTsByCid: { ...s.oldestTsByCid, [cid]: ts } })),
  })),
)

useStore.subscribe(
  (state) => state.me,
  (me) => {
    if (me) {
      void useStore.getState().refetchConvs()
      return
    }

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
  },
)

export const useMe = () => useStore((s) => s.me)
export const usePrefs = () => useStore((s) => s.prefs)
export const useConversation = (cid: string) => useStore((s) => s.conversations[cid] ?? null)
export const useActiveConversation = () =>
  useStore((s) => (s.activeCid ? s.conversations[s.activeCid] ?? null : null))
export const useConversations = () =>
  useStore(
    useShallow((s) => ({
      conversations: s.conversations,
      convsLoading: s.convsLoading,
      convsError: s.convsError,
      refetchConvs: s.refetchConvs,
      updateConversation: s.updateConversation,
    }))
  );
export const useToast = () => useStore((s) => s.toastMsg)
export const useChatMessages = (cid: string) => useStore((s) => s.messagesByCid[cid] ?? [])
export const useDecrypted = (id?: string): string =>
  useStore((s) => (!id ? '' : s.decryptedById[id] ?? ''))
export const useTyping = (cid: string) => useStore((s) => s.typingByCid[cid] ?? [])
export const useUploads = () => useStore((s) => s.uploads)
export const usePresence = (uid?: string) =>
  useStore((s) => (uid ? s.presence[uid] : undefined))
export const usePagination = (cid: string) =>
  useStore(
    useShallow((s) => ({
      hasMore: s.hasMoreByCid[cid] ?? true,
      oldestTs: s.oldestTsByCid[cid] ?? 0,
      setHasMore: s.setHasMore,
      setOldestTs: s.setOldestTs,
    })),
  )

export type {
  ConversationBundle,
  ConversationMembersRecord,
  ConversationStateItem as ConversationState,
  ConversationsRecord,
  MessageBundle,
  MessageEditsRecord,
  MessageReactionsRecord,
  MessagesRecord,
  PollVotesRecord,
  PresenceRecord,
  ReadReceiptsRecord,
  StoriesRecord,
  TypingRecord,
  UsersRecord,
}
