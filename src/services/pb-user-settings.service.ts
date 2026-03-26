/**
 * pb-user-settings.service.ts
 *
 * Services for:
 *   - user_settings  (privacy / security / visibility controls)
 *   - user_preferences  (theme / accent / notification toggles)
 *
 * Pattern mirrors PocketBaseAuthService.
 * All errors are normalised through parsePbError before re-throwing.
 */

import type PocketBase from 'pocketbase';
import {
    USER_SETTINGS_DEFAULTS,
    USER_PREFERENCES_DEFAULTS,
    type UserSettingsRecord,
    type UserPreferencesRecord,
    type UpdateUserSettingsInput,
    type UpdateUserPreferencesInput,
    type UserSettingsChangeEvent,
    type UserPreferencesChangeEvent,
} from '@/src/types/pb-user-settings.types';
import { parsePbError } from '../lib/pb-error';

// ─── Collection name constants (matches your COLLECTIONS map) ─────────────────
const COL_SETTINGS = 'user_settings' as const;
const COL_PREFS = 'user_preferences' as const;

// ─── UserSettingsService ──────────────────────────────────────────────────────

/**
 * Manages the `user_settings` collection.
 *
 * One record per user — auto-creates with defaults on first fetch.
 *
 * @example
 * const settings = new UserSettingsService(pb)
 * const record   = await settings.getOrCreate()
 * await settings.update({ online_visibility: 'nobody' })
 */
export class UserSettingsService {
    private _cache: UserSettingsRecord | null = null;
    private _unsubscribe: (() => void) | null = null;

    constructor(private readonly client: PocketBase) { }

    private collection() {
        return this.client.collection(COL_SETTINGS);
    }

    private requireUserId(): string {
        const id = this.client.authStore.record?.id;
        if (!id) throw new Error('No authenticated user.');
        return id;
    }

    /** Current cached settings record, or null if not yet loaded */
    get cached(): UserSettingsRecord | null {
        return this._cache;
    }

    /**
     * Fetch the current user's settings.
     * Returns null if no record exists yet — use getOrCreate() instead.
     */
    async get(): Promise<UserSettingsRecord | null> {
        try {
            const ownerId = this.requireUserId();
            const result = await this.collection().getFirstListItem<UserSettingsRecord>(
                `owner = "${ownerId}"`,
            );
            this._cache = result;
            return result;
        } catch (err: unknown) {
            const parsed = parsePbError(err);
            // 404 = no record yet, return null instead of throwing
            if (parsed.status === 404) return null;
            throw parsed;
        }
    }

    /**
     * Fetch settings, creating a defaults record if none exists.
     * This is the recommended entry point — call once on app init.
     */
    async getOrCreate(): Promise<UserSettingsRecord> {
        const existing = await this.get();
        if (existing) return existing;

        try {
            const ownerId = this.requireUserId();
            const record = await this.collection().create<UserSettingsRecord>({
                owner: ownerId,
                ...USER_SETTINGS_DEFAULTS,
            });
            this._cache = record;
            return record;
        } catch (err: unknown) {
            throw parsePbError(err);
        }
    }

    /**
     * Update settings fields (partial).
     * Automatically uses the cached record id — call getOrCreate() first.
     *
     * @example
     * await settings.update({ online_visibility: 'contacts', read_receipts_enabled: false })
     */
    async update(data: UpdateUserSettingsInput): Promise<UserSettingsRecord> {
        try {
            const record = this._cache ?? (await this.getOrCreate());
            const updated = await this.collection().update<UserSettingsRecord>(
                record.id,
                data,
            );
            this._cache = updated;
            return updated;
        } catch (err: unknown) {
            throw parsePbError(err);
        }
    }

    /**
     * Update a single field by key.
     *
     * @example
     * await settings.set('online_visibility', 'nobody')
     */
    async set<K extends keyof UpdateUserSettingsInput>(
        key: K,
        value: UpdateUserSettingsInput[K],
    ): Promise<UserSettingsRecord> {
        return this.update({ [key]: value } as UpdateUserSettingsInput);
    }

    /**
     * Reset all settings to their defaults.
     */
    async reset(): Promise<UserSettingsRecord> {
        return this.update(USER_SETTINGS_DEFAULTS);
    }

    /**
     * Subscribe to realtime changes for the current user's settings record.
     * Calls the callback immediately with the current record (if cached).
     * Returns an unsubscribe function.
     *
     * @example
     * const unsub = settings.subscribe((event) => {
     *   console.log(event.action, event.record.online_visibility)
     * })
     * // later:
     * unsub()
     */
    async subscribe(
        callback: (event: UserSettingsChangeEvent) => void,
        fireImmediately = true,
    ): Promise<() => void> {
        // Ensure we have a record to subscribe to
        const record = this._cache ?? (await this.getOrCreate());

        if (fireImmediately) {
            callback({ action: 'update', record });
        }

        try {
            await this.collection().subscribe<UserSettingsRecord>(
                record.id,
                (e) => {
                    this._cache = e.record;
                    callback({ action: e.action as UserSettingsChangeEvent['action'], record: e.record });
                },
            );
        } catch (err: unknown) {
            throw parsePbError(err);
        }

        const unsub = () => {
            this.collection().unsubscribe(record.id).catch(() => { });
            this._unsubscribe = null;
        };

        this._unsubscribe = unsub;
        return unsub;
    }

    /** Unsubscribe from realtime updates */
    unsubscribe(): void {
        this._unsubscribe?.();
    }

    /** Clear the in-memory cache */
    clearCache(): void {
        this._cache = null;
    }
}

// ─── UserPreferencesService ───────────────────────────────────────────────────

/**
 * Manages the `user_preferences` collection.
 *
 * One record per user — auto-creates with defaults on first fetch.
 *
 * @example
 * const prefs = new UserPreferencesService(pb)
 * const record = await prefs.getOrCreate()
 * await prefs.update({ theme: 'dark', accent: 'violet' })
 */
export class UserPreferencesService {
    private _cache: UserPreferencesRecord | null = null;
    private _unsubscribe: (() => void) | null = null;

    constructor(private readonly client: PocketBase) { }

    private collection() {
        return this.client.collection(COL_PREFS);
    }

    private requireUserId(): string {
        const id = this.client.authStore.record?.id;
        if (!id) throw new Error('No authenticated user.');
        return id;
    }

    /** Current cached preferences record, or null if not yet loaded */
    get cached(): UserPreferencesRecord | null {
        return this._cache;
    }

    /**
     * Fetch the current user's preferences.
     * Returns null if no record exists yet — use getOrCreate() instead.
     */
    async get(): Promise<UserPreferencesRecord | null> {
        try {
            const userId = this.requireUserId();
            const result = await this.collection().getFirstListItem<UserPreferencesRecord>(
                `user = "${userId}"`,
            );
            this._cache = result;
            return result;
        } catch (err: unknown) {
            const parsed = parsePbError(err);
            if (parsed.status === 404) return null;
            throw parsed;
        }
    }

    /**
     * Fetch preferences, creating a defaults record if none exists.
     * Call once on app init.
     */
    async getOrCreate(): Promise<UserPreferencesRecord> {
        const existing = await this.get();
        if (existing) return existing;

        try {
            const userId = this.requireUserId();
            const record = await this.collection().create<UserPreferencesRecord>({
                user: userId,
                ...USER_PREFERENCES_DEFAULTS,
            });
            this._cache = record;
            return record;
        } catch (err: unknown) {
            throw parsePbError(err);
        }
    }

    /**
     * Update preferences fields (partial).
     *
     * @example
     * await prefs.update({ theme: 'dark', sound: false })
     */
    async update(data: UpdateUserPreferencesInput): Promise<UserPreferencesRecord> {
        try {
            const record = this._cache ?? (await this.getOrCreate());
            const updated = await this.collection().update<UserPreferencesRecord>(
                record.id,
                data,
            );
            this._cache = updated;
            return updated;
        } catch (err: unknown) {
            throw parsePbError(err);
        }
    }

    /**
     * Update a single preference field.
     *
     * @example
     * await prefs.set('theme', 'dark')
     * await prefs.set('accent', 'rose')
     */
    async set<K extends keyof UpdateUserPreferencesInput>(
        key: K,
        value: UpdateUserPreferencesInput[K],
    ): Promise<UserPreferencesRecord> {
        return this.update({ [key]: value } as UpdateUserPreferencesInput);
    }

    /**
     * Reset all preferences to defaults.
     */
    async reset(): Promise<UserPreferencesRecord> {
        return this.update(USER_PREFERENCES_DEFAULTS);
    }

    /**
     * Subscribe to realtime changes on this user's preferences record.
     * Returns an unsubscribe function.
     *
     * @example
     * const unsub = await prefs.subscribe((event) => {
     *   applyTheme(event.record.theme)
     * })
     */
    async subscribe(
        callback: (event: UserPreferencesChangeEvent) => void,
        fireImmediately = true,
    ): Promise<() => void> {
        const record = this._cache ?? (await this.getOrCreate());

        if (fireImmediately) {
            callback({ action: 'update', record });
        }

        try {
            await this.collection().subscribe<UserPreferencesRecord>(
                record.id,
                (e) => {
                    this._cache = e.record;
                    callback({ action: e.action as UserPreferencesChangeEvent['action'], record: e.record });
                },
            );
        } catch (err: unknown) {
            throw parsePbError(err);
        }

        const unsub = () => {
            this.collection().unsubscribe(record.id).catch(() => { });
            this._unsubscribe = null;
        };

        this._unsubscribe = unsub;
        return unsub;
    }

    /** Unsubscribe from realtime updates */
    unsubscribe(): void {
        this._unsubscribe?.();
    }

    /** Clear the in-memory cache */
    clearCache(): void {
        this._cache = null;
    }
}

// ─── Factory functions (mirrors createAuthService pattern) ────────────────────

/**
 * @example
 * import { pb } from '@/lib/pb'
 * export const settingsService = createUserSettingsService(pb)
 */
export function createUserSettingsService(client: PocketBase): UserSettingsService {
    return new UserSettingsService(client);
}

/**
 * @example
 * import { pb } from '@/lib/pb'
 * export const prefsService = createUserPreferencesService(pb)
 */
export function createUserPreferencesService(client: PocketBase): UserPreferencesService {
    return new UserPreferencesService(client);
}