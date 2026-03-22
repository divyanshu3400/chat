export interface CipherUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  status?: string;
  lastSeen?: number;
}

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'gif' | 'poll';

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

export interface Message {
  uid: string;
  senderName?: string;
  senderPhoto?: string;
  type?: MessageType;
  text?: string;
  url?: string;
  fileName?: string;
  fileSize?: string;
  duration?: string;
  encrypted?: boolean;
  deleted?: boolean;
  edited?: boolean;
  ts?: number;
  status?: 'sent' | 'delivered' | 'read';
  replyTo?: ReplyRef;
  linkPreview?: LinkPreview;
  reactions?: Record<string, string>;
  poll?: Poll;
  votes?: Record<string, number>;
}

export interface Story {
  uid: string;
  displayName: string;
  photoURL: string;
  imageURL?: string;
  text?: string;
  ts: number;
  seenBy?: Record<string, boolean>;
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
