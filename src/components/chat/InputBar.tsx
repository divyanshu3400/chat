'use client'

import React, {
  useState, useRef, useEffect, useCallback,
  KeyboardEvent, ClipboardEvent, DragEvent,
} from 'react'
import { createPortal } from 'react-dom'
import styles from './InputBar.module.css'
import { useDecrypted, useStore } from '@/src/store/store'
import { Camera, File, X, Send, Mic, Plus } from 'lucide-react'

const MAX_CHARS = 4000
const WARN_CHARS = 3800

interface ReplyTo {
  senderName: string; text: string
}

interface Props {
  onSend: (text: string) => void
  onFile: (file: File) => void
  onVoice: (blob: Blob, duration: string) => void
  onGif?: (url: string) => void
  onPoll?: () => void
  onTyping?: () => void
  editingText?: string
  onCancelEdit?: () => void
  replyTo?: ReplyTo | null
  onClearReply?: () => void
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () =>
      setMobile(
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        window.innerWidth < 640
      )
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return mobile
}

const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

interface SheetAction {
  icon: React.ReactNode
  label: string
  bg: string
  onClick: () => void
}

function BottomSheet({
  open, onClose, actions,
}: { open: boolean; onClose: () => void; actions: SheetAction[] }) {
  const [mounted, setMounted] = useState(false)
  const [animIn, setAnimIn] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (open) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimIn(true)))
      document.body.style.overflow = 'hidden'
    } else {
      setAnimIn(false)
      document.body.style.overflow = ''
      const t = setTimeout(() => setMounted(false), 320)
      return () => clearTimeout(t)
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!mounted || typeof document === 'undefined') return null

  return createPortal(
    <div className={styles.sheetOverlay} style={{ pointerEvents: animIn ? 'auto' : 'none' }}>
      {/* Scrim */}
      <div
        onClick={onClose}
        className={styles.sheetScrim}
        style={{ opacity: animIn ? 1 : 0 }}
      />

      {/* Sheet card */}
      <div
        className={styles.sheetCard}
        style={{
          transform: animIn ? 'translateY(0)' : 'translateY(100%)',
        }}
      >
        {/* Handle */}
        <div className={styles.sheetHandle} />

        {/* Title */}
        <p className={styles.sheetTitle}>Add to message</p>

        {/* Action grid */}
        <div className={styles.sheetGrid}>
          {actions.map(({ icon, label, bg, onClick }) => (
            <button
              key={label}
              onClick={() => { onClick(); onClose() }}
              className={styles.sheetAction}
            >
              <span className={styles.sheetIcon} style={{ background: bg }}>
                {icon}
              </span>
              <span className={styles.sheetLabel}>{label}</span>
            </button>
          ))}
        </div>

        {/* Cancel button */}
        <div className={styles.sheetFooter}>
          <button
            onClick={onClose}
            className={styles.sheetCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function ActionBtn({
  icon, onClick, title, active, disabled, variant = 'default'
}: {
  icon: React.ReactNode; onClick: () => void
  title?: string; active?: boolean; disabled?: boolean; variant?: 'default' | 'mic' | 'send'
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={[
        styles.actionBtn,
        active ? styles.actionBtnActive : '',
        variant !== 'default' ? styles[`actionBtn${variant.charAt(0).toUpperCase() + variant.slice(1)}`] : '',
      ].filter(Boolean).join(' ')}
    >
      {icon}
    </button>
  )
}

function VoiceBar({ elapsed, onStop, onCancel }: {
  elapsed: number; onStop: () => void; onCancel: () => void
}) {
  const [waveHeights, setWaveHeights] = useState<number[]>(
    Array(24).fill(0.3)
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setWaveHeights(
        Array(24)
          .fill(0)
          .map(() => Math.random() * 0.7 + 0.3)
      )
    }, 150)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={styles.voiceBarContainer}>
      <div className={styles.voiceBarBg} />
      <div className={styles.voiceBar}>
        <button
          onClick={onCancel}
          className={styles.voiceBtn}
          data-action="cancel"
          title="Cancel recording"
        >
          <X size={18} />
        </button>

        <div className={styles.voiceCenter}>
          <div className={styles.recordingIndicator}>
            <div className={styles.recordingPulse} />
            <div className={styles.recordingDot} />
          </div>

          <div className={styles.voiceWave}>
            {waveHeights.map((height, i) => (
              <span
                key={i}
                className={styles.waveBar}
                style={{
                  height: `${height * 100}%`,
                  opacity: 0.6 + height * 0.4,
                }}
              />
            ))}
          </div>

          <div className={styles.voiceTime}>
            <span className={styles.timeValue}>{fmt(elapsed)}</span>
          </div>
        </div>

        <button
          onClick={onStop}
          className={styles.voiceBtn}
          data-action="send"
          title="Send voice message"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}

export default function InputBar({
  onSend, onFile, onVoice, onPoll,
  onTyping, editingText, onCancelEdit,
}: Props) {
  const mobile = useIsMobile()

  const [text, setText] = useState('')
  const [isRec, setIsRec] = useState(false)
  const [recElapsed, setRecElapsed] = useState(0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [attPreview, setAttPreview] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recStartRef = useRef(0)
  const recTickRef = useRef<ReturnType<typeof setInterval>>()
  const typTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const isEditing = editingText !== undefined
  const {
    replyTo,
    setReplyTo,
    attFile,
    setAttachment,
    attType,
  } = useStore()

  useEffect(() => {
    if (editingText !== undefined) {
      setText(editingText)
      setTimeout(() => { textareaRef.current?.focus(); autoResize() }, 60)
    }
  }, [editingText])

  useEffect(() => {
    if (!replyTo) return
    const el = textareaRef.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
    autoResize()
  }, [replyTo])

  useEffect(() => {
    if (attFile && attType === 'image') {
      const url = URL.createObjectURL(attFile)
      setAttPreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setAttPreview(null)
  }, [attFile, attType])

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 130) + 'px'
  }

  const fireTyping = useCallback(() => {
    onTyping?.()
    clearTimeout(typTimerRef.current)
  }, [onTyping])

  function attachFile(file: File) {
    const type = file.type.startsWith('image/') ? 'image'
      : file.type.startsWith('video/') ? 'video' : 'file'
    setAttachment(file, type)
    onFile(file)
  }

  function handleSend() {
    const t = text.trim()
    if (!t && !attFile) return
    try { navigator.vibrate?.(10) } catch { }
    onSend(t)
    setText('')
    setAttachment(null, null)
    setAttPreview(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    if (e.key === 'Escape' && isEditing) onCancelEdit?.()
  }

  function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
    if (item) { e.preventDefault(); const f = item.getAsFile(); if (f) attachFile(f) }
  }

  function onDragOver(e: DragEvent) { e.preventDefault(); setDragOver(true) }
  function onDragLeave() { setDragOver(false) }
  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) attachFile(f)
  }

  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      chunksRef.current = []
      recStartRef.current = Date.now()
      setRecElapsed(0)
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.start(100)
      mediaRef.current = rec
      setIsRec(true)
      recTickRef.current = setInterval(() =>
        setRecElapsed(Math.floor((Date.now() - recStartRef.current) / 1000)), 500)
    } catch { alert('Microphone access denied') }
  }

  function stopRec(send: boolean) {
    clearInterval(recTickRef.current)
    const rec = mediaRef.current
    if (!rec) { setIsRec(false); return }
    rec.onstop = () => {
      if (send && chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const total = Math.round((Date.now() - recStartRef.current) / 1000)
        onVoice(blob, fmt(total))
      }
      rec.stream.getTracks().forEach(t => t.stop())
    }
    rec.stop()
    setIsRec(false)
    setRecElapsed(0)
  }

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    attachFile(file)
    e.target.value = ''
  }

  const sheetActions: SheetAction[] = [
    {
      icon: <Camera size={22} />,
      label: 'Camera',
      bg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      onClick: () => cameraRef.current?.click(),
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
      label: 'Gallery',
      bg: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
      onClick: () => fileRef.current?.click(),
    },
    {
      icon: <File size={22} />,
      label: 'Document',
      bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      onClick: () => fileRef.current?.click(),
    },
  ]

  const decryptedText = useDecrypted(replyTo?.messageId)

  const charCount = text.length
  const overLimit = charCount > MAX_CHARS
  const nearLimit = charCount > WARN_CHARS
  const canSend = (text.trim().length > 0 || !!attFile) && !overLimit

  return (
    <>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={[styles.root, dragOver ? styles.rootDrag : ''].filter(Boolean).join(' ')}
      >
        {dragOver && (
          <div className={styles.dragOverlay}>
            <div className={styles.dragOverlayContent}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" /></svg>
              <span>Drop to attach</span>
            </div>
          </div>
        )}

        {isEditing && (
          <div className={styles.editBanner}>
            <div className={styles.editBannerContent}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              <span className={styles.editText}>Editing message</span>
              <div className={styles.editKbds}>
                <kbd>↵ Enter</kbd> to save
              </div>
            </div>
            <button onClick={onCancelEdit} className={styles.editCancel} title="Cancel edit">
              <X size={16} />
            </button>
          </div>
        )}

        {replyTo && !isEditing && (
          <div className={styles.replyPreview}>
            <div className={styles.replyBar} />
            <div className={styles.replyInner}>
              <div className={styles.replyName}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="7 7 2 12 7 17" /><line x1="12" y1="12" x2="22" y2="12" /></svg>
                {replyTo.bundle?.message.content}
              </div>
              <div className={styles.replyText}>{decryptedText}</div>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault()
                setReplyTo(null)
              }}
              className={styles.dismissBtn}
              title="Dismiss reply"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {attFile && (
          <div className={styles.attPreview}>
            {attPreview
              ? <img src={attPreview} alt="" className={styles.attThumb} />
              : <span className={styles.attIconBox}>{attType === 'video' ? <Camera size={24} /> : <File size={24} />}</span>
            }
            <div className={styles.attInfo}>
              <div className={styles.attName}>{attFile.name}</div>
              <div className={styles.attMeta}>{(attFile.size / 1024).toFixed(1)} KB · {attType}</div>
            </div>
            <button
              onClick={() => { setAttachment(null, ""); setAttPreview(null) }}
              className={styles.attRemove}
              title="Remove attachment"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {isRec && (
          <VoiceBar elapsed={recElapsed} onStop={() => stopRec(true)} onCancel={() => stopRec(false)} />
        )}

        {!isRec && (
          <div className={styles.inputRow}>
            <ActionBtn
              icon={<Plus size={19} />}
              onClick={mobile ? () => setSheetOpen(true) : () => fileRef.current?.click()}
              title="Attach file"
              variant="default"
            />

            {!mobile && onPoll && (
              <ActionBtn
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>}
                onClick={onPoll}
                title="Create poll"
                variant="default"
              />
            )}

            <div className={styles.textareaWrap}>
              <textarea
                ref={textareaRef}
                placeholder={isEditing ? 'Edit your message…' : 'Message…'}
                value={text}
                rows={1}
                className={[
                  styles.textarea,
                  isEditing ? styles.textareaEdit : '',
                  overLimit ? styles.textareaOver : ''
                ].filter(Boolean).join(' ')}
                onKeyDown={handleKey}
                onPaste={onPaste}
                onChange={e => { setText(e.target.value); autoResize(); fireTyping() }}
              />
            </div>

            {nearLimit && (
              <span className={[styles.charCount, overLimit ? styles.charOver : styles.charWarn].join(' ')}>
                {MAX_CHARS - charCount}
              </span>
            )}

            {!text.trim() && !attFile && !isEditing
              ? (
                <ActionBtn
                  icon={<Mic size={19} />}
                  onClick={startRec}
                  title="Send voice message"
                  variant="mic"
                />
              ) : (
                <ActionBtn
                  icon={isEditing
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    : <Send size={16} />
                  }
                  onClick={handleSend}
                  disabled={!canSend}
                  variant="send"
                  title={isEditing ? 'Save changes' : 'Send message'}
                />
              )
            }
          </div>
        )}

        {!mobile && !isRec && !isEditing && (
          <div className={styles.hint}>
            <span>↵ Enter</span> to send · <span>Shift + Enter</span> for newline
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*,audio/*,.pdf,.zip,.txt,.doc,.docx,.xls,.xlsx"
          style={{ display: 'none' }}
          onChange={onFileSelect}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={onFileSelect}
        />
      </div>
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} actions={sheetActions} />
    </>
  )
}