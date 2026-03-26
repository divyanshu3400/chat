import PocketBase from 'pocketbase'


/** LocalStorage keys â€” single source of truth */
export const STORAGE_KEYS = {
    PREFS: 'cipher_prefs',
} as const

export const COLLECTIONS = {
    SUPERUSERS: '_superusers',
    USERS: 'users',
    AUTHORIGINS: '_authOrigins',
    EXTERNALAUTHS: '_externalAuths',
    MFAS: '_mfas',
    OTPS: '_otps',
    ATTACHMENTS: 'attachments',
    BLOCKED_USERS: 'blocked_users',
    CALL_LOGS: 'call_logs',
    CALL_SIGNALS: 'call_signals',
    CALL_ICE_CANDIDATES: 'call_ice_candidates',
    CONVERSATION_MEMBERS: 'conversation_members',
    CONVERSATION_ROLES: 'conversation_roles',
    CONVERSATION_SETTINGS: 'conversation_settings',
    CONVERSATIONS: 'conversations',
    MESSAGE_EDITS: 'message_edits',
    MESSAGE_REACTIONS: 'message_reactions',
    MESSAGES: 'messages',
    POLL_VOTES: 'poll_votes',
    POLLS: 'polls',
    PRESENCE: 'presence',
    PUBKEYS: 'pubkeys',
    PUSH_TOKENS: 'push_tokens',
    READ_RECEIPTS: 'read_receipts',
    STORIES: 'stories',
    TYPING: 'typing',
    STORY_SETTINGS: 'story_settings',
    STORY_CLOSE_FRIENDS: 'story_close_friends',
    STORY_ALLOWED_VIEWERS: 'story_allowed_viewers',
    STORY_HIDDEN_USERS: 'story_hidden_users',
    STORY_VIEWS: 'story_views',
    STORY_REACTIONS: 'story_reactions',
    STORY_REPLIES: 'story_replies',
    USER_PREF: 'user_preferences',
    USER_SETTINGS:'user_settings'
} as const;


export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS]
export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS]

export interface PbConfig {
    url: string
    vapidKey?: string
}

function resolvePbUrl(): string {
    if (process.env.NEXT_PUBLIC_PB_URL) return process.env.NEXT_PUBLIC_PB_URL
    return 'https://tech.kasheemilk.com/pb'
}

/** Resolve full config â€” reads from env vars only */
export function resolveCfg(): PbConfig | null {
    const url = resolvePbUrl()
    if (!url) return null
    return {
        url,
        vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY,
    }
}
export const pb = new PocketBase(resolvePbUrl())

pb.autoCancellation(false)

/** Currently logged-in user record, or null */
export function getCurrentUser() {
    return pb.authStore.isValid ? pb.authStore.record : null
}

/** Current user ID (Firebase uid equivalent) */
export function getCurrentUid(): string | null {
    return pb.authStore.isValid ? (pb.authStore.record?.id ?? null) : null
}

/** True if user is logged in */
export function isLoggedIn(): boolean {
    return pb.authStore.isValid
}

export function getPbFileUrl(
    record: { id: string; collectionId: string; collectionName: string },
    filename: string,
    thumb?: string,
): string {
    return pb.files.getURL(record, filename, thumb ? { thumb } : undefined)
}
