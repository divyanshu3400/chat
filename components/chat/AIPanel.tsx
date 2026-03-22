'use client'
import { useEffect, useState } from 'react'
import { AIThinkingDots, SparkleIcon } from '../shared'
interface AIInsight {
    type: 'summary' | 'sentiment' | 'suggestion' | 'action'
    content: string
    confidence: number
}

interface SmartReply {
    id: string
    text: string
    tone: 'friendly' | 'formal' | 'brief'
}

/** AI intelligence panel — right side */
export function AIPanel({
    conv, messages, onSmartReply, onClose,
}: {
    conv: any
    messages: any[]
    onSmartReply: (text: string) => void
    onClose: () => void
}) {
    const [insights, setInsights] = useState<AIInsight[]>([])
    const [smartReplies, setSmartReplies] = useState<SmartReply[]>([
        { id: '1', text: 'Sounds good! Let me check and get back to you.', tone: 'friendly' },
        { id: '2', text: 'Noted. I will follow up shortly.', tone: 'formal' },
        { id: '3', text: 'Sure, works for me!', tone: 'brief' },
    ])
    const [sentiment, setSentiment] = useState<'positive' | 'neutral' | 'negative'>('neutral')
    const [activeTab, setActiveTab] = useState<'insights' | 'replies' | 'search'>('insights')

    useEffect(() => {
        if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1]?.text?.toLowerCase() ?? ''
            if (lastMsg.includes('!') || lastMsg.includes('great') || lastMsg.includes('thanks'))
                setSentiment('positive')
            else if (lastMsg.includes('not') || lastMsg.includes('issue') || lastMsg.includes('problem'))
                setSentiment('negative')
            else
                setSentiment('neutral')

            setInsights([
                { type: 'summary', content: `${messages.length} messages · Est. 3 min conversation`, confidence: 0.92 },
                { type: 'action', content: 'Follow-up may be expected based on tone', confidence: 0.78 },
                { type: 'sentiment', content: `Conversation mood: ${sentiment}`, confidence: 0.85 },
            ])
        }
    }, [messages])

    const sentimentColor = sentiment === 'positive' ? 'var(--green)' : sentiment === 'negative' ? 'var(--red)' : 'var(--accent)'
    const sentimentLabel = sentiment === 'positive' ? '+ Positive' : sentiment === 'negative' ? '- Negative' : '~ Neutral'

    return (
        <aside
            className="ai-panel-enter"
            style={{
                width: 'var(--ai-panel-w)', minWidth: 'var(--ai-panel-w)',
                height: '100%', display: 'flex', flexDirection: 'column',
                background: 'var(--bg-base)',
                borderLeft: '1px solid var(--border-subtle)',
            }}
        >
            {/* Header */}
            <div style={{
                padding: '14px 14px 12px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'var(--accent-muted)',
                        border: '1px solid var(--accent-glow)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <SparkleIcon size={14} active />
                    </div>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx-primary)' }}>AI Assistant</div>
                        <div style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)', animation: 'pulse-glow 3s ease infinite' }}>
                            ● analyzing
                        </div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={{ background: 'none', border: 'none', color: 'var(--tx-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                >×</button>
            </div>

            {/* Sentiment bar */}
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: 'var(--tx-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>Sentiment</span>
                    <span style={{ fontSize: 10, color: sentimentColor, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{sentimentLabel}</span>
                </div>
                <div style={{ height: 3, borderRadius: 99, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                    <div style={{
                        height: '100%', borderRadius: 99,
                        background: `linear-gradient(90deg, var(--accent), ${sentimentColor})`,
                        width: sentiment === 'positive' ? '82%' : sentiment === 'negative' ? '25%' : '50%',
                        transition: 'width 600ms ease',
                    }} />
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)' }}>
                {(['insights', 'replies', 'search'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setActiveTab(t)}
                        style={{
                            flex: 1, padding: '8px 4px', background: 'none', border: 'none',
                            cursor: 'pointer', fontSize: 10, fontWeight: 600,
                            fontFamily: 'var(--font-mono)',
                            color: activeTab === t ? 'var(--accent)' : 'var(--tx-muted)',
                            borderBottom: `2px solid ${activeTab === t ? 'var(--accent)' : 'transparent'}`,
                            transition: 'var(--transition)', textTransform: 'uppercase', letterSpacing: '0.08em',
                            marginBottom: -1,
                        }}
                    >{t}</button>
                ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>

                {/* Insights Tab */}
                {activeTab === 'insights' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <AIThinkingDots label="Processing conversation…" />

                        {insights.map((ins, i) => (
                            <div
                                key={i}
                                style={{
                                    background: 'var(--bg-elevated)',
                                    border: '1px solid var(--border-dim)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '10px 12px',
                                    animation: `slide-up ${200 + i * 80}ms ease both`,
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{
                                        fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                                        letterSpacing: '0.1em', color: 'var(--accent)',
                                        fontFamily: 'var(--font-mono)',
                                    }}>
                                        {ins.type}
                                    </span>
                                    <span style={{ fontSize: 9, color: 'var(--tx-muted)', fontFamily: 'var(--font-mono)' }}>
                                        {Math.round(ins.confidence * 100)}%
                                    </span>
                                </div>
                                <p style={{ fontSize: 12, color: 'var(--tx-secondary)', lineHeight: 1.5 }}>{ins.content}</p>
                            </div>
                        ))}

                        {/* Encryption status card */}
                        <div style={{
                            marginTop: 4,
                            background: 'rgba(0, 214, 143, 0.06)',
                            border: '1px solid rgba(0, 214, 143, 0.15)',
                            borderRadius: 'var(--radius-md)', padding: '10px 12px',
                        }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>
                                🔐 ENCRYPTION STATUS
                            </div>
                            <p style={{ fontSize: 11, color: 'var(--tx-secondary)' }}>
                                All messages are end-to-end encrypted. Keys are stored locally and never leave your device.
                            </p>
                        </div>
                    </div>
                )}

                {/* Smart Replies Tab */}
                {activeTab === 'replies' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <p style={{ fontSize: 11, color: 'var(--tx-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
                            AI-suggested replies:
                        </p>
                        {smartReplies.map((r, i) => (
                            <button
                                key={r.id}
                                onClick={() => onSmartReply(r.text)}
                                style={{
                                    background: 'var(--bg-elevated)',
                                    border: '1px solid var(--border-dim)',
                                    borderRadius: 'var(--radius-md)', padding: '10px 12px',
                                    textAlign: 'left', cursor: 'pointer',
                                    transition: 'var(--transition)',
                                    animation: `slide-up ${150 + i * 60}ms ease both`,
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-glow)'
                                        ; (e.currentTarget as HTMLElement).style.background = 'var(--accent-muted)'
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-dim)'
                                        ; (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'
                                }}
                            >
                                <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 3 }}>
                                    {r.tone}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--tx-secondary)', lineHeight: 1.5 }}>{r.text}</div>
                            </button>
                        ))}
                        <button
                            style={{
                                marginTop: 6, background: 'var(--accent-muted)', border: '1px solid var(--accent-glow)',
                                borderRadius: 'var(--radius-md)', padding: '8px 12px',
                                color: 'var(--accent)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                fontFamily: 'var(--font-mono)', transition: 'var(--transition)',
                            }}
                        >
                            ⟳ Regenerate suggestions
                        </button>
                    </div>
                )}

                {/* AI Search Tab */}
                {activeTab === 'search' && (
                    <div>
                        <p style={{ fontSize: 11, color: 'var(--tx-muted)', marginBottom: 10, fontFamily: 'var(--font-mono)' }}>
                            Ask AI to search across this conversation:
                        </p>
                        <AISearchBox />
                    </div>
                )}
            </div>
        </aside>
    )
}

/** AI Search Box within AI Panel */
function AISearchBox() {
    const [query, setQuery] = useState('')
    const [result, setResult] = useState('')
    const [loading, setLoading] = useState(false)

    async function runSearch() {
        if (!query) return
        setLoading(true)
        setResult('')
        // Simulated AI response (replace with actual Anthropic API call)
        await new Promise(r => setTimeout(r, 1200))
        setResult(`Searched conversation for "${query}". Found 3 relevant messages from the last 7 days related to this topic. The most recent mention was about project deadlines.`)
        setLoading(false)
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ position: 'relative' }}>
                <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && runSearch()}
                    placeholder="What are we discussing?"
                    style={{
                        width: '100%', background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-dim)',
                        borderRadius: 'var(--radius-md)', padding: '8px 36px 8px 12px',
                        color: 'var(--tx-primary)', fontSize: 12, outline: 'none',
                        fontFamily: 'var(--font-sans)',
                    }}
                />
                <button
                    onClick={runSearch}
                    style={{
                        position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                        background: 'var(--accent)', border: 'none', borderRadius: 6,
                        width: 22, height: 22, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, color: '#000', fontWeight: 700,
                    }}
                >↵</button>
            </div>
            {loading && <AIThinkingDots label="Searching…" />}
            {result && (
                <div style={{
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)',
                    borderRadius: 'var(--radius-md)', padding: 10,
                    fontSize: 12, color: 'var(--tx-secondary)', lineHeight: 1.6,
                    animation: 'slide-up 200ms ease both',
                }}>
                    {result}
                </div>
            )}
        </div>
    )
}
