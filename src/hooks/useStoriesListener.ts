// src/hooks/useStoriesListener.ts
import { useEffect, useRef } from 'react';
import { createChatService } from '@/src/services/pb-chat.service';
import { pb } from '@/src/lib/pb';
import { useStore } from '@/src/store/store';

const chatService = createChatService(pb);

export function useStoriesListener(active: boolean) {
    const setStories = useStore((s) => s.setStories);
    const unsubRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!active) return;

        const since = new Date(Date.now() - 86_400_000).toISOString();
        const reload = () =>
            chatService.services.stories
                .list({ page: 1, perPage: 200, filter: `created >= "${since}"`, sort: '-created' })
                .then((r) => setStories(r.items as any[]))
                .catch(() => undefined);

        void reload();

        chatService.services.stories
            .subscribe(() => { void reload(); })
            .then((unsub) => { unsubRef.current = unsub; })
            .catch(() => undefined);

        return () => { unsubRef.current?.(); unsubRef.current = null; };
    }, [active]);
}