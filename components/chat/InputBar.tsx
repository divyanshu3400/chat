'use client'

import React, {
  useState, useRef, useEffect, useCallback,
  KeyboardEvent, ClipboardEvent, DragEvent,
} from 'react'
import { createPortal } from 'react-dom'
import styles from './InputBar.module.css'
import { Icon } from '../shared/Icons'
import { useDecrypted, useStore } from '@/lib/store'

/* ─── constants ─── */
const MAX_CHARS = 4000
const WARN_CHARS = 3800

/* ─── types ─── */
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

/* ─── SSR-safe mobile detection ─── */
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

/* ══════════════════════════════════════════════════════════════
   BOTTOM SHEET  — Portal onto document.body
   Slide-up animation exactly like Android BottomSheetDialog
══════════════════════════════════════════════════════════════ */
interface SheetAction {
  icon: React.ReactNode
  label: string
  bg: string
  onClick: () => void
}

function BottomSheet({
  open, onClose, actions,
}: { open: boolean; onClose: () => void; actions: SheetAction[] }) {
  // Two-phase state: "mounted" keeps DOM alive during close animation
  const [mounted, setMounted] = useState(false)
  const [animIn, setAnimIn] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (open) {
      setMounted(true)
      // next tick so CSS transition fires
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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        pointerEvents: animIn ? 'auto' : 'none',
      }}
    >
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          transition: 'opacity 0.28s ease',
          opacity: animIn ? 1 : 0,
        }}
      />

      {/* Sheet card */}
      <div
        style={{
          position: 'relative',
          background: '#1e2537',
          borderRadius: '20px 20px 0 0',
          padding: '0 0 max(20px, env(safe-area-inset-bottom))',
          transform: animIn ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.22)' }} />
        </div>

        {/* Title */}
        <p style={{
          margin: '4px 0 14px',
          textAlign: 'center',
          fontSize: 13,
          fontWeight: 600,
          color: 'rgba(255,255,255,.5)',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}>
          Add to message
        </p>

        {/* Action grid — 4 cols */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 10,
          padding: '0 16px 16px',
        }}>
          {actions.map(({ icon, label, bg, onClick }) => (
            <button
              key={label}
              onClick={() => { onClick(); onClose() }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: '16px 8px 12px',
                background: 'rgba(255,255,255,.04)',
                border: '1px solid rgba(255,255,255,.07)',
                borderRadius: 16,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                transition: 'transform 0.12s, background 0.12s',
              }}
              onPointerDown={e => {
                ; (e.currentTarget as HTMLElement).style.transform = 'scale(0.91)'
                  ; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.1)'
              }}
              onPointerUp={e => {
                ; (e.currentTarget as HTMLElement).style.transform = ''
                  ; (e.currentTarget as HTMLElement).style.background = ''
              }}
              onPointerLeave={e => {
                ; (e.currentTarget as HTMLElement).style.transform = ''
                  ; (e.currentTarget as HTMLElement).style.background = ''
              }}
            >
              {/* Icon circle */}
              <span style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 22,
              }}>
                {icon}
              </span>
              <span style={{
                fontSize: 12,
                color: 'rgba(255,255,255,.6)',
                fontWeight: 500,
                textAlign: 'center',
                lineHeight: 1.2,
              }}>
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* Cancel pill */}
        <div style={{ padding: '0 16px' }}>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '14px',
              background: 'rgba(255,255,255,.06)',
              border: '1px solid rgba(255,255,255,.09)',
              borderRadius: 14,
              color: 'rgba(255,255,255,.7)',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ─── Small icon button ─── */
function IBtn({ icon, onClick, title, active, disabled }: {
  icon: React.ReactNode; onClick: () => void
  title?: string; active?: boolean; disabled?: boolean
}) {
  return (
    <button onClick={onClick} title={title} disabled={disabled} className={[
      styles.iBtn, active ? styles.iBtnActive : '',
    ].filter(Boolean).join(' ')}>
      {icon}
    </button>
  )
}

/* ─── Voice recording bar ─── */
function VoiceBar({ elapsed, onStop, onCancel }: {
  elapsed: number; onStop: () => void; onCancel: () => void
}) {
  return (
    <div className={styles.voiceBar}>
      <button onClick={onCancel} className={styles.voiceCancel}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
      <span className={styles.voiceDot} />
      <span className={styles.voiceTime}>{fmt(elapsed)}</span>
      <div className={styles.voiceWave}>
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i} className={styles.waveBar} style={{ animationDelay: `${i * 65}ms` }} />
        ))}
      </div>
      <button onClick={onStop} className={styles.voiceSend}>Send ↑</button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   MAIN INPUT BAR
══════════════════════════════════════════════════════════════ */
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
    const el = textareaRef.current; if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 130) + 'px'
  }

  const fireTyping = useCallback(() => {
    onTyping?.(); clearTimeout(typTimerRef.current)
  }, [onTyping])

  function attachFile(file: File) {
    const type = file.type.startsWith('image/') ? 'image'
      : file.type.startsWith('video/') ? 'video' : 'file'
    setAttachment(file, type); onFile(file)
  }

  function handleSend() {
    const t = text.trim()
    if (!t && !attFile) return
    try { navigator.vibrate?.(10) } catch { }
    onSend(t)
    setText(''); setAttachment(null, null); setAttPreview(null);
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
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]; if (f) attachFile(f)
  }

  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      chunksRef.current = []; recStartRef.current = Date.now(); setRecElapsed(0)
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.start(100); mediaRef.current = rec; setIsRec(true)
      recTickRef.current = setInterval(() =>
        setRecElapsed(Math.floor((Date.now() - recStartRef.current) / 1000)), 500)
    } catch { alert('Microphone access denied') }
  }

  function stopRec(send: boolean) {
    clearInterval(recTickRef.current)
    const rec = mediaRef.current; if (!rec) { setIsRec(false); return }
    rec.onstop = () => {
      if (send && chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const total = Math.round((Date.now() - recStartRef.current) / 1000)
        onVoice(blob, fmt(total))
      }
      rec.stream.getTracks().forEach(t => t.stop())
    }
    rec.stop(); setIsRec(false); setRecElapsed(0)
  }

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    attachFile(file); e.target.value = ''
  }

  /* Sheet actions */
  const sheetActions: SheetAction[] = [
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>,
      label: 'Camera', bg: '#6366f1', onClick: () => cameraRef.current?.click(),
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
      label: 'Gallery', bg: '#0ea5e9', onClick: () => fileRef.current?.click(),
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
      label: 'Document', bg: '#f59e0b', onClick: () => fileRef.current?.click(),
    },
  ]

  const decryptedText = useDecrypted(replyTo?.id)

  const charCount = text.length
  const overLimit = charCount > MAX_CHARS
  const nearLimit = charCount > WARN_CHARS
  const canSend = (text.trim().length > 0 || !!attFile) && !overLimit

  return (
    <>
      <div
        onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
        className={[styles.root, dragOver ? styles.rootDrag : ''].filter(Boolean).join(' ')}
      >
        {dragOver && <div className={styles.dragOverlay}>📎 Drop to attach</div>}

        {isEditing && (
          <div className={styles.editBanner}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            <span className={styles.editText}>Editing — <kbd className={styles.editKbd}>Enter</kbd> to save</span>
            <button onClick={onCancelEdit} className={styles.editCancel}>Cancel</button>
          </div>
        )}

        {replyTo && !isEditing && (
          <div className={styles.replyPreview}>
            <div className={styles.replyBar} />
            <div className={styles.replyInner}>
              <div className={styles.replyName}>↩ {replyTo.senderName}</div>
              <div className={styles.replyText}>{decryptedText}</div>
            </div>
            <button onClick={(e) => {
              e.preventDefault();
              setReplyTo(null)
            }} className={styles.dismissBtn}>✕</button>
          </div>
        )}

        {attFile && (
          <div className={styles.attPreview}>
            {attPreview
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={attPreview} alt="" className={styles.attThumb} />
              : <span className={styles.attIconBox}>{attType === 'video' ? <Icon.Camera /> : <Icon.File />}</span>
            }
            <div className={styles.attInfo}>
              <div className={styles.attName}>{attFile.name}</div>
              <div className={styles.attMeta}>{(attFile.size / 1024).toFixed(1)} KB · {attType}</div>
            </div>
            <button onClick={() => { setAttachment(null, ""); setAttPreview(null) }} className={styles.attRemove}>✕</button>
          </div>
        )}

        {isRec && (
          <VoiceBar elapsed={recElapsed} onStop={() => stopRec(true)} onCancel={() => stopRec(false)} />
        )}

        {!isRec && (
          <div className={styles.inputRow}>
            <IBtn
              icon={<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l8.57-8.57A4 4 0 1118 8.84l-8.59 8.57a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>}
              onClick={mobile ? () => setSheetOpen(true) : () => fileRef.current?.click()}
              title="Attach"
            />

            {!mobile && onPoll && (
              <IBtn
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>}
                onClick={onPoll} title="Poll"
              />
            )}

            <div className={styles.textareaWrap}>
              <textarea
                ref={textareaRef}
                placeholder={isEditing ? 'Edit message…' : 'Message…'}
                value={text}
                rows={1}

                className={[styles.textarea, isEditing ? styles.textareaEdit : '', overLimit ? styles.textareaOver : ''].filter(Boolean).join(' ')}
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
                <IBtn
                  icon={<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>}
                  onClick={startRec} title="Voice"
                />
              ) : (
                <button
                  onClick={handleSend} disabled={!canSend}
                  className={[styles.sendBtn, isEditing ? styles.sendEdit : '', !canSend ? styles.sendDisabled : ''].filter(Boolean).join(' ')}
                >
                  {isEditing
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
                  }
                </button>
              )
            }
          </div>
        )}

        {!mobile && !isRec && !isEditing && (
          <div className={styles.hint}>Enter ↵ send · Shift+Enter newline</div>
        )}

        <input ref={fileRef} type="file" accept="image/*,video/*,audio/*,.pdf,.zip,.txt,.doc,.docx,.xls,.xlsx" style={{ display: 'none' }} onChange={onFileSelect} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onFileSelect} />
      </div>
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} actions={sheetActions} />
    </>
  )
}