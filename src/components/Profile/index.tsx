'use client'
/**
 * ProfilePanel.tsx  (updated)
 *
 * Changes from original:
 *  - Privacy tab now uses <PrivacyTab /> (fully wired to user_settings)
 *  - Preferences tab added (theme, accent, sound, push, ai suggest)
 *  - All catch blocks use parsePbError for structured error display
 *  - Field-level errors from PocketBase surface under the relevant inputs
 *  - status field fix: was saving to `status` but me.status_message was read
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { useStore } from '@/src/store/store'
import { pb, COLLECTIONS, getPbFileUrl } from '@/src/lib/pb'
import { getUserAvatar } from '@/src/utils/user_utils'
import PrivacyTab from './PrivacyTab'
import PreferencesTab from './PreferencesTab'
import { getFieldErrorMap, parsePbError } from '@/src/lib/pb-error'

interface Props {
    open: boolean
    onClose: () => void
}

const STATUS_PRESETS = [
    { emoji: '🟢', label: 'Available' },
    { emoji: '🔴', label: 'Busy' },
    { emoji: '🟡', label: 'Away' },
    { emoji: '📵', label: 'DND' },
    { emoji: '💻', label: 'Coding' },
    { emoji: '🎧', label: 'In a call' },
    { emoji: '🏖️', label: 'On vacation' },
    { emoji: '🤒', label: 'Out sick' },
]

export default function ProfilePanel({ open, onClose }: Props) {
    const { me, setMe, showToast } = useStore()

    const [name, setName] = useState(me?.name ?? '')
    const [status, setStatus] = useState(me?.status_message ?? '')
    const [bio, setBio] = useState(me?.bio ?? '')
    const [phone, setPhone] = useState(me?.phone ?? '')
    const [username, setUsername] = useState(me?.username ?? '')

    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [dragOver, setDragOver] = useState(false)

    const [saving, setSaving] = useState(false)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'privacy' | 'preferences'>('profile')
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [saveSuccess, setSaveSuccess] = useState(false)

    const fileRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (me) {
            setName(me.name ?? '')
            setStatus(me.status_message ?? '')
            setBio(me.bio ?? '')
            setPhone(me.phone ?? '')
            setUsername(me.username ?? '')
        }
    }, [me])

    /* ── Avatar drag & drop ── */
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files?.[0]
        if (file && file.type.startsWith('image/')) pickAvatar(file)
    }, [])

    function pickAvatar(file: File) {
        if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5MB'); return }
        setAvatarFile(file)
        setAvatarPreview(URL.createObjectURL(file))
    }

    /* ── Validation ── */
    function validate() {
        const e: Record<string, string> = {}
        if (!name.trim()) e.name = 'Name is required'
        if (name.trim().length > 60) e.name = 'Name too long (max 60 chars)'
        if (username && !/^[a-z0-9_]{3,30}$/.test(username))
            e.username = 'Username: 3–30 chars, lowercase letters, numbers, underscores only'
        if (phone && !/^\+?[\d\s\-()]{7,20}$/.test(phone))
            e.phone = 'Invalid phone number'
        if (bio && bio.length > 200) e.bio = 'Bio max 200 characters'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    /* ── Upload avatar ── */
    async function uploadAvatar(file: File): Promise<string | null> {
        if (!me) return null
        setUploadingAvatar(true)
        try {
            const formData = new FormData()
            formData.append('avatar', file)
            const record = await pb.collection(COLLECTIONS.USERS).update(me.id, formData)
            return getPbFileUrl(record, record.avatar)
        } catch (err) {
            const parsed = parsePbError(err)
            showToast(`Avatar upload failed: ${parsed.summary}`)
            return null
        } finally {
            setUploadingAvatar(false)
        }
    }

    /* ── Save profile ── */
    async function handleSave() {
        if (!validate() || !me) return
        setSaving(true)
        setSaveSuccess(false)
        setErrors({})

        try {
            let photoURL = me.avatar
            if (avatarFile) {
                const url = await uploadAvatar(avatarFile)
                if (url) photoURL = url
            }

            await pb.collection(COLLECTIONS.USERS).update(me.id, {
                name: name.trim(),
                status_message: status.trim(),   // ← was `status` in original, fixed
                bio: bio.trim(),
                phone: phone.trim(),
                username: username.trim().toLowerCase(),
            })

            setMe({
                ...me,
                name: name.trim(),
                avatar: photoURL ?? '',
                status_message: status.trim(),
                bio: bio.trim(),
                phone: phone.trim(),
                username: username.trim().toLowerCase(),
            } as typeof me)

            setAvatarFile(null)
            setAvatarPreview(null)
            setSaveSuccess(true)
            showToast('Profile saved ✓')
            setTimeout(() => setSaveSuccess(false), 2500)

        } catch (err) {
            const parsed = parsePbError(err)
            if (parsed.isValidationError) {
                // Surface field errors inline (e.g. username taken)
                setErrors(getFieldErrorMap(parsed))
            } else {
                showToast(parsed.summary)
            }
        } finally {
            setSaving(false)
        }
    }

    /* ── Remove avatar ── */
    async function handleRemoveAvatar() {
        if (!me) return
        try {
            await pb.collection(COLLECTIONS.USERS).update(me.id, { avatar: null })
            setMe({ ...me, avatar: '' })
            setAvatarPreview(null)
            setAvatarFile(null)
            showToast('Avatar removed')
        } catch (err) {
            showToast(parsePbError(err).summary)
        }
    }

    /* ── Change email ── */
    const [newEmail, setNewEmail] = useState('')
    const [emailPassword, setEmailPassword] = useState('')
    const [changingEmail, setChangingEmail] = useState(false)
    const [emailError, setEmailError] = useState('')

    async function handleChangeEmail() {
        if (!newEmail.trim() || !emailPassword) return
        setChangingEmail(true)
        setEmailError('')
        try {
            await pb.collection(COLLECTIONS.USERS).authWithPassword(me?.email ?? '', emailPassword)
            await pb.collection(COLLECTIONS.USERS).update(me!.id, { email: newEmail.trim() })
            setMe({ ...me!, email: newEmail.trim() })
            setNewEmail('')
            setEmailPassword('')
            showToast('Email updated — please verify your new email')
        } catch (err) {
            const parsed = parsePbError(err)
            setEmailError(parsed.summary)
        } finally {
            setChangingEmail(false)
        }
    }

    /* ── Change password ── */
    const [oldPw, setOldPw] = useState('')
    const [newPw, setNewPw] = useState('')
    const [confirmPw, setConfirmPw] = useState('')
    const [changingPw, setChangingPw] = useState(false)
    const [pwError, setPwError] = useState('')

    async function handleChangePassword() {
        setPwError('')
        if (newPw.length < 8) { setPwError('Password must be at least 8 characters'); return }
        if (newPw !== confirmPw) { setPwError('Passwords do not match'); return }
        setChangingPw(true)
        try {
            await pb.collection(COLLECTIONS.USERS).update(me!.id, {
                oldPassword: oldPw,
                password: newPw,
                passwordConfirm: confirmPw,
            })
            setOldPw(''); setNewPw(''); setConfirmPw('')
            showToast('Password changed ✓')
        } catch (err) {
            const parsed = parsePbError(err)
            setPwError(
                parsed.fieldErrors.find(e => e.field === 'oldPassword')
                    ? 'Current password is incorrect'
                    : parsed.summary
            )
        } finally {
            setChangingPw(false)
        }
    }

    const currentPhoto = getUserAvatar(me)
    const initials = (me?.name ?? '?').split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase()

    const tabs = [
        { key: 'profile', label: 'Profile', icon: '👤' },
        { key: 'account', label: 'Account', icon: '🔐' },
        { key: 'privacy', label: 'Privacy', icon: '🛡️' },
        { key: 'preferences', label: 'Preferences', icon: '⚙️' },
    ] as const

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,.45)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 200,
                    opacity: open ? 1 : 0,
                    pointerEvents: open ? 'auto' : 'none',
                    transition: 'opacity .25s',
                }}
            />

            {/* Panel */}
            <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0,
                width: 'min(420px, 100vw)',
                background: 'var(--bg)',
                borderLeft: '1px solid var(--border)',
                zIndex: 201,
                display: 'flex', flexDirection: 'column',
                transform: open ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform .3s cubic-bezier(.4,0,.2,1)',
            }}>

                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '18px 20px 14px',
                    borderBottom: '1px solid var(--border)',
                    flexShrink: 0,
                }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx1)', letterSpacing: '-.3px' }}>
                        My Profile
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: 30, height: 30, borderRadius: '50%',
                            background: 'var(--bg2)', border: 'none',
                            color: 'var(--tx2)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13,
                        }}
                    >✕</button>
                </div>

                {/* Tabs — scrollable row for 4 tabs */}
                <div style={{
                    display: 'flex', borderBottom: '1px solid var(--border)',
                    padding: '0 12px', gap: 2, flexShrink: 0,
                    overflowX: 'auto',
                }}>
                    {tabs.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setActiveTab(t.key)}
                            style={{
                                padding: '10px 10px', border: 'none', background: 'none',
                                cursor: 'pointer', fontSize: 11, fontWeight: 600,
                                color: activeTab === t.key ? 'var(--ac)' : 'var(--tx3)',
                                borderBottom: `2px solid ${activeTab === t.key ? 'var(--ac)' : 'transparent'}`,
                                marginBottom: -1, transition: 'all .18s',
                                display: 'flex', alignItems: 'center', gap: 4,
                                whiteSpace: 'nowrap', flexShrink: 0,
                            }}
                        >
                            <span style={{ fontSize: 13 }}>{t.icon}</span>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 100px' }}>

                    {/* ══ PROFILE TAB ══ */}
                    {activeTab === 'profile' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                            {/* Avatar */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                <div
                                    onDrop={handleDrop}
                                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                                    onDragLeave={() => setDragOver(false)}
                                    style={{
                                        position: 'relative', cursor: 'pointer',
                                        borderRadius: '50%',
                                        outline: dragOver ? '3px dashed var(--ac)' : '3px solid transparent',
                                        outlineOffset: 4, transition: 'outline .2s',
                                    }}
                                    onClick={() => fileRef.current?.click()}
                                >
                                    {currentPhoto ? (
                                        <img
                                            src={avatarPreview ?? currentPhoto}
                                            alt=""
                                            style={{
                                                width: 88, height: 88, borderRadius: '50%',
                                                objectFit: 'cover', border: '3px solid var(--ac)',
                                                opacity: uploadingAvatar ? .5 : 1, transition: 'opacity .2s',
                                            }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: 88, height: 88, borderRadius: '50%',
                                            background: 'var(--bg2)', border: '3px solid var(--ac)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 28, fontWeight: 800, color: 'var(--ac)',
                                        }}>
                                            {initials}
                                        </div>
                                    )}
                                    <div
                                        className="avatar-overlay"
                                        style={{
                                            position: 'absolute', inset: 0, borderRadius: '50%',
                                            background: 'rgba(0,0,0,.45)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            opacity: 0, transition: 'opacity .18s', fontSize: 20,
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                        onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                                    >
                                        {uploadingAvatar ? '⏳' : '📷'}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => fileRef.current?.click()} style={btnSecondary}>
                                        {avatarFile ? '✓ New photo selected' : 'Change photo'}
                                    </button>
                                    {(currentPhoto || avatarFile) && (
                                        <button
                                            onClick={() => avatarFile
                                                ? (setAvatarFile(null), setAvatarPreview(null))
                                                : handleRemoveAvatar()
                                            }
                                            style={{ ...btnSecondary, border: '1px solid #fca5a5', color: '#ef4444' }}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--tx3)' }}>
                                    Drag & drop or click · JPG, PNG, WebP · Max 5MB
                                </div>
                            </div>

                            <Field label="Display Name" error={errors.name} required>
                                <input
                                    value={name} onChange={e => setName(e.target.value)}
                                    placeholder="Your full name" maxLength={60}
                                    style={inputStyle(!!errors.name)}
                                />
                            </Field>

                            <Field label="Username" error={errors.username} hint="@handle · lowercase, numbers, underscores">
                                <div style={{ position: 'relative' }}>
                                    <span style={{
                                        position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                                        color: 'var(--tx3)', fontSize: 13, pointerEvents: 'none',
                                    }}>@</span>
                                    <input
                                        value={username} onChange={e => setUsername(e.target.value.toLowerCase())}
                                        placeholder="yourhandle" maxLength={30}
                                        style={{ ...inputStyle(!!errors.username), paddingLeft: 24 }}
                                    />
                                </div>
                            </Field>

                            <Field label="Status">
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                    {STATUS_PRESETS.map(s => {
                                        const full = `${s.emoji} ${s.label}`
                                        const active = status === full
                                        return (
                                            <button
                                                key={s.label}
                                                onClick={() => setStatus(active ? '' : full)}
                                                style={{
                                                    padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                                                    fontSize: 11, fontWeight: 500,
                                                    border: `1.5px solid ${active ? 'var(--ac)' : 'var(--border)'}`,
                                                    background: active ? 'var(--ac-tint, rgba(99,102,241,.1))' : 'var(--bg2)',
                                                    color: active ? 'var(--ac)' : 'var(--tx2)',
                                                    transition: 'all .15s',
                                                }}
                                            >
                                                {s.emoji} {s.label}
                                            </button>
                                        )
                                    })}
                                </div>
                                <input
                                    value={status} onChange={e => setStatus(e.target.value)}
                                    placeholder="Custom status…" maxLength={80}
                                    style={inputStyle(false)}
                                />
                            </Field>

                            <Field label="Bio" error={errors.bio} hint={`${bio.length}/200`}>
                                <textarea
                                    value={bio} onChange={e => setBio(e.target.value)}
                                    placeholder="Tell people a bit about yourself…"
                                    maxLength={200} rows={3}
                                    style={{ ...inputStyle(!!errors.bio), resize: 'none', lineHeight: 1.5, fontFamily: 'inherit' }}
                                />
                            </Field>

                            <Field label="Phone" error={errors.phone} hint="Optional · shown only to contacts">
                                <input
                                    value={phone} onChange={e => setPhone(e.target.value)}
                                    placeholder="+1 234 567 8900" maxLength={20} type="tel"
                                    style={inputStyle(!!errors.phone)}
                                />
                            </Field>
                        </div>
                    )}

                    {/* ══ ACCOUNT TAB ══ */}
                    {activeTab === 'account' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{
                                padding: '12px 14px', borderRadius: 10,
                                background: 'var(--bg2)', border: '1px solid var(--border)',
                            }}>
                                <div style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 4 }}>Current email</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx1)' }}>{me?.email}</div>
                            </div>

                            <SectionCard label="Change Email">
                                <Field label="New Email">
                                    <input value={newEmail} onChange={e => setNewEmail(e.target.value)}
                                        placeholder="new@email.com" type="email" style={inputStyle(false)} />
                                </Field>
                                <Field label="Current Password">
                                    <input value={emailPassword} onChange={e => setEmailPassword(e.target.value)}
                                        placeholder="Your current password" type="password" style={inputStyle(false)} />
                                </Field>
                                {emailError && <InlineError msg={emailError} />}
                                <ActionButton onClick={handleChangeEmail} loading={changingEmail}
                                    disabled={!newEmail || !emailPassword} label="Update Email" />
                            </SectionCard>

                            <SectionCard label="Change Password">
                                <Field label="Current Password">
                                    <input value={oldPw} onChange={e => setOldPw(e.target.value)}
                                        type="password" placeholder="Current password" style={inputStyle(false)} />
                                </Field>
                                <Field label="New Password">
                                    <input value={newPw} onChange={e => setNewPw(e.target.value)}
                                        type="password" placeholder="Min 8 characters" style={inputStyle(false)} />
                                </Field>
                                <Field label="Confirm New Password">
                                    <input value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                                        type="password" placeholder="Repeat new password" style={inputStyle(false)} />
                                </Field>
                                {pwError && <InlineError msg={pwError} />}
                                <ActionButton onClick={handleChangePassword} loading={changingPw}
                                    disabled={!oldPw || newPw.length < 8 || newPw !== confirmPw}
                                    label="Change Password" />
                            </SectionCard>
                        </div>
                    )}

                    {/* ══ PRIVACY TAB ══ */}
                    {activeTab === 'privacy' && <PrivacyTab />}

                    {/* ══ PREFERENCES TAB ══ */}
                    {activeTab === 'preferences' && <PreferencesTab />}
                </div>

                {/* Sticky save bar — only on profile tab */}
                {activeTab === 'profile' && (
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        padding: '12px 16px',
                        background: 'var(--bg)', borderTop: '1px solid var(--border)',
                        display: 'flex', gap: 10,
                    }}>
                        <button onClick={onClose} style={btnSecondary}>Cancel</button>
                        <button
                            onClick={handleSave} disabled={saving}
                            style={{
                                flex: 2, padding: '11px 0', borderRadius: 10, border: 'none',
                                background: saveSuccess ? '#10b981' : 'var(--ac)', color: '#fff',
                                cursor: saving ? 'not-allowed' : 'pointer',
                                fontSize: 13, fontWeight: 600,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                                opacity: saving ? .75 : 1, transition: 'background .3s',
                            }}
                        >
                            {saving ? <><Spinner /> Saving…</> : saveSuccess ? '✓ Saved!' : '💾 Save Profile'}
                        </button>
                    </div>
                )}
            </div>

            <input
                ref={fileRef} type="file" accept="image/*"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) pickAvatar(f); e.target.value = '' }}
            />

            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </>
    )
}

/* ── Sub-components ── */

function Field({ label, children, error, hint, required }: {
    label: string; children: React.ReactNode
    error?: string; hint?: string; required?: boolean
}) {
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {label}{required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
                </label>
                {hint && <span style={{ fontSize: 10, color: error ? '#ef4444' : 'var(--tx3)' }}>{hint}</span>}
            </div>
            {children}
            {error && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, paddingLeft: 2 }}>⚠ {error}</div>}
        </div>
    )
}

function InlineError({ msg }: { msg: string }) {
    return (
        <div style={{
            fontSize: 11, color: '#ef4444', padding: '6px 10px', borderRadius: 8,
            background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)',
            display: 'flex', alignItems: 'center', gap: 5,
        }}>
            ⚠ {msg}
        </div>
    )
}

function SectionCard({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{
                padding: '9px 14px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
                fontSize: 11, fontWeight: 700, color: 'var(--tx3)', letterSpacing: '1px', textTransform: 'uppercase',
            }}>{label}</div>
            <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
        </div>
    )
}

function ActionButton({ onClick, loading, disabled, label }: {
    onClick: () => void; loading: boolean; disabled: boolean; label: string
}) {
    return (
        <button
            onClick={onClick} disabled={disabled || loading}
            style={{
                padding: '9px 16px', borderRadius: 9, border: 'none',
                background: 'var(--ac)', color: '#fff',
                cursor: disabled || loading ? 'not-allowed' : 'pointer',
                fontSize: 12, fontWeight: 600, opacity: disabled ? .5 : 1,
                display: 'flex', alignItems: 'center', gap: 6, transition: 'opacity .15s',
                alignSelf: 'flex-start',
            }}
        >
            {loading && <Spinner />}{label}
        </button>
    )
}

function Spinner() {
    return (
        <span style={{
            width: 13, height: 13,
            border: '2px solid rgba(255,255,255,.35)', borderTopColor: '#fff',
            borderRadius: '50%', display: 'inline-block',
            animation: 'spin .7s linear infinite', flexShrink: 0,
        }} />
    )
}

const btnSecondary: React.CSSProperties = {
    flex: 1, padding: '11px 0', borderRadius: 10,
    border: '1.5px solid var(--border)',
    background: 'var(--bg2)', color: 'var(--tx2)',
    cursor: 'pointer', fontSize: 13, fontWeight: 600,
}

function inputStyle(hasError: boolean): React.CSSProperties {
    return {
        width: '100%', padding: '9px 11px', borderRadius: 9,
        border: `1.5px solid ${hasError ? '#ef4444' : 'var(--border)'}`,
        background: 'var(--bg2)', color: 'var(--tx1)',
        fontSize: 13, outline: 'none', boxSizing: 'border-box',
        transition: 'border-color .18s', fontFamily: 'inherit',
    }
}