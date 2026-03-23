export interface CipherUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  status?: string;
  lastSeen?: number;
}

export interface ReplyRef {
  id: string;
  text: string;
  senderName: string;
}

export interface LinkPreview {
  url: string;
  title: string;
  image?: string;
}

export interface Poll {
  question: string;
  options: string[];
}

export interface CallSession {
  caller: string;
  callerName: string;
  callerPhoto: string;
  callee: string;
  mode: 'audio' | 'video';
  state: 'ringing' | 'active' | 'rejected' | 'ended';
  offer?: RTCSessionDescriptionInit;
  ts?: number;
}

export interface Bookmark {
  msgId: string;
  convId: string;
  text: string;
  senderName: string;
  ts: number;
}

// ─── App Prefs ────────────────────────────────────────────────────────────────

export type AccentColor = 'indigo' | 'violet' | 'rose' | 'cyan' | 'amber' | 'emerald';
export type ThemeMode = 'dark' | 'light';

export interface AppPrefs {
  theme: ThemeMode;
  accent: AccentColor;
  sound: boolean;
  enterSend: boolean;
  aiSuggest: boolean;
  readReceipts: boolean;
  push: boolean;
}

// ─── UI State ─────────────────────────────────────────────────────────────────

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  msgId: string | null;
  msg: Message | null;
  isMine: boolean;
  dtext: string;
}

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

/* ═══════════════════════════════════════════════════════════════
   types/message.ts
   Single source of truth for the Message shape across Cipher.
   Every bubble component reads from this interface.
═══════════════════════════════════════════════════════════════ */

/* ── Shared sub-types ─────────────────────────────────────── */

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'file'
  | 'gif'
  | 'poll'
  | 'system'

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface ReplyTo {
  id: string
  text?: string
  senderName?: string
  mediaThumb?: string
  type?: MessageType
  deleted?: boolean
}

/** Open-graph style link preview */
export interface LinkPreview {
  url: string
  title: string
  description?: string
  image?: string
  siteName?: string
  favicon?: string
}

/** Poll definition */
export interface Poll {
  question: string
  options: string[]
  /** ISO timestamp after which voting is closed */
  expiresAt?: string
  /** Allow voters to pick multiple options */
  multiChoice?: boolean
  /** Hide vote counts until poll closes */
  anonymous?: boolean
}

/** System / event message sub-types */
export type SystemEventKind =
  | 'member_joined'
  | 'member_left'
  | 'group_created'
  | 'group_renamed'
  | 'call_started'
  | 'call_ended'
  | 'encryption_enabled'

/* ── Main Message interface ────────────────────────────────── */

export interface Message {
  /* ─── Identity ─── */
  id?: string
  uid: string                        // sender uid
  senderName?: string
  senderPhoto?: string

  /* ─── Core ─── */
  type: MessageType
  text: string                       // plain text / caption / system label
  ts?: number                        // unix ms timestamp
  status?: MessageStatus
  encrypted?: boolean
  edited?: boolean
  editedAt?: number
  deleted?: boolean

  /* ─── Social ─── */
  /** uid → emoji  e.g. { "uid_abc": "❤️", "uid_xyz": "😂" } */
  reactions?: Record<string, string>
  replyTo?: ReplyTo
  linkPreview?: LinkPreview

  /* ─── Media (image / video / gif) ─── */
  url?: string
  /** Natural pixel width — used for aspect-ratio-preserving display */
  mediaWidth?: number
  /** Natural pixel height — used for aspect-ratio-preserving display */
  mediaHeight?: number
  /** Low-res blurred placeholder (base64 or URL) shown while loading */
  blurhash?: string
  /** Poster / thumbnail URL for videos */
  thumbnailUrl?: string

  /* ─── Audio ─── */
  /** Duration in seconds (audio & video) */
  duration?: number
  /** Waveform amplitude samples for the audio player visualiser (0–1 each) */
  waveform?: number[]

  /* ─── File attachment ─── */
  fileName?: string
  /** Human-readable size string e.g. "4.2 MB" */
  fileSize?: string
  /** Raw bytes — used for progress calculation */
  fileSizeBytes?: number
  /** MIME type e.g. "application/pdf" */
  mimeType?: string

  /* ─── Poll ─── */
  poll?: Poll
  /** uid → option index (single-choice) or option indices (multi-choice) */
  votes?: Record<string, number | number[]>

  /* ─── System event ─── */
  systemEvent?: SystemEventKind
  /** Extra payload for system messages (e.g. new group name) */
  systemMeta?: Record<string, string>

  /* ─── Forwarded ─── */
  forwardedFrom?: {
    senderName: string
    chatName?: string
  }
}

/* ── Narrowed helper types (use in bubble components) ──────── */

/** Message guaranteed to have a media URL */
export type MediaMessage = Message & {
  type: 'image' | 'video' | 'gif'
  url: string
}

/** Message guaranteed to have audio fields */
export type AudioMessage = Message & {
  type: 'audio'
  url: string
  duration: number
}

/** Message guaranteed to have file fields */
export type FileMessage = Message & {
  type: 'file'
  url: string
  fileName: string
}

/** Message guaranteed to have poll fields */
export type PollMessage = Message & {
  type: 'poll'
  poll: Poll
  votes: Record<string, number | number[]>
}

/** System event message */
export type SystemMessage = Message & {
  type: 'system'
  systemEvent: SystemEventKind
}

/* ── Type guards ───────────────────────────────────────────── */

export const isMediaMessage = (m: Message): m is MediaMessage =>
  ['image', 'video', 'gif'].includes(m.type) && !!m.url

export const isAudioMessage = (m: Message): m is AudioMessage =>
  m.type === 'audio' && !!m.url

export const isFileMessage = (m: Message): m is FileMessage =>
  m.type === 'file' && !!m.url && !!m.fileName

export const isPollMessage = (m: Message): m is PollMessage =>
  m.type === 'poll' && !!m.poll

export const isSystemMessage = (m: Message): m is SystemMessage =>
  m.type === 'system' && !!m.systemEvent

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