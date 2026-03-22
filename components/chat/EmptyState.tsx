'use client'

import { memo, useEffect, useState } from 'react'
import styles from './EnhancedEmptyState.module.css'
import { useGestureHint } from '@/lib/Usegesturehint'
import { useDragGesture } from '@/lib/Usedraggesture'

/* ═══════════════════════════════════════════════════════════════════════════
   PROPS
═══════════════════════════════════════════════════════════════════════════ */

interface Props {
    onNewChat: () => void
    onNewGroup?: () => void
    onSidebarOpen?: () => void
}

/* ═══════════════════════════════════════════════════════════════════════════
   NEURAL NETWORK VISUALIZATION
═══════════════════════════════════════════════════════════════════════════ */

const NeuralNetworkViz = memo(({ nodes, edges }: any) => (
    <svg
        className={styles.neuralIcon}
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
    >
        <defs>
            <linearGradient
                id="neural-grad"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
            >
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <filter id="neural-glow">
                <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>

        {/* Hexagon background */}
        <path
            d="M 50 15 L 85 35 L 85 65 L 50 85 L 15 65 L 15 35 Z"
            fill="none"
            stroke="url(#neural-grad)"
            strokeWidth="1.5"
            opacity="0.6"
        />

        {/* Inner circle */}
        <circle
            cx="50"
            cy="50"
            r="12"
            fill="url(#neural-grad)"
            filter="url(#neural-glow)"
        />

        {/* Connection lines */}
        {edges.map(([a, b]: number[], i: number) => {
            const na = nodes[a]
            const nb = nodes[b]
            return (
                <line
                    key={`edge-${i}`}
                    x1={na.cx}
                    y1={na.cy}
                    x2={nb.cx}
                    y2={nb.cy}
                    stroke="url(#neural-grad)"
                    strokeWidth="0.8"
                    opacity="0.4"
                />
            )
        })}

        {/* Nodes */}
        {nodes.map((node: any, i: number) => (
            <circle
                key={`node-${i}`}
                cx={node.cx}
                cy={node.cy}
                r={node.r}
                fill="url(#neural-grad)"
                opacity={node.primary ? 1 : 0.7}
                filter={node.primary ? 'url(#neural-glow)' : undefined}
            />
        ))}
    </svg>
))

NeuralNetworkViz.displayName = 'NeuralNetworkViz'

/* ═══════════════════════════════════════════════════════════════════════════
   GESTURE HINT COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

interface GestureHintProps {
    visible: boolean
    phase: number
    onDismiss: () => void
}

const GestureHint = memo(({ visible, phase, onDismiss }: GestureHintProps) => {
    if (!visible || phase === 0) return null

    const isFadingOut = phase === 2

    return (
        <div
            className={styles.gestureHintOverlay}
            style={{
                pointerEvents: isFadingOut ? 'none' : 'auto',
            }}
        >
            {/* Semi-transparent overlay */}
            <div
                className={styles.gestureHintOverlayDimmed}
                style={{
                    opacity: isFadingOut ? 0 : 0.5,
                    transition: 'opacity 0.3s ease',
                }}
            />

            {/* Gesture hint card */}
            <div
                className={`${styles.gestureHintContainer} ${isFadingOut ? styles.gestureHintContainerFadeOut : ''
                    }`}
                style={{
                    opacity: isFadingOut ? 0 : 1,
                    transition: 'opacity 0.3s ease',
                }}
            >
                {/* Hand icon with animation */}
                <div style={{ position: 'relative', width: 32, height: 32 }}>
                    <div className={styles.handIcon}>👆</div>
                    <div className={styles.fingerLine} />
                </div>

                {/* Text card */}
                <div className={styles.gestureText}>
                    <div style={{ position: 'relative', width: '100%' }}>
                        <button
                            onClick={onDismiss}
                            className={styles.dismissBtn}
                            aria-label="Dismiss gesture hint"
                        >
                            ✕
                        </button>
                    </div>
                    <div className={styles.gestureTextPrimary}>Drag to Open</div>
                    <div className={styles.gestureTextSecondary}>Swipe from left edge</div>
                </div>
            </div>
        </div>
    )
})

GestureHint.displayName = 'GestureHint'

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

const EnhancedEmptyState = memo(
    ({ onNewChat, onNewGroup, onSidebarOpen }: Props) => {
        const [dragProgress, setDragProgress] = useState(0)
        const [hintPhase, setHintPhase] = useState(0)
        const { showGestureHint, dismissHint } = useGestureHint()

        // Neural network nodes
        const nodes = [
            { cx: 50, cy: 50, r: 4, primary: true },
            { cx: 25, cy: 30, r: 2.5, primary: false },
            { cx: 75, cy: 30, r: 2.5, primary: false },
            { cx: 15, cy: 55, r: 2, primary: false },
            { cx: 85, cy: 55, r: 2, primary: false },
            { cx: 35, cy: 75, r: 2, primary: false },
            { cx: 65, cy: 75, r: 2, primary: false },
        ]

        const edges = [
            [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
            [1, 3], [2, 4], [3, 5], [4, 6],
        ]

        // Gesture hint lifecycle
        useEffect(() => {
            if (!showGestureHint) {
                setHintPhase(0)
                return
            }

            setHintPhase(1)

            // Auto-dismiss after 4.5 seconds
            const timeout = setTimeout(() => {
                setHintPhase(2)
            }, 4500)

            return () => clearTimeout(timeout)
        }, [showGestureHint])

        const handleHintDismiss = () => {
            setHintPhase(2)
            setTimeout(dismissHint, 200)
        }

        // Drag gesture detection
        useDragGesture(true, {
            threshold: 80,
            onDragStart: () => {
                // Visual feedback
            },
            onDragProgress: (progress) => {
                setDragProgress(progress)
            },
            onDragEnd: () => {
                setDragProgress(0)
            },
            onComplete: () => {
                dismissHint()
                onSidebarOpen?.()
            },
        })

        return (
            <div className={styles.emptyState}>
                {/* Drag indicator on left edge */}
                <div
                    className={`${styles.dragIndicator} ${dragProgress > 0 ? styles.dragIndicatorActive : ''
                        }`}
                    style={{
                        opacity: dragProgress * 0.8,
                    }}
                />

                {/* Neural visualization */}
                <div className={styles.neuralVisualization}>
                    <NeuralNetworkViz nodes={nodes} edges={edges} />

                    {/* Glow ring */}
                    <div className={styles.glowRing} />
                </div>

                {/* Content */}
                <div className={styles.emptyContent}>
                    <div className={styles.emptyHeading}>
                        <h1>Cipher AI Messenger</h1>
                        <p className={styles.emptySubtext}>
                            End-to-end encrypted conversations
                            <br />
                            with AI-powered insights
                        </p>
                    </div>

                    {/* CTAs */}
                    <div className={styles.emptyCtas}>
                        <button
                            className={`${styles.ctaBtn} ${styles.ctaBtnPrimary}`}
                            onClick={onNewChat}
                        >
                            <span>💬</span>
                            Start a Chat
                        </button>
                        {onNewGroup && (
                            <button
                                className={`${styles.ctaBtn} ${styles.ctaBtnSecondary}`}
                                onClick={onNewGroup}
                            >
                                <span>👥</span>
                                New Group
                            </button>
                        )}
                    </div>

                    {/* Features grid */}
                    <div className={styles.featuresGrid}>
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>🔐</div>
                            <div className={styles.featureName}>E2E Encrypted</div>
                        </div>
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>✦</div>
                            <div className={styles.featureName}>AI Insights</div>
                        </div>
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>⚡</div>
                            <div className={styles.featureName}>Real-time</div>
                        </div>
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>🌍</div>
                            <div className={styles.featureName}>Global Network</div>
                        </div>
                    </div>
                </div>

                {/* Gesture Hint - Mobile Only */}
                <GestureHint
                    visible={showGestureHint}
                    phase={hintPhase}
                    onDismiss={handleHintDismiss}
                />
            </div>
        )
    }
)

EnhancedEmptyState.displayName = 'EnhancedEmptyState'

export default EnhancedEmptyState