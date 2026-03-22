'use client'

import {
  useState, useEffect, useRef,
  useMemo, memo, type KeyboardEvent,
} from 'react'
import { useStore } from '@/lib/store'
import { useConvCtx } from '@/lib/ui'
import { fmtTime } from '@/lib/utils'
import type { Conversation, Story } from '@/types'
import { Avatar, IBtn, Icon } from '../shared'
import styles from './Sidebar.module.css'

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */
interface Props {
  onNewChat: () => void
  onNewGroup: () => void
  onProfile: () => void
  onSettings: () => void
  onOpenChat: (cid: string) => void
}

type Tab = 'all' | 'dms' | 'groups' | 'starred' | 'unread'

/* ═══════════════════════════════════════════════════════════════
   SKELETON CARD
═══════════════════════════════════════════════════════════════ */
const SkeletonCard = memo(({ delay = 0 }: { delay?: number }) => (
  <div
    className={styles.skeletonCard}
    style={{ animation: `skelPulse 1.6s ease-in-out ${delay}s infinite` }}
  >
    <div className={styles.skeletonAvatar} />
    <div className={styles.skeletonLines}>
      <div className={styles.skeletonLine} style={{ width: '60%' }} />
      <div className={styles.skeletonLine} style={{ width: '85%' }} />
    </div>
  </div>
))
SkeletonCard.displayName = 'SkeletonCard'

/* ═══════════════════════════════════════════════════════════════
   STORIES ROW
═══════════════════════════════════════════════════════════════ */
const StoriesRow = memo(({ onAddStory }: { onAddStory: () => void }) => {
  const { stories = [], me, setActiveStory, setStoryViewerOpen } = useStore()
  const now = Date.now()
  const valid = stories.filter((s: Story) => now - s.ts < 86_400_000 && s.uid !== me?.uid)

  return (
    <div className={styles.storiesRow}>
      {/* My story */}
      <button onClick={onAddStory} title="Add story" className={styles.storyBtn}>
        <div className={styles.myStoryRing}>
          {me?.photoURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.photoURL} alt="" className={styles.myStoryPhoto} />
          )}
          <div className={styles.myStoryPlus}>
            <Icon.Plus />
          </div>
        </div>
        <span className={`${styles.storyLabel} ${styles.storyLabelSeen}`}>My Story</span>
      </button>

      {/* Others */}
      {valid.map((s: Story) => {
        const seen = s.seenBy?.[me?.uid ?? '']
        return (
          <button
            key={s.uid}
            onClick={() => { setActiveStory(s); setStoryViewerOpen(true) }}
            title={s.displayName}
            className={styles.storyBtn}
          >
            <div className={`${styles.storyRingWrap} ${seen ? styles.storyRingSeen : styles.storyRingUnseen}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.photoURL} alt={s.displayName} className={styles.storyImg} />
            </div>
            <span className={`${styles.storyLabel} ${seen ? styles.storyLabelSeen : styles.storyLabelUnseen}`}>
              {s.displayName.split(' ')[0]}
            </span>
          </button>
        )
      })}

      {valid.length === 0 && (
        <div className={styles.storiesEmpty}>No stories yet</div>
      )}
    </div>
  )
})
StoriesRow.displayName = 'StoriesRow'

/* ═══════════════════════════════════════════════════════════════
   CONVERSATION ROW
═══════════════════════════════════════════════════════════════ */
interface ConvRowProps {
  cid: string
  conv: Conversation
  isActive: boolean
  isOnline: boolean
  focused: boolean
  onOpen: (cid: string) => void
  onCtx: (cid: string, x: number, y: number) => void
}

const ConvRow = memo(({
  cid, conv, isActive, isOnline, focused, onOpen, onCtx,
}: ConvRowProps) => {
  const name = conv.isGroup ? (conv.name ?? 'Group') : (conv.otherName ?? 'Unknown')
  const photo = conv.isGroup ? undefined : conv.otherPhoto ?? undefined
  const unread = conv.unread ?? 0
  const preview = conv.lastMsg ? conv.lastMsg.substring(0, 40) : 'No messages yet'

  const lpRef = useRef<ReturnType<typeof setTimeout>>()
  function onTouchStart(e: React.TouchEvent) {
    lpRef.current = setTimeout(() => {
      const t = e.touches[0]
      onCtx(cid, t.clientX, t.clientY)
    }, 550)
  }
  function onTouchEnd() { clearTimeout(lpRef.current) }

  const rowClass = [
    styles.convRow,
    isActive ? styles.convRowActive : styles.convRowDefault,
    focused && !isActive ? styles.convRowFocused : '',
    conv.archived ? styles.convRowArchived : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      role="button"
      tabIndex={0}
      aria-selected={isActive}
      onClick={() => onOpen(cid)}
      onContextMenu={e => { e.preventDefault(); onCtx(cid, e.clientX, e.clientY) }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onOpen(cid) }}
      className={rowClass}
    >
      <div className={styles.avatarWrap}>
        <Avatar name={name} photo={photo} size={44} isGroup={conv.isGroup} />
        {!conv.isGroup && (
          <div className={`${styles.presenceDot} ${isOnline ? styles.presenceDotOnline : styles.presenceDotOffline}`} />
        )}
      </div>

      <div className={styles.convText}>
        <div className={styles.convNameRow}>
          <span className={[
            styles.convName,
            unread > 0 ? styles.convNameUnread : '',
            isActive ? styles.convNameActive : '',
          ].filter(Boolean).join(' ')}>
            {name}
          </span>
          <span className={styles.convTime}>
            {conv.updatedAt ? fmtTime(conv.updatedAt) : ''}
          </span>
        </div>

        <div className={styles.convPreviewRow}>
          <span className={styles.convPreview}>
            <span className={styles.lockIcon}><Icon.Lock /></span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {preview}
            </span>
          </span>
          <div className={styles.convMeta}>
            {conv.muted && <span className={styles.metaIcon}><Icon.Mute /></span>}
            {conv.pinned && <span className={`${styles.metaIcon} ${styles.pinIcon}`}><Icon.Pin /></span>}
            {unread > 0 && (
              <span className={`${styles.unreadBadge} ${conv.muted ? styles.unreadBadgeMuted : ''}`}>
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})
ConvRow.displayName = 'ConvRow'

/* ═══════════════════════════════════════════════════════════════
   CONTEXT MENU
═══════════════════════════════════════════════════════════════ */
interface ConvCtxMenuProps {
  cid: string
  x: number
  y: number
  conv: Conversation | undefined
  onClose: () => void
  onAction: (cid: string, action: string) => void
}

const ConvContextMenu = memo(({
  cid, x, y, conv, onClose, onAction,
}: ConvCtxMenuProps) => {
  if (!conv) return null

  /* Desktop: keep inside viewport */
  const mW = 190, mH = 220
  const W = typeof window !== 'undefined' ? window.innerWidth : 400
  const H = typeof window !== 'undefined' ? window.innerHeight : 800
  const left = Math.min(x, W - mW - 8)
  const top = Math.min(y, H - mH - 8)

  const items = [
    { key: 'pin', icon: <Icon.Pin />, label: conv.pinned ? 'Unpin' : 'Pin', danger: false },
    { key: 'mute', icon: <Icon.Mute />, label: conv.muted ? 'Unmute' : 'Mute', danger: false },
    { key: 'archive', icon: <Icon.Archive />, label: conv.archived ? 'Unarchive' : 'Archive', danger: false },
    { key: 'delete', icon: <Icon.Trash />, label: 'Delete chat', danger: true },
  ]

  return (
    <>
      <div onClick={onClose} className={styles.ctxBackdrop} />
      {/* On mobile the CSS overrides left/right/bottom, so desktop pos is only for desktop */}
      <div className={styles.ctxMenu} style={{ left, top }}>
        <div className={styles.ctxHeader}>
          <div className={styles.ctxHeaderName}>
            {conv.isGroup ? conv.name : conv.otherName}
          </div>
        </div>
        {items.map(item => (
          <div
            key={item.key}
            onClick={() => { onAction(cid, item.key); onClose() }}
            className={`${styles.ctxItem} ${item.danger ? styles.ctxItemDanger : ''}`}
          >
            <span className={styles.ctxItemIcon}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>
    </>
  )
})
ConvContextMenu.displayName = 'ConvContextMenu'

/* ═══════════════════════════════════════════════════════════════
   SIDEBAR EMPTY STATE
═══════════════════════════════════════════════════════════════ */
type EmptyKind = 'no-convs' | 'no-results' | 'error'

const SidebarEmpty = memo(({ kind, onAction }: { kind: EmptyKind; onAction?: () => void }) => {
  const cfg = {
    'no-convs': { icon: '💬', title: 'No conversations yet', body: 'Start a new chat or create a group.', cta: 'Start a chat' },
    'no-results': { icon: '🔍', title: 'Nothing found', body: 'Try a different name or message snippet.', cta: null },
    'error': { icon: '⚠️', title: 'Failed to load', body: 'Something went wrong loading conversations.', cta: 'Retry' },
  }[kind]

  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>{cfg.icon}</div>
      <div className={styles.emptyTitle}>{cfg.title}</div>
      <div className={styles.emptyBody}>{cfg.body}</div>
      {cfg.cta && onAction && (
        <button
          onClick={onAction}
          className={`${styles.emptyCta} ${kind !== 'error' ? styles.emptyCtaAccent : styles.emptyCtaNeutral}`}
        >
          {cfg.cta}
        </button>
      )}
    </div>
  )
})
SidebarEmpty.displayName = 'SidebarEmpty'

/* ═══════════════════════════════════════════════════════════════
   MOBILE BOTTOM NAV
═══════════════════════════════════════════════════════════════ */
interface BottomNavProps {
  tab: Tab
  onTab: (t: Tab) => void
  unread: number
  onNewChat: () => void
  onSettings: () => void
}

const BottomNav = memo(({ tab, onTab, unread, onNewChat, onSettings }: BottomNavProps) => {
  const navItems = [
    { key: 'all' as Tab, icon: '💬', label: 'Chats', badge: unread },
    { key: 'groups' as Tab, icon: '👥', label: 'Groups', badge: 0 },
    { key: 'compose', icon: '✏️', label: 'New', badge: 0, action: onNewChat },
    { key: 'starred' as Tab, icon: '⭐', label: 'Starred', badge: 0 },
    { key: 'settings', icon: '⚙️', label: 'Settings', badge: 0, action: onSettings },
  ] as const

  return (
    <nav className={styles.bottomNav}>
      {navItems.map(item => {
        const isActive = 'action' in item ? false : tab === item.key
        const handleTap = 'action' in item ? item.action : () => onTab(item.key as Tab)

        return (
          <button
            key={item.key}
            onClick={handleTap}
            className={`${styles.bottomNavItem} ${isActive ? styles.bottomNavItemActive : ''}`}
          >
            <span className={styles.bottomNavIcon}>{item.icon}</span>
            <span className={styles.bottomNavLabel}>{item.label}</span>
            {item.badge > 0 && (
              <span className={styles.bottomNavBadge}>
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
})
BottomNav.displayName = 'BottomNav'

/* ═══════════════════════════════════════════════════════════════
   MAIN SIDEBAR
═══════════════════════════════════════════════════════════════ */
export default function Sidebar({
  onNewChat, onNewGroup, onProfile, onSettings, onOpenChat,
}: Props) {
  const {
    me,
    conversations = {},
    activeCid,
    sidebarOpen, setSidebarOpen,
    sbTab: storeTab, setSbTab,
    searchQuery, setSearchQuery,
    presence = {},
    convsLoading = false,
    convsError = null,
    refetchConvs,
    updateConversation,
  } = useStore()

  const { convCtx, openConvCtx, closeConvCtx } = useConvCtx()

  const [tab, setTabLocal] = useState<Tab>((storeTab as Tab) ?? 'all')
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const [searchFocused, setSearchFocused] = useState(false)

  const listRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  function setTab(t: Tab) { setTabLocal(t); setSbTab(t) }

  /* ── ⌘K shortcut ── */
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        setSidebarOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSidebarOpen])

  /* ── Filtered + sorted conversations ── */
  const convs = useMemo<[string, Conversation][]>(() => {
    let entries = Object.entries(conversations) as [string, Conversation][]
    if (tab === 'dms') entries = entries.filter(([, c]) => !c.isGroup)
    if (tab === 'groups') entries = entries.filter(([, c]) => c.isGroup)
    if (tab === 'starred') entries = entries.filter(([, c]) => c.starred)
    if (tab === 'unread') entries = entries.filter(([, c]) => (c.unread ?? 0) > 0)
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      entries = entries.filter(([, c]) => {
        const name = (c.isGroup ? c.name : c.otherName) ?? ''
        return name.toLowerCase().includes(q) || (c.lastMsg ?? '').toLowerCase().includes(q)
      })
    }
    return entries.sort((a, b) => {
      if (!!b[1].pinned !== !!a[1].pinned) return b[1].pinned ? 1 : -1
      return (b[1].updatedAt ?? 0) - (a[1].updatedAt ?? 0)
    })
  }, [conversations, tab, searchQuery])

  const totalUnread = useMemo(() =>
    Object.values(conversations).reduce((acc, c) => acc + ((c as Conversation).unread ?? 0), 0)
    , [conversations])

  /* ── Pinned / recent separation ── */
  const pinnedConvs = convs.filter(([, c]) => c.pinned)
  const recentConvs = convs.filter(([, c]) => !c.pinned)

  /* ── Keyboard nav ── */
  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIdx(0)
      listRef.current?.querySelector<HTMLElement>('[role=button]')?.focus()
    }
    if (e.key === 'Escape') { setSearchQuery(''); searchRef.current?.blur() }
  }

  function onListKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIdx(i => Math.min(i + 1, convs.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (focusedIdx <= 0) { setFocusedIdx(-1); searchRef.current?.focus() }
      else setFocusedIdx(i => i - 1)
    }
    if (e.key === 'Enter' && focusedIdx >= 0 && convs[focusedIdx]) {
      openChat(convs[focusedIdx][0])
    }
  }

  /* ── Context menu actions ── */
  function handleConvAction(cid: string, action: string) {
    const conv = conversations[cid] as Conversation | undefined
    if (!conv) return
    switch (action) {
      case 'pin': updateConversation(cid, { pinned: !conv.pinned }); break
      case 'mute': updateConversation(cid, { muted: !conv.muted }); break
      case 'archive': updateConversation(cid, { archived: !conv.archived }); break
      case 'delete':
        if (confirm(`Delete chat with ${conv.isGroup ? conv.name : conv.otherName}?`))
          updateConversation(cid, null)
        break
    }
  }

  function openChat(cid: string) {
    onOpenChat(cid)
    setSidebarOpen(false)
  }

  /* ── Mobile swipe to close ── */
  const swipeX0 = useRef(0)
  function onTouchStart(e: React.TouchEvent) { swipeX0.current = e.touches[0].clientX }
  function onTouchEnd(e: React.TouchEvent) {
    if (e.changedTouches[0].clientX - swipeX0.current < -70) setSidebarOpen(false)
  }

  /* ── Tab config (desktop tab bar) ── */
  const tabs: { key: Tab; label: string; star?: boolean }[] = [
    { key: 'all', label: 'All' },
    { key: 'dms', label: 'DMs' },
    { key: 'groups', label: 'Groups' },
    { key: 'starred', label: '⭐', star: true },
    { key: 'unread', label: 'Unread' },
  ]

  /* ── Render helper: one section of conv rows ── */
  function renderConvRows(rows: [string, Conversation][], idxOffset: number) {
    return rows.map(([cid, conv], i) => (
      <ConvRow
        key={cid}
        cid={cid}
        conv={conv}
        isActive={cid === activeCid}
        isOnline={!!(conv.otherUid && presence[conv.otherUid]?.online)}
        focused={focusedIdx === idxOffset + i}
        onOpen={openChat}
        onCtx={(cid, x, y) => openConvCtx({ cid, x, y })}
      />
    ))
  }

  /* ── Render ── */
  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className={styles.backdrop} onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        id="cipher-sidebar-wrap"
        className={`${styles.wrap} ${sidebarOpen ? styles.wrapOpen : ''}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >

        {/* ── HEADER ── */}
        <div className={styles.header}>
          <div className={styles.headerTop}>
            {/* Profile chip */}
            <button onClick={onProfile} title="Edit profile" className={styles.profileChip}>
              <Avatar name={me?.displayName ?? '?'} photo={me?.photoURL} size={36} ring />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={styles.profileName}>
                  {me?.displayName ?? 'User'}
                </div>
                {me?.email && (
                  <div className={styles.profileEmail}>
                    {me.email}
                  </div>
                )}
                <div className={styles.profileStatus}>
                  <span className={styles.statusDot} />
                  Online
                </div>
              </div>
            </button>

            <div className={styles.headerActions}>
              <IBtn onClick={onNewChat} title="New chat (⌘N)"><Icon.Edit /></IBtn>
              <IBtn onClick={onNewGroup} title="New group"><Icon.Group /></IBtn>
              <IBtn onClick={onSettings} title="Settings"><Icon.Settings /></IBtn>
            </div>
          </div>

          {/* Search */}
          <div className={`${styles.searchBox} ${searchFocused ? styles.searchBoxFocused : ''}`}>
            <span className={styles.searchIcon}><Icon.Search /></span>
            <input
              ref={searchRef}
              placeholder="Search… (⌘K)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onKeyDown={onSearchKeyDown}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); searchRef.current?.focus() }}
                className={styles.searchClear}
              >
                <Icon.X />
              </button>
            )}
          </div>
        </div>

        {/* ── STORIES ── */}
        <StoriesRow onAddStory={() => { }} />

        {/* ── DESKTOP TABS (hidden on mobile — replaced by bottom nav) ── */}
        <div className={styles.tabBar}>
          {tabs.map(t => {
            const isActive = tab === t.key
            const showBadge = t.key === 'unread' && totalUnread > 0
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={[
                  styles.tab,
                  t.star ? styles.tabStar : '',
                  isActive ? styles.tabActive : '',
                ].filter(Boolean).join(' ')}
              >
                {t.label}
                {showBadge && (
                  <span className={styles.tabBadge}>
                    {totalUnread > 9 ? '9+' : totalUnread}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── CONVERSATION LIST ── */}
        <div
          ref={listRef}
          className={styles.convList}
          onKeyDown={onListKeyDown}
        >
          {/* Loading */}
          {convsLoading && !Object.keys(conversations).length && (
            <>
              <SkeletonCard delay={0} />
              <SkeletonCard delay={0.15} />
              <SkeletonCard delay={0.3} />
              <SkeletonCard delay={0.45} />
            </>
          )}

          {/* Error */}
          {convsError && !convsLoading && (
            <SidebarEmpty kind="error" onAction={refetchConvs} />
          )}

          {/* Empty */}
          {!convsLoading && !convsError && convs.length === 0 && (
            searchQuery
              ? <SidebarEmpty kind="no-results" />
              : <SidebarEmpty kind="no-convs" onAction={onNewChat} />
          )}

          {/* Pinned section */}
          {!convsError && pinnedConvs.length > 0 && (
            <>
              <div className={styles.sectionLabel}>Pinned</div>
              {renderConvRows(pinnedConvs, 0)}
            </>
          )}

          {/* Recent section */}
          {!convsError && recentConvs.length > 0 && (
            <>
              {pinnedConvs.length > 0 && (
                <div className={styles.sectionLabel}>Recent</div>
              )}
              {renderConvRows(recentConvs, pinnedConvs.length)}
            </>
          )}
        </div>

        {/* ── DESKTOP FOOTER ── */}
        <div className={styles.footer}>
          <div className={styles.footerBrand}>
            <Icon.Lightning />
            Cipher
          </div>
          <div className={styles.footerRight}>
            <span className={styles.footerVersion}>v2.0</span>
            <div title="Connected" className={styles.footerDot} />
          </div>
        </div>

        {/* ── MOBILE BOTTOM NAV ── */}
        <BottomNav
          tab={tab}
          onTab={setTab}
          unread={totalUnread}
          onNewChat={onNewChat}
          onSettings={onSettings}
        />

        {/* ── CONTEXT MENU ── */}
        {convCtx && (
          <ConvContextMenu
            cid={convCtx.cid}
            x={convCtx.x}
            y={convCtx.y}
            conv={conversations[convCtx.cid] as Conversation | undefined}
            onClose={closeConvCtx}
            onAction={handleConvAction}
          />
        )}
      </aside>
    </>
  )
}