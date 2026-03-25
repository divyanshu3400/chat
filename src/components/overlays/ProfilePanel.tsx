'use client'
import { useRef, useState, useEffect, useCallback } from 'react'
import { useStore } from '@/src/store/store'
import { pb, COLLECTIONS, getPbFileUrl } from '@/src/lib/pb'

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
  const [status, setStatus] = useState((me as any)?.status ?? '')
  const [bio, setBio] = useState((me as any)?.bio ?? '')
  const [phone, setPhone] = useState((me as any)?.phone ?? '')
  const [username, setUsername] = useState((me as any)?.username ?? '')

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'privacy'>('profile')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveSuccess, setSaveSuccess] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  /* Sync fields when me changes */
  useEffect(() => {
    if (me) {
      setName(me.name ?? '')
      setStatus((me as any).status ?? '')
      setBio((me as any).bio ?? '')
      setPhone((me as any).phone ?? '')
      setUsername((me as any).username ?? '')
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
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB')
      return
    }
    setAvatarFile(file)
    const url = URL.createObjectURL(file)
    setAvatarPreview(url)
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
    if (bio && bio.length > 200)
      e.bio = 'Bio max 200 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  /* ── Upload avatar only ── */
  async function uploadAvatar(file: File): Promise<string | null> {
    if (!me) return null
    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const record = await pb.collection(COLLECTIONS.USERS).update(me.id, formData)
      const url = getPbFileUrl(record, record.avatar)
      return url
    } catch (err: any) {
      showToast('Avatar upload failed')
      console.error('[ProfilePanel] avatar upload:', err)
      return null
    } finally {
      setUploadingAvatar(false)
    }
  }

  /* ── Save profile ── */
  async function handleSave() {
    if (!validate()) return
    if (!me) return
    setSaving(true)
    setSaveSuccess(false)

    try {
      let photoURL = me.avatar

      /* Upload new avatar first if selected */
      if (avatarFile) {
        const url = await uploadAvatar(avatarFile)
        if (url) photoURL = url
      }

      /* Update user record */
      await pb.collection(COLLECTIONS.USERS).update(me.id, {
        name: name.trim(),
        status: status.trim(),
        bio: bio.trim(),
        phone: phone.trim(),
        username: username.trim().toLowerCase(),
      })

      /* Update local store */
      setMe({
        ...me,
        displayName: name.trim(),
        photoURL: photoURL ?? '',
        status: status.trim(),
        bio: bio.trim(),
        phone: phone.trim(),
        username: username.trim().toLowerCase(),
      } as typeof me)

      setAvatarFile(null)
      setAvatarPreview(null)
      setSaveSuccess(true)
      showToast('Profile saved ✓')
      setTimeout(() => setSaveSuccess(false), 2500)

    } catch (err: any) {
      const data = err?.data?.data
      if (data?.username) setErrors(e => ({ ...e, username: 'Username already taken' }))
      else showToast(err?.message ?? 'Failed to save profile')
      console.error('[ProfilePanel] save:', err)
    } finally {
      setSaving(false)
    }
  }

  /* ── Remove avatar ── */
  async function handleRemoveAvatar() {
    if (!me) return
    try {
      await pb.collection(COLLECTIONS.USERS).update(me.id, { 'avatar': null })
      setMe({ ...me, avatar: '' })
      setAvatarPreview(null)
      setAvatarFile(null)
      showToast('Avatar removed')
    } catch {
      showToast('Failed to remove avatar')
    }
  }

  /* ── Change email ── */
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [changingEmail, setChangingEmail] = useState(false)

  async function handleChangeEmail() {
    if (!newEmail.trim() || !emailPassword) return
    setChangingEmail(true)
    try {
      await pb.collection(COLLECTIONS.USERS).authWithPassword(me?.email ?? '', emailPassword)
      await pb.collection(COLLECTIONS.USERS).update(me!.id, { email: newEmail.trim() })
      setMe({ ...me!, email: newEmail.trim() })
      setNewEmail('')
      setEmailPassword('')
      showToast('Email updated — please verify your new email')
    } catch (err: any) {
      showToast(err?.message ?? 'Failed to change email')
    } finally {
      setChangingEmail(false)
    }
  }

  /* ── Change password ── */
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [changingPw, setChangingPw] = useState(false)

  async function handleChangePassword() {
    if (newPw.length < 8) { showToast('Password must be at least 8 characters'); return }
    if (newPw !== confirmPw) { showToast('Passwords do not match'); return }
    setChangingPw(true)
    try {
      await pb.collection(COLLECTIONS.USERS).update(me!.id, {
        oldPassword: oldPw,
        password: newPw,
        passwordConfirm: confirmPw,
      })
      setOldPw(''); setNewPw(''); setConfirmPw('')
      showToast('Password changed ✓')
    } catch (err: any) {
      showToast(err?.message ?? 'Failed to change password')
    } finally {
      setChangingPw(false)
    }
  }

  const currentPhoto = avatarPreview ?? me?.avatar ?? ''
  const initials = (me?.name ?? '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
  const charCount = bio.length

  const tabs = [
    { key: 'profile', label: 'Profile', icon: '👤' },
    { key: 'account', label: 'Account', icon: '🔐' },
    { key: 'privacy', label: 'Privacy', icon: '🛡️' },
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
        width: 'min(400px, 100vw)',
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

        {/* Tabs */}
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--border)',
          padding: '0 16px', gap: 4, flexShrink: 0,
        }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '10px 12px', border: 'none', background: 'none',
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
                color: activeTab === t.key ? 'var(--ac)' : 'var(--tx3)',
                borderBottom: `2px solid ${activeTab === t.key ? 'var(--ac)' : 'transparent'}`,
                marginBottom: -1, transition: 'all .18s',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 100px' }}>

          {/* ══ PROFILE TAB ══ */}
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Avatar upload */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  style={{
                    position: 'relative', cursor: 'pointer',
                    borderRadius: '50%',
                    outline: dragOver ? '3px dashed var(--ac)' : '3px solid transparent',
                    outlineOffset: 4,
                    transition: 'outline .2s',
                  }}
                  onClick={() => fileRef.current?.click()}
                >
                  {currentPhoto ? (
                    <img
                      src={currentPhoto}
                      alt=""
                      style={{
                        width: 88, height: 88, borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid var(--ac)',
                        opacity: uploadingAvatar ? .5 : 1,
                        transition: 'opacity .2s',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 88, height: 88, borderRadius: '50%',
                      background: 'var(--bg2)',
                      border: '3px solid var(--ac)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 28, fontWeight: 800, color: 'var(--ac)',
                    }}>
                      {initials}
                    </div>
                  )}

                  {/* Overlay */}
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: 'rgba(0,0,0,.45)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0, transition: 'opacity .18s',
                    fontSize: 20,
                  }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                  >
                    {uploadingAvatar ? '⏳' : '📷'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => fileRef.current?.click()}
                    style={{
                      padding: '5px 12px', borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--bg2)', color: 'var(--tx2)',
                      cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    }}
                  >
                    {avatarFile ? '✓ New photo selected' : 'Change photo'}
                  </button>
                  {(currentPhoto || avatarFile) && (
                    <button
                      onClick={() => {
                        if (avatarFile) { setAvatarFile(null); setAvatarPreview(null) }
                        else handleRemoveAvatar()
                      }}
                      style={{
                        padding: '5px 12px', borderRadius: 8,
                        border: '1px solid #fca5a5',
                        background: 'transparent', color: '#ef4444',
                        cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 10, color: 'var(--tx3)' }}>
                  Drag & drop or click · JPG, PNG, WebP · Max 5MB
                </div>
              </div>

              {/* Name */}
              <Field label="Display Name" error={errors.name} required>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your full name"
                  maxLength={60}
                  style={inputStyle(!!errors.name)}
                />
              </Field>

              {/* Username */}
              <Field label="Username" error={errors.username} hint="@handle · letters, numbers, underscores">
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--tx3)', fontSize: 13, pointerEvents: 'none',
                  }}>@</span>
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase())}
                    placeholder="yourhandle"
                    maxLength={30}
                    style={{ ...inputStyle(!!errors.username), paddingLeft: 24 }}
                  />
                </div>
              </Field>

              {/* Status */}
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
                          padding: '4px 10px', borderRadius: 20,
                          cursor: 'pointer', fontSize: 11, fontWeight: 500,
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
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  placeholder="Custom status…"
                  maxLength={80}
                  style={inputStyle(false)}
                />
              </Field>

              {/* Bio */}
              <Field label="Bio" error={errors.bio} hint={`${charCount}/200`}>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell people a bit about yourself…"
                  maxLength={200}
                  rows={3}
                  style={{
                    ...inputStyle(!!errors.bio),
                    resize: 'none', lineHeight: 1.5,
                    fontFamily: 'inherit',
                  }}
                />
              </Field>

              {/* Phone */}
              <Field label="Phone" error={errors.phone} hint="Optional · shown only to contacts">
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 234 567 8900"
                  maxLength={20}
                  type="tel"
                  style={inputStyle(!!errors.phone)}
                />
              </Field>
            </div>
          )}

          {/* ══ ACCOUNT TAB ══ */}
          {activeTab === 'account' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Current email info */}
              <div style={{
                padding: '12px 14px', borderRadius: 10,
                background: 'var(--bg2)', border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 4 }}>Current email</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx1)' }}>{me?.email}</div>
              </div>

              <SectionCard label="Change Email">
                <Field label="New Email">
                  <input
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="new@email.com"
                    type="email"
                    style={inputStyle(false)}
                  />
                </Field>
                <Field label="Current Password">
                  <input
                    value={emailPassword}
                    onChange={e => setEmailPassword(e.target.value)}
                    placeholder="Your current password"
                    type="password"
                    style={inputStyle(false)}
                  />
                </Field>
                <ActionButton
                  onClick={handleChangeEmail}
                  loading={changingEmail}
                  disabled={!newEmail || !emailPassword}
                  label="Update Email"
                />
              </SectionCard>

              <SectionCard label="Change Password">
                <Field label="Current Password">
                  <input value={oldPw} onChange={e => setOldPw(e.target.value)} type="password" placeholder="Current password" style={inputStyle(false)} />
                </Field>
                <Field label="New Password">
                  <input value={newPw} onChange={e => setNewPw(e.target.value)} type="password" placeholder="Min 8 characters" style={inputStyle(false)} />
                </Field>
                <Field label="Confirm New Password">
                  <input value={confirmPw} onChange={e => setConfirmPw(e.target.value)} type="password" placeholder="Repeat new password" style={inputStyle(false)} />
                </Field>
                <ActionButton
                  onClick={handleChangePassword}
                  loading={changingPw}
                  disabled={!oldPw || newPw.length < 8 || newPw !== confirmPw}
                  label="Change Password"
                />
              </SectionCard>
            </div>
          )}

          {/* ══ PRIVACY TAB ══ */}
          {activeTab === 'privacy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <PrivacyRow
                label="Last seen"
                desc="Who can see when you were last online"
                options={['Everyone', 'Contacts', 'Nobody']}
                value={(me as any)?.privacyLastSeen ?? 'Everyone'}
                onChange={v => updatePrivacy('privacyLastSeen', v)}
              />
              <PrivacyRow
                label="Profile photo"
                desc="Who can see your profile picture"
                options={['Everyone', 'Contacts', 'Nobody']}
                value={(me as any)?.privacyPhoto ?? 'Everyone'}
                onChange={v => updatePrivacy('privacyPhoto', v)}
              />
              <PrivacyRow
                label="Status"
                desc="Who can see your status message"
                options={['Everyone', 'Contacts', 'Nobody']}
                value={(me as any)?.privacyStatus ?? 'Everyone'}
                onChange={v => updatePrivacy('privacyStatus', v)}
              />
              <PrivacyRow
                label="Read receipts"
                desc="Let others know when you've read their messages"
                options={['On', 'Off']}
                value={(me as any)?.privacyReadReceipts ?? 'On'}
                onChange={v => updatePrivacy('privacyReadReceipts', v)}
              />
            </div>
          )}
        </div>

        {/* Sticky save bar — only on profile tab */}
        {activeTab === 'profile' && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '12px 16px',
            background: 'var(--bg)',
            borderTop: '1px solid var(--border)',
            display: 'flex', gap: 10,
          }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 10,
                border: '1.5px solid var(--border)',
                background: 'var(--bg2)', color: 'var(--tx2)',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 2, padding: '11px 0', borderRadius: 10,
                border: 'none',
                background: saveSuccess ? '#10b981' : 'var(--ac)',
                color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                opacity: saving ? .75 : 1,
                transition: 'background .3s',
              }}
            >
              {saving ? (
                <>
                  <Spinner />
                  Saving…
                </>
              ) : saveSuccess ? '✓ Saved!' : '💾 Save Profile'}
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) pickAvatar(f)
          e.target.value = ''
        }}
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </>
  )

  async function updatePrivacy(field: string, value: string) {
    if (!me) return
    try {
      await pb.collection(COLLECTIONS.USERS).update(me.id, { [field]: value })
      setMe({ ...me, [field]: value } as typeof me)
    } catch {
      showToast('Failed to update privacy setting')
    }
  }
}

/* ── Sub-components ── */

function Field({ label, children, error, hint, required }: {
  label: string; children: React.ReactNode
  error?: string; hint?: string; required?: boolean
}) {
  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 6,
      }}>
        <label style={{
          fontSize: 11, fontWeight: 700, color: 'var(--tx3)',
          letterSpacing: '1px', textTransform: 'uppercase',
        }}>
          {label}{required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
        </label>
        {hint && <span style={{ fontSize: 10, color: error ? '#ef4444' : 'var(--tx3)' }}>{hint}</span>}
      </div>
      {children}
      {error && (
        <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, paddingLeft: 2 }}>
          ⚠ {error}
        </div>
      )}
    </div>
  )
}

function SectionCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '9px 14px', background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
        fontSize: 11, fontWeight: 700, color: 'var(--tx3)',
        letterSpacing: '1px', textTransform: 'uppercase',
      }}>
        {label}
      </div>
      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </div>
  )
}

function ActionButton({ onClick, loading, disabled, label }: {
  onClick: () => void; loading: boolean; disabled: boolean; label: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        padding: '9px 16px', borderRadius: 9,
        border: 'none', background: 'var(--ac)', color: '#fff',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        fontSize: 12, fontWeight: 600,
        opacity: disabled ? .5 : 1,
        display: 'flex', alignItems: 'center', gap: 6,
        transition: 'opacity .15s',
        alignSelf: 'flex-start',
      }}
    >
      {loading && <Spinner />}
      {label}
    </button>
  )
}

function PrivacyRow({ label, desc, options, value, onChange }: {
  label: string; desc: string
  options: string[]; value: string; onChange: (v: string) => void
}) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 12,
      border: '1px solid var(--border)', background: 'var(--bg2)',
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx1)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 10 }}>{desc}</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {options.map(o => (
          <button
            key={o}
            onClick={() => onChange(o)}
            style={{
              padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
              cursor: 'pointer',
              border: `1.5px solid ${value === o ? 'var(--ac)' : 'var(--border)'}`,
              background: value === o ? 'var(--ac-tint, rgba(99,102,241,.1))' : 'transparent',
              color: value === o ? 'var(--ac)' : 'var(--tx3)',
              transition: 'all .15s',
            }}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <span style={{
      width: 13, height: 13,
      border: '2px solid rgba(255,255,255,.35)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      display: 'inline-block',
      animation: 'spin .7s linear infinite',
      flexShrink: 0,
    }} />
  )
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: '100%', padding: '9px 11px', borderRadius: 9,
    border: `1.5px solid ${hasError ? '#ef4444' : 'var(--border)'}`,
    background: 'var(--bg2)', color: 'var(--tx1)',
    fontSize: 13, outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color .18s',
    fontFamily: 'inherit',
  }
}