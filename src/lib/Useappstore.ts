import { Chat, UIState } from '@/src/types'
import { create } from 'zustand'

/* ═══════════════════════════════════════════════════════════════════════════
   ZUSTAND STORE
═══════════════════════════════════════════════════════════════════════════ */

interface AppStore {
    // UI State
    ui: UIState
    setSidebarOpen: (open: boolean) => void
    setSelectedChatId: (id: string | null) => void
    setShowGestureHint: (show: boolean) => void
    setLoading: (loading: boolean) => void
    setError: (error: string | null) => void

    // Chat State
    chats: Chat[]
    setChats: (chats: Chat[]) => void
    addChat: (chat: Chat) => void
    deleteChat: (id: string) => void

    // Actions
    toggleSidebar: () => void
    selectChat: (id: string) => void
    closeSidebar: () => void
}

export const useAppStore = create<AppStore>((set) => ({
    // Initial UI state
    ui: {
        sidebarOpen: false,
        selectedChatId: null,
        showGestureHint: true, // Show gesture hint on first load
        loading: false,
        error: null,
    },

    // Initial chat state
    chats: [],

    // UI Actions
    setSidebarOpen: (open) =>
        set((state) => ({
            ui: { ...state.ui, sidebarOpen: open },
        })),

    setSelectedChatId: (id) =>
        set((state) => ({
            ui: { ...state.ui, selectedChatId: id },
        })),

    setShowGestureHint: (show) =>
        set((state) => ({
            ui: { ...state.ui, showGestureHint: show },
        })),

    setLoading: (loading) =>
        set((state) => ({
            ui: { ...state.ui, loading },
        })),

    setError: (error) =>
        set((state) => ({
            ui: { ...state.ui, error },
        })),

    // Chat Actions
    setChats: (chats) => set({ chats }),

    addChat: (chat) =>
        set((state) => ({
            chats: [chat, ...state.chats],
        })),

    deleteChat: (id) =>
        set((state) => ({
            chats: state.chats.filter((chat) => chat.id !== id),
        })),

    // Combined Actions
    toggleSidebar: () =>
        set((state) => ({
            ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen },
        })),

    selectChat: (id) =>
        set((state) => ({
            ui: {
                ...state.ui,
                selectedChatId: id,
                sidebarOpen: false, // Close sidebar on mobile after selection
            },
        })),

    closeSidebar: () =>
        set((state) => ({
            ui: { ...state.ui, sidebarOpen: false },
        })),
}))