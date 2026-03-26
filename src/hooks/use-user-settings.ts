'use client'
/**
 * use-user-settings.ts
 *
 * Realtime hook for user_settings + user_preferences.
 * Handles loading, saving, field-level errors, and auto-cleanup.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { pb } from '@/src/lib/pb'
import {
    createUserSettingsService,
    createUserPreferencesService,
} from '@/src/services/pb-user-settings.service'

import type {
    UserSettingsRecord,
    UserPreferencesRecord,
    UpdateUserSettingsInput,
    UpdateUserPreferencesInput,
} from '@/src/types/pb-user-settings.types'
import { getFieldErrorMap, parsePbError } from '../lib/pb-error'

// Singletons — one instance shared across the app
const settingsService = createUserSettingsService(pb)
const prefsService = createUserPreferencesService(pb)

// ─── useUserSettings ──────────────────────────────────────────────────────────

interface UseUserSettingsReturn {
    settings: UserSettingsRecord | null
    loading: boolean
    saving: boolean
    /** Field-level error map: { online_visibility: "Invalid value" } */
    fieldErrors: Record<string, string>
    /** General error message (non-field errors) */
    error: string | null
    update: (data: UpdateUserSettingsInput) => Promise<boolean>
    set: <K extends keyof UpdateUserSettingsInput>(key: K, value: UpdateUserSettingsInput[K]) => Promise<boolean>
    clearErrors: () => void
}

export function useUserSettings(): UseUserSettingsReturn {
    const [settings, setSettings] = useState<UserSettingsRecord | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [error, setError] = useState<string | null>(null)
    const unsubRef = useRef<(() => void) | null>(null)

    useEffect(() => {
        let mounted = true

        settingsService
            .subscribe((event) => {
                if (mounted && event.action !== 'delete') {
                    setSettings(event.record)
                    setLoading(false)
                }
            }, true)
            .then((unsub) => {
                if (mounted) unsubRef.current = unsub
                else unsub() // component unmounted before subscribe resolved
            })
            .catch((err) => {
                if (!mounted) return
                const parsed = parsePbError(err)
                setError(parsed.summary)
                setLoading(false)
            })

        return () => {
            mounted = false
            unsubRef.current?.()
        }
    }, [])

    const update = useCallback(async (data: UpdateUserSettingsInput): Promise<boolean> => {
        setSaving(true)
        setFieldErrors({})
        setError(null)
        try {
            const updated = await settingsService.update(data)
            setSettings(updated)
            return true
        } catch (err) {
            const parsed = parsePbError(err)
            if (parsed.isValidationError) {
                setFieldErrors(getFieldErrorMap(parsed))
            } else {
                setError(parsed.summary)
            }
            return false
        } finally {
            setSaving(false)
        }
    }, [])

    const set = useCallback(async <K extends keyof UpdateUserSettingsInput>(
        key: K,
        value: UpdateUserSettingsInput[K],
    ): Promise<boolean> => {
        return update({ [key]: value } as UpdateUserSettingsInput)
    }, [update])

    const clearErrors = useCallback(() => {
        setFieldErrors({})
        setError(null)
    }, [])

    return { settings, loading, saving, fieldErrors, error, update, set, clearErrors }
}

// ─── useUserPreferences ───────────────────────────────────────────────────────

interface UseUserPreferencesReturn {
    prefs: UserPreferencesRecord | null
    loading: boolean
    saving: boolean
    fieldErrors: Record<string, string>
    error: string | null
    update: (data: UpdateUserPreferencesInput) => Promise<boolean>
    set: <K extends keyof UpdateUserPreferencesInput>(key: K, value: UpdateUserPreferencesInput[K]) => Promise<boolean>
    clearErrors: () => void
}

export function useUserPreferences(): UseUserPreferencesReturn {
    const [prefs, setPrefs] = useState<UserPreferencesRecord | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [error, setError] = useState<string | null>(null)
    const unsubRef = useRef<(() => void) | null>(null)

    useEffect(() => {
        let mounted = true

        prefsService
            .subscribe((event) => {
                if (mounted && event.action !== 'delete') {
                    setPrefs(event.record)
                    setLoading(false)
                }
            }, true)
            .then((unsub) => {
                if (mounted) unsubRef.current = unsub
                else unsub()
            })
            .catch((err) => {
                if (!mounted) return
                const parsed = parsePbError(err)
                setError(parsed.summary)
                setLoading(false)
            })

        return () => {
            mounted = false
            unsubRef.current?.()
        }
    }, [])

    const update = useCallback(async (data: UpdateUserPreferencesInput): Promise<boolean> => {
        setSaving(true)
        setFieldErrors({})
        setError(null)
        try {
            const updated = await prefsService.update(data)
            setPrefs(updated)
            return true
        } catch (err) {
            const parsed = parsePbError(err)
            if (parsed.isValidationError) {
                setFieldErrors(getFieldErrorMap(parsed))
            } else {
                setError(parsed.summary)
            }
            return false
        } finally {
            setSaving(false)
        }
    }, [])

    const set = useCallback(async <K extends keyof UpdateUserPreferencesInput>(
        key: K,
        value: UpdateUserPreferencesInput[K],
    ): Promise<boolean> => {
        return update({ [key]: value } as UpdateUserPreferencesInput)
    }, [update])

    const clearErrors = useCallback(() => {
        setFieldErrors({})
        setError(null)
    }, [])

    return { prefs, loading, saving, fieldErrors, error, update, set, clearErrors }
}