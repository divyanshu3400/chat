'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@/src/store/store'
import { createChatService } from '@/src/services/pb-chat.service'
import { pb } from '@/src/lib/pb'

import styles from './Sidebar.module.css'
import { CloudLightning, GroupIcon, MoreVertical, PanelLeftClose, PanelLeftOpen, Search, Settings, UserPlus2, X } from 'lucide-react'

import type {
  ConversationMembersRecord,
  ConversationsRecord,
  MessageBundle,
  MessageStateItem,
  PresenceRecord,
  SbTab,
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
import { getConversationName, getLastMessageText, getUserAvatar } from '@/src/utils/user_utils'

type Props = {
  onNewChat: () => void
  onNewGroup: () => void
  onProfile: () => void
  onSettings: () => void
  onOpenChat: (cid: string) => void
  mobileHome?: boolean
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

export default function Sidebar({
  onNewChat,
  onNewGroup,
  onProfile,
  onSettings,
  onOpenChat,
  mobileHome = false,
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
    prefs,
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
      prefs: state.prefs,
      setPrefs: state.setPrefs,
    }))
  );

  const [focusedIdx, setFocusedIdx] = useState(-1)
  const [searchFocused, setSearchFocused] = useState(false)
  const [compactDesktop, setCompactDesktop] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const swipeX0 = useRef(0)
  const [menuOpen, setMenuOpen] = useState(false);

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

  useEffect(() => {
    if (isMobile) {
      setCompactDesktop(false)
      return
    }

    try {
      setCompactDesktop(window.localStorage.getItem('cipher_sidebar_compact_desktop') === '1')
    } catch {
      setCompactDesktop(false)
    }
  }, [isMobile])

  useEffect(() => {
    if (isMobile) return

    try {
      window.localStorage.setItem('cipher_sidebar_compact_desktop', compactDesktop ? '1' : '0')
    } catch {
      // ignore storage failures
    }
  }, [compactDesktop, isMobile])

  function setTab(nextTab: SbTab) {
    setSbTab(nextTab)
    setSbTab(nextTab)
  }

  const views = useMemo(() => {
    return Object.entries(conversations).map(([id, item]) =>
      [id, buildSidebarConversationView(me?.id ?? null, id, item)] as const,
    )
  }, [conversations, me?.id])

  const filteredConvs = useMemo(() => {
    let entries = [...views]

    if (sbTab === 'groups') {
      entries = entries.filter(([, conv]) => conv.isGroup)
    }

    if (sbTab === 'starred') {
      entries = entries.filter(([, conv]) => conv.starred)
    }

    if (sbTab === 'unread') {
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
  }, [views, sbTab, searchQuery])

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

  const tabs: Array<{ key: SbTab; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'groups', label: 'Groups' },
    { key: 'starred', label: '⭐' },
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
  const isLightTheme = prefs.theme === 'light'

  function toggleCompactDesktop() {
    if (isMobile) return
    setCompactDesktop((current) => !current)
  }

  return (
    <>
      {sidebarOpen && <div className={styles.backdrop} onClick={() => setSidebarOpen(false)} />}

      <aside
        id="cipher-sidebar-wrap"
        className={`${styles.wrap} ${sidebarOpen ? styles.wrapOpen : ''} ${!isMobile && compactDesktop ? styles.compactDesktop : ''}`}
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
                  size={28}
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
              {/* The Trigger Button */}
              <button
                className={styles.headerBtn}
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <MoreVertical size={18} />
              </button>

              {/* The Dropdown Menu */}
              {menuOpen && (
                <div className={styles.optionsDropdown}>
                  {!isMobile && (
                    <button className={styles.dropdownItem} onClick={toggleCompactDesktop}>
                      {compactDesktop ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
                      <span>{compactDesktop ? 'Expand' : 'Compact'}</span>
                    </button>
                  )}

                  <button className={styles.dropdownItem} onClick={onNewChat}>
                    <UserPlus2 size={15} />
                    <span>New Chat</span>
                  </button>

                  <button className={styles.dropdownItem} onClick={onNewGroup}>
                    <GroupIcon size={15} />
                    <span>New Group</span>
                  </button>

                  <button className={styles.dropdownItem} onClick={onSettings}>
                    <Settings size={15} />
                    <span>Settings</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={`${styles.searchBox} ${searchFocused ? styles.searchBoxFocused : ''}`}>
            <span className={styles.searchIcon}><Search /></span>
            <input
              ref={searchRef}
              placeholder={isLightTheme ? 'Search cycles...' : 'Search neural network...'}
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

        <div className={styles.featureSection}>
          <div className={styles.featureHeader}>
            <span className={styles.featureEyebrow}>{isLightTheme ? 'Neural Interfaces' : 'Active AI Assistants'}</span>
          </div>
          <StoriesRow onAddStory={() => undefined} />
        </div>

        <div className={styles.tabBar}>
          {tabs.map((item) => {
            const isActive = sbTab === item.key
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

        {mobileHome && (
          <div className={styles.mobileHero}>
            <div className={styles.mobileHeroEyebrow}>{isLightTheme ? 'System Intelligence' : 'Neural Command'}</div>
            <div className={styles.mobileHeroTitle}>{isLightTheme ? 'Memory Synthesis' : 'Signal Uplink'}</div>
            <div className={styles.mobileHeroBody}>{isLightTheme ? 'Your interface has picked up fresh chat patterns. Jump into a new cycle or reopen a recent thread.' : 'Your encrypted network is online. Launch a direct chat, spin up a group, or continue from a recent thread.'}</div>
            <div className={styles.mobileHeroActions}>
              <button className={styles.mobileHeroPrimary} onClick={onNewChat}>New Chat</button>
              <button className={styles.mobileHeroSecondary} onClick={onNewGroup}>New Group</button>
            </div>
          </div>
        )}

        <div className={styles.listIntro}>
          <div>
            <div className={styles.listTitle}>{isLightTheme ? 'Recent Cycles' : 'Recent Threads'}</div>
          </div>
          <div className={styles.listMeta}>{filteredConvs.length > 0 ? String(filteredConvs.length) + ' active' : 'No pulses'}</div>
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
          <div className={styles.footerMeta}>
            <div className={styles.footerBrand}>
              <span className={styles.footerBrandIcon}><CloudLightning size={15} /></span>
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
        </div>

        {isMobile && (
          <BottomNav
            tab={sbTab}
            onTab={setSbTab}
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

