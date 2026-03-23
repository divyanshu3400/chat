'use client'

import {
  useCallback, useMemo, useRef, useState, useTransition, useEffect,
} from 'react'
import { useStore, useChatMessages, useTyping, useUploads, usePagination } from '@/lib/store'
import {
  get, limitToLast, onValue, orderByChild, push, query, ref,
  serverTimestamp, set, startAfter, update, type Unsubscribe,
} from 'firebase/database'
import { getDownloadURL, uploadBytesResumable, ref as sref } from 'firebase/storage'
import { getFirebaseDB, getFirebaseStorage } from '@/lib/firebase'
import { mdRender, fmtTime, fmtBytes, sameDay, dateSep, stripUndefined } from '@/lib/utils'

import type { Conversation, Message } from '@/types'
import { Crypto } from '@/lib/crypto'
import { DateSep, EncryptionBanner, Lightbox, MessageBubble, ReactorSheet, TypingIndicator, UploadBubble } from './Bubbles'
import InputBar from './InputBar'
import { CtxMenu } from '../shared/CtxMenu'

const PAGE_SIZE = 40

interface Props { cid: string; conv: Conversation }

interface CtxTarget {
  x: number; y: number
  id: string; msg: Message
  isMine: boolean; text: string
}
interface ReactorSheetData { emoji: string; users: any[] }

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function ChatArea({ cid, conv }: Props) {
  /* ── Granular store slices — each re-renders ONLY when its own data changes ── */
  const me = useStore(s => s.me)
  const myKP = useStore(s => s.myKP)
  const prefs = useStore(s => s.prefs)

  // Actions — stable references, never cause re-renders
  const setMessages = useStore(s => s.setMessages)
  const prependMessages = useStore(s => s.prependMessages)
  const setDecrypted = useStore(s => s.setDecrypted)
  const setTyping = useStore(s => s.setTyping)
  const addUpload = useStore(s => s.addUpload)
  const updateUpload = useStore(s => s.updateUpload)
  const removeUpload = useStore(s => s.removeUpload)
  const setHasMore = useStore(s => s.setHasMore)
  const setOldestTs = useStore(s => s.setOldestTs)
  const showToast = useStore(s => s.showToast)
  const sharedKeys = useStore(s => s.sharedKeys)
  const setSharedKey = useStore(s => s.setSharedKey)
  const setReplyTo = useStore(s => s.setReplyTo)
  const replyTo = useStore(s => s.replyTo)
  const setAttachment = useStore(s => s.setAttachment)
  const attFile = useStore(s => s.attFile)
  const editMsgId = useStore(s => s.editMsgId)
  const setEditMsgId = useStore(s => s.setEditMsgId)

  // Per-cid data — these hooks only re-render when this cid's data changes
  const messages = useChatMessages(cid)
  const typingNames = useTyping(cid)
  const uploads = useUploads()
  const { hasMore, oldestTs } = usePagination(cid)

  /* ── Local UI state (intentionally NOT in store) ── */
  const [ctxMenu, setCtxMenu] = useState<CtxTarget | null>(null)
  const [reactorSheet, setReactorSheet] = useState<ReactorSheetData | null>(null)
  const [lightbox, setLightbox] = useState<{ url: string; type: 'image' | 'video' } | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showScrollFab, setShowScrollFab] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // Swipe stays local — fires at 60fps, must NOT go to global store
  const [swipeX, setSwipeX] = useState(0)
  const [swipeMsgId, setSwipeMsgId] = useState<string | null>(null)

  const msgsRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<{ x: number; y: number; msgId: string | null }>({ x: 0, y: 0, msgId: null })
  const rafRef = useRef<number>(0)   // for scroll throttle
  const [, startTransition] = useTransition()

  const isGroup = !!conv.isGroup
  const peerUid = conv.otherUid

  /* ── SHARED KEY ── */
  const getSK = useCallback(async () => {
    if (!peerUid || !myKP || isGroup) return null
    if (sharedKeys[cid]) return sharedKeys[cid]
    const db = getFirebaseDB()
    const snap = await get(ref(db, `pubkeys/${peerUid}`))
    if (!snap.exists()) return null
    const tp = await Crypto.importPub(snap.val().pubkey)
    const sk = await Crypto.derive(myKP.privateKey, tp)
    setSharedKey(cid, sk)
    return sk
  }, [cid, peerUid, myKP, sharedKeys, isGroup, setSharedKey])

  /* ── DECRYPT BATCH ── */
  const decryptBatch = useCallback(async (
    pairs: [string, Message][],
    sk: CryptoKey | null,
  ): Promise<Record<string, string>> => {
    const out: Record<string, string> = {}
    await Promise.all(pairs.map(async ([id, msg]) => {
      if (msg.encrypted && sk && !isGroup) {
        out[id] = await Crypto.dec(sk, msg.text ?? '')
      } else {
        out[id] = mdRender(msg.text ?? '')
      }
    }))
    return out
  }, [isGroup])

  /* ── REALTIME LISTENER ── */
  useEffect(() => {
    const db = getFirebaseDB()
    const mq = query(ref(db, `messages/${cid}`), orderByChild('ts'), limitToLast(PAGE_SIZE))
    let sk: CryptoKey | null = null
    getSK().then(k => { sk = k })

    const unsub: Unsubscribe = onValue(mq, async snap => {
      const raw = (snap.val() ?? {}) as Record<string, Message>
      const sorted = Object.entries(raw)
        .sort((a, b) => ((a[1].ts ?? 0) as number) - ((b[1].ts ?? 0) as number))

      if (sorted.length > 0) {
        setOldestTs(cid, (sorted[0][1].ts ?? 0) as number)
      }

      // Batch store writes with lower priority — won't block input
      startTransition(() => setMessages(cid, sorted))

      const dec = await decryptBatch(sorted, sk)
      // setDecrypted only writes keys that actually changed (built into store)
      startTransition(() => setDecrypted(dec))

      const unread = sorted.filter(([, m]) => m.uid !== me?.uid && m.status !== 'read')
      setUnreadCount(unread.length)

      if (prefs.readReceipts && me) {
        unread.forEach(([id]) =>
          update(ref(db, `messages/${cid}/${id}`), { status: 'read' })
        )
      }
      if (me) update(ref(db, `conversations/${me.uid}/${cid}`), { unread: 0 })

      if (msgsRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = msgsRef.current
        if (scrollHeight - scrollTop - clientHeight < 160) scrollBottom(false)
      }
    })

    // Typing listener
    const typRef = ref(db, `typing/${cid}`)
    const typUnsub: Unsubscribe = onValue(typRef, snap => {
      const data = (snap.val() ?? {}) as Record<string, { typing: boolean; name?: string }>
      const names = Object.entries(data)
        .filter(([uid, v]) => uid !== me?.uid && v?.typing)
        .map(([, v]) => v.name ?? 'Someone')
      setTyping(cid, names)   // store skips write if names didn't change
    })

    return () => { unsub(); typUnsub() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid, me?.uid])

  /* ── LOAD MORE (pagination) ── */
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !oldestTs) return
    setLoadingMore(true)
    const db = getFirebaseDB()
    const snap = await get(
      query(
        ref(db, `messages/${cid}`),
        orderByChild('ts'),
        limitToLast(PAGE_SIZE + 1),
        startAfter(null, `${oldestTs - 1}`)
      )
    )
    const raw = (snap.val() ?? {}) as Record<string, Message>
    const sorted = Object.entries(raw)
      .sort((a, b) => ((a[1].ts ?? 0) as number) - ((b[1].ts ?? 0) as number))

    if (sorted.length <= 1) {
      setHasMore(cid, false)
      setLoadingMore(false)
      return
    }
    setOldestTs(cid, (sorted[0][1].ts ?? 0) as number)

    const sk = await getSK()
    const dec = await decryptBatch(sorted, sk)

    startTransition(() => {
      prependMessages(cid, sorted)   // store deduplicates automatically
      setDecrypted(dec)
    })
    setLoadingMore(false)
  }, [cid, loadingMore, hasMore, oldestTs, getSK, decryptBatch, prependMessages, setDecrypted, setHasMore, setOldestTs])

  /* ── SCROLL (RAF-throttled — was firing setState on every pixel) ── */
  const scrollBottom = useCallback((smooth = true) => {
    setTimeout(() => {
      msgsRef.current?.scrollTo({
        top: msgsRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'instant',
      })
    }, 40)
  }, [])

  const onScroll = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const el = msgsRef.current
      if (!el) return
      const { scrollTop, scrollHeight, clientHeight } = el
      const distFromBottom = scrollHeight - scrollTop - clientHeight
      setShowScrollFab(distFromBottom > 250)
      if (scrollTop < 80) loadMore()
    })
  }, [])

  /* ── SWIPE TO REPLY ── */
  const onMsgTouchStart = useCallback((e: React.TouchEvent, msgId: string) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, msgId }
  }, [])

  const onMsgTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartRef.current.x
    const dy = Math.abs(e.touches[0].clientY - touchStartRef.current.y)
    if (dy > 20) return
    if (Math.abs(dx) > 8) {
      setSwipeX(dx)
      setSwipeMsgId(touchStartRef.current.msgId)
    }
  }, [])

  const onMsgTouchEnd = useCallback(() => {
    if (Math.abs(swipeX) > 55 && swipeMsgId) {
      const found = messages.find(([id]) => id === swipeMsgId)
      if (found) {
        const [, msg] = found
        const text = msg.text ?? ''
        setReplyTo({ id: swipeMsgId, type: msg.type, mediaThumb: msg.thumbnailUrl, text: msg.fileName || text.substring(0, 60), senderName: msg.senderName ?? 'User' })
        showToast('Replying…')
      }
    }
    setSwipeX(0)
    setSwipeMsgId(null)
  }, [swipeX, swipeMsgId, messages, setReplyTo, showToast])

  /* ── SEND ── */
  const sendMsg = useCallback(async (text: string) => {
    if (!me) return
    const db = getFirebaseDB()
    const stor = getFirebaseStorage()

    // ── Attachment upload ──
    if (attFile) {
      const type = attFile.type.startsWith('image/') ? 'image'
        : attFile.type.startsWith('video/') ? 'video'
          : attFile.type.startsWith('audio/') ? 'audio'
            : 'file'
      const preview = type === 'image' ? URL.createObjectURL(attFile) : undefined
      const entryId = `upload_${Date.now()}`
      const storRef = sref(stor, `messages/${cid}/${Date.now()}_${attFile.name}`)
      const task = uploadBytesResumable(storRef, attFile)

      addUpload({ id: entryId, file: attFile, task, progress: 0, status: 'uploading', preview })
      setAttachment(null, null)

      task.on(
        'state_changed',
        snap => updateUpload(entryId, {
          progress: Math.round(snap.bytesTransferred / snap.totalBytes * 100),
        }),
        () => updateUpload(entryId, { status: 'failed' }),
        async () => {
          const url = await getDownloadURL(task.snapshot.ref)
          const msgData: Partial<Message> = {
            uid: me.uid, senderName: me.displayName, senderPhoto: me.photoURL,
            type, url, ts: Date.now() as any, status: 'sent',
            ...(type === 'file' ? { fileName: attFile.name, fileSize: fmtBytes(attFile.size) } : {}),
            ...(replyTo ? { replyTo } : {}),
          }
          push(ref(db, `messages/${cid}`), msgData)
          const lastMsg = `[${type}]`
          update(ref(db, `conversations/${me.uid}/${cid}`), { lastMsg, updatedAt: serverTimestamp() })
          if (peerUid) update(ref(db, `conversations/${peerUid}/${cid}`), { lastMsg, updatedAt: serverTimestamp() })
          removeUpload(entryId)
          if (preview) URL.revokeObjectURL(preview)
          showToast('Sent ✓')
          setReplyTo(null)
        }
      )
      return
    }

    if (!text.trim()) return

    // ── Encrypt DMs ──
    let finalText = text
    let encrypted = false
    if (!isGroup && peerUid) {
      const sk = await getSK()
      if (sk) { finalText = await Crypto.enc(sk, text); encrypted = true }
    }

    // ── Edit existing message ──
    if (editMsgId) {
      update(ref(db, `messages/${cid}/${editMsgId}`), { text: finalText, edited: true, editedAt: Date.now() })
      setEditMsgId(null)
      showToast('Edited ✓')
      return
    }

    // ── Optimistic insert ──
    const tempId = `temp_${Date.now()}`
    const msgData: Message = {
      uid: me.uid, senderName: me.displayName, senderPhoto: me.photoURL ?? '',
      text: finalText, type: 'text', encrypted,
      ts: Date.now() as any, status: 'sending',
      ...(replyTo ? { replyTo } : {}),
    }
    // Write directly to store without going through Firebase round-trip
    startTransition(() => {
      setMessages(cid, [...messages, [tempId, msgData]])
      setDecrypted({ [tempId]: mdRender(text) })
    })
    scrollBottom()
    setReplyTo(null)

    // ── Persist ──
    const newRef = push(ref(db, `messages/${cid}`))
    await set(newRef, stripUndefined({ ...msgData, ts: serverTimestamp(), status: 'sent' }))
    const preview = encrypted ? '🔐 Encrypted message' : text.substring(0, 60)
    update(ref(db, `conversations/${me.uid}/${cid}`), { lastMsg: preview, updatedAt: serverTimestamp() })
    if (peerUid) update(ref(db, `conversations/${peerUid}/${cid}`), { lastMsg: preview, updatedAt: serverTimestamp() })
    update(ref(db, `typing/${cid}`), { [me.uid]: { typing: false } })
  }, [
    me, cid, peerUid, isGroup, attFile, replyTo, editMsgId, messages,
    getSK, addUpload, updateUpload, removeUpload, setAttachment,
    setReplyTo, setEditMsgId, setMessages, setDecrypted, showToast, scrollBottom,
  ])

  /* ── VOICE ── */
  const sendVoice = useCallback(async (blob: Blob, dur: string) => {
    if (!me) return
    const stor = getFirebaseStorage()
    const db = getFirebaseDB()
    const entryId = `upload_voice_${Date.now()}`
    const storRef = sref(stor, `voice/${cid}/${Date.now()}.webm`)
    const task = uploadBytesResumable(storRef, blob)

    addUpload({ id: entryId, file: new File([blob], 'voice.webm'), task, progress: 0, status: 'uploading' })

    task.on(
      'state_changed',
      snap => updateUpload(entryId, { progress: Math.round(snap.bytesTransferred / snap.totalBytes * 100) }),
      () => updateUpload(entryId, { status: 'failed' }),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        push(ref(db, `messages/${cid}`), {
          uid: me.uid, senderName: me.displayName, senderPhoto: me.photoURL,
          type: 'audio', url, duration: dur, ts: serverTimestamp(), status: 'sent',
        })
        const lastMsg = '🎙 Voice message'
        update(ref(db, `conversations/${me.uid}/${cid}`), { lastMsg, updatedAt: serverTimestamp() })
        if (peerUid) update(ref(db, `conversations/${peerUid}/${cid}`), { lastMsg, updatedAt: serverTimestamp() })
        removeUpload(entryId)
      }
    )
  }, [me, cid, peerUid, addUpload, updateUpload, removeUpload])

  /* ── REACTIONS ── */
  const addReaction = useCallback(async (msgId: string, emoji: string) => {
    if (!me) return
    const db = getFirebaseDB()
    const snap = await get(ref(db, `messages/${cid}/${msgId}/reactions/${me.uid}`))
    update(ref(db, `messages/${cid}/${msgId}/reactions`), {
      [me.uid]: snap.val() === emoji ? null : emoji,
    })
  }, [me, cid])

  /* ── DELETE ── */
  const deleteMsg = useCallback(async (msgId: string) => {
    update(ref(getFirebaseDB(), `messages/${cid}/${msgId}`), {
      deleted: true, text: '', type: 'text',
    })
    showToast('Deleted')
  }, [cid, showToast])

  /* ── TYPING ── */
  const onTyping = useCallback(() => {
    if (!me) return
    const db = getFirebaseDB()
    update(ref(db, `typing/${cid}`), { [me.uid]: { typing: true, name: me.displayName } })
    clearTimeout((window as any)._typTimer)
      ; (window as any)._typTimer = setTimeout(() => {
        update(ref(db, `typing/${cid}`), { [me.uid]: { typing: false } })
      }, 2000)
  }, [me, cid])

  /* ── CTX ACTIONS ── */
  const handleCtxAction = useCallback((action: string) => {
    if (!ctxMenu) return
    const { id, msg, text } = ctxMenu
    switch (action) {
      case 'reply': setReplyTo({ id, type: msg.type, mediaThumb: msg.thumbnailUrl, text: msg.fileName || text.substring(0, 60), senderName: msg.senderName ?? 'User' }); break
      case 'react': showToast('Double-tap the message to react'); break
      case 'star': showToast('Starred ⭐'); break
      case 'copy': navigator.clipboard?.writeText(text); showToast('Copied!'); break
      case 'forward': showToast('Forward coming soon'); break
      case 'info': showToast(`Sent ${fmtTime(msg.ts as number)}  ·  Status: ${msg.status ?? 'sent'}`); break
      case 'edit': setEditMsgId(id); showToast('Editing — press Enter to save'); break
      case 'delete': deleteMsg(id); break
      case 'report': showToast('Reported'); break
    }
    setCtxMenu(null)
  }, [ctxMenu, setReplyTo, setEditMsgId, deleteMsg, showToast])

  /* ── SCROLL TO MESSAGE ── */
  const onScrollTo = useCallback((msgId: string) => {
    const el = document.getElementById(`mg_${msgId}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('msg-flash')
    setTimeout(() => el.classList.remove('msg-flash'), 900)
  }, [])

  /* ── LIGHTBOX HANDLER ── */
  const onLightbox = useCallback((url: string, type?: 'image' | 'video') => {
    setLightbox({ url, type: type ?? 'image' })
  }, [])

  /* ── GROUPED MESSAGES (memoized — only recomputes when messages array changes) ── */
  const grouped = useMemo(() => {
    type Item =
      | { kind: 'sep'; label: string; key: string }
      | { kind: 'msg'; id: string; msg: Message; isFirst: boolean; isLast: boolean }

    const items: Item[] = []
    for (let i = 0; i < messages.length; i++) {
      const [id, msg] = messages[i]
      const [, prevMsg] = messages[i - 1] ?? []
      const [, nextMsg] = messages[i + 1] ?? []
      const ts = (msg.ts ?? 0) as number
      const prevTs = prevMsg ? (prevMsg.ts ?? 0) as number : 0

      if (i === 0 || !sameDay(ts, prevTs)) {
        items.push({ kind: 'sep', label: dateSep(ts), key: `sep_${id}` })
      }

      const sameAsPrev = prevMsg && prevMsg.uid === msg.uid && sameDay(ts, prevTs) && (ts - prevTs) < 120_000
      const sameAsNext = nextMsg && nextMsg.uid === msg.uid && sameDay(ts, (nextMsg.ts ?? 0) as number) && ((nextMsg.ts ?? 0) as number - ts) < 120_000

      items.push({ kind: 'msg', id, msg, isFirst: !sameAsPrev, isLast: !sameAsNext })
    }
    return items
  }, [messages])

  /* ═══════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{`
        @keyframes typBounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
        @keyframes ctxIn { from{opacity:0;transform:scale(.95) translateY(-4px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes panelUp { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes msgFlash { 0%,100%{background:transparent} 30%{background:rgba(99,102,241,.18)} }
        .msg-flash { animation: msgFlash .8s ease; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: var(--bd2); border-radius: 2px; }
      `}</style>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, position: 'relative' }}>

        {/* ── MESSAGE LIST ── */}
        <div
          ref={msgsRef}
          onScroll={onScroll}
          onClick={() => setCtxMenu(null)}
          style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0, overscrollBehavior: 'contain' }}
        >
          {/* Pagination indicators */}
          {loadingMore && (
            <div style={{ textAlign: 'center', padding: 12, fontSize: 12, color: 'var(--tx3)', fontFamily: 'var(--mono)' }}>
              Loading older messages…
            </div>
          )}
          {!hasMore && messages.length >= PAGE_SIZE && (
            <div style={{ textAlign: 'center', padding: 12, fontSize: 11, color: 'var(--tx3)', fontFamily: 'var(--mono)' }}>
              — Beginning of conversation —
            </div>
          )}

          {messages.length < 3 && <EncryptionBanner isGroup={isGroup} />}

          {messages.length === 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--tx3)', gap: 12, padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 52, opacity: .4 }}>💬</div>
              <div style={{ fontSize: 14, color: 'var(--tx2)', fontWeight: 600 }}>No messages yet</div>
              <div style={{ fontSize: 12, fontFamily: 'var(--mono)', lineHeight: 1.7 }}>
                Send a message to start the conversation.<br />
                Everything is end-to-end encrypted.
              </div>
            </div>
          )}

          {/* Touch handlers on the container, not each bubble */}
          <div
            onTouchStart={e => {
              const target = (e.target as HTMLElement).closest('[data-msgid]') as HTMLElement | null
              if (target) onMsgTouchStart(e, target.dataset.msgid!)
            }}
            onTouchMove={onMsgTouchMove}
            onTouchEnd={onMsgTouchEnd}
          >
            {grouped.map(item => {
              if (item.kind === 'sep') return <DateSep key={item.key} label={item.label} />
              const { id, msg, isFirst, isLast } = item
              return (
                <div key={id} data-msgid={id}>
                  <MessageBubble
                    id={id}
                    msg={msg}
                    isMine={msg.uid === me?.uid}
                    isGroup={isGroup}
                    isFirst={isFirst}
                    isLast={isLast}
                    cid={cid}
                    onCtx={(e, id, msg, isMine, text) => {
                      setCtxMenu({
                        x: Math.min(e.clientX, window.innerWidth - 195),
                        y: Math.min(e.clientY, window.innerHeight - 300),
                        id, msg, isMine, text,
                      })
                    }}
                    onReact={addReaction}
                    onShowReactors={(emoji, users) => setReactorSheet({ emoji, users })}
                    onScrollTo={onScrollTo}
                    onLightbox={onLightbox}
                    swipeX={swipeMsgId === id ? swipeX : 0}
                  />
                </div>
              )
            })}
          </div>

          {/* Uploads */}
          {uploads.map(entry => (
            <UploadBubble
              key={entry.id}
              entry={entry}
              onCancel={() => { entry.task.cancel(); removeUpload(entry.id) }}
            />
          ))}

          {/* Typing indicator */}
          {typingNames.length > 0 && <TypingIndicator names={typingNames} />}

          <div style={{ height: 4 }} />
        </div>

        {/* ── UNREAD JUMP ── */}
        {unreadCount > 2 && (
          <div
            onClick={() => { scrollBottom(); setUnreadCount(0) }}
            style={{
              position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
              background: 'var(--ac)', color: '#000',
              padding: '7px 18px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 4px 16px var(--ac-glow)',
              display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none',
              zIndex: 10, animation: 'panelUp .3s ease',
            }}
          >
            ↓ {unreadCount} unread
          </div>
        )}

        {/* ── SCROLL FAB ── */}
        {showScrollFab && !unreadCount && (
          <button
            onClick={() => scrollBottom()}
            style={{
              position: 'absolute', bottom: 80, right: 16,
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--s2)', border: '1px solid var(--bd2)',
              color: 'var(--tx)', cursor: 'pointer', fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,.3)', zIndex: 10,
              animation: 'panelUp .25s ease',
            }}
          >↓</button>
        )}

        <InputBar
          onSend={sendMsg}
          onFile={f => setAttachment(f, f.type.startsWith('image/') ? 'image' : 'file')}
          onVoice={sendVoice}
          onTyping={onTyping}
          editingText={editMsgId ? '' : undefined}  // text is read via useDecrypted inside InputBar
          onCancelEdit={() => setEditMsgId(null)}
        />

        {ctxMenu && <CtxMenu ctx={ctxMenu} onAction={handleCtxAction} />}
      </div>

      {reactorSheet && <ReactorSheet sheet={reactorSheet} onClose={() => setReactorSheet(null)} />}
      {lightbox && <Lightbox url={lightbox.url} type={lightbox.type} onClose={() => setLightbox(null)} />}
    </>
  )
}