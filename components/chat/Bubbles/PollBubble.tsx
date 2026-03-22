import { memo } from 'react'
import { useStore } from '@/lib/store'
import type { Message } from '@/types'
import { ref, update, get } from 'firebase/database'
import { getFirebaseDB } from '@/lib/firebase'

/* ── POLL BUBBLE ── */
export const PollBubble = memo(({ id, msg, mine, cid }: { id: string; msg: Message; mine: boolean; cid: string }) => {
    const { me } = useStore()
    const votes = (msg.votes ?? {}) as Record<string, number>
    const total = Object.keys(votes).length
    const myVote = me ? votes[me.uid] : undefined
    const options = msg.poll?.options ?? []

    async function vote(optIdx: number) {
        if (!me) return
        const db = getFirebaseDB()
        const snap = await get(ref(db, `messages/${cid}/${id}/votes/${me.uid}`))
        if (snap.val() === optIdx) {
            update(ref(db, `messages/${cid}/${id}/votes`), { [me.uid]: null })
        } else {
            update(ref(db, `messages/${cid}/${id}/votes`), { [me.uid]: optIdx })
        }
    }

    return (
        <div style={{ minWidth: 220 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
                📊 {msg.poll?.question}
            </div>
            {options.map((opt, i) => {
                const cnt = Object.values(votes).filter(v => v === i).length
                const pct = total ? Math.round(cnt / total * 100) : 0
                const isMe = myVote === i
                return (
                    <div
                        key={i}
                        onClick={() => vote(i)}
                        style={{
                            position: 'relative', overflow: 'hidden',
                            padding: '9px 12px', borderRadius: 10,
                            border: `1px solid ${isMe ? 'rgba(99,102,241,.5)' : mine ? 'rgba(255,255,255,.15)' : 'var(--bd)'}`,
                            marginBottom: 6, cursor: 'pointer', transition: 'all .2s',
                            background: isMe
                                ? (mine ? 'rgba(255,255,255,.15)' : 'rgba(99,102,241,.1)')
                                : 'transparent',
                        }}
                    >
                        {/* Fill bar */}
                        <div style={{
                            position: 'absolute', left: 0, top: 0, bottom: 0,
                            width: `${pct}%`,
                            background: mine ? 'rgba(255,255,255,.08)' : 'rgba(99,102,241,.07)',
                            transition: 'width .4s ease',
                        }} />
                        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13 }}>
                                {isMe && <span style={{ marginRight: 5, color: mine ? '#fff' : 'var(--ac)' }}>✓</span>}
                                {opt}
                            </span>
                            {total > 0 && (
                                <span style={{ fontSize: 11, fontFamily: 'var(--mono)', opacity: .7 }}>{pct}%</span>
                            )}
                        </div>
                    </div>
                )
            })}
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', opacity: .55, marginTop: 4 }}>
                {total} vote{total !== 1 ? 's' : ''}
            </div>
        </div>
    )
})
PollBubble.displayName = 'PollBubble'
