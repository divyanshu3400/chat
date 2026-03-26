'use client'
/**
 * settings-ui.tsx
 *
 * Fully reusable settings primitives — drop them anywhere.
 *
 * Components exported:
 *   SettingsSection      — labelled card wrapper
 *   SettingsGroup        — borderless group with optional title
 *   VisibilityRow        — everyone / contacts / nobody selector
 *   ToggleRow            — on/off switch row
 *   SelectRow            — generic option pill row
 *   SettingsDivider      — subtle horizontal rule
 *   SettingsInfo         — info/warning banner
 */

import React, { useId } from 'react'

// ─── Shared style tokens ──────────────────────────────────────────────────────

const ROW: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '11px 14px',
    gap: 12,
    transition: 'background .15s',
}

const LABEL_COL: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    flex: 1,
    minWidth: 0,
}

// ─── SettingsSection ──────────────────────────────────────────────────────────

interface SettingsSectionProps {
    label?: string
    description?: string
    children: React.ReactNode
    style?: React.CSSProperties
}

export function SettingsSection({ label, description, children, style }: SettingsSectionProps) {
    return (
        <div style={style}>
            {(label || description) && (
                <div style={{ marginBottom: 8, paddingLeft: 2 }}>
                    {label && (
                        <div style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: '1.2px',
                            textTransform: 'uppercase', color: 'var(--tx3)',
                            marginBottom: description ? 2 : 0,
                        }}>
                            {label}
                        </div>
                    )}
                    {description && (
                        <div style={{ fontSize: 11, color: 'var(--tx3)', lineHeight: 1.5 }}>
                            {description}
                        </div>
                    )}
                </div>
            )}
            <div style={{
                border: '1px solid var(--border)',
                borderRadius: 12,
                overflow: 'hidden',
                background: 'var(--bg)',
            }}>
                {children}
            </div>
        </div>
    )
}

// ─── SettingsGroup ────────────────────────────────────────────────────────────

interface SettingsGroupProps {
    title?: string
    children: React.ReactNode
    style?: React.CSSProperties
}

export function SettingsGroup({ title, children, style }: SettingsGroupProps) {
    return (
        <div style={style}>
            {title && (
                <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '1.2px',
                    textTransform: 'uppercase', color: 'var(--tx3)',
                    marginBottom: 8, paddingLeft: 2,
                }}>
                    {title}
                </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {children}
            </div>
        </div>
    )
}

// ─── SettingsDivider ──────────────────────────────────────────────────────────

export function SettingsDivider() {
    return (
        <div style={{
            height: 1,
            background: 'var(--border)',
            margin: '0 14px',
        }} />
    )
}

// ─── SettingsInfo ─────────────────────────────────────────────────────────────

interface SettingsInfoProps {
    type?: 'info' | 'warning' | 'success'
    children: React.ReactNode
}

const INFO_COLORS = {
    info: { bg: 'rgba(99,102,241,.08)', border: 'rgba(99,102,241,.2)', color: 'var(--ac)', icon: 'ℹ' },
    warning: { bg: 'rgba(251,191,36,.08)', border: 'rgba(251,191,36,.2)', color: '#d97706', icon: '⚠' },
    success: { bg: 'rgba(16,185,129,.08)', border: 'rgba(16,185,129,.2)', color: '#059669', icon: '✓' },
}

export function SettingsInfo({ type = 'info', children }: SettingsInfoProps) {
    const c = INFO_COLORS[type]
    return (
        <div style={{
            display: 'flex', gap: 8, alignItems: 'flex-start',
            padding: '10px 12px', borderRadius: 10,
            background: c.bg, border: `1px solid ${c.border}`,
        }}>
            <span style={{ fontSize: 12, color: c.color, flexShrink: 0, marginTop: 1 }}>{c.icon}</span>
            <div style={{ fontSize: 11, color: 'var(--tx2)', lineHeight: 1.5 }}>{children}</div>
        </div>
    )
}

// ─── VisibilityRow ────────────────────────────────────────────────────────────

export type VisibilityOption = 'everyone' | 'contacts' | 'nobody'

const VISIBILITY_OPTIONS: { value: VisibilityOption; label: string; icon: string }[] = [
    { value: 'everyone', label: 'Everyone', icon: '🌐' },
    { value: 'contacts', label: 'Contacts', icon: '👥' },
    { value: 'nobody', label: 'Nobody', icon: '🔒' },
]

interface VisibilityRowProps {
    label: string
    description?: string
    value: VisibilityOption
    onChange: (v: VisibilityOption) => void
    disabled?: boolean
    loading?: boolean
}

export function VisibilityRow({
    label, description, value, onChange, disabled, loading,
}: VisibilityRowProps) {
    return (
        <div style={{
            ...ROW,
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 10,
            opacity: disabled ? 0.5 : 1,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={LABEL_COL}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx1)' }}>{label}</span>
                    {description && (
                        <span style={{ fontSize: 11, color: 'var(--tx3)', lineHeight: 1.4 }}>{description}</span>
                    )}
                </div>
                {loading && <MiniSpinner />}
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
                {VISIBILITY_OPTIONS.map(opt => {
                    const active = value === opt.value
                    return (
                        <button
                            key={opt.value}
                            onClick={() => !disabled && onChange(opt.value)}
                            disabled={disabled}
                            style={{
                                flex: 1, padding: '6px 4px', borderRadius: 8,
                                border: `1.5px solid ${active ? 'var(--ac)' : 'var(--border)'}`,
                                background: active ? 'var(--ac-tint, rgba(99,102,241,.1))' : 'var(--bg2)',
                                color: active ? 'var(--ac)' : 'var(--tx3)',
                                cursor: disabled ? 'not-allowed' : 'pointer',
                                fontSize: 11, fontWeight: 600,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                                transition: 'all .15s',
                            }}
                        >
                            <span style={{ fontSize: 14 }}>{opt.icon}</span>
                            <span>{opt.label}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// ─── ToggleRow ────────────────────────────────────────────────────────────────

interface ToggleRowProps {
    label: string
    description?: string
    value: boolean
    onChange: (v: boolean) => void
    disabled?: boolean
    loading?: boolean
    icon?: string
}

export function ToggleRow({
    label, description, value, onChange, disabled, loading, icon,
}: ToggleRowProps) {
    const id = useId()
    return (
        <label
            htmlFor={id}
            style={{
                ...ROW,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
            }}
            onMouseEnter={e => {
                if (!disabled) (e.currentTarget as HTMLElement).style.background = 'var(--bg2)'
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'transparent'
            }}
        >
            <div style={LABEL_COL}>
                <span style={{
                    fontSize: 13, fontWeight: 500, color: 'var(--tx1)',
                    display: 'flex', alignItems: 'center', gap: 6,
                }}>
                    {icon && <span style={{ fontSize: 15 }}>{icon}</span>}
                    {label}
                </span>
                {description && (
                    <span style={{ fontSize: 11, color: 'var(--tx3)', lineHeight: 1.4 }}>{description}</span>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {loading && <MiniSpinner />}
                <Toggle id={id} checked={value} onChange={onChange} disabled={!!disabled} />
            </div>
        </label>
    )
}

// Internal toggle knob
function Toggle({ id, checked, onChange, disabled }: {
    id: string; checked: boolean; onChange: (v: boolean) => void; disabled: boolean
}) {
    return (
        <>
            <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={e => !disabled && onChange(e.target.checked)}
                style={{ display: 'none' }}
            />
            <div
                onClick={() => !disabled && onChange(!checked)}
                style={{
                    width: 40, height: 22, borderRadius: 11,
                    background: checked ? 'var(--ac)' : 'var(--border)',
                    position: 'relative', flexShrink: 0,
                    transition: 'background .2s',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                }}
            >
                <div style={{
                    position: 'absolute',
                    top: 3, left: checked ? 21 : 3,
                    width: 16, height: 16, borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                    transition: 'left .2s cubic-bezier(.4,0,.2,1)',
                }} />
            </div>
        </>
    )
}

// ─── SelectRow ────────────────────────────────────────────────────────────────

interface SelectOption<T extends string> {
    value: T
    label: string
    icon?: string
}

interface SelectRowProps<T extends string> {
    label: string
    description?: string
    options: SelectOption<T>[]
    value: T
    onChange: (v: T) => void
    disabled?: boolean
    loading?: boolean
    icon?: string
}

export function SelectRow<T extends string>({
    label, description, options, value, onChange, disabled, loading, icon,
}: SelectRowProps<T>) {
    return (
        <div style={{
            ...ROW,
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 8,
            opacity: disabled ? 0.5 : 1,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={LABEL_COL}>
                    <span style={{
                        fontSize: 13, fontWeight: 500, color: 'var(--tx1)',
                        display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                        {icon && <span style={{ fontSize: 15 }}>{icon}</span>}
                        {label}
                    </span>
                    {description && (
                        <span style={{ fontSize: 11, color: 'var(--tx3)', lineHeight: 1.4 }}>{description}</span>
                    )}
                </div>
                {loading && <MiniSpinner />}
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {options.map(opt => {
                    const active = value === opt.value
                    return (
                        <button
                            key={opt.value}
                            onClick={() => !disabled && onChange(opt.value)}
                            disabled={disabled}
                            style={{
                                padding: '5px 12px', borderRadius: 20,
                                border: `1.5px solid ${active ? 'var(--ac)' : 'var(--border)'}`,
                                background: active ? 'var(--ac-tint, rgba(99,102,241,.1))' : 'var(--bg2)',
                                color: active ? 'var(--ac)' : 'var(--tx2)',
                                cursor: disabled ? 'not-allowed' : 'pointer',
                                fontSize: 11, fontWeight: 600,
                                display: 'flex', alignItems: 'center', gap: 4,
                                transition: 'all .15s',
                            }}
                        >
                            {opt.icon && <span style={{ fontSize: 12 }}>{opt.icon}</span>}
                            {opt.label}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// ─── MiniSpinner (internal) ───────────────────────────────────────────────────

function MiniSpinner() {
    return (
        <span style={{
            width: 12, height: 12,
            border: '1.5px solid var(--border)',
            borderTopColor: 'var(--ac)',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin .7s linear infinite',
            flexShrink: 0,
        }} />
    )
}