/**
 * pb-user-settings.types.ts
 * Types and constants for user_settings + user_preferences collections.
 */

import type { BasePocketBaseRecord, RecordId } from './pb-collections.types';

// ─── user_settings ────────────────────────────────────────────────────────────

export type VisibilityOption = 'everyone' | 'contacts' | 'nobody';

export type UserSettingsLanguage =
    | 'en' | 'hi' | 'ar' | 'fr' | 'es'
    | 'de' | 'pt' | 'zh' | 'ja' | 'ko';

export interface UserSettingsRecord extends BasePocketBaseRecord<'user_settings'> {
    owner: RecordId;

    // Visibility
    online_visibility: VisibilityOption;
    last_seen_visibility: VisibilityOption;
    profile_photo_visibility: VisibilityOption;
    about_visibility: VisibilityOption;
    story_visibility: VisibilityOption;

    // Chat behaviour
    read_receipts_enabled: boolean;
    typing_indicator_enabled: boolean;
    screenshot_alerts_enabled: boolean;

    // Who can reach me
    who_can_message_me: VisibilityOption;
    who_can_add_to_groups: VisibilityOption;
    who_can_call_me: VisibilityOption;

    // Notifications
    notifications_enabled: boolean;
    message_preview_in_notifications: boolean;
    story_notifications_enabled: boolean;

    // Security
    two_step_verification_enabled: boolean;
    blocked_screenshots: boolean;

    // App
    language: UserSettingsLanguage | null;
}

export type UpdateUserSettingsInput = Partial<
    Omit<UserSettingsRecord, keyof BasePocketBaseRecord<'user_settings'> | 'owner'>
>;

export const USER_SETTINGS_DEFAULTS: Omit<
    UserSettingsRecord,
    keyof BasePocketBaseRecord<'user_settings'> | 'owner'
> = {
    online_visibility: 'everyone',
    last_seen_visibility: 'everyone',
    profile_photo_visibility: 'everyone',
    about_visibility: 'everyone',
    story_visibility: 'everyone',
    read_receipts_enabled: true,
    typing_indicator_enabled: true,
    screenshot_alerts_enabled: false,
    who_can_message_me: 'everyone',
    who_can_add_to_groups: 'contacts',
    who_can_call_me: 'everyone',
    notifications_enabled: true,
    message_preview_in_notifications: true,
    story_notifications_enabled: true,
    two_step_verification_enabled: false,
    blocked_screenshots: false,
    language: 'en',
};

// ─── user_preferences ────────────────────────────────────────────────────────

export type PreferencesTheme = 'light' | 'dark' | 'system';
export type PreferencesAccent =
    | 'indigo' | 'violet' | 'rose' | 'cyan' | 'amber' | 'emerald';

export interface UserPreferencesRecord extends BasePocketBaseRecord<'user_preferences'> {
    user: RecordId;
    theme: PreferencesTheme;
    accent: PreferencesAccent | null;
    sound: boolean;
    push: boolean;
    readReceipts: boolean;
    aiSuggest: boolean;
}

export type UpdateUserPreferencesInput = Partial<
    Omit<UserPreferencesRecord, keyof BasePocketBaseRecord<'user_preferences'> | 'user'>
>;

export const USER_PREFERENCES_DEFAULTS: Omit<
    UserPreferencesRecord,
    keyof BasePocketBaseRecord<'user_preferences'> | 'user'
> = {
    theme: 'system',
    accent: 'indigo',
    sound: true,
    push: true,
    readReceipts: true,
    aiSuggest: false,
};

// ─── Realtime ─────────────────────────────────────────────────────────────────

export type UserSettingsChangeEvent = {
    action: 'create' | 'update' | 'delete';
    record: UserSettingsRecord;
};

export type UserPreferencesChangeEvent = {
    action: 'create' | 'update' | 'delete';
    record: UserPreferencesRecord;
};