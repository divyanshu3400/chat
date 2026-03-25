'use client'

import { memo } from 'react'

import {
  ImageBubble,
  VideoBubble,
  GifBubble,
  FileBubble,
  AudioBubble,
  TextBubble,
} from './index'
import { mdRender } from '@/src/lib/utils'
import { PollBubble } from './PollBubble'
import type { PollsRecord, PollVotesRecord } from '@/src/types/pb-collections.types'
import type { MessageBubbleViewModel } from './MessageBubble'

export interface MessageContentViewModel extends MessageBubbleViewModel {
  poll?: PollsRecord | null
  pollVotes?: PollVotesRecord[]
  mediaWidth?: number
  mediaHeight?: number
  mimeType?: string
}

interface Props {
  msg: MessageContentViewModel
  mine: boolean
  cid: string
  id: string
  decryptedText?: string
  onLightbox: (url: string, type: 'image' | 'video') => void
}

export const MessageContent = memo(function MessageContent({
  msg,
  mine,
  cid,
  id,
  decryptedText,
  onLightbox,
}: Props) {
  switch (msg.type) {
    case 'image':
      return (
        <ImageBubble
          url={msg.url ?? ''}
          width={msg.mediaWidth}
          height={msg.mediaHeight}
          mine={mine}
          onLightbox={onLightbox}
        />
      )

    case 'video':
      return (
        <VideoBubble
          url={msg.url ?? ''}
          width={msg.mediaWidth}
          height={msg.mediaHeight}
          thumbnailUrl={msg.thumbnailUrl}
          duration={msg.duration}
          mine={mine}
          onLightbox={onLightbox}
        />
      )

    case 'audio':
      return (
        <AudioBubble
          url={msg.url ?? ''}
          duration={msg.duration}
          mine={mine}
        />
      )

    case 'gif':
      return (
        <GifBubble
          url={msg.url ?? ''}
          mine={mine}
          onLightbox={onLightbox}
        />
      )

    case 'file':
      return (
        <FileBubble
          url={msg.url ?? ''}
          fileName={msg.fileName}
          fileSize={msg.fileSize}
          mimeType={msg.mimeType}
          mine={mine}
        />
      )

    case 'poll':
      if (!msg.poll) {
        return <TextBubble html="Poll unavailable" mine={mine} />
      }

      return (
        <PollBubble
          poll={msg.poll}
          mine={mine}
          cid={cid}
          initialVotes={msg.pollVotes}
        />
      )

    default: {
      const html = decryptedText || mdRender(msg.text ?? '')
      return <TextBubble html={html} mine={mine} />
    }
  }
})
