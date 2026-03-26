'use client'

import { memo, useState, useCallback } from 'react'
import styles from './FileBubble.module.css'

interface Props {
    url: string
    fileName?: string
    fileSize?: string
    mimeType?: string
    mine: boolean
}

const FILE_TYPES: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pdf: {
        label: 'PDF',
        color: '#ef4444',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="22" height="22">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" />
            </svg>
        ),
    },
    doc: {
        label: 'DOC',
        color: '#3b82f6',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="22" height="22">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
        ),
    },
    xls: {
        label: 'XLS',
        color: '#22c55e',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="22" height="22">
                <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18" />
            </svg>
        ),
    },
    zip: {
        label: 'ZIP',
        color: '#f59e0b',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="22" height="22">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <path d="M12 3v12M7 8l5-5 5 5" />
            </svg>
        ),
    },
    img: {
        label: 'IMG',
        color: '#a855f7',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="22" height="22">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
            </svg>
        ),
    },
    default: {
        label: 'FILE',
        color: '#64748b',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="22" height="22">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
            </svg>
        ),
    },
}

function getFileType(name?: string, mime?: string) {
    const ext = name?.split('.').pop()?.toLowerCase() ?? ''
    const m = mime?.toLowerCase() ?? ''
    if (ext === 'pdf' || m.includes('pdf')) return FILE_TYPES.pdf
    if (['doc', 'docx'].includes(ext) || m.includes('word')) return FILE_TYPES.doc
    if (['xls', 'xlsx', 'csv'].includes(ext) || m.includes('sheet') || m.includes('excel')) return FILE_TYPES.xls
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return FILE_TYPES.zip
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) || m.startsWith('image/')) return FILE_TYPES.img
    return FILE_TYPES.default
}

type DlState = 'idle' | 'downloading' | 'done' | 'error'

export const FileBubble = memo(({ url, fileName, fileSize, mimeType, mine }: Props) => {
    const [dlState, setDlState] = useState<DlState>('idle')
    const [progress, setProgress] = useState(0)

    const ft = getFileType(fileName, mimeType)
    const shortName = fileName ?? 'Unknown file'
    const displayName = shortName.length > 32 ? `${shortName.substring(0, 29)}...` : shortName
    const mimeLabel = mimeType?.split('/')[1]?.replace(/[-_.]+/g, ' ')?.toUpperCase() ?? ft.label

    const download = useCallback(async () => {
        if (dlState !== 'idle') return
        setDlState('downloading')
        setProgress(0)

        try {
            const res = await fetch(url)
            const reader = res.body?.getReader()
            const total = Number(res.headers.get('content-length') || 0)
            const chunks: BlobPart[] = []
            let received = 0

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    if (value) {
                        chunks.push(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength))
                        received += value.length

                        if (total) {
                            setProgress(Math.min(99, Math.round((received / total) * 100)))
                        }
                    }
                }
            }

            setProgress(100)

            const blob = new Blob(chunks)
            const bUrl = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = bUrl
            a.download = fileName ?? 'download'
            a.click()
            URL.revokeObjectURL(bUrl)

            setDlState('done')
            setTimeout(() => setDlState('idle'), 3000)
        } catch {
            setDlState('error')
            setTimeout(() => setDlState('idle'), 2500)
        }
    }, [url, fileName, dlState])

    return (
        <div className={`${styles.wrap} ${mine ? styles.mine : styles.theirs}`}>
            <div className={styles.iconCol}>
                <div className={styles.iconWrap} style={{ '--ft-color': ft.color } as React.CSSProperties}>
                    <div className={styles.iconGlow} style={{ background: ft.color }} />
                    <span className={styles.iconSvg} style={{ color: ft.color }}>
                        {ft.icon}
                    </span>
                    <span className={styles.iconLabel} style={{ color: ft.color }}>{ft.label}</span>
                </div>
            </div>

            <div className={styles.info}>
                <div className={styles.fileName} title={shortName}>{displayName}</div>
                <div className={styles.meta}>
                    {fileSize && <span className={styles.metaChip}>{fileSize}</span>}
                    <span className={styles.metaChip}>{mimeLabel}</span>
                </div>

                {dlState === 'downloading' && (
                    <div className={styles.progressTrack}>
                        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                        <span className={styles.progressLabel}>{progress}%</span>
                    </div>
                )}

                <div className={styles.actions}>
                    {dlState === 'idle' && (
                        <button onClick={download} className={`${styles.dlBtn} ${mine ? styles.dlBtnMine : styles.dlBtnTheirs}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="12" height="12">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                            </svg>
                            Download
                        </button>
                    )}
                    {dlState === 'downloading' && (
                        <span className={styles.statusChip}>
                            <span className={styles.spinner} /> Downloading...
                        </span>
                    )}
                    {dlState === 'done' && (
                        <span className={`${styles.statusChip} ${styles.statusDone}`}>
                            Saved
                        </span>
                    )}
                    {dlState === 'error' && (
                        <span className={`${styles.statusChip} ${styles.statusError}`}>
                            Failed
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
})

FileBubble.displayName = 'FileBubble'
