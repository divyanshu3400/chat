import { useCallback } from 'react'
import { useStore } from '@/src/store/store'
import { useCallingStore } from './useCallingStore'
import { pb, COLLECTIONS } from '@/src/lib/pb'

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_KEY ?? ''
const PB_URL = process.env.NEXT_PUBLIC_PB_URL ?? 'https://com.example.com/db'

export function usePushNotif() {
    const { showToast } = useStore()

    const initPush = useCallback(async (uid: string) => {
        /* 1. Check support */
        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
            console.warn('[Push] Not supported in this browser')
            return
        }

        /* 2. Request permission */
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
            console.warn('[Push] Permission denied')
            return
        }

        /* 3. Register service worker
              Use your own SW instead of firebase-messaging-sw.js */
        let swReg: ServiceWorkerRegistration
        try {
            swReg = await navigator.serviceWorker.register('/sw.js')
        } catch (err) {
            console.error('[Push] SW registration failed:', err)
            return
        }

        /* 4. Subscribe to Web Push using VAPID */
        try {
            let subscription = await swReg.pushManager.getSubscription()

            if (!subscription) {
                subscription = await swReg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) as unknown as BufferSource,
                })
            }

            /* 5. Save subscription to PocketBase push_tokens collection */
            const subJson = subscription.toJSON()
            const tokenPayload = {
                userId: uid,
                endpoint: subJson.endpoint,
                p256dh: (subJson.keys as any)?.p256dh ?? '',
                auth: (subJson.keys as any)?.auth ?? '',
                platform: 'web',
                updatedAt: new Date().toISOString(),
            }

            /* Upsert — update if exists, create if not */
            const existing = await pb
                .collection(COLLECTIONS.PUSH_TOKENS)
                .getFirstListItem(`userId="${uid}"`)
                .catch(() => null)

            if (existing) {
                await pb.collection(COLLECTIONS.PUSH_TOKENS).update(existing.id, tokenPayload)
            } else {
                await pb.collection(COLLECTIONS.PUSH_TOKENS).create(tokenPayload)
            }

            console.log('[Push] Subscription registered for uid:', uid)

            /* 6. Handle FOREGROUND messages via SW message event
                  Your SW should postMessage to the page for foreground push events */
            navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
                const data = event.data as Record<string, string> | undefined
                if (!data) return

                if (data.type === 'incoming_call') {
                    useCallingStore.getState().openCall({
                        cid: data.cid ?? '',
                        isIncoming: true,
                        mode: (data.mode ?? 'audio') as 'audio' | 'video',
                        peerName: data.callerName ?? 'Unknown',
                        peerPhoto: data.callerPhoto ?? '',
                        callerName: data.callerName ?? 'Unknown',
                        callerPhoto: data.callerPhoto ?? '',
                        callerUid: data.callerUid ?? '',
                        calleeUid: data.calleeUid ?? '',
                        state: 'Incoming…',
                    })
                }

                if (data.type === 'missed_call') {
                    showToast(`Missed call from ${data.callerName ?? 'Unknown'}`)
                }
            })

        } catch (err) {
            console.error('[Push] Push subscription failed:', err)
        }
    }, [showToast])

    return { initPush }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; i++) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}