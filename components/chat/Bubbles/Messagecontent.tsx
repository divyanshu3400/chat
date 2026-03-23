'use client'

import { memo } from 'react'
import type { Message } from '@/types'   // adjust to your actual type path

import {
    ImageBubble,
    VideoBubble,
    GifBubble,
    FileBubble,
    AudioBubble,
    TextBubble,
} from './index'

// Your existing md renderer
import { mdRender } from '@/lib/utils'
import { PollBubble } from './PollBubble'

interface Props {
    msg: Message
    mine: boolean
    cid: string
    id: string
    decryptedText?: string
    onLightbox: (url: string, type: 'image' | 'video') => void
}

export const MessageContent = memo(({
    msg, mine, cid, id, decryptedText, onLightbox,
}: Props) => {

    switch (msg.type) {

        /* ── Image ─────────────────────────────────────────── */
        case 'image':
            return (
                <ImageBubble
                    url={msg.url!}
                    width={msg.mediaWidth}
                    height={msg.mediaHeight}
                    mine={mine}
                    onLightbox={onLightbox}
                />
            )

        /* ── Video ─────────────────────────────────────────── */
        case 'video':
            return (
                <VideoBubble
                    url={msg.url!}
                    width={msg.mediaWidth}
                    height={msg.mediaHeight}
                    thumbnailUrl={msg.thumbnailUrl}
                    duration={msg.duration}
                    mine={mine}
                    onLightbox={onLightbox}
                />
            )

        /* ── Audio / Voice message ─────────────────────────── */
        case 'audio':
            return (
                <AudioBubble
                    url={msg.url!}
                    duration={msg.duration}
                    mine={mine}
                />
            )

        /* ── GIF ───────────────────────────────────────────── */
        case 'gif':
            return (
                <GifBubble
                    url={msg.url!}
                    mine={mine}
                    onLightbox={onLightbox}
                />
            )

        /* ── File attachment ───────────────────────────────── */
        case 'file':
            return (
                <FileBubble
                    url={msg.url!}
                    fileName={msg.fileName}
                    fileSize={msg.fileSize}
                    mimeType={msg.mimeType}
                    mine={mine}
                />
            )

        /* ── Poll ──────────────────────────────────────────── */
        case 'poll':
            return <PollBubble id={id} msg={msg} mine={mine} cid={cid} />

        /* ── Text / Markdown (default) ─────────────────────── */
        default: {
            const html = decryptedText || mdRender(msg.text ?? '')
            return <TextBubble html={html} mine={mine} />
        }
    }
})

MessageContent.displayName = 'MessageContent'