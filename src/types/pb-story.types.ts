import type {
  StoriesAllowReplies,
  StoriesPrivacy,
  StoriesStoryType,
  StoryRepliesReplyType,
  StorySettingsDefaultAllowReplies,
  StorySettingsDefaultPrivacy,
} from './pb-collections.constants'
import type {
  ISODateString,
  StoriesRecord,
  StoryAllowedViewersRecord,
  StoryCloseFriendsRecord,
  StoryHiddenUsersRecord,
  StoryReactionsRecord,
  StoryRepliesRecord,
  StorySettingsRecord,
  StoryViewsRecord,
  UsersRecord,
} from './pb-collections.types'
import type { FullListParams, RealtimeEvent } from './pb-service.types'

export interface StorySettingsInput {
  defaultPrivacy?: StorySettingsDefaultPrivacy
  defaultAllowReplies?: StorySettingsDefaultAllowReplies
  allowReactionsDefault?: boolean
  allowReshareDefault?: boolean
  allowScreenshotDefault?: boolean
  autoArchive?: boolean
  viewersCanSeeViewersDefault?: boolean
}

export interface CreateStoryInput {
  ownerId: string
  storyType: StoriesStoryType
  media?: File | null
  thumbnail?: File | null
  caption?: string | null
  textOverlay?: string | null
  backgroundColor?: string | null
  privacy?: StoriesPrivacy
  allowReplies?: StoriesAllowReplies
  allowReactions?: boolean
  allowReshare?: boolean
  allowScreenshot?: boolean
  viewersCanSeeViewers?: boolean
  mentions?: string[]
  expiresAt?: ISODateString
  useOwnerDefaults?: boolean
}

export interface UpdateStoryInput {
  caption?: string | null
  textOverlay?: string | null
  backgroundColor?: string | null
  privacy?: StoriesPrivacy
  allowReplies?: StoriesAllowReplies
  allowReactions?: boolean
  allowReshare?: boolean
  allowScreenshot?: boolean
  viewersCanSeeViewers?: boolean
  mentions?: string[]
  expiresAt?: ISODateString
  isArchived?: boolean
  isDeleted?: boolean
  deletedAt?: ISODateString | null
  thumbnail?: File | null
}

export interface StoryAudienceEntryInput {
  ownerId: string
  userId: string
  note?: string | null
}

export interface StoryHiddenUserInput {
  ownerId: string
  hiddenUserId: string
  reason?: string | null
}

export interface StoryReactionInput {
  storyId: string
  userId: string
  emoji: string
}

export interface StoryReplyInput {
  storyId: string
  senderId: string
  replyType?: StoryRepliesReplyType
  content: string
}

export interface StoryViewInput {
  storyId: string
  userId: string
  completed?: boolean
  screenshotTaken?: boolean
  replayCount?: number
}

export interface StoryVisibilityOptions {
  activeOnly?: boolean
  includeArchived?: boolean
  includeDeleted?: boolean
  ownerId?: string
}

export interface StoryBundle {
  story: StoriesRecord
  owner: UsersRecord | null
  settings: StorySettingsRecord | null
  closeFriends: StoryCloseFriendsRecord[]
  allowedViewers: StoryAllowedViewersRecord[]
  hiddenUsers: StoryHiddenUsersRecord[]
  views: StoryViewsRecord[]
  reactions: StoryReactionsRecord[]
  replies: StoryRepliesRecord[]
}

export interface StoryPolicy {
  canView: boolean
  canReact: boolean
  canReply: boolean
  isOwner: boolean
  isCloseFriend: boolean
  isSelectedViewer: boolean
  isHidden: boolean
}

export interface StorySubscriptionMap {
  stories: (event: RealtimeEvent<StoriesRecord>) => void
  views: (event: RealtimeEvent<StoryViewsRecord>) => void
  reactions: (event: RealtimeEvent<StoryReactionsRecord>) => void
  replies: (event: RealtimeEvent<StoryRepliesRecord>) => void
}

export type StoryListParams = FullListParams
