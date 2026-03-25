'use client'

import { memo, useCallback, useEffect, useMemo, useState } from 'react'

import { useStore } from '@/src/store/store'
import { createChatService } from '@/src/services/pb-chat.service'
import { pb } from '@/src/lib/pb'
import type { PollsRecord, PollVotesRecord } from '@/src/types/pb-collections.types'

const chatService = createChatService(pb)

type PollOptionValue = string

export interface PollBubbleProps {
  poll: PollsRecord
  mine: boolean
  cid: string
  initialVotes?: PollVotesRecord[]
  className?: string
}

function parseOptions(options: PollsRecord['options']): PollOptionValue[] {
  if (!Array.isArray(options)) {
    return []
  }

  return options
    .map((value) => (typeof value === 'string' ? value.trim() : String(value ?? '').trim()))
    .filter(Boolean)
}

function isExpired(poll: PollsRecord): boolean {
  if (!poll.expires_at) {
    return false
  }

  const time = Date.parse(poll.expires_at)
  return Number.isFinite(time) && time <= Date.now()
}

function formatDeadline(value?: string): string {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleString()
}

export const PollBubble = memo(function PollBubble({
  poll,
  mine,
  cid,
  initialVotes = [],
  className,
}: PollBubbleProps) {
  const me = useStore((state) => state.me)
  const [votes, setVotes] = useState<PollVotesRecord[]>(initialVotes)
  const [loading, setLoading] = useState(initialVotes.length === 0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const expired = isExpired(poll)
  const options = useMemo(() => parseOptions(poll.options), [poll.options])

  const tallies = useMemo(() => {
    const counts = options.map((_, index) => votes.filter((vote) => vote.option_index === index).length)
    const totalVotes = counts.reduce((sum, count) => sum + count, 0)

    return {
      counts,
      totalVotes,
      percentages: counts.map((count) => (totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0)),
    }
  }, [options, votes])

  const myVote = useMemo(() => {
    if (!me) {
      return null
    }

    return votes.find((vote) => vote.user === me.id) ?? null
  }, [me, votes])

  const loadVotes = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const nextVotes = await chatService.listPollVotes(poll.id)
      setVotes(nextVotes)
    } catch (loadError) {
      console.warn('[PollBubble] Failed to load poll votes:', loadError)
      setError('Failed to load votes')
    } finally {
      setLoading(false)
    }
  }, [poll.id])

  useEffect(() => {
    let active = true
    let unsub: (() => void) | null = null

    void loadVotes()

    void chatService.subscribePollVotes(poll.id, async () => {
      if (!active) {
        return
      }

      try {
        const nextVotes = await chatService.listPollVotes(poll.id)
        if (active) {
          setVotes(nextVotes)
        }
      } catch (subscriptionError) {
        console.warn('[PollBubble] Failed to refresh votes:', subscriptionError)
      }
    }).then((cleanup) => {
      unsub = cleanup
    }).catch((subscriptionError) => {
      console.warn('[PollBubble] Failed to subscribe poll votes:', subscriptionError)
    })

    return () => {
      active = false
      unsub?.()
    }
  }, [loadVotes, poll.id])

  const vote = useCallback(async (optionIndex: number) => {
    if (!me || submitting || expired) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      if (myVote?.option_index === optionIndex) {
        await chatService.services.poll_votes.delete(myVote.id)
      } else {
        await chatService.votePoll({
          pollId: poll.id,
          userId: me.id,
          optionIndex,
        })
      }

      const nextVotes = await chatService.listPollVotes(poll.id)
      setVotes(nextVotes)
    } catch (voteError) {
      console.warn('[PollBubble] Failed to vote:', voteError)
      setError('Vote failed')
    } finally {
      setSubmitting(false)
    }
  }, [expired, me, myVote, poll.id, submitting])

  return (
    <div
      className={className}
      style={{
        minWidth: 240,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4 }}>
          Poll: {poll.question}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11, opacity: 0.72 }}>
          <span>{tallies.totalVotes} vote{tallies.totalVotes !== 1 ? 's' : ''}</span>
          <span>{poll.is_anonymous ? 'Anonymous votes' : 'Votes visible'}</span>
          <span>{poll.allow_multiple ? 'Multi-select enabled in UI intent' : 'Single choice'}</span>
          {poll.expires_at && (
            <span>{expired ? 'Expired' : `Ends ${formatDeadline(poll.expires_at)}`}</span>
          )}
        </div>
      </div>

      {options.map((option, index) => {
        const count = tallies.counts[index] ?? 0
        const percentage = tallies.percentages[index] ?? 0
        const selected = myVote?.option_index === index

        return (
          <button
            key={`${poll.id}_${index}`}
            type="button"
            onClick={() => void vote(index)}
            disabled={!me || submitting || expired}
            style={{
              position: 'relative',
              overflow: 'hidden',
              padding: '10px 12px',
              borderRadius: 12,
              border: `1px solid ${selected
                  ? 'rgba(99,102,241,.55)'
                  : mine
                    ? 'rgba(255,255,255,.16)'
                    : 'var(--bd)'
                }`,
              cursor: !me || expired ? 'default' : 'pointer',
              transition: 'all .2s ease',
              background: selected
                ? (mine ? 'rgba(255,255,255,.14)' : 'rgba(99,102,241,.10)')
                : 'transparent',
              textAlign: 'left',
              opacity: !me || expired ? 0.88 : 1,
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                width: `${percentage}%`,
                background: mine ? 'rgba(255,255,255,.08)' : 'rgba(99,102,241,.08)',
                transition: 'width .35s ease',
              }}
            />

            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, lineHeight: 1.4 }}>
                {selected && <span style={{ fontWeight: 700, color: mine ? '#fff' : 'var(--ac)' }}>✓</span>}
                <span>{option}</span>
              </span>

              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, opacity: 0.78 }}>
                <span>{count}</span>
                <span>{percentage}%</span>
              </span>
            </div>
          </button>
        )
      })}

      {error && (
        <div style={{ fontSize: 11, color: '#ef4444' }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ fontSize: 11, opacity: 0.65 }}>
          Loading votes...
        </div>
      )}

      {!me && (
        <div style={{ fontSize: 11, opacity: 0.65 }}>
          Sign in to vote.
        </div>
      )}

      {expired && (
        <div style={{ fontSize: 11, opacity: 0.65 }}>
          This poll is closed.
        </div>
      )}
    </div>
  )
})
