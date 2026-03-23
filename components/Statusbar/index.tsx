'use client'

/**
 * StatusBar.tsx - Responsive Version
 * 
 * Handles:
 * ✅ Mobile: Compact, single row, no overflow
 * ✅ Tablet: Medium spacing
 * ✅ Desktop: Full featured
 * ✅ Doesn't overlap with FloatingCallWindow
 * ✅ Proper z-index layering
 */

import { NeuralIcon, SparkleIcon } from '../shared'
import styles from './StatusBar.module.css'

interface StatusBarProps {
    aiActive: boolean
    onToggleAI: () => void
}

export default function StatusBar({ aiActive, onToggleAI }: StatusBarProps) {
    return (
        <div className={styles.bar}>
            {/* Left — brand */}
            <div className={styles.brand}>
                <NeuralIcon size={16} />
                <span className={styles.brandName}>CIPHER</span>
                {/* Show tag only on larger screens */}
                <span className={styles.brandTag}>v2.0-ai</span>
            </div>

            {/* Center — connection pulse (hidden on mobile) */}
            <div className={styles.center}>
                <div className={styles.dotWrap}>
                    <div className={styles.dot} />
                    <div className={styles.dotPing} />
                </div>
                <span className={styles.liveLabel}>e2e encrypted · live</span>
            </div>

            {/* Right — AI toggle */}
            <button
                onClick={onToggleAI}
                className={`${styles.aiBtn} ${aiActive ? styles.aiActive : styles.aiInactive}`}
                title={aiActive ? 'Disable AI' : 'Enable AI'}
                aria-label={aiActive ? 'AI is on' : 'AI is off'}
            >
                <SparkleIcon size={11} active={aiActive} />
                <span className={styles.aiText}>AI {aiActive ? 'ON' : 'OFF'}</span>
            </button>
        </div>
    )
}