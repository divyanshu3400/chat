'use client'
/**
 * PreferencesTab.tsx
 *
 * App preferences tab wired to user_preferences collection.
 * Reuses SelectRow + ToggleRow from settings-ui.
 */

import React from 'react'
import { SelectRow, SettingsDivider, SettingsInfo, SettingsSection, ToggleRow } from './SettingsUI'
import { useUserPreferences } from '@/src/hooks/use-user-settings'

const THEME_OPTIONS = [
    { value: 'system', label: 'System', icon: '💻' },
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'dark', label: 'Dark', icon: '🌙' },
] as const

const ACCENT_OPTIONS = [
    { value: 'indigo', label: 'Indigo', icon: '🟣' },
    { value: 'violet', label: 'Violet', icon: '💜' },
    { value: 'rose', label: 'Rose', icon: '🌸' },
    { value: 'cyan', label: 'Cyan', icon: '🩵' },
    { value: 'amber', label: 'Amber', icon: '🟡' },
    { value: 'emerald', label: 'Emerald', icon: '💚' },
] as const

export default function PreferencesTab() {
    const { prefs, loading, saving, error, set } = useUserPreferences()

    if (loading) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 40, color: 'var(--tx3)', fontSize: 13,
                flexDirection: 'column', gap: 10,
            }}>
                <div style={{ display: 'flex', gap: 5 }}>
                    {[0, 1, 2].map(i => (
                        <div key={i} style={{
                            width: 7, height: 7, borderRadius: '50%', background: 'var(--ac)',
                            animation: `bounce .9s ease-in-out ${i * 0.15}s infinite`, opacity: 0.6,
                        }} />
                    ))}
                </div>
                Loading preferences…
                <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(.6);opacity:.4} 40%{transform:scale(1);opacity:1} }`}</style>
            </div>
        )
    }

    if (!prefs) {
        return <SettingsInfo type="warning">Could not load preferences. Please reload.</SettingsInfo>
    }

    if (error) return <SettingsInfo type="warning">{error}</SettingsInfo>

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── Appearance ── */}
            <SettingsSection label="Appearance">
                <SelectRow
                    label="Theme"
                    options={THEME_OPTIONS as unknown as { value: string; label: string; icon: string }[]}
                    value={prefs.theme}
                    onChange={v => set('theme', v as typeof prefs.theme)}
                    loading={saving}
                    icon="🎨"
                />
                <SettingsDivider />
                <SelectRow
                    label="Accent colour"
                    options={ACCENT_OPTIONS as unknown as { value: string; label: string; icon: string }[]}
                    value={prefs.accent ?? 'indigo'}
                    onChange={v => set('accent', v as typeof prefs.accent)}
                    loading={saving}
                    icon="🖌"
                />
            </SettingsSection>

            {/* ── Notifications ── */}
            <SettingsSection label="Notifications">
                <ToggleRow
                    label="Sound effects"
                    description="Play sounds for messages and events"
                    icon="🔊"
                    value={prefs.sound}
                    onChange={v => set('sound', v)}
                    loading={saving}
                />
                <SettingsDivider />
                <ToggleRow
                    label="Push notifications"
                    description="Receive notifications when app is closed"
                    icon="📲"
                    value={prefs.push}
                    onChange={v => set('push', v)}
                    loading={saving}
                />
            </SettingsSection>

            {/* ── Chat ── */}
            <SettingsSection label="Chat">
                <ToggleRow
                    label="Read receipts"
                    description="Show double ticks when messages are read"
                    icon="✓"
                    value={prefs.readReceipts}
                    onChange={v => set('readReceipts', v)}
                    loading={saving}
                />
                <SettingsDivider />
                <ToggleRow
                    label="AI suggestions"
                    description="Show smart reply and compose suggestions"
                    icon="✨"
                    value={prefs.aiSuggest}
                    onChange={v => set('aiSuggest', v)}
                    loading={saving}
                />
            </SettingsSection>

            <SettingsInfo type="info">
                Theme and accent changes apply instantly across the app.
            </SettingsInfo>

            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
    )
}