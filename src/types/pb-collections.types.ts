// Auto-generated from pb_schema.json
// Record interfaces for PocketBase collections used in a Next.js + TypeScript frontend.

import type {
  CollectionName, UsersStatus,
  AttachmentsFileType, CallLogsCallType, CallLogsStatus,
  ConversationMembersRole, ConversationMembersNotifications,
  ConversationSettingsTextSize, ConversationSettingsTheme,
  ConversationsType, MessagesContentType, MessagesStatus,
  StoriesStoryType, StoriesPrivacy, StoriesAllowReplies,
  StorySettingsDefaultPrivacy, StorySettingsDefaultAllowReplies,
  StoryRepliesReplyType
} from './pb-collections.constants';

export type RecordId = string;
export type ISODateString = string;
export type JSONObject = { [key: string]: JSONValue };
export type JSONValue = string | number | boolean | null | JSONObject | JSONValue[];

export interface BasePocketBaseRecord<TCollection extends CollectionName = CollectionName> {
  id: RecordId;
  collectionId: string;
  collectionName: TCollection;
  created: ISODateString;
  updated: ISODateString;
}

export interface AuthPocketBaseRecord<TCollection extends CollectionName = CollectionName> extends BasePocketBaseRecord<TCollection> {
  email: string;
  emailVisibility: boolean;
  verified: boolean;
}

export interface SuperusersRecord extends AuthPocketBaseRecord<'_superusers'> {
  password: string;
  tokenKey: string;
}

export interface UsersRecord extends AuthPocketBaseRecord<'users'> {
  password: string;
  tokenKey: string;
  name?: string | null;
  avatar?: string | null;
  last_seen?: ISODateString;
  username: string;
  bio?: string | null;
  phone?: string | null;
  is_active?: boolean;
  status_message?: string | null;
  status?: UsersStatus | null;
}

export interface AuthOriginsRecord extends BasePocketBaseRecord<'_authOrigins'> {
  collectionRef: string;
  recordRef: string;
  fingerprint: string;
}

export interface ExternalAuthsRecord extends BasePocketBaseRecord<'_externalAuths'> {
  collectionRef: string;
  recordRef: string;
  provider: string;
  providerId: string;
}

export interface MfasRecord extends BasePocketBaseRecord<'_mfas'> {
  collectionRef: string;
  recordRef: string;
  method: string;
}

export interface OtpsRecord extends BasePocketBaseRecord<'_otps'> {
  collectionRef: string;
  recordRef: string;
  password: string;
  sentTo?: string | null;
}

export interface AttachmentsRecord extends BasePocketBaseRecord<'attachments'> {
  message: RecordId | null;
  file?: string | null;
  file_name?: string | null;
  file_type?: AttachmentsFileType | null;
  file_size?: number;
  mime_type?: string | null;
  duration?: number;
  width?: number;
  height?: number;
  thumbnail?: string | null;
  metadata?: string | null;
}

export interface BlockedUsersRecord extends BasePocketBaseRecord<'blocked_users'> {
  blocker: RecordId | null;
  blocked_user: RecordId | null;
  reason?: string | null;
}

export interface CallLogsRecord extends BasePocketBaseRecord<'call_logs'> {
  conversation: RecordId | null;
  initiator?: RecordId | null;
  participants?: RecordId[];
  call_type?: CallLogsCallType | null;
  started_at?: ISODateString;
  ended_at?: ISODateString;
  duration?: number;
  is_missed?: boolean;
  status?: CallLogsStatus | null;
}

export interface ConversationMembersRecord extends BasePocketBaseRecord<'conversation_members'> {
  user: RecordId | null;
  conversation: RecordId | null;
  role?: ConversationMembersRole | null;
  joined_at?: ISODateString;
  last_read_at?: ISODateString;
  is_muted?: boolean;
  notifications?: ConversationMembersNotifications | null;
  custom_name?: string | null;
  color_tag?: string | null;
  is_blocked?: boolean;
}

export interface ConversationRolesRecord extends BasePocketBaseRecord<'conversation_roles'> {
  conversation: RecordId | null;
  name: string;
  color?: string | null;
  permissions?: JSONValue;
  priority?: number;
}

export interface ConversationSettingsRecord extends BasePocketBaseRecord<'conversation_settings'> {
  conversation: RecordId | null;
  user: RecordId | null;
  background_color?: string | null;
  text_size?: ConversationSettingsTextSize | null;
  auto_download_media?: boolean;
  theme?: ConversationSettingsTheme | null;
}

export interface ConversationsRecord extends BasePocketBaseRecord<'conversations'> {
  name?: string | null;
  description?: string | null;
  avatar?: string | null;
  type: ConversationsType;
  created_by: RecordId | null;
  max_members: number;
  is_archived?: boolean;
  is_muted?: boolean;
  allow_reactions?: boolean;
  allow_media?: boolean;
  allow_voice_calls?: boolean;
  allow_video_calls?: boolean;
  pinned_messages?: RecordId[];
}

export interface MessageEditsRecord extends BasePocketBaseRecord<'message_edits'> {
  message: RecordId | null;
  old_content?: string | null;
  new_content?: string | null;
  edited_by: RecordId | null;
  reason?: string | null;
}

export interface MessageReactionsRecord extends BasePocketBaseRecord<'message_reactions'> {
  message: RecordId | null;
  user: RecordId | null;
  emoji: string;
}

export interface MessagesRecord extends BasePocketBaseRecord<'messages'> {
  conversation: RecordId | null;
  sender: RecordId | null;
  content?: string | null;
  content_type?: MessagesContentType | null;
  mentions?: RecordId[];
  forwarded_from?: RecordId | null;
  replied_to?: RecordId | null;
  is_edited?: boolean;
  edited_at?: ISODateString;
  is_pinned?: boolean;
  is_deleted?: boolean;
  deleted_at?: ISODateString;
  status?: MessagesStatus | null;
  attachments?: RecordId[];
}

export interface PollVotesRecord extends BasePocketBaseRecord<'poll_votes'> {
  poll: RecordId | null;
  user: RecordId | null;
  option_index: number;
}

export interface PollsRecord extends BasePocketBaseRecord<'polls'> {
  message?: RecordId | null;
  conversation: RecordId | null;
  question: string;
  options?: JSONValue;
  created_by: RecordId | null;
  allow_multiple?: boolean;
  is_anonymous?: boolean;
  expires_at?: ISODateString;
}

export interface PresenceRecord extends BasePocketBaseRecord<'presence'> {
  online?: boolean;
  lastSeen?: ISODateString;
  userId: RecordId | null;
}

export interface PubkeysRecord extends BasePocketBaseRecord<'pubkeys'> {
  pubkey?: string | null;
  userId?: RecordId | null;
}

export interface PushTokensRecord extends BasePocketBaseRecord<'push_tokens'> {
  userId: RecordId | null;
  endpoint?: string | null;
  p256dh?: string | null;
  auth?: string | null;
  platform?: string | null;
}

export interface ReadReceiptsRecord extends BasePocketBaseRecord<'read_receipts'> {
  message: RecordId | null;
  user: RecordId | null;
  read_at?: ISODateString;
}

export interface StoriesRecord extends BasePocketBaseRecord<'stories'> {
  owner: RecordId | null;
  media?: string | null;
  thumbnail?: string | null;
  story_type: StoriesStoryType;
  caption?: string | null;
  text_overlay?: string | null;
  background_color?: string | null;
  privacy: StoriesPrivacy;
  allow_replies: StoriesAllowReplies;
  allow_reactions?: boolean;
  allow_reshare?: boolean;
  allow_screenshot?: boolean;
  viewers_can_see_viewers?: boolean;
  expires_at: ISODateString;
  is_archived?: boolean;
  is_deleted?: boolean;
  deleted_at?: ISODateString;
  mentions?: RecordId[];
}

export interface TypingRecord extends BasePocketBaseRecord<'typing'> {
  user: RecordId | null;
  is_typing?: boolean;
  name?: string | null;
  conversation: RecordId | null;
  expires_at?: ISODateString;
}

export interface StorySettingsRecord extends BasePocketBaseRecord<'story_settings'> {
  owner: RecordId | null;
  default_privacy: StorySettingsDefaultPrivacy;
  default_allow_replies: StorySettingsDefaultAllowReplies;
  allow_reactions_default?: boolean;
  allow_reshare_default?: boolean;
  allow_screenshot_default?: boolean;
  auto_archive?: boolean;
  viewers_can_see_viewers_default?: boolean;
}

export interface StoryCloseFriendsRecord extends BasePocketBaseRecord<'story_close_friends'> {
  owner: RecordId | null;
  user: RecordId | null;
  note?: string | null;
}

export interface StoryAllowedViewersRecord extends BasePocketBaseRecord<'story_allowed_viewers'> {
  owner: RecordId | null;
  user: RecordId | null;
  note?: string | null;
}

export interface StoryHiddenUsersRecord extends BasePocketBaseRecord<'story_hidden_users'> {
  owner: RecordId | null;
  hidden_user: RecordId | null;
  reason?: string | null;
}

export interface StoryViewsRecord extends BasePocketBaseRecord<'story_views'> {
  story: RecordId | null;
  user: RecordId | null;
  completed?: boolean;
  screenshot_taken?: boolean;
  replay_count?: number;
}

export interface StoryReactionsRecord extends BasePocketBaseRecord<'story_reactions'> {
  story: RecordId | null;
  user: RecordId | null;
  emoji: string;
}

export interface StoryRepliesRecord extends BasePocketBaseRecord<'story_replies'> {
  story: RecordId | null;
  sender: RecordId | null;
  reply_type: StoryRepliesReplyType;
  content: string;
  is_deleted?: boolean;
}

export interface UserPreferencesRecord extends BasePocketBaseRecord<'user_preferences'> {
  user: string
  theme: 'light' | 'dark' | 'system'
  accent: 'indigo' | 'violet' | 'rose' | 'cyan' | 'amber' | 'emerald'
  sound?: boolean
  push?: boolean
  enterSend?: boolean
  readReceipts?: boolean
  aiSuggest?: boolean
}

export type Prefs = {
  theme: 'light' | 'dark' | 'system'
  accent: 'indigo' | 'violet' | 'rose' | 'cyan' | 'amber' | 'emerald'
  sound: boolean
  enterSend: boolean
  aiSuggest: boolean
  readReceipts: boolean
  push: boolean
}
export interface CollectionRecordMap {
  '_superusers': SuperusersRecord;
  'users': UsersRecord;
  '_authOrigins': AuthOriginsRecord;
  '_externalAuths': ExternalAuthsRecord;
  '_mfas': MfasRecord;
  '_otps': OtpsRecord;
  'attachments': AttachmentsRecord;
  'blocked_users': BlockedUsersRecord;
  'call_logs': CallLogsRecord;
  'conversation_members': ConversationMembersRecord;
  'conversation_roles': ConversationRolesRecord;
  'conversation_settings': ConversationSettingsRecord;
  'conversations': ConversationsRecord;
  'message_edits': MessageEditsRecord;
  'message_reactions': MessageReactionsRecord;
  'messages': MessagesRecord;
  'poll_votes': PollVotesRecord;
  'polls': PollsRecord;
  'presence': PresenceRecord;
  'pubkeys': PubkeysRecord;
  'push_tokens': PushTokensRecord;
  'read_receipts': ReadReceiptsRecord;
  'stories': StoriesRecord;
  'typing': TypingRecord;
  'story_settings': StorySettingsRecord;
  'story_close_friends': StoryCloseFriendsRecord;
  'story_allowed_viewers': StoryAllowedViewersRecord;
  'story_hidden_users': StoryHiddenUsersRecord;
  'story_views': StoryViewsRecord;
  'story_reactions': StoryReactionsRecord;
  'story_replies': StoryRepliesRecord;
  'prefs': UserPreferencesRecord;
}

export type AnyPocketBaseRecord = CollectionRecordMap[keyof CollectionRecordMap];

export type RecordsByCollection<TCollection extends keyof CollectionRecordMap> = CollectionRecordMap[TCollection];
