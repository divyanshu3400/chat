import styles from './Sidebar.module.css';
import { memo } from "react";

/* ── Empty State ── */
type EmptyKind = 'no-convs' | 'no-results' | 'error'
export const SidebarEmpty = memo(({ kind, onAction }: { kind: EmptyKind; onAction?: () => void }) => {
    const cfg = {
        'no-convs': { icon: '✦', title: 'No conversations yet', body: 'Start a chat or create a group to get going.', cta: 'New Chat' },
        'no-results': { icon: '◎', title: 'Nothing found', body: 'Try a different name or message snippet.', cta: null },
        'error': { icon: '⚠', title: 'Failed to load', body: 'Something went wrong loading your chats.', cta: 'Retry' },
    }[kind]

    return (
        <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>{cfg.icon}</div>
            <div className={styles.emptyTitle}>{cfg.title}</div>
            <div className={styles.emptyBody}>{cfg.body}</div>
            {cfg.cta && onAction && (
                <button onClick={onAction} className={`${styles.emptyCta} ${kind !== 'error' ? styles.emptyCtaAccent : styles.emptyCtaNeutral}`}>
                    {cfg.cta}
                </button>
            )}
        </div>
    )
})
SidebarEmpty.displayName = 'SidebarEmpty'
