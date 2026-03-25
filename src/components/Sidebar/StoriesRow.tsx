'use client'

import { memo, useEffect, useMemo, useState } from 'react'

import styles from './Sidebar.module.css'
import { useStore } from '@/src/store/store'
import { pb } from '@/src/lib/pb'
import type {
  StoriesRecord,
  StoryViewsRecord,
  UsersRecord,
} from '@/src/types/pb-collections.types'

type StoriesRowProps = {
  onAddStory: () => void
}

type OwnerStoryGroup = {
  owner: UsersRecord | null
  ownerId: string
  latestStory: StoriesRecord
  storyIds: string[]
  unseenCount: number
  hasUnseen: boolean
}

function isActiveStory(story: StoriesRecord): boolean {
  if (story.is_deleted || story.is_archived) {
    return false
  }

  if (!story.expires_at) {
    return true
  }

  const expiresAt = Date.parse(story.expires_at)
  return Number.isFinite(expiresAt) ? expiresAt > Date.now() : true
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

function getUserLabel(user: UsersRecord | null): string {
  const value = user?.name?.trim() || user?.username?.trim() || user?.email || 'Story'
  return value.split(' ')[0]
}

function chooseStoryForViewer(stories: StoriesRecord[], seenStoryIds: Set<string>): StoriesRecord {
  const unseen = stories.find((story) => !seenStoryIds.has(story.id))
  return unseen ?? stories[0]
}

export const StoriesRow = memo(function StoriesRow({ onAddStory }: StoriesRowProps) {
  const me = useStore((state) => state.me)
  const stories = useStore((state) => state.stories)
  const setActiveStory = useStore((state) => state.setActiveStory)
  const setStoryViewerOpen = useStore((state) => state.setStoryViewerOpen)

  const [ownerMap, setOwnerMap] = useState<Record<string, UsersRecord>>({})
  const [viewedStoryIds, setViewedStoryIds] = useState<Set<string>>(new Set())

  const activeStories = useMemo(
    () => stories.filter(isActiveStory),
    [stories],
  )

  const myStories = useMemo(
    () => activeStories.filter((story) => story.owner === me?.id),
    [activeStories, me?.id],
  )

  const otherStories = useMemo(
    () => activeStories.filter((story) => story.owner && story.owner !== me?.id),
    [activeStories, me?.id],
  )

  useEffect(() => {
    const ownerIds = Array.from(
      new Set(
        otherStories
          .map((story) => story.owner)
          .filter((ownerId): ownerId is string => !!ownerId),
      ),
    )

    if (ownerIds.length === 0) {
      setOwnerMap({})
      return
    }

    let alive = true

    void Promise.all(
      ownerIds.map(async (ownerId) => {
        const user = await pb.collection('users').getOne(ownerId).catch(() => null)
        return user ? [ownerId, user as UsersRecord] as const : null
      }),
    ).then((entries) => {
      if (!alive) {
        return
      }

      setOwnerMap(
        Object.fromEntries(
          entries.filter((entry): entry is readonly [string, UsersRecord] => !!entry),
        ),
      )
    })

    return () => {
      alive = false
    }
  }, [otherStories])

  useEffect(() => {
    if (!me?.id) {
      setViewedStoryIds(new Set())
      return
    }

    let alive = true
    let unsub: (() => void) | null = null

    async function loadViews() {
      const rows = await pb
        .collection('story_views')
        .getFullList({
          filter: `user = "${me?.id}"`,
          sort: '-updated',
        })
        .catch(() => []) as StoryViewsRecord[]

      if (!alive) {
        return
      }

      setViewedStoryIds(new Set(rows.map((row) => row.story).filter((id): id is string => !!id)))
    }

    void loadViews()

    void pb.collection('story_views').subscribe('*', () => {
      if (alive) {
        void loadViews()
      }
    }).then((cleanup) => {
      unsub = cleanup
    }).catch(() => null)

    return () => {
      alive = false
      unsub?.()
    }
  }, [me?.id])

  const groupedStories = useMemo<OwnerStoryGroup[]>(() => {
    const grouped = new Map<string, StoriesRecord[]>()

    for (const story of otherStories) {
      if (!story.owner) {
        continue
      }

      const list = grouped.get(story.owner) ?? []
      list.push(story)
      grouped.set(story.owner, list)
    }

    return Array.from(grouped.entries())
      .map(([ownerId, ownerStories]) => {
        const sorted = [...ownerStories].sort((a, b) => Date.parse(b.created) - Date.parse(a.created))
        const unseenCount = sorted.filter((story) => !viewedStoryIds.has(story.id)).length

        return {
          owner: ownerMap[ownerId] ?? null,
          ownerId,
          latestStory: chooseStoryForViewer(sorted, viewedStoryIds),
          storyIds: sorted.map((story) => story.id),
          unseenCount,
          hasUnseen: unseenCount > 0,
        }
      })
      .sort((a, b) => {
        if (a.hasUnseen !== b.hasUnseen) {
          return a.hasUnseen ? -1 : 1
        }

        return Date.parse(b.latestStory.created) - Date.parse(a.latestStory.created)
      })
  }, [otherStories, ownerMap, viewedStoryIds])

  const myPhoto = getUserAvatar(me)
  const hasMyStories = myStories.length > 0

  function openStory(story: StoriesRecord) {
    setActiveStory(story)
    setStoryViewerOpen(true)
  }

  return (
    <div className={styles.storiesRow}>
      <button onClick={onAddStory} className={styles.storyBtn}>
        <div className={styles.myStoryRing}>
          {myPhoto && <img src={myPhoto} alt="" className={styles.myStoryPhoto} />}
          <div className={styles.myStoryPlus}>{hasMyStories ? '+' : '+'}</div>
        </div>
        <span className={`${styles.storyLabel} ${hasMyStories ? styles.storyLabelUnseen : styles.storyLabelSeen}`}>
          You
        </span>
      </button>

      {groupedStories.map((group) => {
        const photo = getUserAvatar(group.owner)
        const label = getUserLabel(group.owner)

        return (
          <button
            key={group.ownerId}
            onClick={() => openStory(group.latestStory)}
            className={styles.storyBtn}
            title={group.owner?.name || group.owner?.email || 'Story'}
          >
            <div className={`${styles.storyRingWrap} ${group.hasUnseen ? styles.storyRingUnseen : styles.storyRingSeen}`}>
              {photo ? (
                <img src={photo} alt={label} className={styles.storyImg} />
              ) : (
                <div className={styles.avatarInitial}>{label[0]?.toUpperCase() || '?'}</div>
              )}
            </div>
            <span className={`${styles.storyLabel} ${group.hasUnseen ? styles.storyLabelUnseen : styles.storyLabelSeen}`}>
              {label}
            </span>
          </button>
        )
      })}

      {groupedStories.length === 0 && (
        <div className={styles.storiesEmpty}>
          <span className={styles.storiesEmptyDot} />
          No new stories
        </div>
      )}
    </div>
  )
})
