'use client'

/**
 * InputBar — Production-grade mobile-first message input
 * Styling: InputBar.module.css + globals.css tokens
 * Zero hardcoded colors — everything via CSS variables.
 */

import {
  useRef, useState, useEffect, useCallback,
  useMemo, memo, type KeyboardEvent, type DragEvent,
  type ClipboardEvent
} from 'react'
import { useStore } from '@/lib/store'
import styles from './InputBar.module.css'

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */
interface Props {
  onSend: (text: string) => void
  onFile: (file: File) => void
  onVoice: (blob: Blob, duration: string) => void
  onGif: (url: string) => void
  onPoll: (question: string, options: string[]) => void
  onTyping?: () => void
  editingText?: string
  onCancelEdit?: () => void
}

interface EmojiCategory { name: string; icon: string; emojis: string[] }

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════ */
const GIPHY_KEY = 'dc6zaTOxFJmzC'
const CLAUDE_API = 'https://api.anthropic.com/v1/messages'
const MAX_CHARS = 4000
const WARN_CHARS = 800

const AI_PROMPTS: Record<string, string> = {
  'Summarize': 'Summarize this in 2 sentences: ',
  'Fix grammar': 'Fix the grammar and spelling of: ',
  'Translate EN': 'Translate to English: ',
  'Make shorter': 'Make this more concise: ',
  'Make formal': 'Rewrite this in a formal tone: ',
  'Make casual': 'Rewrite this in a casual friendly tone: ',
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  { name: 'Smileys', icon: '😊', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '😘', '😗', '😙', '😚', '☺️', '🥲', '😋', '😛', '😜', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐'] },
  { name: 'Gestures', icon: '👋', emojis: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤙', '🤘', '🤟', '👈', '👉', '👆', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🫶', '🤲', '🙏', '✍️', '💪', '🦾', '🫵', '🫱', '🫲'] },
  { name: 'Hearts', icon: '❤️', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☯️', '♾️', '💢', '💥', '💫', '💦', '💨', '🕳️', '💬', '💭', '🗯️', '💤'] },
  { name: 'Animals', icon: '🐶', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐔', '🐧', '🐦', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'] },
  { name: 'Food', icon: '🍎', emojis: ['🍎', '🍊', '🍋', '🍇', '🍓', '🫐', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🫒', '🥑', '🍆', '🥦', '🧄', '🧅', '🌽', '🌶️', '🫑', '🥕', '🫚', '🫛', '🧆', '🥐', '🍞', '🥖', '🥨', '🧀', '🥚', '🧈', '🥞', '🧇', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯'] },
  { name: 'Travel', icon: '🚀', emojis: ['🚀', '✈️', '🛸', '🚁', '🛶', '⛵', '🚂', '🚗', '🏎️', '🚕', '🚙', '🛻', '🚌', '🏍️', '🛵', '🚲', '🛴', '🛺', '🚦', '🗺️', '🗼', '🗽', '🏰', '🏯', '🏟️', '🛕', '⛪', '🕌', '🛖', '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩', '🏪', '🏫', '🏭', '🗿', '🏔️', '🌋'] },
  { name: 'Objects', icon: '💡', emojis: ['💡', '🔦', '🕯️', '🪔', '🧱', '💎', '🔑', '🗝️', '🔒', '🔓', '🪤', '🧲', '⚙️', '🔧', '🔨', '🪛', '🔩', '🪜', '🧰', '🪝', '💊', '🩺', '🩻', '🩹', '🩼', '💉', '🩸', '🏷️', '🔖', '📎', '🖇️', '📌', '📍', '✂️', '🗃️', '🗄️', '📦', '📫', '📬', '📭', '📮', '📯'] },
  { name: 'Symbols', icon: '⭐', emojis: ['⭐', '🌟', '💥', '🔥', '🌈', '⚡', '❄️', '🌊', '🎆', '🎇', '✨', '🎉', '🎊', '🎈', '🎁', '🎀', '🪄', '🎯', '🎮', '🎲', '♟️', '🧩', '🪅', '🎭', '🖼️', '🎨', '🎪', '🎟️', '🎫', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🎗️'] },
]

/* ═══════════════════════════════════════════════════════════════
   EMOJI PICKER
═══════════════════════════════════════════════════════════════ */
const RECENT_KEY = 'cipher_recent_emoji'

const EmojiPicker = memo(({ onPick }: { onPick: (e: string) => void; onClose: () => void }) => {
  const [catIdx, setCatIdx] = useState(0)
  const [search, setSearch] = useState('')
  const [recent, setRecent] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] }
  })

  function pick(emoji: string) {
    onPick(emoji)
    const updated = [emoji, ...recent.filter(e => e !== emoji)].slice(0, 30)
    setRecent(updated)
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
  }

  const filtered = useMemo(() => {
    if (!search) return null
    return EMOJI_CATEGORIES.flatMap(c => c.emojis).slice(0, 48)
  }, [search])

  const display = search
    ? (filtered ?? [])
    : catIdx === -1
      ? recent
      : (EMOJI_CATEGORIES[catIdx]?.emojis ?? [])

  return (
    <div className={styles.emojiPickerWrap}>
      <div className={styles.emojiSearch}>
        <input
          autoFocus
          placeholder="🔍 Search emoji…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={styles.emojiSearchInput}
        />
      </div>

      {!search && (
        <div className={styles.emojiCats}>
          {recent.length > 0 && (
            <button
              onClick={() => setCatIdx(-1)}
              className={`${styles.emojiCatBtn} ${catIdx === -1 ? styles.emojiCatActive : ''}`}
              title="Recent"
            >🕐</button>
          )}
          {EMOJI_CATEGORIES.map((cat, i) => (
            <button
              key={cat.name}
              onClick={() => setCatIdx(i)}
              title={cat.name}
              className={`${styles.emojiCatBtn} ${catIdx === i ? styles.emojiCatActive : ''}`}
            >{cat.icon}</button>
          ))}
        </div>
      )}

      <div className={styles.emojiGrid}>
        {display.map((emoji, i) => (
          <button
            key={`${emoji}_${i}`}
            onClick={() => pick(emoji)}
            className={styles.emojiBtn}
          >{emoji}</button>
        ))}
      </div>
    </div>
  )
})
EmojiPicker.displayName = 'EmojiPicker'

/* ═══════════════════════════════════════════════════════════════
   VOICE RECORDING UI
═══════════════════════════════════════════════════════════════ */
const VoiceRecordingUI = memo(({ elapsed, onStop, onCancel }:
  { elapsed: number; onStop: () => void; onCancel: () => void }
) => {
  const bars = 24
  const s = elapsed % 60
  const m = Math.floor(elapsed / 60)
  const dur = `${m}:${s.toString().padStart(2, '0')}`

  return (
    <div className={styles.voiceWrap}>
      <div className={styles.voiceMicBtn}>🎙️</div>

      <div className={styles.voiceWave}>
        {Array.from({ length: bars }, (_, i) => (
          <div
            key={i}
            className={styles.voiceBar}
            style={{
              height: `${20 + Math.sin(Date.now() / 200 + i) * 12}px`,
              animationDelay: `${i * 40}ms`,
            }}
          />
        ))}
      </div>

      <span className={styles.voiceTimer}>{dur}</span>

      <button onClick={onCancel} className={styles.voiceCancelBtn}>
        Cancel
      </button>

      <button
        onClick={onStop}
        title="Send voice message"
        className={styles.voiceSendBtn}
      >↑</button>
    </div>
  )
})
VoiceRecordingUI.displayName = 'VoiceRecordingUI'

/* ═══════════════════════════════════════════════════════════════
   GIF PANEL
═══════════════════════════════════════════════════════════════ */
const GifPanel = memo(({ onPick, onClose }: { onPick: (url: string) => void; onClose: () => void }) => {
  const [query, setQuery] = useState('')
  const [gifs, setGifs] = useState<{ url: string; preview: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [trending, setTrending] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  async function load(q: string) {
    setLoading(true)
    try {
      const endpoint = q
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=15&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=15&rating=g`
      const res = await fetch(endpoint)
      const data = await res.json()
      setGifs((data.data ?? []).map((g: any) => ({
        url: g.images.downsized.url,
        preview: g.images.fixed_width_small.url,
      })))
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load('') }, [])

  function onSearch(q: string) {
    setQuery(q)
    clearTimeout(timerRef.current)
    setTrending(!q)
    timerRef.current = setTimeout(() => load(q), 400)
  }

  return (
    <div className={styles.gifWrap}>
      <div className={styles.gifHeader}>
        <input
          autoFocus
          placeholder={`🔍 ${trending ? 'Trending GIFs' : 'Search GIFs'}…`}
          value={query}
          onChange={e => onSearch(e.target.value)}
          className={styles.gifSearchInput}
        />
        <button onClick={onClose} className={styles.gifCloseBtn}>✕</button>
      </div>

      <div className={styles.gifGrid}>
        {loading
          ? Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={styles.gifSkeleton} />
          ))
          : gifs.map((g, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={g.preview}
              alt=""
              loading="lazy"
              onClick={() => { onPick(g.url); onClose() }}
              className={styles.gifItem}
            />
          ))
        }
      </div>
    </div>
  )
})
GifPanel.displayName = 'GifPanel'

/* ═══════════════════════════════════════════════════════════════
   POLL BUILDER
═══════════════════════════════════════════════════════════════ */
const PollBuilder = memo(({ onSend, onClose }: {
  onSend: (q: string, opts: string[]) => void
  onClose: () => void
}) => {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const optRefs = useRef<(HTMLInputElement | null)[]>([])

  function setOpt(i: number, val: string) {
    setOptions(prev => { const o = [...prev]; o[i] = val; return o })
  }
  function addOpt() {
    if (options.length >= 8) return
    setOptions(prev => [...prev, ''])
    setTimeout(() => optRefs.current[options.length]?.focus(), 60)
  }
  function removeOpt(i: number) {
    if (options.length <= 2) return
    setOptions(prev => prev.filter((_, idx) => idx !== i))
  }
  function handleSend() {
    const q = question.trim()
    const opts = options.map(o => o.trim()).filter(Boolean)
    if (!q || opts.length < 2) return
    onSend(q, opts)
    onClose()
  }

  const canSendPoll = question.trim() && options.filter(o => o.trim()).length >= 2

  return (
    <div className={styles.pollWrap}>
      <div className={styles.pollHeader}>
        <div className={styles.pollTitle}>📊 Create Poll</div>
        <button onClick={onClose} className={styles.pollCloseBtn}>✕</button>
      </div>

      <input
        autoFocus
        placeholder="Ask a question…"
        value={question}
        onChange={e => setQuestion(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') optRefs.current[0]?.focus() }}
        className={styles.pollQuestionInput}
      />

      {options.map((opt, i) => (
        <div key={i} className={styles.pollOptionRow}>
          <div className={styles.pollOptionNum}>{i + 1}</div>
          <input
            ref={el => { optRefs.current[i] = el }}
            placeholder={i < 2 ? `Option ${i + 1} (required)` : `Option ${i + 1}`}
            value={opt}
            onChange={e => setOpt(i, e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (i === options.length - 1) addOpt()
                else optRefs.current[i + 1]?.focus()
              }
            }}
            className={styles.pollOptionInput}
          />
          {options.length > 2 && (
            <button onClick={() => removeOpt(i)} className={styles.pollRemoveBtn}>✕</button>
          )}
        </div>
      ))}

      {options.length < 8 && (
        <button onClick={addOpt} className={styles.pollAddBtn}>
          ＋ Add option {options.length < 8 ? `(${8 - options.length} remaining)` : ''}
        </button>
      )}

      <button
        onClick={handleSend}
        disabled={!canSendPoll}
        className={styles.pollSendBtn}
      >
        Send Poll
      </button>
    </div>
  )
})
PollBuilder.displayName = 'PollBuilder'

/* ═══════════════════════════════════════════════════════════════
   AI COMMAND HANDLER
═══════════════════════════════════════════════════════════════ */
async function callClaude(prompt: string): Promise<string> {
  try {
    const res = await fetch(CLAUDE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    return data.content?.[0]?.text ?? 'No response.'
  } catch {
    return 'AI request failed. Check network.'
  }
}

/* ═══════════════════════════════════════════════════════════════
   ICON BUTTON  (IBtn)
═══════════════════════════════════════════════════════════════ */
const IBtn = memo(({ icon, onClick, active, title, danger }: {
  icon: React.ReactNode
  onClick: () => void
  active?: boolean
  title?: string
  danger?: boolean
}) => {
  const cls = [
    styles.iBtn,
    active && !danger ? styles.iBtnActive : '',
    danger ? styles.iBtnDanger : '',
  ].filter(Boolean).join(' ')

  return (
    <button onClick={onClick} title={title} className={cls}>
      {icon}
    </button>
  )
})
IBtn.displayName = 'IBtn'

/* ═══════════════════════════════════════════════════════════════
   MAIN INPUT BAR
═══════════════════════════════════════════════════════════════ */
export default function InputBar({
  onSend, onFile, onVoice, onGif, onPoll,
  onTyping, editingText, onCancelEdit,
}: Props) {
  const { replyTo, setReplyTo, attFile, attType, setAttachment } = useStore()

  const [text, setText] = useState('')
  const [gifOpen, setGifOpen] = useState(false)
  const [pollOpen, setPollOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [isRec, setIsRec] = useState(false)
  const [recElapsed, setRecElapsed] = useState(0)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiChips, setAiChips] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [attPreview, setAttPreview] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recStartRef = useRef(0)
  const recTickRef = useRef<ReturnType<typeof setInterval>>()
  const typTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const isEditing = editingText !== undefined

  /* ── PRE-FILL EDIT MODE ── */
  useEffect(() => {
    if (editingText !== undefined) {
      setText(editingText)
      setTimeout(() => { textareaRef.current?.focus(); autoResize() }, 60)
    }
  }, [editingText])

  /* ── ATTACHMENT PREVIEW ── */
  useEffect(() => {
    if (attFile && attType === 'image') {
      const url = URL.createObjectURL(attFile)
      setAttPreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setAttPreview(null)
  }, [attFile, attType])

  /* ── AUTO-RESIZE ── */
  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 130) + 'px'
  }

  /* ── TYPING INDICATOR ── */
  const fireTyping = useCallback(() => {
    onTyping?.()
    clearTimeout(typTimerRef.current)
  }, [onTyping])

  /* ── /ai COMMAND ── */
  function checkAiCommand(val: string) {
    setAiChips(val === '/ai' || val.startsWith('/ai ') ? Object.keys(AI_PROMPTS) : [])
  }

  async function applyAiChip(chip: string) {
    const userText = text.replace(/^\/ai\s*/, '').trim()
    const prompt = AI_PROMPTS[chip] + (userText || '…')
    setAiLoading(true)
    setAiChips([])
    const result = await callClaude(prompt)
    setText(result)
    setAiLoading(false)
    setTimeout(autoResize, 50)
    textareaRef.current?.focus()
  }

  /* ── SEND ── */
  function handleSend() {
    const t = text.trim()
    if (!t && !attFile) return
    try { navigator.vibrate?.(10) } catch { }
    onSend(t)
    setText('')
    setReplyTo(null)
    setAttachment(null, null)
    setAiChips([])
    setEmojiOpen(false)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  /* ── KEYBOARD ── */
  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    if (e.key === 'Escape') {
      if (isEditing) onCancelEdit?.()
      setEmojiOpen(false); setGifOpen(false); setPollOpen(false)
    }
  }

  /* ── PASTE IMAGE ── */
  function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
    if (item) {
      e.preventDefault()
      const file = item.getAsFile()
      if (file) { setAttachment(file, 'image'); onFile(file) }
    }
  }

  /* ── DRAG & DROP ── */
  function onDragOver(e: DragEvent) { e.preventDefault(); setDragOver(true) }
  function onDragLeave() { setDragOver(false) }
  function onDrop(e: DragEvent) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      setAttachment(file, file.type.startsWith('image/') ? 'image' : 'file')
      onFile(file)
    }
  }

  /* ── VOICE ── */
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
      recTickRef.current = setInterval(() => {
        setRecElapsed(Math.floor((Date.now() - recStartRef.current) / 1000))
      }, 500)
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
        onVoice(blob, `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`)
      }
      rec.stream.getTracks().forEach(t => t.stop())
    }
    rec.stop(); setIsRec(false); setRecElapsed(0)
  }

  /* ── EMOJI ── */
  function insertEmoji(emoji: string) {
    const el = textareaRef.current
    const start = el?.selectionStart ?? text.length
    const end = el?.selectionEnd ?? text.length
    const next = text.slice(0, start) + emoji + text.slice(end)
    setText(next)
    setTimeout(() => {
      el?.setSelectionRange(start + emoji.length, start + emoji.length)
      el?.focus()
    }, 0)
  }

  /* ── FILE SELECT ── */
  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const type = file.type.startsWith('image/') ? 'image'
      : file.type.startsWith('video/') ? 'video'
        : 'file'
    setAttachment(file, type)
    onFile(file)
    e.target.value = ''
  }

  /* ── DERIVED STATE ── */
  const charCount = text.length
  const overLimit = charCount > MAX_CHARS
  const nearLimit = charCount > WARN_CHARS
  const canSend = (text.trim().length > 0 || !!attFile) && !overLimit && !aiLoading

  /* ── PANEL TOGGLES ── */
  function toggleGif() { setGifOpen(g => { if (!g) { setPollOpen(false); setEmojiOpen(false) } return !g }) }
  function togglePoll() { setPollOpen(p => { if (!p) { setGifOpen(false); setEmojiOpen(false) } return !p }) }
  function toggleEmoji() { setEmojiOpen(e => { if (!e) { setGifOpen(false); setPollOpen(false) } return !e }) }

  /* ── TEXTAREA CSS CLASSES ── */
  const textareaClass = [
    styles.textarea,
    isEditing ? styles.textareaEdit : '',
    overLimit ? styles.textareaOverLimit : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`${styles.root} ${dragOver ? styles.rootDrag : ''}`}
    >
      {/* Drag overlay */}
      {dragOver && (
        <div className={styles.dragOverlay}>
          📎 Drop file to attach
        </div>
      )}

      {/* Edit mode banner */}
      {isEditing && (
        <div className={styles.editBanner}>
          <span style={{ fontSize: 14 }}>✏️</span>
          <span className={styles.editBannerText}>
            Editing message — press{' '}
            <kbd className={styles.editBannerKbd}>Enter</kbd>
            {' '}to save
          </span>
          <button onClick={onCancelEdit} className={styles.editBannerCancel}>
            Cancel
          </button>
        </div>
      )}

      {/* Reply preview */}
      {replyTo && !isEditing && (
        <div className={styles.replyPreview}>
          <div className={styles.replyPreviewInner}>
            <div className={styles.replyLabel}>↩ Replying to {replyTo.senderName}</div>
            <div className={styles.replyText}>{replyTo.text}</div>
          </div>
          <button onClick={() => setReplyTo(null)} className={styles.dismissBtn}>✕</button>
        </div>
      )}

      {/* Attachment preview */}
      {attFile && (
        <div className={styles.attPreview}>
          {attPreview
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={attPreview} alt="" className={styles.attThumb} />
            : (
              <div className={styles.attIcon}>
                {attType === 'video' ? '🎥' : attType === 'audio' ? '🎙️' : '📎'}
              </div>
            )
          }
          <div className={styles.attInfo}>
            <div className={styles.attName}>{attFile.name}</div>
            <div className={styles.attMeta}>
              {(attFile.size / 1024).toFixed(1)} KB · {attType}
            </div>
          </div>
          <button
            onClick={() => setAttachment(null, null)}
            className={styles.attRemove}
          >✕</button>
        </div>
      )}

      {/* GIF panel */}
      {gifOpen && <GifPanel onPick={onGif} onClose={() => setGifOpen(false)} />}
      {pollOpen && <PollBuilder onSend={onPoll} onClose={() => setPollOpen(false)} />}

      {/* AI chips */}
      {(aiChips.length > 0 || aiLoading) && (
        <div className={styles.aiChipsBar}>
          {aiLoading
            ? <span className={styles.aiThinkingLabel}>🤖 AI thinking…</span>
            : (
              <>
                <span className={styles.aiChipsLabel}>/ai →</span>
                {aiChips.map(chip => (
                  /* input-chip is a global class defined in globals.css */
                  <button key={chip} className="input-chip" onClick={() => applyAiChip(chip)}>
                    {chip}
                  </button>
                ))}
              </>
            )
          }
        </div>
      )}

      {/* Voice recording UI */}
      {isRec && (
        <VoiceRecordingUI
          elapsed={recElapsed}
          onStop={() => stopRec(true)}
          onCancel={() => stopRec(false)}
        />
      )}

      {/* Main input row */}
      {!isRec && (
        <div className={styles.inputRow}>
          {/* Left buttons */}
          <IBtn
            icon="📎"
            onClick={() => fileRef.current?.click()}
            title="Attach file (⌘U)"
          />
          <IBtn
            icon={<span style={{ fontSize: 11, fontWeight: 800, fontFamily: 'var(--mono)', letterSpacing: -0.5 }}>GIF</span>}
            onClick={toggleGif}
            active={gifOpen}
            title="Send GIF"
          />
          <IBtn
            icon="📊"
            onClick={togglePoll}
            active={pollOpen}
            title="Create poll"
          />

          {/* Textarea + emoji */}
          <div className={styles.textareaWrap}>
            <textarea
              ref={textareaRef}
              placeholder={isEditing ? 'Edit message…' : 'Message… (try /ai)'}
              value={text}
              onKeyDown={handleKey}
              onPaste={onPaste}
              onChange={e => {
                setText(e.target.value)
                autoResize()
                checkAiCommand(e.target.value)
                fireTyping()
              }}
              rows={1}
              className={textareaClass}
            />

            {/* Emoji toggle */}
            <button
              onClick={toggleEmoji}
              className={`${styles.emojiToggle} ${emojiOpen ? styles.emojiToggleActive : ''}`}
            >
              😊
            </button>

            {/* Emoji picker */}
            {emojiOpen && (
              <EmojiPicker
                onPick={insertEmoji}
                onClose={() => setEmojiOpen(false)}
              />
            )}
          </div>

          {/* Char count */}
          {nearLimit && (
            <div className={`${styles.charCount} ${overLimit ? styles.charCountOver : styles.charCountWarn}`}>
              {MAX_CHARS - charCount}
            </div>
          )}

          {/* Voice / Send */}
          {!text.trim() && !attFile && !isEditing
            ? (
              <IBtn
                icon="🎙️"
                onClick={startRec}
                title="Record voice"
                danger={isRec}
                active={isRec}
              />
            ) : (
              <button
                onClick={handleSend}
                disabled={!canSend}
                className={[
                  styles.sendBtn,
                  isEditing ? styles.sendBtnEdit : '',
                  !canSend ? styles.sendBtnDisabled : '',
                ].filter(Boolean).join(' ')}
              >
                {isEditing ? '✓' : '↑'}
              </button>
            )
          }
        </div>
      )}

      {/* Desktop hint */}
      {!isRec && !isEditing && (
        <div className={styles.hint}>
          <span className={styles.hintText}>
            Enter ↵ send · Shift+Enter newline · /ai commands
          </span>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*,audio/*,.pdf,.zip,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
        style={{ display: 'none' }}
        onChange={onFileSelect}
        multiple={false}
      />
    </div>
  )
}