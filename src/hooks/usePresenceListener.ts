// src/hooks/usePresenceListener.ts
import { useEffect, useRef } from 'react';
import { createChatService } from '@/src/services/pb-chat.service';
import { pb } from '@/src/lib/pb';
import { usePresenceStore } from '../store/usePresenceStore';

const chatService = createChatService(pb);

export function usePresenceListener(active: boolean) {
    const setPresence = usePresenceStore((s) => s.setPresence);
    const unsubRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!active) return;

        chatService
            .subscribePresence((event) => {
                if (event.action === 'create' || event.action === 'update')
                    setPresence(event.record.userId ?? '', event.record);
            })
            .then((unsub) => { unsubRef.current = unsub; })
            .catch(() => undefined);

        return () => { unsubRef.current?.(); unsubRef.current = null; };
    }, [active]);
}