import { MessagesContentType } from './pb-collections.constants';
import type {
  AttachmentsRecord,
  BlockedUsersRecord,
  CallLogsRecord,
  ConversationMembersRecord,
  ConversationsRecord,
  MessageEditsRecord,
  MessageReactionsRecord,
  MessagesRecord,
  PollVotesRecord,
  PollsRecord,
  PresenceRecord,
  ReadReceiptsRecord,
  TypingRecord,
} from './pb-collections.types';

export interface CreateDirectConversationInput {
  currentUserId: string;
  otherUserId: string;
  createdBy: string;
  name?: string;
}

export interface CreateGroupConversationInput {
  createdBy: string;
  name: string;
  description?: string;
  avatar?: string;
  maxMembers?: number;
  memberIds?: string[];
}

export interface AddConversationMemberInput {
  conversationId: string;
  userId: string;
  role?: ConversationMembersRecord['role'];
}

export interface UpdateConversationMemberInput {
  role?: ConversationMembersRecord['role'];
  is_muted?: boolean;
  notifications?: ConversationMembersRecord['notifications'];
  custom_name?: string | null;
  color_tag?: string | null;
}

export interface SendMessageInput {
  conversationId: string;
  senderId: string;
  content?: string;
  contentType?: MessagesContentType;
  mentions?: string[];
  repliedTo?: string | null;
  forwardedFrom?: string | null;
  attachments?: string[];
}

export interface EditMessageInput {
  messageId: string;
  editorId: string;
  newContent: string;
  reason?: string;
}

export interface CreateAttachmentInput {
  messageId: string;
  file?: File | Blob | string;
  file_name?: string;
  file_type?: AttachmentsRecord['file_type'];
  file_size?: number;
  mime_type?: string;
  duration?: number;
  width?: number;
  height?: number;
  thumbnail?: File | Blob | string;
  metadata?: string;
}

export interface SetTypingInput {
  conversationId: string;
  userId: string;
  name?: string;
  isTyping: boolean;
  expiresAt?: string;
}

export interface MarkReadInput {
  messageId: string;
  userId: string;
  readAt?: string;
}

export interface CreatePollInput {
  conversationId: string;
  createdBy: string;
  question: string;
  options: string[];
  messageId?: string | null;
  allowMultiple?: boolean;
  isAnonymous?: boolean;
  expiresAt?: string;
}

export interface VotePollInput {
  pollId: string;
  userId: string;
  optionIndex: number;
}

export interface CreateReactionInput {
  messageId: string;
  userId: string;
  emoji: string;
}

export interface PresenceInput {
  userId: string;
  online: boolean;
  lastSeen?: string;
}

export interface BlockUserInput {
  blockerId: string;
  blockedUserId: string;
  reason?: string;
}

export interface CreateCallLogInput {
  conversationId: string;
  initiatorId?: string;
  participants?: string[];
  callType?: CallLogsRecord['call_type'];
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  isMissed?: boolean;
  status?: CallLogsRecord['status'];
}

export interface ChatRealtimeEventMap {
  conversation: ConversationsRecord;
  member: ConversationMembersRecord;
  message: MessagesRecord;
  messageReaction: MessageReactionsRecord;
  messageEdit: MessageEditsRecord;
  attachment: AttachmentsRecord;
  typing: TypingRecord;
  readReceipt: ReadReceiptsRecord;
  poll: PollsRecord;
  pollVote: PollVotesRecord;
  presence: PresenceRecord;
  block: BlockedUsersRecord;
  callLog: CallLogsRecord;
}

export interface ConversationBundle {
  conversation: ConversationsRecord;
  members: ConversationMembersRecord[];
}

export interface MessageBundle {
  message: MessagesRecord;
  reactions: MessageReactionsRecord[];
  readReceipts: ReadReceiptsRecord[];
  edits: MessageEditsRecord[];
  attachments: AttachmentsRecord[];
}
