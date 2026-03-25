import { useStore } from "@/src/store/store";
import { memo, useMemo } from "react";

/* ── REACTION ROW ── */
export const ReactionRow = memo(({ id, reactions, mine, onReact, onShowReactors }:
    { id: string; reactions: Record<string, string>; mine: boolean; onReact: (e: string) => void; onShowReactors: (e: string, users: any[]) => void }
) => {
    const { me } = useStore()
    const counts = useMemo(() => {
        const c: Record<string, { count: number; uids: string[] }> = {}
        Object.entries(reactions).forEach(([uid, emoji]) => {
            if (!c[emoji]) c[emoji] = { count: 0, uids: [] }
            c[emoji].count++
            c[emoji].uids.push(uid)
        })
        return c
    }, [reactions])

    return (
        <div style={{
            display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4,
            justifyContent: mine ? 'flex-end' : 'flex-start',
        }}>
            {Object.entries(counts).map(([emoji, { count, uids }]) => {
                const iMe = me ? uids.includes(me.id) : false
                return (
                    <button
                        key={emoji}
                        onClick={() => onReact(emoji)}
                        // onLongPress={() => { }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '3px 8px', borderRadius: 20,
                            background: iMe ? 'rgba(99,102,241,.15)' : 'var(--s3)',
                            border: `1px solid ${iMe ? 'rgba(99,102,241,.4)' : 'var(--bd)'}`,
                            cursor: 'pointer', fontSize: 13, transition: 'all .15s',
                        }}
                        onContextMenu={e => { e.preventDefault(); onShowReactors(emoji, uids.map(u => ({ uid: u, name: u, photo: '' }))) }}
                    >
                        {emoji}
                        {count > 1 && <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--tx2)' }}>{count}</span>}
                    </button>
                )
            })}
        </div>
    )
})
ReactionRow.displayName = 'ReactionRow'
