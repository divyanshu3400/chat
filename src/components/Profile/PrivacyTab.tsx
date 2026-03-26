'use client'
/**
 * PrivacyTab.tsx
 *
 * Drop-in Privacy tab for ProfilePanel.
 * Fully wired to user_settings via useUserSettings().
 * Each toggle/select saves instantly on change (no save button needed).
 */

import React from 'react'
import { SettingsDivider, SettingsInfo, SettingsSection, ToggleRow, VisibilityRow } from './SettingsUI'
import { useUserSettings } from '@/src/hooks/use-user-settings'

export default function PrivacyTab() {
    const { settings, loading, saving, fieldErrors, error, set } = useUserSettings()

    if (loading) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 40, color: 'var(--tx3)', fontSize: 13,
                flexDirection: 'column', gap: 10,
            }}>
                <LoadingDots />
                Loading your settings…
            </div>
        )
    }

    if (!settings) {
        return (
            <SettingsInfo type="warning">
                Could not load settings. Please reload and try again.
            </SettingsInfo>
        )
    }

    if (error) {
        return <SettingsInfo type="warning">{error}</SettingsInfo>
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── Visibility ── */}
            <SettingsSection label="Visibility" description="Control who can see your information">

                <VisibilityRow
                    label="Online status"
                    description="Who can see when you're active"
                    value={settings.online_visibility}
                    onChange={v => set('online_visibility', v)}
                    loading={saving}
                />
                {fieldErrors.online_visibility && <FieldError msg={fieldErrors.online_visibility} />}

                <SettingsDivider />

                <VisibilityRow
                    label="Last seen"
                    description="Who can see when you were last online"
                    value={settings.last_seen_visibility}
                    onChange={v => set('last_seen_visibility', v)}
                    loading={saving}
                />
                {fieldErrors.last_seen_visibility && <FieldError msg={fieldErrors.last_seen_visibility} />}

                <SettingsDivider />

                <VisibilityRow
                    label="Profile photo"
                    description="Who can see your avatar"
                    value={settings.profile_photo_visibility}
                    onChange={v => set('profile_photo_visibility', v)}
                    loading={saving}
                />

                <SettingsDivider />

                <VisibilityRow
                    label="About / Bio"
                    description="Who can see your bio text"
                    value={settings.about_visibility}
                    onChange={v => set('about_visibility', v)}
                    loading={saving}
                />

                <SettingsDivider />

                <VisibilityRow
                    label="Stories"
                    description="Who can view your stories"
                    value={settings.story_visibility}
                    onChange={v => set('story_visibility', v)}
                    loading={saving}
                />
            </SettingsSection>

            {/* ── Messaging ── */}
            <SettingsSection label="Messaging">

                <VisibilityRow
                    label="Who can message me"
                    value={settings.who_can_message_me}
                    onChange={v => set('who_can_message_me', v)}
                    loading={saving}
                />

                <SettingsDivider />

                <VisibilityRow
                    label="Who can call me"
                    value={settings.who_can_call_me}
                    onChange={v => set('who_can_call_me', v)}
                    loading={saving}
                />

                <SettingsDivider />

                <VisibilityRow
                    label="Who can add me to groups"
                    value={settings.who_can_add_to_groups}
                    onChange={v => set('who_can_add_to_groups', v)}
                    loading={saving}
                />
            </SettingsSection>

            {/* ── Chat behaviour ── */}
            <SettingsSection label="Chat">

                <ToggleRow
                    label="Read receipts"
                    description="Let others know when you've read their messages"
                    icon="✓"
                    value={settings.read_receipts_enabled}
                    onChange={v => set('read_receipts_enabled', v)}
                    loading={saving}
                />

                <SettingsDivider />

                <ToggleRow
                    label="Typing indicator"
                    description="Show when you're typing a message"
                    icon="✏"
                    value={settings.typing_indicator_enabled}
                    onChange={v => set('typing_indicator_enabled', v)}
                    loading={saving}
                />

                <SettingsDivider />

                <ToggleRow
                    label="Screenshot alerts"
                    description="Notify you when someone screenshots a chat"
                    icon="📸"
                    value={settings.screenshot_alerts_enabled}
                    onChange={v => set('screenshot_alerts_enabled', v)}
                    loading={saving}
                />
            </SettingsSection>

            {/* ── Security ── */}
            <SettingsSection label="Security">

                <ToggleRow
                    label="Two-step verification"
                    description="Require a PIN when logging in on a new device"
                    icon="🔐"
                    value={settings.two_step_verification_enabled}
                    onChange={v => set('two_step_verification_enabled', v)}
                    loading={saving}
                />

                <SettingsDivider />

                <ToggleRow
                    label="Block screenshots"
                    description="Prevent screenshots of your chats (mobile only)"
                    icon="🛡"
                    value={settings.blocked_screenshots}
                    onChange={v => set('blocked_screenshots', v)}
                    loading={saving}
                />
            </SettingsSection>

            {/* ── Notifications ── */}
            <SettingsSection label="Notifications">

                <ToggleRow
                    label="Push notifications"
                    description="Receive notifications when the app is in background"
                    icon="🔔"
                    value={settings.notifications_enabled}
                    onChange={v => set('notifications_enabled', v)}
                    loading={saving}
                />

                <SettingsDivider />

                <ToggleRow
                    label="Message preview"
                    description="Show message content in notifications"
                    icon="👁"
                    value={settings.message_preview_in_notifications}
                    disabled={!settings.notifications_enabled}
                    onChange={v => set('message_preview_in_notifications', v)}
                    loading={saving}
                />

                <SettingsDivider />

                <ToggleRow
                    label="Story notifications"
                    description="Notify when contacts post stories"
                    icon="📖"
                    value={settings.story_notifications_enabled}
                    disabled={!settings.notifications_enabled}
                    onChange={v => set('story_notifications_enabled', v)}
                    loading={saving}
                />
            </SettingsSection>

            {settings.last_seen_visibility === 'nobody' && (
                <SettingsInfo type="info">
                    When last seen is set to Nobody, you also won't be able to see other people's last seen.
                </SettingsInfo>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
    )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldError({ msg }: { msg: string }) {
    return (
        <div style={{
            fontSize: 11, color: '#ef4444',
            padding: '0 14px 8px',
            display: 'flex', alignItems: 'center', gap: 4,
        }}>
            <span>⚠</span> {msg}
        </div>
    )
}

function LoadingDots() {
    return (
        <div style={{ display: 'flex', gap: 5 }}>
            {[0, 1, 2].map(i => (
                <div key={i} style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: 'var(--ac)',
                    animation: `bounce .9s ease-in-out ${i * 0.15}s infinite`,
                    opacity: 0.6,
                }} />
            ))}
            <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
        </div>
    )
}