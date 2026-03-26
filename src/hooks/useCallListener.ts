// src/hooks/useCallListener.ts
import { useEffect, useRef } from 'react';
import { createChatService } from '@/src/services/pb-chat.service';
import { pb, getPbFileUrl } from '@/src/lib/pb';
import { useStore } from '@/src/store/store';
import { useCallActions } from '@/src/hooks/useCallingStore';

const chatService = createChatService(pb);

export function useCallListener(userId: string | null) {
    const { openCall } = useCallActions();
    const unsubRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!userId) return;

        chatService.services.call_logs
            .subscribe((event) => {
                if (event.action !== 'create' && event.action !== 'update') return;
                const call = event.record;
                if (call.status !== 'ringing') return;
                if (!(call.participants ?? []).includes(userId)) return;
                if (call.initiator === userId) return;

                const conversations = useStore.getState().conversations;
                const conv = Object.values(conversations).find(
                    (c) => c.otherUser?.id === call.initiator,
                );
                const peer = conv?.otherUser;
                const makeUrl = (u: typeof peer) =>
                    u?.avatar
                        ? getPbFileUrl(
                            { id: u.id, collectionId: '_pb_users_auth_', collectionName: 'users' },
                            u.avatar,
                        )
                        : '';

                openCall({
                    cid: call.conversation ?? call.id,
                    callLogId: call.id,
                    isIncoming: true,
                    mode: call.call_type === 'video' ? 'video' : 'audio',
                    peerName: peer?.name ?? peer?.username ?? peer?.email ?? 'Unknown',
                    peerPhoto: makeUrl(peer),
                    callerName: peer?.name ?? peer?.username ?? peer?.email ?? 'Unknown',
                    callerPhoto: makeUrl(peer),
                    callerUid: call.initiator ?? '',
                    calleeUid: userId,
                    state: 'Incoming…',
                });
            })
            .then((unsub) => { unsubRef.current = unsub; })
            .catch(() => undefined);

        return () => { unsubRef.current?.(); unsubRef.current = null; };
    }, [userId]);
}