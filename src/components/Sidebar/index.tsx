'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { shallow } from 'zustand/shallow'

import { useStore } from '@/src/store/store'
import { createChatService } from '@/src/services/pb-chat.service'
import { pb } from '@/src/lib/pb'

import styles from './Sidebar.module.css'
import { CloudLightning, GroupIcon, Search, Settings, UserPlus2, X } from 'lucide-react'

import type {
  ConversationMembersRecord,
  ConversationsRecord,
  MessageBundle,
  MessageStateItem,
  PresenceRecord,
  UsersRecord,
} from '@/src/store/store'
import { useConvCtx } from '@/src/lib/ui'
import { isMobileDevice } from '@/src/lib/utils'
import { ConvContextMenu } from './ConvContextMenu'
import BottomNav from './MobileBottomNav'
import { SkeletonCard } from './SkeletonCard'
import { SidebarEmpty } from './SidebarEmpty'
import { StoriesRow } from './StoriesRow'
import { Avatar } from '../shared'
import { ConvRow } from './ConvRow'
import { useShallow } from 'zustand/react/shallow'

type Tab = 'all' | 'dms' | 'groups' | 'starred' | 'unread'

type Props = {
  onNewChat: () => void
  onNewGroup: () => void
  onProfile: () => void
  onSettings: () => void
  onOpenChat: (cid: string) => void
}

type SidebarConversationView = {
  id: string
  name: string
  subtitle: string
  photo: string
  isGroup: boolean
  otherUid: string | null
  unread: number
  starred: boolean
  pinned: boolean
  muted: boolean
  archived: boolean
  updatedAt: number
  lastMsg: string
  source: ConversationsRecord
  member: ConversationMembersRecord | null
  otherUser: UsersRecord | null
  lastMessage: MessageStateItem['message'] | null
}

function getUserAvatar(user: UsersRecord | null): string {
  if (!user?.avatar) {
    return ''
  }

  try {
    return pb.files.getURL(user, user.avatar).toString()
  } catch {
    return ''
  }
}

function getConversationName(item: {
  source: ConversationsRecord
  otherUser: UsersRecord | null
}): string {
  if (item.source.type === 'group') {
    return item.source.name?.trim() || 'Untitled group'
  }

  return item.otherUser?.name?.trim() || item.otherUser?.username?.trim() || item.otherUser?.email || 'Unknown user'
}

function getLastMessageText(bundle: MessageBundle['message'] | null): string {
  if (!bundle) {
    return ''
  }

  if (bundle.is_deleted) {
    return 'Message deleted'
  }

  if (bundle.content?.trim()) {
    return bundle.content
  }

  if ((bundle.attachments?.length ?? 0) > 0) {
    return 'Attachment'
  }

  return ''
}

function buildSidebarConversationView(
  currentUserId: string | null,
  id: string,
  item: {
    bundle: {
      conversation: ConversationsRecord
      members: ConversationMembersRecord[]
    }
    otherUser: UsersRecord | null
    lastMessage: MessageBundle['message'] | null
  },
): SidebarConversationView {
  const member =
    (currentUserId
      ? item.bundle.members.find((entry) => entry.user === currentUserId) ?? null
      : null)

  const updatedAt = Date.parse(item.lastMessage?.created ?? item.bundle.conversation.updated)

  return {
    id,
    name: getConversationName({
      source: item.bundle.conversation,
      otherUser: item.otherUser,
    }),
    subtitle: item.otherUser?.email ?? item.bundle.conversation.description ?? '',
    photo: item.bundle.conversation.type === 'group' ? '' : getUserAvatar(item.otherUser),
    isGroup: item.bundle.conversation.type === 'group',
    otherUid: item.otherUser?.id ?? null,
    unread: 0,
    starred: false,
    pinned: false,
    muted: !!member?.is_muted,
    archived: !!item.bundle.conversation.is_archived,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
    lastMsg: getLastMessageText(item.lastMessage),
    source: item.bundle.conversation,
    member,
    otherUser: item.otherUser,
    lastMessage: item.lastMessage,
  }
}

export default function Sidebar({
  onNewChat,
  onNewGroup,
  onProfile,
  onSettings,
  onOpenChat,
}: Props) {
  const chatService = useMemo(() => createChatService(pb), [])
  const isMobile = isMobileDevice()
  const { convCtx, openConvCtx, closeConvCtx } = useConvCtx()

  const {
    me,
    conversations,
    activeCid,
    sidebarOpen,
    setSidebarOpen,
    sbTab,
    setSbTab,
    searchQuery,
    setSearchQuery,
    presence,
    convsLoading,
    convsError,
    refetchConvs,
    updateConversation,
    showToast,
  } = useStore(
    useShallow((state) => ({
      me: state.me,
      conversations: state.conversations,
      activeCid: state.activeCid,
      sidebarOpen: state.sidebarOpen,
      setSidebarOpen: state.setSidebarOpen,
      sbTab: state.sbTab,
      setSbTab: state.setSbTab,
      searchQuery: state.searchQuery,
      setSearchQuery: state.setSearchQuery,
      presence: state.presence,
      convsLoading: state.convsLoading,
      convsError: state.convsError,
      refetchConvs: state.refetchConvs,
      updateConversation: state.updateConversation,
      showToast: state.showToast,
    }))
  );

  const [tab, setTabLocal] = useState<Tab>(sbTab)
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const [searchFocused, setSearchFocused] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const swipeX0 = useRef(0)

  useEffect(() => {
    setTabLocal(sbTab)
  }, [sbTab])

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
        setSidebarOpen(true)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSidebarOpen])

  function setTab(nextTab: Tab) {
    setTabLocal(nextTab)
    setSbTab(nextTab)
  }

  const views = useMemo(() => {
    return Object.entries(conversations).map(([id, item]) =>
      [id, buildSidebarConversationView(me?.id ?? null, id, item)] as const,
    )
  }, [conversations, me?.id])

  const filteredConvs = useMemo(() => {
    let entries = [...views]

    if (tab === 'dms') {
      entries = entries.filter(([, conv]) => !conv.isGroup)
    }

    if (tab === 'groups') {
      entries = entries.filter(([, conv]) => conv.isGroup)
    }

    if (tab === 'starred') {
      entries = entries.filter(([, conv]) => conv.starred)
    }

    if (tab === 'unread') {
      entries = entries.filter(([, conv]) => conv.unread > 0)
    }

    const query = searchQuery.trim().toLowerCase()
    if (query) {
      entries = entries.filter(([, conv]) => {
        return (
          conv.name.toLowerCase().includes(query) ||
          conv.lastMsg.toLowerCase().includes(query) ||
          conv.subtitle.toLowerCase().includes(query)
        )
      })
    }

    return entries.sort((a, b) => {
      if (b[1].pinned !== a[1].pinned) {
        return b[1].pinned ? 1 : -1
      }

      return b[1].updatedAt - a[1].updatedAt
    })
  }, [views, tab, searchQuery])

  const totalUnread = useMemo(
    () => filteredConvs.reduce((count, [, conv]) => count + conv.unread, 0),
    [filteredConvs],
  )

  const pinnedConvs = filteredConvs.filter(([, conv]) => conv.pinned)
  const recentConvs = filteredConvs.filter(([, conv]) => !conv.pinned)

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setFocusedIdx(0)
      listRef.current?.querySelector<HTMLElement>('[role=button]')?.focus()
    }

    if (event.key === 'Escape') {
      setSearchQuery('')
      searchRef.current?.blur()
    }
  }

  function onListKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setFocusedIdx((index) => Math.min(index + 1, filteredConvs.length - 1))
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (focusedIdx <= 0) {
        setFocusedIdx(-1)
        searchRef.current?.focus()
      } else {
        setFocusedIdx((index) => index - 1)
      }
    }

    if (event.key === 'Enter' && focusedIdx >= 0 && filteredConvs[focusedIdx]) {
      openChat(filteredConvs[focusedIdx][0])
    }
  }

  async function handleConvAction(cid: string, action: string) {
    const item = conversations[cid]
    if (!item || !me) {
      return
    }

    const ownMembership =
      item.bundle.members.find((member) => member.user === me.id) ??
      null

    try {
      switch (action) {
        case 'pin': {
          showToast('Pinning is not persisted in the PocketBase schema yet.')
          break
        }

        case 'mute': {
          if (!ownMembership?.id) {
            showToast('Membership record not found for this conversation.')
            return
          }

          await chatService.updateConversationMember(ownMembership.id, {
            is_muted: !ownMembership.is_muted,
          })

          await refetchConvs()
          break
        }

        case 'archive': {
          await chatService.updateConversation(cid, {
            is_archived: !item.bundle.conversation.is_archived,
          })

          updateConversation(cid, {
            is_archived: !item.bundle.conversation.is_archived,
          })
          break
        }

        case 'delete': {
          if (!confirm('Delete chat?')) {
            return
          }

          await chatService.deleteConversation(cid)
          updateConversation(cid, null)
          break
        }
      }
    } catch (error) {
      console.warn('[Sidebar] conversation action failed:', error)
      showToast('Conversation action failed.')
    }
  }

  function openChat(cid: string) {
    onOpenChat(cid)
    setSidebarOpen(false)
  }

  function onTouchStart(event: React.TouchEvent) {
    swipeX0.current = event.touches[0].clientX
  }

  function onTouchEnd(event: React.TouchEvent) {
    if (event.changedTouches[0].clientX - swipeX0.current < -70) {
      setSidebarOpen(false)
    }
  }

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'dms', label: 'DMs' },
    { key: 'groups', label: 'Groups' },
    { key: 'starred', label: '*' },
    { key: 'unread', label: 'Unread' },
  ]

  function toRowProps(conv: SidebarConversationView) {
    return {
      id: conv.id,
      isGroup: conv.isGroup,
      name: conv.isGroup ? conv.name : undefined,
      otherName: conv.isGroup ? undefined : conv.name,
      otherUid: conv.otherUid ?? undefined,
      otherPhoto: conv.photo,
      lastMsg: conv.lastMsg,
      pinned: conv.pinned,
      muted: conv.muted,
      archived: conv.archived,
      starred: conv.starred,
      unread: conv.unread,
      updatedAt: conv.updatedAt,
    }
  }

  function isOnline(conv: SidebarConversationView, map: Record<string, PresenceRecord>) {
    if (!conv.otherUid) {
      return false
    }

    return !!map[conv.otherUid]?.online
  }

  function renderConvRows(rows: ReadonlyArray<readonly [string, SidebarConversationView]>, idxOffset: number) {
    return rows.map(([cid, conv], index) => (
      <ConvRow
        key={cid}
        cid={cid}
        conv={toRowProps(conv) as never}
        isActive={cid === activeCid}
        isOnline={isOnline(conv, presence)}
        focused={focusedIdx === idxOffset + index}
        onOpen={openChat}
        onCtx={(nextCid, x, y) => openConvCtx({ cid: nextCid, x, y })}
      />
    ))
  }

  const currentUserName = me?.name?.trim() || me?.username || me?.email || 'User'
  const currentUserPhoto = getUserAvatar(me)

  return (
    <>
      {sidebarOpen && <div className={styles.backdrop} onClick={() => setSidebarOpen(false)} />}

      <aside
        id="cipher-sidebar-wrap"
        className={`${styles.wrap} ${sidebarOpen ? styles.wrapOpen : ''}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className={styles.ambientOrb1} />
        <div className={styles.ambientOrb2} />

        <div className={styles.header}>
          <div className={styles.headerTop}>
            <button onClick={onProfile} className={styles.profileChip}>
              <div className={styles.profileAvatarRing}>
                <Avatar
                  name={currentUserName}
                  photo={currentUserPhoto}
                  size={38}
                  ring
                />
                <div className={styles.profileOnlineDot} />
              </div>

              <div className={styles.profileInfo}>
                <div className={styles.profileName}>{currentUserName}</div>
                {me?.email && <div className={styles.profileEmail}>{me.email}</div>}
              </div>
            </button>

            <div className={styles.headerActions}>
              <button className={styles.headerBtn} onClick={onNewChat} title="New chat">
                <UserPlus2 />
              </button>
              <button className={styles.headerBtn} onClick={onNewGroup} title="New group">
                <GroupIcon />
              </button>
              <button className={styles.headerBtn} onClick={onSettings} title="Settings">
                <Settings />
              </button>
            </div>
          </div>

          <div className={`${styles.searchBox} ${searchFocused ? styles.searchBoxFocused : ''}`}>
            <span className={styles.searchIcon}><Search /></span>
            <input
              ref={searchRef}
              placeholder="Search... (Ctrl/Cmd+K)"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onKeyDown={onSearchKeyDown}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  searchRef.current?.focus()
                }}
                className={styles.searchClear}
              >
                <X />
              </button>
            )}
          </div>
        </div>

        <StoriesRow onAddStory={() => undefined} />

        <div className={styles.tabBar}>
          {tabs.map((item) => {
            const isActive = tab === item.key
            const showBadge = item.key === 'unread' && totalUnread > 0

            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
              >
                {item.label}
                {showBadge && (
                  <span className={styles.tabBadge}>
                    {totalUnread > 9 ? '9+' : totalUnread}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div ref={listRef} className={styles.convList} onKeyDown={onListKeyDown}>
          {convsLoading && !Object.keys(conversations).length && (
            <>{[0, 0.12, 0.24, 0.36].map((delay, index) => <SkeletonCard key={index} delay={delay} />)}</>
          )}

          {convsError && !convsLoading && <SidebarEmpty kind="error" onAction={() => void refetchConvs()} />}

          {!convsLoading && !convsError && filteredConvs.length === 0 && (
            searchQuery
              ? <SidebarEmpty kind="no-results" />
              : <SidebarEmpty kind="no-convs" onAction={onNewChat} />
          )}

          {!convsError && pinnedConvs.length > 0 && (
            <>
              <div className={styles.sectionLabel}><span className={styles.sectionLabelDot} />Pinned</div>
              {renderConvRows(pinnedConvs, 0)}
            </>
          )}

          {!convsError && recentConvs.length > 0 && (
            <>
              {pinnedConvs.length > 0 && (
                <div className={styles.sectionLabel}><span className={styles.sectionLabelDot} />Recent</div>
              )}
              {renderConvRows(recentConvs, pinnedConvs.length)}
            </>
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.footerBrand}>
            <span className={styles.footerBrandIcon}><CloudLightning /></span>
            Cipher
          </div>
          <div className={styles.footerRight}>
            <span className={styles.footerVersion}>v2.0</span>
            <div className={styles.footerStatusGroup}>
              <span className={styles.footerStatusText}>Connected</span>
              <div className={styles.footerDot} />
            </div>
          </div>
        </div>

        {isMobile && (
          <BottomNav
            tab={tab}
            onTab={setTab}
            unread={totalUnread}
            onNewChat={onNewChat}
            onSettings={onSettings}
          />
        )}

        {convCtx && (
          <ConvContextMenu
            cid={convCtx.cid}
            x={convCtx.x}
            y={convCtx.y}
            conv={
              conversations[convCtx.cid]
                ? (toRowProps(
                  buildSidebarConversationView(
                    me?.id ?? null,
                    convCtx.cid,
                    conversations[convCtx.cid],
                  ),
                ) as never)
                : undefined
            }
            onClose={closeConvCtx}
            onAction={handleConvAction}
          />
        )}
      </aside>
    </>
  )
}
