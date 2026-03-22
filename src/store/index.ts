import { create } from 'zustand';
import {
  Conversation, Message, Story, Bookmark
} from '@/types';
import { AccentColor, AppPrefs, CipherUser, ContextMenuState, ThemeMode } from '../types';

// ─── Prefs Store ─────────────────────────────────────────────────────────────

const DEFAULT_PREFS: AppPrefs = {
  theme: 'dark',
  accent: 'indigo',
  sound: true,
  enterSend: true,
  aiSuggest: true,
  readReceipts: true,
  push: false,
};

interface PrefsStore {
  prefs: AppPrefs;
  setTheme: (t: ThemeMode) => void;
  setAccent: (a: AccentColor) => void;
  togglePref: (key: keyof AppPrefs) => void;
  loadPrefs: () => void;
}

export const usePrefsStore = create<PrefsStore>((set, get) => ({
  prefs: DEFAULT_PREFS,

  loadPrefs: () => {
    try {
      const stored = localStorage.getItem('cipher_prefs');
      if (stored) {
        set({ prefs: { ...DEFAULT_PREFS, ...JSON.parse(stored) } });
      }
    } catch { /* ignore */ }
  },

  setTheme: (theme) => {
    set(s => { const p = { ...s.prefs, theme }; save(p); applyTheme(p); return { prefs: p }; });
  },

  setAccent: (accent) => {
    set(s => { const p = { ...s.prefs, accent }; save(p); applyTheme(p); return { prefs: p }; });
  },

  togglePref: (key) => {
    set(s => {
      const p = { ...s.prefs, [key]: !s.prefs[key as keyof AppPrefs] };
      save(p);
      return { prefs: p };
    });
  },
}));

function save(p: AppPrefs) {
  localStorage.setItem('cipher_prefs', JSON.stringify(p));
}

export function applyTheme(prefs: AppPrefs) {
  document.documentElement.setAttribute('data-theme', prefs.theme ?? 'dark');
  document.documentElement.setAttribute('data-accent', prefs.accent ?? 'indigo');
}

// ─── App Store ────────────────────────────────────────────────────────────────

interface AppStore {
  // Auth
  currentUser: CipherUser | null;
  setCurrentUser: (u: CipherUser | null) => void;

  // Active chat
  activeCid: string | null;
  activePeer: CipherUser | null;
  activeIsGroup: boolean;
  setActiveChat: (cid: string | null, peer: CipherUser | null, isGroup: boolean) => void;

  // Conversations
  conversations: Record<string, Conversation>;
  setConversations: (c: Record<string, Conversation>) => void;

  // Messages
  messages: Record<string, Message>;
  setMessages: (m: Record<string, Message>) => void;
  clearMessages: () => void;

  // Stories
  stories: Record<string, Story>;
  setStories: (s: Record<string, Story>) => void;

  // Bookmarks
  bookmarks: Record<string, Bookmark>;
  setBookmarks: (b: Record<string, Bookmark>) => void;

  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  activePanel: string | null;
  setActivePanel: (p: string | null) => void;

  // Reply
  replyTo: { id: string; text: string; senderName: string } | null;
  setReplyTo: (r: AppStore['replyTo']) => void;

  // Context menu
  ctxMenu: ContextMenuState;
  setCtxMenu: (m: ContextMenuState) => void;

  // Sidebar tab
  sidebarTab: 'all' | 'chats' | 'groups' | 'starred';
  setSidebarTab: (t: AppStore['sidebarTab']) => void;

  // Typing
  typingUsers: Record<string, boolean>;
  setTypingUsers: (t: Record<string, boolean>) => void;

  // Toast
  toastMsg: string;
  showToast: (msg: string) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  currentUser: null,
  setCurrentUser: (u) => set({ currentUser: u }),

  activeCid: null,
  activePeer: null,
  activeIsGroup: false,
  setActiveChat: (cid, peer, isGroup) => set({ activeCid: cid, activePeer: peer, activeIsGroup: isGroup }),

  conversations: {},
  setConversations: (c) => set({ conversations: c }),

  messages: {},
  setMessages: (m) => set({ messages: m }),
  clearMessages: () => set({ messages: {} }),

  stories: {},
  setStories: (s) => set({ stories: s }),

  bookmarks: {},
  setBookmarks: (b) => set({ bookmarks: b }),

  sidebarOpen: false,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),

  activePanel: null,
  setActivePanel: (p) => set({ activePanel: p }),

  replyTo: null,
  setReplyTo: (r) => set({ replyTo: r }),

  ctxMenu: { visible: false, x: 0, y: 0, msgId: null, msg: null, isMine: false, dtext: '' },
  setCtxMenu: (m) => set({ ctxMenu: m }),

  sidebarTab: 'all',
  setSidebarTab: (t) => set({ sidebarTab: t }),

  typingUsers: {},
  setTypingUsers: (t) => set({ typingUsers: t }),

  toastMsg: '',
  showToast: (msg) => {
    set({ toastMsg: msg });
    setTimeout(() => set({ toastMsg: '' }), 2800);
  },
}));
