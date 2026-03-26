import { pb } from "../lib/pb"
import { fmtBytes, mdRender } from "../lib/utils"
import { ConversationState, MessageStateItem, UsersRecord } from "../store/store"
import { BubbleMessageView, MessageBundle } from "../types/pb-chat.types"

export function contentTypeFromFile(file: File): 'image' | 'video' | 'audio' | 'file' {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.startsWith('video/')) return 'video'
    if (file.type.startsWith('audio/')) return 'audio'
    return 'file'
}

export function attachmentTypeFromFile(file: File): 'image' | 'video' | 'audio' | 'document' {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.startsWith('video/')) return 'video'
    if (file.type.startsWith('audio/')) return 'audio'
    return 'document'
}

export function toEpoch(value?: string | null): number {
    if (!value) return 0
    const time = Date.parse(value)
    return Number.isFinite(time) ? time : 0
}

export function buildReactionsMap(bundle: MessageBundle): Record<string, string | null> {
    const map: Record<string, string | null> = {}
    for (const reaction of bundle.reactions) {
        if (reaction.user) {
            map[reaction.user] = reaction.emoji
        }
    }
    return map
}

export function getFileUrl(
    record: { id: string; collectionId: string; collectionName: string },
    file?: string | null,
): string | undefined {
    if (!file) return undefined
    try {
        return pb.files.getURL(record, file).toString()
    } catch {
        return undefined
    }
}

export function buildReplyPreview(
    bundle: MessageBundle,
    messages: MessageStateItem[],
    decryptedById: Record<string, string>,
): BubbleMessageView['replyTo'] {
    const repliedId = bundle.message.replied_to
    if (!repliedId) return undefined

    const target = messages.find((item) => item.message.id === repliedId)
    if (!target) {
        return {
            id: repliedId,
            text: 'Reply',
            senderName: 'Unknown',
            type: 'text',
        }
    }

    return {
        id: target.message.id,
        text: decryptedById[target.message.id] ?? target.message.content ?? '',
        senderName: target.message.sender ?? 'Unknown',
        type: target.message.content_type ?? 'text',
        mediaThumb: target.attachments[0]
            ? getFileUrl(target.attachments[0], target.attachments[0].thumbnail ?? target.attachments[0].file)
            : undefined,
    }
}

export function getSenderName(
    me: UsersRecord | null,
    conv: ConversationState,
    messageSenderId: string | null,
    senderCache: Record<string, UsersRecord>,
): string {
    if (!messageSenderId) return 'Unknown'
    if (me?.id === messageSenderId) return me.name?.trim() || me.username || me.email
    if (conv.otherUser?.id === messageSenderId) {
        return conv.otherUser.name?.trim() || conv.otherUser.username || conv.otherUser.email
    }

    const cached = senderCache[messageSenderId]
    if (cached) {
        return cached.name?.trim() || cached.username || cached.email
    }

    return messageSenderId
}

export function getSenderPhoto(
    me: UsersRecord | null,
    conv: ConversationState,
    messageSenderId: string | null,
    senderCache: Record<string, UsersRecord>,
): string {
    const sender =
        (messageSenderId && me?.id === messageSenderId ? me : null) ||
        (messageSenderId && conv.otherUser?.id === messageSenderId ? conv.otherUser : null) ||
        (messageSenderId ? senderCache[messageSenderId] : null)

    if (!sender?.avatar) return ''
    return getFileUrl(sender, sender.avatar) ?? ''
}

export function buildBubbleMessage(
    bundle: MessageBundle,
    conv: ConversationState,
    me: UsersRecord | null,
    decryptedById: Record<string, string>,
    allMessages: MessageStateItem[],
    senderCache: Record<string, UsersRecord>,
): BubbleMessageView {
    const primaryAttachment = bundle.attachments[0]
    const contentType = bundle.message.content_type ?? 'text'
    const attachmentUrl = primaryAttachment
        ? getFileUrl(primaryAttachment, primaryAttachment.file)
        : undefined
    const thumbnailUrl = primaryAttachment
        ? getFileUrl(primaryAttachment, primaryAttachment.thumbnail ?? primaryAttachment.file)
        : undefined

    return {
        uid: bundle.message.sender ?? '',
        senderName: getSenderName(me, conv, bundle.message.sender, senderCache),
        senderPhoto: getSenderPhoto(me, conv, bundle.message.sender, senderCache),
        text: decryptedById[bundle.message.id] ?? mdRender(bundle.message.content ?? ''),
        type: contentType,
        url: attachmentUrl,
        fileName: primaryAttachment?.file_name ?? undefined,
        fileSize: primaryAttachment?.file_size ? fmtBytes(primaryAttachment.file_size) : undefined,
        encrypted: !!conv.otherUser && contentType === 'text',
        edited: !!bundle.message.is_edited,
        editedAt: bundle.message.edited_at ?? undefined,
        deleted: !!bundle.message.is_deleted,
        duration: primaryAttachment?.duration ? String(primaryAttachment.duration) : undefined,
        replyTo: buildReplyPreview(bundle, allMessages, decryptedById),
        thumbnailUrl,
        ts: bundle.message.created,
        status: bundle.message.status ?? 'sent',
        reactions: buildReactionsMap(bundle),
    }
}
