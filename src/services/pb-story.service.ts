import type PocketBase from 'pocketbase'

import type {
  StoriesRecord,
  StoryAllowedViewersRecord,
  StoryCloseFriendsRecord,
  StoryHiddenUsersRecord,
  StoryReactionsRecord,
  StoryRepliesRecord,
  StorySettingsRecord,
  StoryViewsRecord,
  UsersRecord,
} from '@/src/types/pb-collections.types'
import { createCollectionServiceMap } from './pb-base.service'
import type { FullListParams, RealtimeEvent } from '@/src/types/pb-service.types'
import type {
  CreateStoryInput,
  StoryAudienceEntryInput,
  StoryBundle,
  StoryHiddenUserInput,
  StoryListParams,
  StoryPolicy,
  StoryReactionInput,
  StoryReplyInput,
  StorySettingsInput,
  StorySubscriptionMap,
  StoryViewInput,
  StoryVisibilityOptions,
  UpdateStoryInput,
} from '@/src/types/pb-story.types'

function quote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function nowIso(): string {
  return new Date().toISOString()
}

function defaultExpiresAt(hours = 24): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
}

function normalizeBool(value: boolean | null | undefined, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export class PocketBaseStoryService {
  readonly services: ReturnType<typeof createCollectionServiceMap>

  constructor(private readonly client: PocketBase) {
    this.services = createCollectionServiceMap(client)
  }

  private async getOwner(ownerId: string): Promise<UsersRecord | null> {
    return this.services.users.getById(ownerId).catch(() => null)
  }

  private async getStorySettings(ownerId: string): Promise<StorySettingsRecord | null> {
    const rows = await this.services.story_settings.getFullList({
      filter: `owner = ${quote(ownerId)}`,
      batch: 1,
    })

    return rows[0] ?? null
  }

  private buildVisibilityFilter(options: StoryVisibilityOptions = {}): string | undefined {
    const parts: string[] = []

    if (options.ownerId) {
      parts.push(`owner = ${quote(options.ownerId)}`)
    }

    if (!options.includeDeleted) {
      parts.push('(is_deleted = false || is_deleted = null)')
    }

    if (!options.includeArchived) {
      parts.push('(is_archived = false || is_archived = null)')
    }

    if (options.activeOnly !== false) {
      parts.push(`expires_at > ${quote(nowIso())}`)
    }

    return parts.length > 0 ? parts.join(' && ') : undefined
  }

  private async getAudienceData(ownerId: string) {
    const [closeFriends, allowedViewers, hiddenUsers] = await Promise.all([
      this.listCloseFriends(ownerId),
      this.listAllowedViewers(ownerId),
      this.listHiddenUsers(ownerId),
    ])

    return { closeFriends, allowedViewers, hiddenUsers }
  }

  async listStories(params: StoryListParams = {}, options: StoryVisibilityOptions = {}): Promise<StoriesRecord[]> {
    const filter = [params.filter, this.buildVisibilityFilter(options)].filter(Boolean).join(' && ')

    return this.services.stories.getFullList({
      sort: params.sort ?? '-created',
      ...params,
      filter: filter || undefined,
    })
  }

  async listOwnerStories(ownerId: string, options: StoryVisibilityOptions = {}): Promise<StoriesRecord[]> {
    return this.listStories({}, { ...options, ownerId })
  }

  async getStoryById(storyId: string, params: FullListParams = {}): Promise<StoriesRecord> {
    return this.services.stories.getById(storyId, params)
  }

  async getStoryBundle(storyId: string): Promise<StoryBundle> {
    const story = await this.getStoryById(storyId)
    const ownerId = story.owner ?? ''

    const [owner, settings, audience, views, reactions, replies] = await Promise.all([
      ownerId ? this.getOwner(ownerId) : Promise.resolve(null),
      ownerId ? this.getStorySettings(ownerId) : Promise.resolve(null),
      ownerId ? this.getAudienceData(ownerId) : Promise.resolve({ closeFriends: [], allowedViewers: [], hiddenUsers: [] }),
      this.listStoryViews(storyId),
      this.listStoryReactions(storyId),
      this.listStoryReplies(storyId),
    ])

    return {
      story,
      owner,
      settings,
      closeFriends: audience.closeFriends,
      allowedViewers: audience.allowedViewers,
      hiddenUsers: audience.hiddenUsers,
      views,
      reactions,
      replies,
    }
  }

  async getOrCreateSettings(ownerId: string, defaults?: StorySettingsInput): Promise<StorySettingsRecord> {
    const existing = await this.getStorySettings(ownerId)
    if (existing) {
      return existing
    }

    return this.services.story_settings.create({
      owner: ownerId,
      default_privacy: defaults?.defaultPrivacy ?? 'all_users',
      default_allow_replies: defaults?.defaultAllowReplies ?? 'everyone',
      allow_reactions_default: defaults?.allowReactionsDefault ?? true,
      allow_reshare_default: defaults?.allowReshareDefault ?? true,
      allow_screenshot_default: defaults?.allowScreenshotDefault ?? false,
      auto_archive: defaults?.autoArchive ?? true,
      viewers_can_see_viewers_default: defaults?.viewersCanSeeViewersDefault ?? false,
    } as never)
  }

  async updateSettings(ownerId: string, input: StorySettingsInput): Promise<StorySettingsRecord> {
    const settings = await this.getOrCreateSettings(ownerId)
    return this.services.story_settings.update(settings.id, {
      default_privacy: input.defaultPrivacy ?? settings.default_privacy,
      default_allow_replies: input.defaultAllowReplies ?? settings.default_allow_replies,
      allow_reactions_default: input.allowReactionsDefault ?? settings.allow_reactions_default,
      allow_reshare_default: input.allowReshareDefault ?? settings.allow_reshare_default,
      allow_screenshot_default: input.allowScreenshotDefault ?? settings.allow_screenshot_default,
      auto_archive: input.autoArchive ?? settings.auto_archive,
      viewers_can_see_viewers_default: input.viewersCanSeeViewersDefault ?? settings.viewers_can_see_viewers_default,
    } as never)
  }

  async createStory(input: CreateStoryInput): Promise<StoriesRecord> {
    const settings = input.useOwnerDefaults === false ? null : await this.getStorySettings(input.ownerId)

    return this.services.stories.create({
      owner: input.ownerId,
      media: input.media ?? null,
      thumbnail: input.thumbnail ?? null,
      story_type: input.storyType,
      caption: input.caption ?? null,
      text_overlay: input.textOverlay ?? null,
      background_color: input.backgroundColor ?? null,
      privacy: input.privacy ?? settings?.default_privacy ?? 'all_users',
      allow_replies: input.allowReplies ?? settings?.default_allow_replies ?? 'everyone',
      allow_reactions: normalizeBool(input.allowReactions, settings?.allow_reactions_default ?? true),
      allow_reshare: normalizeBool(input.allowReshare, settings?.allow_reshare_default ?? true),
      allow_screenshot: normalizeBool(input.allowScreenshot, settings?.allow_screenshot_default ?? false),
      viewers_can_see_viewers: normalizeBool(input.viewersCanSeeViewers, settings?.viewers_can_see_viewers_default ?? false),
      mentions: input.mentions ?? [],
      expires_at: input.expiresAt ?? defaultExpiresAt(),
      is_archived: false,
      is_deleted: false,
      deleted_at: null,
    } as never)
  }

  async updateStory(storyId: string, input: UpdateStoryInput): Promise<StoriesRecord> {
    return this.services.stories.update(storyId, {
      caption: input.caption,
      text_overlay: input.textOverlay,
      background_color: input.backgroundColor,
      privacy: input.privacy,
      allow_replies: input.allowReplies,
      allow_reactions: input.allowReactions,
      allow_reshare: input.allowReshare,
      allow_screenshot: input.allowScreenshot,
      viewers_can_see_viewers: input.viewersCanSeeViewers,
      mentions: input.mentions,
      expires_at: input.expiresAt,
      is_archived: input.isArchived,
      is_deleted: input.isDeleted,
      deleted_at: input.deletedAt,
      thumbnail: input.thumbnail,
    } as never)
  }

  async archiveStory(storyId: string, archived = true): Promise<StoriesRecord> {
    return this.services.stories.update(storyId, { is_archived: archived } as never)
  }

  async softDeleteStory(storyId: string): Promise<StoriesRecord> {
    return this.services.stories.update(storyId, {
      is_deleted: true,
      deleted_at: nowIso(),
    } as never)
  }

  async deleteStory(storyId: string): Promise<boolean> {
    return this.services.stories.delete(storyId)
  }

  async listCloseFriends(ownerId: string): Promise<StoryCloseFriendsRecord[]> {
    return this.services.story_close_friends.getFullList({
      filter: `owner = ${quote(ownerId)}`,
      sort: 'created',
    })
  }

  async addCloseFriend(input: StoryAudienceEntryInput): Promise<StoryCloseFriendsRecord> {
    return this.services.story_close_friends.create({
      owner: input.ownerId,
      user: input.userId,
      note: input.note ?? null,
    } as never)
  }

  async updateCloseFriend(entryId: string, note: string | null): Promise<StoryCloseFriendsRecord> {
    return this.services.story_close_friends.update(entryId, { note } as never)
  }

  async removeCloseFriend(entryId: string): Promise<boolean> {
    return this.services.story_close_friends.delete(entryId)
  }

  async listAllowedViewers(ownerId: string): Promise<StoryAllowedViewersRecord[]> {
    return this.services.story_allowed_viewers.getFullList({
      filter: `owner = ${quote(ownerId)}`,
      sort: 'created',
    })
  }

  async addAllowedViewer(input: StoryAudienceEntryInput): Promise<StoryAllowedViewersRecord> {
    return this.services.story_allowed_viewers.create({
      owner: input.ownerId,
      user: input.userId,
      note: input.note ?? null,
    } as never)
  }

  async updateAllowedViewer(entryId: string, note: string | null): Promise<StoryAllowedViewersRecord> {
    return this.services.story_allowed_viewers.update(entryId, { note } as never)
  }

  async removeAllowedViewer(entryId: string): Promise<boolean> {
    return this.services.story_allowed_viewers.delete(entryId)
  }

  async listHiddenUsers(ownerId: string): Promise<StoryHiddenUsersRecord[]> {
    return this.services.story_hidden_users.getFullList({
      filter: `owner = ${quote(ownerId)}`,
      sort: 'created',
    })
  }

  async hideUser(input: StoryHiddenUserInput): Promise<StoryHiddenUsersRecord> {
    return this.services.story_hidden_users.create({
      owner: input.ownerId,
      hidden_user: input.hiddenUserId,
      reason: input.reason ?? null,
    } as never)
  }

  async updateHiddenUser(entryId: string, reason: string | null): Promise<StoryHiddenUsersRecord> {
    return this.services.story_hidden_users.update(entryId, { reason } as never)
  }

  async unhideUser(entryId: string): Promise<boolean> {
    return this.services.story_hidden_users.delete(entryId)
  }

  async listStoryViews(storyId: string): Promise<StoryViewsRecord[]> {
    return this.services.story_views.getFullList({
      filter: `story = ${quote(storyId)}`,
      sort: '-updated',
    })
  }

  async markViewed(input: StoryViewInput): Promise<StoryViewsRecord> {
    const existing = await this.services.story_views.getFullList({
      filter: `story = ${quote(input.storyId)} && user = ${quote(input.userId)}`,
      batch: 1,
    })

    const previous = existing[0]
    const payload = {
      story: input.storyId,
      user: input.userId,
      completed: input.completed ?? previous?.completed ?? true,
      screenshot_taken: input.screenshotTaken ?? previous?.screenshot_taken ?? false,
      replay_count: input.replayCount ?? previous?.replay_count ?? 0,
    } as never

    if (previous?.id) {
      return this.services.story_views.update(previous.id, payload)
    }

    return this.services.story_views.create(payload)
  }

  async incrementReplayCount(storyId: string, userId: string): Promise<StoryViewsRecord> {
    const existing = await this.services.story_views.getFullList({
      filter: `story = ${quote(storyId)} && user = ${quote(userId)}`,
      batch: 1,
    })

    return this.markViewed({
      storyId,
      userId,
      completed: existing[0]?.completed ?? true,
      screenshotTaken: existing[0]?.screenshot_taken ?? false,
      replayCount: (existing[0]?.replay_count ?? 0) + 1,
    })
  }

  async listStoryReactions(storyId: string): Promise<StoryReactionsRecord[]> {
    return this.services.story_reactions.getFullList({
      filter: `story = ${quote(storyId)}`,
      sort: '-created',
    })
  }

  async reactToStory(input: StoryReactionInput): Promise<StoryReactionsRecord> {
    const existing = await this.services.story_reactions.getFullList({
      filter: `story = ${quote(input.storyId)} && user = ${quote(input.userId)}`,
      batch: 1,
    })

    if (existing[0]?.id) {
      return this.services.story_reactions.update(existing[0].id, { emoji: input.emoji } as never)
    }

    return this.services.story_reactions.create({
      story: input.storyId,
      user: input.userId,
      emoji: input.emoji,
    } as never)
  }

  async removeReaction(reactionId: string): Promise<boolean> {
    return this.services.story_reactions.delete(reactionId)
  }

  async listStoryReplies(storyId: string): Promise<StoryRepliesRecord[]> {
    return this.services.story_replies.getFullList({
      filter: `story = ${quote(storyId)} && (is_deleted = false || is_deleted = null)`,
      sort: 'created',
    })
  }

  async replyToStory(input: StoryReplyInput): Promise<StoryRepliesRecord> {
    return this.services.story_replies.create({
      story: input.storyId,
      sender: input.senderId,
      reply_type: input.replyType ?? 'text',
      content: input.content,
      is_deleted: false,
    } as never)
  }

  async softDeleteReply(replyId: string): Promise<StoryRepliesRecord> {
    return this.services.story_replies.update(replyId, { is_deleted: true } as never)
  }

  async deleteReply(replyId: string): Promise<boolean> {
    return this.services.story_replies.delete(replyId)
  }

  async evaluatePolicy(story: StoriesRecord, viewerId: string): Promise<StoryPolicy> {
    const ownerId = story.owner ?? ''
    const isOwner = ownerId === viewerId
    if (!ownerId) {
      return {
        canView: false,
        canReact: false,
        canReply: false,
        isOwner: false,
        isCloseFriend: false,
        isSelectedViewer: false,
        isHidden: false,
      }
    }

    const { closeFriends, allowedViewers, hiddenUsers } = await this.getAudienceData(ownerId)
    const isCloseFriend = closeFriends.some((row) => row.user === viewerId)
    const isSelectedViewer = allowedViewers.some((row) => row.user === viewerId)
    const isHidden = hiddenUsers.some((row) => row.hidden_user === viewerId)
    const notExpired = Date.parse(story.expires_at) > Date.now()
    const visibleByPrivacy = isOwner || story.privacy === 'all_users' || (story.privacy === 'close_friends' && isCloseFriend) || (story.privacy === 'selected_users' && isSelectedViewer)
    const canView = !story.is_deleted && !story.is_archived && notExpired && !isHidden && visibleByPrivacy

    const replyAudienceOk =
      story.allow_replies === 'everyone' ||
      (story.allow_replies === 'close_friends' && isCloseFriend) ||
      (story.allow_replies === 'selected_users' && isSelectedViewer)

    return {
      canView,
      canReact: canView && !isOwner && !!story.allow_reactions,
      canReply: canView && !isOwner && story.allow_replies !== 'none' && replyAudienceOk,
      isOwner,
      isCloseFriend,
      isSelectedViewer,
      isHidden,
    }
  }

  async subscribeStories(callback: StorySubscriptionMap['stories'], options?: { ownerId?: string; activeOnly?: boolean }): Promise<() => void> {
    return this.services.stories.subscribe(callback, {
      filter: this.buildVisibilityFilter({ ownerId: options?.ownerId, activeOnly: options?.activeOnly }),
    })
  }

  async subscribeStoryViews(storyId: string, callback: StorySubscriptionMap['views']): Promise<() => void> {
    return this.services.story_views.subscribe(callback, {
      filter: `story = ${quote(storyId)}`,
    })
  }

  async subscribeStoryReactions(storyId: string, callback: StorySubscriptionMap['reactions']): Promise<() => void> {
    return this.services.story_reactions.subscribe(callback, {
      filter: `story = ${quote(storyId)}`,
    })
  }

  async subscribeStoryReplies(storyId: string, callback: StorySubscriptionMap['replies']): Promise<() => void> {
    return this.services.story_replies.subscribe(callback, {
      filter: `story = ${quote(storyId)}`,
    })
  }

  async subscribeOwnerAudience(ownerId: string, callbacks: {
    closeFriends?: (event: RealtimeEvent<StoryCloseFriendsRecord>) => void
    allowedViewers?: (event: RealtimeEvent<StoryAllowedViewersRecord>) => void
    hiddenUsers?: (event: RealtimeEvent<StoryHiddenUsersRecord>) => void
    settings?: (event: RealtimeEvent<StorySettingsRecord>) => void
  }): Promise<() => void> {
    const unsubs = await Promise.all([
      callbacks.closeFriends
        ? this.services.story_close_friends.subscribe(callbacks.closeFriends, { filter: `owner = ${quote(ownerId)}` })
        : Promise.resolve(() => undefined),
      callbacks.allowedViewers
        ? this.services.story_allowed_viewers.subscribe(callbacks.allowedViewers, { filter: `owner = ${quote(ownerId)}` })
        : Promise.resolve(() => undefined),
      callbacks.hiddenUsers
        ? this.services.story_hidden_users.subscribe(callbacks.hiddenUsers, { filter: `owner = ${quote(ownerId)}` })
        : Promise.resolve(() => undefined),
      callbacks.settings
        ? this.services.story_settings.subscribe(callbacks.settings, { filter: `owner = ${quote(ownerId)}` })
        : Promise.resolve(() => undefined),
    ])

    return () => {
      unsubs.forEach((unsubscribe) => unsubscribe())
    }
  }
}

export function createStoryService(client: PocketBase): PocketBaseStoryService {
  return new PocketBaseStoryService(client)
}
