import { pb } from '@/src/lib/pb'

import type {
    ConversationsRecord,
    MessageBundle,
    UsersRecord,
} from '@/src/store/store'

export function getUserAvatar(user: UsersRecord | null): string {
    if (!user?.avatar) {
        return ''
    }

    try {
        return pb.files.getURL(user, user.avatar).toString()
    } catch {
        return ''
    }
}

export function getConversationName(item: {
    source: ConversationsRecord
    otherUser: UsersRecord | null
}): string {
    if (item.source.type === 'group') {
        return item.source.name?.trim() || 'Untitled group'
    }

    return item.otherUser?.name?.trim() || item.otherUser?.username?.trim() || item.otherUser?.email || 'Unknown user'
}

export function getLastMessageText(bundle: MessageBundle['message'] | null): string {
    if (!bundle) {
        return ''
    }

    if (bundle.is_deleted) {
        return 'Message deleted'
    }

    if (bundle.content?.trim()) {
        return bundle.content
    }

    if ((bundle.attachments?.length ?? 0) > 0) {
        return 'Attachment'
    }

    return ''
}
