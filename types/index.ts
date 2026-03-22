export interface Conversation {
  isGroup: boolean
  archived: boolean
  name?: string            // group name
  otherUid?: string        // DM peer uid
  otherName?: string
  otherPhoto?: string
  lastMsg?: string
  updatedAt?: number
  unread?: number
  pinned?: boolean
  muted?: boolean
  gid?: string
  starred?: boolean;           // group id
}

export interface Message {
  id?: string
  uid: string
  senderName?: string
  senderPhoto?: string
  text: string
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'gif' | 'poll' | 'system'
  ts?: number
  status?: 'sent' | 'delivered' | 'read'
  encrypted?: boolean
  edited?: boolean
  deleted?: boolean
  reactions?: Record<string, string>   // uid → emoji
  replyTo?: { id: string; text: string; senderName: string }
  linkPreview?: { url: string; title: string; image?: string }
  // media
  url?: string
  fileName?: string
  fileSize?: string
  duration?: string
  // poll
  poll?: { question: string; options: string[] }
  votes?: Record<string, number>       // uid → option index
}

export interface Story {
  uid: string
  displayName: string
  photoURL: string
  imageURL: string
  ts: number
  seenBy?: Record<string, boolean>
}

export interface Bookmark {
  id: string
  cid: string
  text: string
  senderName: string
  ts: number
}

export interface CallData {
  peerName: string
  peerPhoto?: string
  state: string
  isIncoming: boolean
  callerName?: string
  callerPhoto?: string
  mode?: 'audio' | 'video'
  cid?: string
  callerUid?: string
  calleeUid?: string
}

export interface Prefs {
  theme: 'dark' | 'light'
  accent: 'indigo' | 'violet' | 'rose' | 'cyan' | 'amber' | 'emerald'
  sound: boolean
  enterSend: boolean
  aiSuggest: boolean
  readReceipts: boolean
  push: boolean
}

export const DEFAULT_PREFS: Prefs = {
  theme: 'dark',
  accent: 'indigo',
  sound: true,
  enterSend: true,
  aiSuggest: true,
  readReceipts: true,
  push: false,
}

export interface ChatMember {
  id: string
  name: string
  avatar?: string
  status: 'online' | 'offline' | 'away'
  role?: 'admin' | 'member'
}

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  status: 'online' | 'offline' | 'away'
  bio?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   UI STATE TYPES
═══════════════════════════════════════════════════════════════════════════ */
export interface Chat {
  id: string
  name: string
  avatar?: string
  lastMessage?: string
  timestamp?: number
  unread?: number
  isGroup?: boolean
}

export interface UIState {
  sidebarOpen: boolean
  selectedChatId: string | null
  showGestureHint: boolean
  loading: boolean
  error: string | null
  inputFocused?: boolean
  selectedMessage?: string | null
}

export interface DragGestureState {
  isDragging: boolean
  startX: number
  currentX: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONFIGURATION TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface DragGestureConfig {
  threshold?: number
  onDragStart?: () => void
  onDragEnd?: () => void
  onDragProgress?: (progress: number) => void
  onComplete?: () => void
}

export interface GestureHintConfig {
  visible: boolean
  autoHideDelay?: number
  onDismiss?: () => void
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT PROPS TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface DashboardProps {
  onError?: (error: string) => void
  onChatSelect?: (chatId: string) => void
}

export interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  onSelectChat?: (chatId: string) => void
}

export interface GestureHintProps {
  visible: boolean
  onDismiss: () => void
}

export interface EnhancedEmptyStateProps {
  onNewChat: () => void
  onNewGroup?: () => void
  isLoading?: boolean
  error?: string | null
}

/* ═══════════════════════════════════════════════════════════════════════════
   API RESPONSE TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  timestamp: number
}

export interface ChatsListResponse {
  chats: Chat[]
  total: number
  hasMore: boolean
}

export interface MessageListResponse {
  messages: Message[]
  total: number
  hasMore: boolean
  cursor?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   THEME TYPES
═══════════════════════════════════════════════════════════════════════════ */

export type AccentTheme =
  | 'cyan'
  | 'violet'
  | 'rose'
  | 'amber'
  | 'emerald'
  | 'indigo'

export interface ThemeConfig {
  accent: AccentTheme
  darkMode: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   EVENT TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface ChatEvent {
  type: 'message_new' | 'message_edited' | 'message_deleted' | 'user_typing'
  chatId: string
  data: any
  timestamp: number
}

export interface PresenceEvent {
  userId: string
  status: 'online' | 'offline' | 'away'
  timestamp: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITY TYPES
═══════════════════════════════════════════════════════════════════════════ */

export type Optional<T> = T | undefined | null

export type Nullable<T> = T | null

export type Async<T> = Promise<T>

export type Callback<T = void> = (data?: T) => void | Promise<void>