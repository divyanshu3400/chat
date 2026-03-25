import { memo } from 'react'
import styles from './Sidebar.module.css'

/* ── Skeleton ── */
export const SkeletonCard = memo(({ delay = 0 }: { delay?: number }) => (
    <div className={styles.skeletonCard} style={{ animationDelay: `${delay}s` }}>
        <div className={styles.skeletonAvatar} />
        <div className={styles.skeletonLines}>
            <div className={styles.skeletonLine} style={{ width: '55%' }} />
            <div className={styles.skeletonLine} style={{ width: '80%' }} />
        </div>
    </div>
))
SkeletonCard.displayName = 'SkeletonCard'
