'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'

import {
  useStore,
  useChatMessages,
  useTyping,
  useUploads,
  usePagination,
} from '@/src/store/store'
import type {
  ConversationState,
  MessageBundle,
  MessageStateItem,
  UsersRecord,
} from '@/src/store/store'
import { mdRender, fmtTime, fmtBytes, sameDay, dateSep } from '@/src/lib/utils'
import { Crypto } from '@/src/lib/crypto'
import { createChatService } from '@/src/services/pb-chat.service'
import { pb } from '@/src/lib/pb'

import {
  DateSep,
  EncryptionBanner,
  Lightbox,
  MessageBubble,
  ReactorSheet,
  TypingIndicator,
  UploadBubble,
} from './Bubbles'
import InputBar from './InputBar'
import { CtxMenu } from '../shared/CtxMenu'

type BubbleMessageView = {
  uid: string
  senderName: string
  senderPhoto: string
  text: string
  type: string
  url?: string
  fileName?: string
  fileSize?: string
  encrypted: boolean
  edited: boolean
  editedAt?: string
  deleted: boolean
  duration?: string
  replyTo?: {
    id: string
    text: string
    senderName: string
    type: string
    mediaThumb?: string
  }
  thumbnailUrl?: string
  ts: string
  status: string
  reactions: Record<string, string | null>
}

type Props = {
  cid: string
  conv: ConversationState
}

type CtxTarget = {
  x: number
  y: number
  id: string
  msg: BubbleMessageView
  isMine: boolean
  text: string
}

type ReactorSheetData = {
  emoji: string
  users: Array<{ id: string; name: string }>
}

const PAGE_SIZE = 40
const chatService = createChatService(pb)

function contentTypeFromFile(file: File): 'image' | 'video' | 'audio' | 'file' {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return 'file'
}

function attachmentTypeFromFile(file: File): 'image' | 'video' | 'audio' | 'document' {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return 'document'
}

function toEpoch(value?: string | null): number {
  if (!value) return 0
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : 0
}

function buildReactionsMap(bundle: MessageBundle): Record<string, string | null> {
  const map: Record<string, string | null> = {}
  for (const reaction of bundle.reactions) {
    if (reaction.user) {
      map[reaction.user] = reaction.emoji
    }
  }
  return map
}

function getFileUrl(
  record: { id: string; collectionId: string; collectionName: string },
  file?: string | null,
): string | undefined {
  if (!file) return undefined
  try {
    return pb.files.getURL(record, file).toString()
  } catch {
    return undefined
  }
}

function buildReplyPreview(
  bundle: MessageBundle,
  messages: MessageStateItem[],
  decryptedById: Record<string, string>,
): BubbleMessageView['replyTo'] {
  const repliedId = bundle.message.replied_to
  if (!repliedId) return undefined

  const target = messages.find((item) => item.message.id === repliedId)
  if (!target) {
    return {
      id: repliedId,
      text: 'Reply',
      senderName: 'Unknown',
      type: 'text',
    }
  }

  return {
    id: target.message.id,
    text: decryptedById[target.message.id] ?? target.message.content ?? '',
    senderName: target.message.sender ?? 'Unknown',
    type: target.message.content_type ?? 'text',
    mediaThumb: target.attachments[0]
      ? getFileUrl(target.attachments[0], target.attachments[0].thumbnail ?? target.attachments[0].file)
      : undefined,
  }
}

function getSenderName(
  me: UsersRecord | null,
  conv: ConversationState,
  messageSenderId: string | null,
  senderCache: Record<string, UsersRecord>,
): string {
  if (!messageSenderId) return 'Unknown'
  if (me?.id === messageSenderId) return me.name?.trim() || me.username || me.email
  if (conv.otherUser?.id === messageSenderId) {
    return conv.otherUser.name?.trim() || conv.otherUser.username || conv.otherUser.email
  }

  const cached = senderCache[messageSenderId]
  if (cached) {
    return cached.name?.trim() || cached.username || cached.email
  }

  return messageSenderId
}

function getSenderPhoto(
  me: UsersRecord | null,
  conv: ConversationState,
  messageSenderId: string | null,
  senderCache: Record<string, UsersRecord>,
): string {
  const sender =
    (messageSenderId && me?.id === messageSenderId ? me : null) ||
    (messageSenderId && conv.otherUser?.id === messageSenderId ? conv.otherUser : null) ||
    (messageSenderId ? senderCache[messageSenderId] : null)

  if (!sender?.avatar) return ''
  return getFileUrl(sender, sender.avatar) ?? ''
}

function buildBubbleMessage(
  bundle: MessageBundle,
  conv: ConversationState,
  me: UsersRecord | null,
  decryptedById: Record<string, string>,
  allMessages: MessageStateItem[],
  senderCache: Record<string, UsersRecord>,
): BubbleMessageView {
  const primaryAttachment = bundle.attachments[0]
  const contentType = bundle.message.content_type ?? 'text'
  const attachmentUrl = primaryAttachment
    ? getFileUrl(primaryAttachment, primaryAttachment.file)
    : undefined
  const thumbnailUrl = primaryAttachment
    ? getFileUrl(primaryAttachment, primaryAttachment.thumbnail ?? primaryAttachment.file)
    : undefined

  return {
    uid: bundle.message.sender ?? '',
    senderName: getSenderName(me, conv, bundle.message.sender, senderCache),
    senderPhoto: getSenderPhoto(me, conv, bundle.message.sender, senderCache),
    text: decryptedById[bundle.message.id] ?? mdRender(bundle.message.content ?? ''),
    type: contentType,
    url: attachmentUrl,
    fileName: primaryAttachment?.file_name ?? undefined,
    fileSize: primaryAttachment?.file_size ? fmtBytes(primaryAttachment.file_size) : undefined,
    encrypted: !!conv.otherUser && contentType === 'text',
    edited: !!bundle.message.is_edited,
    editedAt: bundle.message.edited_at ?? undefined,
    deleted: !!bundle.message.is_deleted,
    duration: primaryAttachment?.duration ? String(primaryAttachment.duration) : undefined,
    replyTo: buildReplyPreview(bundle, allMessages, decryptedById),
    thumbnailUrl,
    ts: bundle.message.created,
    status: bundle.message.status ?? 'sent',
    reactions: buildReactionsMap(bundle),
  }
}

export default function ChatArea({ cid, conv }: Props) {
  const me = useStore((state) => state.me)
  const myKP = useStore((state) => state.myKP)
  const sharedKeys = useStore((state) => state.sharedKeys)
  const setSharedKey = useStore((state) => state.setSharedKey)
  const setMessages = useStore((state) => state.setMessages)
  const prependMessages = useStore((state) => state.prependMessages)
  const patchMessage = useStore((state) => state.patchMessage)
  const setDecrypted = useStore((state) => state.setDecrypted)
  const setTyping = useStore((state) => state.setTyping)
  const addUpload = useStore((state) => state.addUpload)
  const updateUpload = useStore((state) => state.updateUpload)
  const removeUpload = useStore((state) => state.removeUpload)
  const setHasMore = useStore((state) => state.setHasMore)
  const setOldestTs = useStore((state) => state.setOldestTs)
  const showToast = useStore((state) => state.showToast)
  const setReplyTo = useStore((state) => state.setReplyTo)
  const replyTo = useStore((state) => state.replyTo)
  const setAttachment = useStore((state) => state.setAttachment)
  const attFile = useStore((state) => state.attFile)
  const editMsgId = useStore((state) => state.editMsgId)
  const setEditMsgId = useStore((state) => state.setEditMsgId)
  const decryptedById = useStore((state) => state.decryptedById)

  const messages = useChatMessages(cid)
  const typingRows = useTyping(cid)
  const uploads = useUploads()
  const { hasMore, oldestTs } = usePagination(cid)

  const [ctxMenu, setCtxMenu] = useState<CtxTarget | null>(null)
  const [reactorSheet, setReactorSheet] = useState<ReactorSheetData | null>(null)
  const [lightbox, setLightbox] = useState<{ url: string; type: 'image' | 'video' } | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showScrollFab, setShowScrollFab] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const [swipeMsgId, setSwipeMsgId] = useState<string | null>(null)
  const [senderCache, setSenderCache] = useState<Record<string, UsersRecord>>({})

  const msgsRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<{ x: number; y: number; msgId: string | null }>({
    x: 0,
    y: 0,
    msgId: null,
  })
  const rafRef = useRef<number>(0)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [, startTransition] = useTransition()

  const isGroup = conv.bundle.conversation.type === 'group'
  const peerUid = conv.otherUser?.id ?? null

  const getSK = useCallback(async (): Promise<CryptoKey | null> => {
    if (!peerUid || !myKP || isGroup) return null
    if (sharedKeys[cid]) return sharedKeys[cid]

    const rec = await pb.collection('pubkeys').getFirstListItem(`userId="${peerUid}"`).catch(() => null)
    if (!rec?.pubkey) return null

    const peerPublic = await Crypto.importPub(rec.pubkey)
    const sk = await Crypto.derive(myKP.privateKey, peerPublic)
    setSharedKey(cid, sk)
    return sk
  }, [cid, isGroup, myKP, peerUid, setSharedKey, sharedKeys])

  const decryptBatch = useCallback(async (
    rows: MessageStateItem[],
    sk: CryptoKey | null,
  ): Promise<Record<string, string>> => {
    const output: Record<string, string> = {}

    await Promise.all(
      rows.map(async (item) => {
        const content = item.message.content ?? ''
        if (!content) {
          output[item.message.id] = ''
          return
        }

        if (!isGroup && sk && item.message.content_type === 'text') {
          try {
            output[item.message.id] = await Crypto.dec(sk, content)
            return
          } catch {
            output[item.message.id] = mdRender(content)
            return
          }
        }

        output[item.message.id] = mdRender(content)
      }),
    )

    return output
  }, [isGroup])

  const hydrateBundles = useCallback(async (records: Array<{ id: string }>) => {
    return Promise.all(records.map((record) => chatService.getMessageBundle(record.id)))
  }, [])

  const resolveMissingSenders = useCallback(async (rows: MessageStateItem[]) => {
    const ids = Array.from(
      new Set(
        rows
          .map((item) => item.message.sender)
          .filter((id): id is string => !!id && !senderCache[id] && id !== me?.id && id !== conv.otherUser?.id),
      ),
    )

    if (ids.length === 0) {
      return
    }

    const fetched = await Promise.all(
      ids.map(async (id) => {
        const user = await chatService.services.users.getById(id).catch(() => null)
        return user ? [id, user] as const : null
      }),
    )

    const nextEntries = fetched.filter((entry): entry is readonly [string, UsersRecord] => !!entry)
    if (nextEntries.length === 0) {
      return
    }

    setSenderCache((current) => ({
      ...current,
      ...Object.fromEntries(nextEntries),
    }))
  }, [conv.otherUser?.id, me?.id, senderCache])

  const markRowsRead = useCallback(async (rows: MessageStateItem[]) => {
    if (!me) return

    const unread = rows.filter((item) => {
      if (item.message.sender === me.id) {
        return false
      }

      return !item.readReceipts.some((receipt) => receipt.user === me.id)
    })

    if (unread.length === 0) {
      return
    }

    setUnreadCount(unread.length)

    await Promise.all(
      unread.map((item) =>
        chatService.markAsRead({
          messageId: item.message.id,
          userId: me.id,
        }).catch(() => null),
      ),
    )
  }, [me])

  const scrollBottom = useCallback((smooth = true) => {
    setTimeout(() => {
      msgsRef.current?.scrollTo({
        top: msgsRef.current?.scrollHeight ?? 0,
        behavior: smooth ? 'smooth' : 'auto',
      })
    }, 40)
  }, [])

  const appendOrReplaceMessage = useCallback((bundle: MessageStateItem) => {
    const current = useStore.getState().messagesByCid[cid] ?? []
    const idx = current.findIndex((item) => item.message.id === bundle.message.id)
    const next =
      idx === -1
        ? [...current, bundle]
        : current.map((item) => (item.message.id === bundle.message.id ? bundle : item))

    setMessages(cid, next)
  }, [cid, setMessages])

  const bubbleMessages = useMemo(() => {
    return messages.map((bundle) => [
      bundle.message.id,
      buildBubbleMessage(bundle, conv, me, decryptedById, messages, senderCache),
    ] as const)
  }, [conv, decryptedById, me, messages, senderCache])

  const typingNames = useMemo(
    () => typingRows.map((row) => row.name?.trim() || 'Someone'),
    [typingRows],
  )

  const grouped = useMemo(() => {
    type Item =
      | { kind: 'sep'; label: string; key: string }
      | { kind: 'msg'; id: string; msg: BubbleMessageView; isFirst: boolean; isLast: boolean }

    const items: Item[] = []

    for (let index = 0; index < bubbleMessages.length; index += 1) {
      const [id, msg] = bubbleMessages[index]
      const [, prevMsg] = bubbleMessages[index - 1] ?? []
      const [, nextMsg] = bubbleMessages[index + 1] ?? []
      const ts = toEpoch(msg.ts)
      const prevTs = toEpoch(prevMsg?.ts)
      const nextTs = toEpoch(nextMsg?.ts)

      if (index === 0 || !sameDay(ts, prevTs)) {
        items.push({ kind: 'sep', label: dateSep(ts), key: `sep_${id}` })
      }

      const sameAsPrev =
        !!prevMsg &&
        prevMsg.uid === msg.uid &&
        sameDay(ts, prevTs) &&
        ts - prevTs < 120_000

      const sameAsNext =
        !!nextMsg &&
        nextMsg.uid === msg.uid &&
        sameDay(ts, nextTs) &&
        nextTs - ts < 120_000

      items.push({
        kind: 'msg',
        id,
        msg,
        isFirst: !sameAsPrev,
        isLast: !sameAsNext,
      })
    }

    return items
  }, [bubbleMessages])

  useEffect(() => {
    let cancelled = false

    async function loadInitial() {
      const sk = await getSK()
      const records = await chatService.listMessages(cid, {
        batch: PAGE_SIZE,
      })

      const latest = [...records].reverse()
      const bundles = await hydrateBundles(latest)
      if (cancelled) return

      startTransition(() => {
        setMessages(cid, bundles)
      })

      const dec = await decryptBatch(bundles, sk)
      if (cancelled) return

      startTransition(() => {
        setDecrypted(dec)
      })

      if (bundles.length > 0) {
        setOldestTs(cid, toEpoch(bundles[0].message.created))
      }

      await resolveMissingSenders(bundles)
      await markRowsRead(bundles)

      if (!cancelled) {
        scrollBottom(false)
      }
    }

    void loadInitial()

    return () => {
      cancelled = true
    }
  }, [
    cid,
    decryptBatch,
    getSK,
    hydrateBundles,
    markRowsRead,
    resolveMissingSenders,
    scrollBottom,
    setDecrypted,
    setMessages,
    setOldestTs,
  ])

  useEffect(() => {
    let active = true
    let unsubMessages: (() => void) | null = null
    let unsubTyping: (() => void) | null = null

    async function attachRealtime() {
      unsubMessages = await chatService.subscribeMessages(cid, async (event) => {
        if (!active) return

        if (event.action === 'delete') {
          patchMessage(cid, event.record.id, {
            is_deleted: true,
            content: null,
            content_type: 'deleted',
          })
          return
        }

        const bundle = await chatService.getMessageBundle(event.record.id)
        const sk = await getSK()
        const dec = await decryptBatch([bundle], sk)

        startTransition(() => {
          appendOrReplaceMessage(bundle)
          setDecrypted(dec)
        })

        await resolveMissingSenders([bundle])

        if (event.action === 'create' && bundle.message.sender !== me?.id) {
          setUnreadCount((count) => count + 1)
          await markRowsRead([bundle])
          scrollBottom(false)
        }
      })

      unsubTyping = await chatService.subscribeTyping(cid, async () => {
        if (!active) return
        const rows = await chatService.listTyping(cid)
        const filtered = rows.filter((row) => row.user !== me?.id && row.is_typing)
        setTyping(cid, filtered)
      })
    }

    void attachRealtime()

    return () => {
      active = false
      unsubMessages?.()
      unsubTyping?.()
    }
  }, [
    appendOrReplaceMessage,
    cid,
    decryptBatch,
    getSK,
    markRowsRead,
    me?.id,
    patchMessage,
    resolveMissingSenders,
    scrollBottom,
    setDecrypted,
    setTyping,
  ])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !oldestTs) {
      return
    }

    setLoadingMore(true)
    const oldestIso = new Date(oldestTs - 1).toISOString()

    const olderRecords = await chatService.listMessages(cid, {
      filter: `conversation = "${cid}" && (is_deleted = false || is_deleted = null) && created < "${oldestIso}"`,
      sort: '-created',
      batch: PAGE_SIZE,
    })

    if (olderRecords.length === 0) {
      setHasMore(cid, false)
      setLoadingMore(false)
      return
    }

    const bundles = await hydrateBundles([...olderRecords].reverse())
    const sk = await getSK()
    const dec = await decryptBatch(bundles, sk)

    if (bundles.length < PAGE_SIZE) {
      setHasMore(cid, false)
    }

    setOldestTs(cid, toEpoch(bundles[0]?.message.created))
    startTransition(() => {
      prependMessages(cid, bundles)
      setDecrypted(dec)
    })

    await resolveMissingSenders(bundles)
    setLoadingMore(false)
  }, [
    cid,
    decryptBatch,
    getSK,
    hasMore,
    hydrateBundles,
    loadingMore,
    oldestTs,
    prependMessages,
    resolveMissingSenders,
    setDecrypted,
    setHasMore,
    setOldestTs,
  ])

  const onScroll = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const el = msgsRef.current
      if (!el) return

      const { scrollTop, scrollHeight, clientHeight } = el
      setShowScrollFab(scrollHeight - scrollTop - clientHeight > 250)
      if (scrollTop < 80) {
        void loadMore()
      }
    })
  }, [loadMore])

  const onMsgTouchStart = useCallback((event: React.TouchEvent, msgId: string) => {
    touchStartRef.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
      msgId,
    }
  }, [])

  const onMsgTouchMove = useCallback((event: React.TouchEvent) => {
    const dx = event.touches[0].clientX - touchStartRef.current.x
    const dy = Math.abs(event.touches[0].clientY - touchStartRef.current.y)
    if (dy > 20) return

    if (Math.abs(dx) > 8) {
      setSwipeX(dx)
      setSwipeMsgId(touchStartRef.current.msgId)
    }
  }, [])

  const onMsgTouchEnd = useCallback(() => {
    if (Math.abs(swipeX) > 55 && swipeMsgId) {
      const found = bubbleMessages.find(([id]) => id === swipeMsgId)
      if (found) {
        const [, msg] = found
        setReplyTo({
          messageId: swipeMsgId,
          conversationId: cid,
        })
        showToast(`Replying to ${msg.senderName}`)
      }
    }

    setSwipeX(0)
    setSwipeMsgId(null)
  }, [bubbleMessages, cid, setReplyTo, showToast, swipeMsgId, swipeX])

  const sendMsg = useCallback(async (text: string) => {
    if (!me) return
    if (!text.trim() && !attFile) return

    if (editMsgId) {
      await chatService.editMessage({
        messageId: editMsgId,
        editorId: me.id,
        newContent: text,
      })
      setEditMsgId(null)
      showToast('Edited')
      return
    }

    let finalContent = text
    if (!isGroup && peerUid && text.trim()) {
      const sk = await getSK()
      if (sk) {
        finalContent = await Crypto.enc(sk, text)
      }
    }

    const contentType = attFile ? contentTypeFromFile(attFile) : 'text'
    const message = await chatService.sendMessage({
      conversationId: cid,
      senderId: me.id,
      content: finalContent || undefined,
      contentType,
      repliedTo: replyTo?.messageId ?? null,
    })

    if (attFile) {
      const uploadId = `upload_${Date.now()}`
      const preview = attFile.type.startsWith('image/') ? URL.createObjectURL(attFile) : undefined

      addUpload({
        id: uploadId,
        file: attFile,
        task: {},
        progress: 0,
        status: 'uploading',
        preview,
      })

      try {
        updateUpload(uploadId, { progress: 35 })
        await chatService.createAttachment({
          messageId: message.id,
          file: attFile,
          file_name: attFile.name,
          file_type: attachmentTypeFromFile(attFile),
          file_size: attFile.size,
          mime_type: attFile.type,
        })
        updateUpload(uploadId, { progress: 100 })
        removeUpload(uploadId)
        if (preview) URL.revokeObjectURL(preview)
      } catch {
        updateUpload(uploadId, { status: 'failed' })
      } finally {
        setAttachment(null, null)
      }
    }

    const bundle = await chatService.getMessageBundle(message.id)
    const sk = await getSK()
    const dec = await decryptBatch([bundle], sk)

    startTransition(() => {
      appendOrReplaceMessage(bundle)
      setDecrypted(dec)
    })

    setReplyTo(null)
    scrollBottom()
  }, [
    addUpload,
    appendOrReplaceMessage,
    attFile,
    cid,
    decryptBatch,
    editMsgId,
    getSK,
    isGroup,
    me,
    peerUid,
    removeUpload,
    replyTo,
    scrollBottom,
    setAttachment,
    setDecrypted,
    setEditMsgId,
    setReplyTo,
    showToast,
    updateUpload,
  ])

  const sendVoice = useCallback(async (blob: Blob, dur: string) => {
    if (!me) return

    const file = new File([blob], 'voice.webm', { type: 'audio/webm' })
    const entryId = `upload_voice_${Date.now()}`
    addUpload({ id: entryId, file, progress: 0, status: 'uploading' })

    try {
      const message = await chatService.sendMessage({
        conversationId: cid,
        senderId: me.id,
        contentType: 'audio',
      })

      updateUpload(entryId, { progress: 40 })
      await chatService.createAttachment({
        messageId: message.id,
        file,
        file_name: file.name,
        file_type: 'audio',
        file_size: file.size,
        mime_type: file.type,
        duration: Number(dur) || undefined,
      })
      updateUpload(entryId, { progress: 100 })
      removeUpload(entryId)
    } catch {
      updateUpload(entryId, { status: 'failed' })
    }
  }, [addUpload, cid, me, removeUpload, updateUpload])

  const addReaction = useCallback(async (msgId: string, emoji: string) => {
    if (!me) return

    const bundle = useStore.getState().messagesByCid[cid]?.find((item) => item.message.id === msgId)
    const existing = bundle?.reactions.find((reaction) => reaction.user === me.id)

    if (existing?.emoji === emoji && existing.id) {
      await chatService.removeReaction(existing.id)
      return
    }

    if (existing?.id) {
      await chatService.removeReaction(existing.id)
    }

    await chatService.createReaction({
      messageId: msgId,
      userId: me.id,
      emoji,
    })
  }, [cid, me])

  const deleteMsg = useCallback(async (msgId: string) => {
    await chatService.softDeleteMessage(msgId)
    showToast('Deleted')
  }, [showToast])

  const onTyping = useCallback(() => {
    if (!me) return

    void chatService.setTyping({
      conversationId: cid,
      userId: me.id,
      name: me.name?.trim() || me.username || me.email,
      isTyping: true,
    })

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      void chatService.setTyping({
        conversationId: cid,
        userId: me.id,
        name: me.name?.trim() || me.username || me.email,
        isTyping: false,
      })
    }, 2000)
  }, [cid, me])

  const handleCtxAction = useCallback((action: string) => {
    if (!ctxMenu) return

    const { id, msg, text } = ctxMenu
    switch (action) {
      case 'reply':
        setReplyTo({ messageId: id, conversationId: cid })
        break
      case 'react':
        showToast('Double-tap the message to react')
        break
      case 'star':
        showToast('Starred support is not wired yet')
        break
      case 'copy':
        navigator.clipboard?.writeText(text)
        showToast('Copied')
        break
      case 'forward':
        showToast('Forward coming soon')
        break
      case 'info':
        showToast(`Sent ${fmtTime(msg.ts)} - Status: ${msg.status}`)
        break
      case 'edit':
        setEditMsgId(id)
        showToast('Editing')
        break
      case 'delete':
        void deleteMsg(id)
        break
      case 'report':
        showToast('Reported')
        break
    }

    setCtxMenu(null)
  }, [cid, ctxMenu, deleteMsg, setEditMsgId, setReplyTo, showToast])

  const onScrollTo = useCallback((msgId: string) => {
    const el = document.getElementById(`mg_${msgId}`)
    if (!el) return

    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('msg-flash')
    setTimeout(() => el.classList.remove('msg-flash'), 900)
  }, [])

  const onLightbox = useCallback((url: string, type?: 'image' | 'video') => {
    setLightbox({ url, type: type ?? 'image' })
  }, [])

  return (
    <>
      <style>{`
        @keyframes panelUp { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes msgFlash { 0%,100%{background:transparent} 30%{background:rgba(99,102,241,.18)} }
        .msg-flash { animation: msgFlash .8s ease; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: var(--bd2); border-radius: 2px; }
      `}</style>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, position: 'relative' }}>
        <div
          ref={msgsRef}
          onScroll={onScroll}
          onClick={() => setCtxMenu(null)}
          style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0, overscrollBehavior: 'contain' }}
        >
          {loadingMore && (
            <div style={{ textAlign: 'center', padding: 12, fontSize: 12, color: 'var(--tx3)', fontFamily: 'var(--mono)' }}>
              Loading older messages...
            </div>
          )}

          {!hasMore && messages.length >= PAGE_SIZE && (
            <div style={{ textAlign: 'center', padding: 12, fontSize: 11, color: 'var(--tx3)', fontFamily: 'var(--mono)' }}>
              Beginning of conversation
            </div>
          )}

          {messages.length < 3 && <EncryptionBanner isGroup={isGroup} />}

          {messages.length === 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--tx3)', gap: 12, padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 52, opacity: 0.4 }}>...</div>
              <div style={{ fontSize: 14, color: 'var(--tx2)', fontWeight: 600 }}>No messages yet</div>
              <div style={{ fontSize: 12, fontFamily: 'var(--mono)', lineHeight: 1.7 }}>
                Send a message to start the conversation.
                <br />
                Everything is end-to-end encrypted.
              </div>
            </div>
          )}

          <div
            onTouchStart={(event) => {
              const target = (event.target as HTMLElement).closest('[data-msgid]') as HTMLElement | null
              if (target?.dataset.msgid) {
                onMsgTouchStart(event, target.dataset.msgid)
              }
            }}
            onTouchMove={onMsgTouchMove}
            onTouchEnd={onMsgTouchEnd}
          >
            {grouped.map((item) => {
              if (item.kind === 'sep') {
                return <DateSep key={item.key} label={item.label} />
              }

              const { id, msg, isFirst, isLast } = item
              return (
                <div key={id} data-msgid={id}>
                  <MessageBubble
                    id={id}
                    msg={msg as never}
                    isMine={msg.uid === me?.id}
                    isGroup={isGroup}
                    isFirst={isFirst}
                    isLast={isLast}
                    cid={cid}
                    onCtx={(event, targetId, targetMsg, isMine, text) => {
                      setCtxMenu({
                        x: Math.min(event.clientX, window.innerWidth - 195),
                        y: Math.min(event.clientY, window.innerHeight - 300),
                        id: targetId,
                        msg: targetMsg,
                        isMine,
                        text,
                      })
                    }}
                    onReact={addReaction}
                    onShowReactors={(emoji, users) => setReactorSheet({ emoji, users: users as Array<{ id: string; name: string }> })}
                    onScrollTo={onScrollTo}
                    onLightbox={onLightbox}
                    swipeX={swipeMsgId === id ? swipeX : 0}
                  />
                </div>
              )
            })}
          </div>

          {uploads.map((entry) => (
            <UploadBubble key={entry.id} entry={entry} onCancel={() => removeUpload(entry.id)} />
          ))}

          {typingNames.length > 0 && <TypingIndicator names={typingNames} />}

          <div style={{ height: 4 }} />
        </div>

        {unreadCount > 2 && (
          <div
            onClick={() => {
              scrollBottom()
              setUnreadCount(0)
            }}
            style={{
              position: 'absolute',
              bottom: 80,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--ac)',
              color: '#000',
              padding: '7px 18px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 16px var(--ac-glow)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              userSelect: 'none',
              zIndex: 10,
              animation: 'panelUp .3s ease',
            }}
          >
            v {unreadCount} unread
          </div>
        )}

        {showScrollFab && !unreadCount && (
          <button
            onClick={() => scrollBottom()}
            style={{
              position: 'absolute',
              bottom: 80,
              right: 16,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'var(--s2)',
              border: '1px solid var(--bd2)',
              color: 'var(--tx)',
              cursor: 'pointer',
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,.3)',
              zIndex: 10,
              animation: 'panelUp .25s ease',
            }}
          >
            v
          </button>
        )}

        <InputBar
          onSend={sendMsg}
          onFile={(file) => setAttachment(file, contentTypeFromFile(file))}
          onVoice={sendVoice}
          onTyping={onTyping}
          editingText={editMsgId ? '' : undefined}
          onCancelEdit={() => setEditMsgId(null)}
        />

        {ctxMenu && <CtxMenu ctx={ctxMenu as never} onAction={handleCtxAction} />}
      </div>

      {reactorSheet && <ReactorSheet sheet={reactorSheet as never} onClose={() => setReactorSheet(null)} />}
      {lightbox && <Lightbox url={lightbox.url} type={lightbox.type} onClose={() => setLightbox(null)} />}
    </>
  )
}
