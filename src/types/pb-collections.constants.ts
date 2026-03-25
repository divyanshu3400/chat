import { COLLECTIONS } from "../lib/pb";

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

export const UsersStatusOptions = ['online', 'offline', 'away', 'dnd'] as const;
export type UsersStatus = typeof UsersStatusOptions[number];

export const AttachmentsFileTypeOptions = ['image', 'video', 'audio', 'document', 'other'] as const;
export type AttachmentsFileType = typeof AttachmentsFileTypeOptions[number];

export const CallLogsCallTypeOptions = ['voice', 'video'] as const;
export type CallLogsCallType = typeof CallLogsCallTypeOptions[number];

export const CallLogsStatusOptions = ['ringing', 'active', 'ended', 'rejected', 'missed'] as const;
export type CallLogsStatus = typeof CallLogsStatusOptions[number];

export const ConversationMembersRoleOptions = ['owner', 'admin', 'moderator', 'member'] as const;
export type ConversationMembersRole = typeof ConversationMembersRoleOptions[number];

export const ConversationMembersNotificationsOptions = ['all', 'mentions_only', 'none'] as const;
export type ConversationMembersNotifications = typeof ConversationMembersNotificationsOptions[number];

export const ConversationSettingsTextSizeOptions = ['small', 'medium', 'high', 'original'] as const;
export type ConversationSettingsTextSize = typeof ConversationSettingsTextSizeOptions[number];

export const ConversationSettingsThemeOptions = ['light', 'dark', 'system'] as const;
export type ConversationSettingsTheme = typeof ConversationSettingsThemeOptions[number];

export const ConversationsTypeOptions = ['direct', 'group'] as const;
export type ConversationsType = typeof ConversationsTypeOptions[number];

export const MessagesContentTypeOptions = ['text', 'image', 'video', 'audio', 'file', 'location', 'contact', 'poll', 'deleted'] as const;
export type MessagesContentType = typeof MessagesContentTypeOptions[number];

export const MessagesStatusOptions = ['sending', 'sent', 'delivered', 'read'] as const;
export type MessagesStatus = typeof MessagesStatusOptions[number];

export const StoriesStoryTypeOptions = ['image', 'video', 'text', 'audio'] as const;
export type StoriesStoryType = typeof StoriesStoryTypeOptions[number];

export const StoriesPrivacyOptions = ['all_users', 'close_friends', 'selected_users'] as const;
export type StoriesPrivacy = typeof StoriesPrivacyOptions[number];

export const StoriesAllowRepliesOptions = ['everyone', 'close_friends', 'selected_users', 'none'] as const;
export type StoriesAllowReplies = typeof StoriesAllowRepliesOptions[number];

export const StorySettingsDefaultPrivacyOptions = ['all_users', 'close_friends', 'selected_users'] as const;
export type StorySettingsDefaultPrivacy = typeof StorySettingsDefaultPrivacyOptions[number];

export const StorySettingsDefaultAllowRepliesOptions = ['everyone', 'close_friends', 'selected_users', 'none'] as const;
export type StorySettingsDefaultAllowReplies = typeof StorySettingsDefaultAllowRepliesOptions[number];

export const StoryRepliesReplyTypeOptions = ['text', 'emoji', 'quick_reaction'] as const;
export type StoryRepliesReplyType = typeof StoryRepliesReplyTypeOptions[number];

