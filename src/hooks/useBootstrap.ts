// src/hooks/useBootstrap.ts  — remove unused setMe
import { useEffect } from 'react';
import { loadOrGenKeys } from '@/src/lib/crypto';
import { createChatService } from '@/src/services/pb-chat.service';
import { pb } from '@/src/lib/pb';
import { useStore } from '@/src/store/store';

const chatService = createChatService(pb);

export function useBootstrap(userId: string | null) {
    const setMyKP = useStore((s) => s.setMyKP);

    useEffect(() => {
        if (!userId) return;

        (async () => {
            const kp = (await loadOrGenKeys(userId)) as CryptoKeyPair;
            setMyKP(kp);

            const { Crypto } = await import('@/src/lib/crypto');
            const pubkey = await Crypto.exportPub(kp.publicKey);

            await chatService.services.pubkeys
                .getFullList({ filter: `userId = "${userId}"`, batch: 1 })
                .then(async (rows) => {
                    rows[0]?.id
                        ? await chatService.services.pubkeys.update(rows[0].id, { userId, pubkey })
                        : await chatService.services.pubkeys.create({ userId, pubkey });
                })
                .catch(() => undefined);

            await chatService.setPresence({ userId, online: true }).catch(() => undefined);
            await chatService.services.users
                .update(userId, { last_seen: new Date().toISOString() })
                .catch(() => undefined);
        })();

        const setOffline = () =>
            chatService
                .setPresence({ userId, online: false, lastSeen: new Date().toISOString() })
                .catch(() => undefined);

        window.addEventListener('beforeunload', setOffline, { once: true });
        return () => window.removeEventListener('beforeunload', setOffline);
    }, [userId]);
}