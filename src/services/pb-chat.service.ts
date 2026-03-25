import type PocketBase from 'pocketbase';

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
} from '@/src/types/pb-collections.types';
import { createCollectionServiceMap } from './pb-base.service';
import type { FullListParams, RealtimeEvent } from '@/src/types/pb-service.types';
import type {
  AddConversationMemberInput,
  BlockUserInput,
  ConversationBundle,
  CreateAttachmentInput,
  CreateCallLogInput,
  CreateDirectConversationInput,
  CreateGroupConversationInput,
  CreatePollInput,
  CreateReactionInput,
  EditMessageInput,
  MarkReadInput,
  MessageBundle,
  PresenceInput,
  SendMessageInput,
  SetTypingInput,
  UpdateConversationMemberInput,
  VotePollInput,
} from '../types/pb-chat.types';

type ChatServiceMap = ReturnType<typeof createCollectionServiceMap>;

function quote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export class PocketBaseChatService {
  readonly services: ChatServiceMap;

  constructor(private readonly client: PocketBase) {
    this.services = createCollectionServiceMap(client);
  }

  private async createConversationRecord(
    payload: Partial<ConversationsRecord>,
  ): Promise<ConversationsRecord> {
    return this.services.conversations.create(payload as never);
  }

  async getConversationById(id: string, params: FullListParams = {}): Promise<ConversationBundle> {
    const [conversation, members] = await Promise.all([
      this.services.conversations.getById(id, params),
      this.listConversationMembers(id),
    ]);

    return { conversation, members };
  }

  async listUserConversations(userId: string): Promise<ConversationsRecord[]> {
    const memberships = await this.services.conversation_members.getFullList({
      filter: `user = ${quote(userId)}`,
      sort: '-updated',
    });

    if (memberships.length === 0) {
      return [];
    }

    const filters = memberships.map((item) => `id = ${quote(item.conversation ?? '')}`).join(' || ');

    return this.services.conversations.getFullList({
      filter: filters,
      sort: '-updated',
    });
  }

  async createDirectConversation(input: CreateDirectConversationInput): Promise<ConversationBundle> {
    const existingMemberships = await this.services.conversation_members.getFullList({
      filter: `user = ${quote(input.currentUserId)}`,
      sort: '-created',
    });

    if (existingMemberships.length > 0) {
      const conversationIds = existingMemberships
        .map((item) => item.conversation)
        .filter(Boolean)
        .map((id) => `conversation = ${quote(id!)}`)
        .join(' || ');

      if (conversationIds) {
        const otherMemberships = await this.services.conversation_members.getFullList({
          filter: `user = ${quote(input.otherUserId)} && (${conversationIds})`,
        });

        if (otherMemberships.length > 0) {
          const existingConversationId = otherMemberships[0].conversation;
          if (existingConversationId) {
            return this.getConversationById(existingConversationId);
          }
        }
      }
    }

    const conversation = await this.createConversationRecord({
      name: input.name ?? null,
      type: 'direct',
      created_by: input.createdBy,
      max_members: 2,
      allow_reactions: true,
      allow_media: true,
      allow_voice_calls: true,
      allow_video_calls: true,
    });

    const members = await Promise.all([
      this.addConversationMember({
        conversationId: conversation.id,
        userId: input.currentUserId,
        role: 'owner',
      }),
      this.addConversationMember({
        conversationId: conversation.id,
        userId: input.otherUserId,
        role: 'member',
      }),
    ]);

    return { conversation, members };
  }

  async createGroupConversation(input: CreateGroupConversationInput): Promise<ConversationBundle> {
    const conversation = await this.createConversationRecord({
      name: input.name,
      description: input.description ?? null,
      avatar: input.avatar ?? null,
      type: 'group',
      created_by: input.createdBy,
      max_members: input.maxMembers ?? 512,
      allow_reactions: true,
      allow_media: true,
      allow_voice_calls: true,
      allow_video_calls: true,
    });

    const uniqueMemberIds = Array.from(new Set([input.createdBy, ...(input.memberIds ?? [])]));
    const members = await Promise.all(
      uniqueMemberIds.map((userId) =>
        this.addConversationMember({
          conversationId: conversation.id,
          userId,
          role: userId === input.createdBy ? 'owner' : 'member',
        }),
      ),
    );

    return { conversation, members };
  }

  async updateConversation(
    conversationId: string,
    data: Partial<ConversationsRecord>,
  ): Promise<ConversationsRecord> {
    return this.services.conversations.update(conversationId, data as never);
  }

  async deleteConversation(conversationId: string): Promise<boolean> {
    return this.services.conversations.delete(conversationId);
  }

  async listConversationMembers(conversationId: string): Promise<ConversationMembersRecord[]> {
    return this.services.conversation_members.getFullList({
      filter: `conversation = ${quote(conversationId)}`,
      sort: 'created',
    });
  }

  async addConversationMember(
    input: AddConversationMemberInput,
  ): Promise<ConversationMembersRecord> {
    return this.services.conversation_members.create({
      conversation: input.conversationId,
      user: input.userId,
      role: input.role ?? 'member',
    } as never);
  }

  async updateConversationMember(
    memberId: string,
    input: UpdateConversationMemberInput,
  ): Promise<ConversationMembersRecord> {
    return this.services.conversation_members.update(memberId, input as never);
  }

  async removeConversationMember(memberId: string): Promise<boolean> {
    return this.services.conversation_members.delete(memberId);
  }

  async listMessages(conversationId: string, params: FullListParams = {}): Promise<MessagesRecord[]> {
    return this.services.messages.getFullList({
      filter: `conversation = ${quote(conversationId)} && (is_deleted = false || is_deleted = null)`,
      sort: '-created',
      ...params,
    });
  }

  async getMessageBundle(messageId: string): Promise<MessageBundle> {
    const [message, reactions, readReceipts, edits, attachments] = await Promise.all([
      this.services.messages.getById(messageId),
      this.services.message_reactions.getFullList({ filter: `message = ${quote(messageId)}` }),
      this.services.read_receipts.getFullList({ filter: `message = ${quote(messageId)}` }),
      this.services.message_edits.getFullList({ filter: `message = ${quote(messageId)}` }),
      this.services.attachments.getFullList({ filter: `message = ${quote(messageId)}` }),
    ]);

    return { message, reactions, readReceipts, edits, attachments };
  }

  async sendMessage(input: SendMessageInput): Promise<MessagesRecord> {
    return this.services.messages.create({
      conversation: input.conversationId,
      sender: input.senderId,
      content: input.content ?? null,
      content_type: input.contentType ?? 'text',
      mentions: input.mentions ?? [],
      replied_to: input.repliedTo ?? null,
      forwarded_from: input.forwardedFrom ?? null,
      attachments: input.attachments ?? [],
      status: 'sending',
      is_edited: false,
      is_deleted: false,
    } as never);
  }

  async editMessage(input: EditMessageInput): Promise<MessageEditsRecord> {
    const existing = await this.services.messages.getById(input.messageId);

    await this.services.messages.update(
      input.messageId,
      {
        content: input.newContent,
        is_edited: true,
        edited_at: nowIso(),
      } as never,
    );

    return this.services.message_edits.create({
      message: input.messageId,
      old_content: existing.content ?? null,
      new_content: input.newContent,
      edited_by: input.editorId,
      reason: input.reason ?? null,
    } as never);
  }

  async softDeleteMessage(messageId: string): Promise<MessagesRecord> {
    return this.services.messages.update(
      messageId,
      {
        content: null,
        content_type: 'deleted',
        is_deleted: true,
        deleted_at: nowIso(),
      } as never,
    );
  }

  async deleteMessagePermanently(messageId: string): Promise<boolean> {
    return this.services.messages.delete(messageId);
  }

  async createAttachment(input: CreateAttachmentInput): Promise<AttachmentsRecord> {
    return this.services.attachments.create({
      message: input.messageId,
      file: input.file ?? null,
      file_name: input.file_name ?? null,
      file_type: input.file_type ?? null,
      file_size: input.file_size ?? null,
      mime_type: input.mime_type ?? null,
      duration: input.duration ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      thumbnail: input.thumbnail ?? null,
      metadata: input.metadata ?? null,
    } as never);
  }

  async createReaction(input: CreateReactionInput): Promise<MessageReactionsRecord> {
    return this.services.message_reactions.create({
      message: input.messageId,
      user: input.userId,
      emoji: input.emoji,
    } as never);
  }

  async removeReaction(reactionId: string): Promise<boolean> {
    return this.services.message_reactions.delete(reactionId);
  }

  async listMessageReactions(messageId: string): Promise<MessageReactionsRecord[]> {
    return this.services.message_reactions.getFullList({
      filter: `message = ${quote(messageId)}`,
      sort: 'created',
    });
  }

  async setTyping(input: SetTypingInput): Promise<TypingRecord> {
    const existing = await this.services.typing.getFullList({
      filter: `conversation = ${quote(input.conversationId)} && user = ${quote(input.userId)}`,
    });

    const payload = {
      conversation: input.conversationId,
      user: input.userId,
      name: input.name ?? null,
      is_typing: input.isTyping,
      expires_at: input.expiresAt ?? new Date(Date.now() + 30_000).toISOString(),
    } as never;

    if (existing[0]?.id) {
      return this.services.typing.update(existing[0].id, payload);
    }

    return this.services.typing.create(payload);
  }

  async listTyping(conversationId: string): Promise<TypingRecord[]> {
    return this.services.typing.getFullList({
      filter: `conversation = ${quote(conversationId)}`,
      sort: '-updated',
    });
  }

  async markAsRead(input: MarkReadInput): Promise<ReadReceiptsRecord> {
    const existing = await this.services.read_receipts.getFullList({
      filter: `message = ${quote(input.messageId)} && user = ${quote(input.userId)}`,
    });

    const payload = {
      message: input.messageId,
      user: input.userId,
      read_at: input.readAt ?? nowIso(),
    } as never;

    if (existing[0]?.id) {
      return this.services.read_receipts.update(existing[0].id, payload);
    }

    return this.services.read_receipts.create(payload);
  }

  async listReadReceipts(messageId: string): Promise<ReadReceiptsRecord[]> {
    return this.services.read_receipts.getFullList({
      filter: `message = ${quote(messageId)}`,
      sort: '-read_at',
    });
  }

  async createPoll(input: CreatePollInput): Promise<PollsRecord> {
    return this.services.polls.create({
      message: input.messageId ?? null,
      conversation: input.conversationId,
      question: input.question,
      options: input.options,
      created_by: input.createdBy,
      allow_multiple: input.allowMultiple ?? false,
      is_anonymous: input.isAnonymous ?? false,
      expires_at: input.expiresAt ?? null,
    } as never);
  }

  async votePoll(input: VotePollInput): Promise<PollVotesRecord> {
    const existing = await this.services.poll_votes.getFullList({
      filter: `poll = ${quote(input.pollId)} && user = ${quote(input.userId)}`,
    });

    const payload = {
      poll: input.pollId,
      user: input.userId,
      option_index: input.optionIndex,
    } as never;

    if (existing[0]?.id) {
      return this.services.poll_votes.update(existing[0].id, payload);
    }

    return this.services.poll_votes.create(payload);
  }

  async listPollVotes(pollId: string): Promise<PollVotesRecord[]> {
    return this.services.poll_votes.getFullList({
      filter: `poll = ${quote(pollId)}`,
      sort: 'created',
    });
  }

  async setPresence(input: PresenceInput): Promise<PresenceRecord> {
    const existing = await this.services.presence.getFullList({
      filter: `userId = ${quote(input.userId)}`,
    });

    const payload = {
      userId: input.userId,
      online: input.online,
      lastSeen: input.lastSeen ?? nowIso(),
    } as never;

    if (existing[0]?.id) {
      return this.services.presence.update(existing[0].id, payload);
    }

    return this.services.presence.create(payload);
  }

  async getPresence(userId: string): Promise<PresenceRecord | null> {
    const rows = await this.services.presence.getFullList({
      filter: `userId = ${quote(userId)}`,
      batch: 1,
    });

    return rows[0] ?? null;
  }

  async blockUser(input: BlockUserInput): Promise<BlockedUsersRecord> {
    return this.services.blocked_users.create({
      blocker: input.blockerId,
      blocked_user: input.blockedUserId,
      reason: input.reason ?? null,
    } as never);
  }

  async unblockUser(blockId: string): Promise<boolean> {
    return this.services.blocked_users.delete(blockId);
  }

  async listBlockedUsers(blockerId: string): Promise<BlockedUsersRecord[]> {
    return this.services.blocked_users.getFullList({
      filter: `blocker = ${quote(blockerId)}`,
      sort: '-created',
    });
  }

  async createCallLog(input: CreateCallLogInput): Promise<CallLogsRecord> {
    return this.services.call_logs.create({
      conversation: input.conversationId,
      initiator: input.initiatorId ?? null,
      participants: input.participants ?? [],
      call_type: input.callType ?? 'voice',
      started_at: input.startedAt ?? nowIso(),
      ended_at: input.endedAt ?? null,
      duration: input.duration ?? null,
      is_missed: input.isMissed ?? false,
      status: input.status ?? 'ringing',
    } as never);
  }

  async listCallLogs(conversationId: string): Promise<CallLogsRecord[]> {
    return this.services.call_logs.getFullList({
      filter: `conversation = ${quote(conversationId)}`,
      sort: '-created',
    });
  }

  async subscribeConversations(
    callback: (event: RealtimeEvent<ConversationsRecord>) => void,
  ): Promise<() => void> {
    return this.services.conversations.subscribe(callback);
  }

  async subscribeConversationMembers(
    conversationId: string,
    callback: (event: RealtimeEvent<ConversationMembersRecord>) => void,
  ): Promise<() => void> {
    return this.services.conversation_members.subscribe(callback, {
      filter: `conversation = ${quote(conversationId)}`,
    });
  }

  async subscribeMessages(
    conversationId: string,
    callback: (event: RealtimeEvent<MessagesRecord>) => void,
  ): Promise<() => void> {
    return this.services.messages.subscribe(callback, {
      filter: `conversation = ${quote(conversationId)}`,
    });
  }

  async subscribeMessageReactions(
    messageId: string,
    callback: (event: RealtimeEvent<MessageReactionsRecord>) => void,
  ): Promise<() => void> {
    return this.services.message_reactions.subscribe(callback, {
      filter: `message = ${quote(messageId)}`,
    });
  }

  async subscribeTyping(
    conversationId: string,
    callback: (event: RealtimeEvent<TypingRecord>) => void,
  ): Promise<() => void> {
    return this.services.typing.subscribe(callback, {
      filter: `conversation = ${quote(conversationId)}`,
    });
  }

  async subscribeReadReceipts(
    messageId: string,
    callback: (event: RealtimeEvent<ReadReceiptsRecord>) => void,
  ): Promise<() => void> {
    return this.services.read_receipts.subscribe(callback, {
      filter: `message = ${quote(messageId)}`,
    });
  }

  async subscribePollVotes(
    pollId: string,
    callback: (event: RealtimeEvent<PollVotesRecord>) => void,
  ): Promise<() => void> {
    return this.services.poll_votes.subscribe(callback, {
      filter: `poll = ${quote(pollId)}`,
    });
  }

  async subscribePresence(
    callback: (event: RealtimeEvent<PresenceRecord>) => void,
  ): Promise<() => void> {
    return this.services.presence.subscribe(callback);
  }
}

export function createChatService(client: PocketBase): PocketBaseChatService {
  return new PocketBaseChatService(client);
}
