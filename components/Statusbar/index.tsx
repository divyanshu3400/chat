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
                <span className={styles.brandTag}>v2.0-ai</span>
            </div>

            {/* Center — connection pulse */}
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
            >
                <SparkleIcon size={11} active={aiActive} />
                AI {aiActive ? 'ON' : 'OFF'}
            </button>

        </div>
    )
}