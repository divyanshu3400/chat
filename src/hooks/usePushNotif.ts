/**
 * hooks/usePushNotif.ts
 *
 * Handles:
 *  1. Requesting notification permission
 *  2. Getting the FCM token and saving it to Firebase DB
 *  3. Handling foreground messages (when app is open)
 *  4. Routing incoming call notifications to the call overlay
 *
 * Usage in CipherApp.tsx:
 *   const { initPush } = usePushNotif()
 *   useEffect(() => { if (me) initPush(me.uid) }, [me])
 */

import { useCallback } from 'react'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { getApp } from 'firebase/app'
import { getDatabase, ref, set } from 'firebase/database'
import { useStore } from '@/src/lib/store'
import { useCipherUIStore } from '@/src/lib/ui'
import { CallData } from '@/src/types'
import { useOverlayOpen } from './useCallingStore'

/* ── Your VAPID public key from Firebase Console ──────────────────────
   Firebase Console → Project Settings → Cloud Messaging → Web Push certs
   Generate a key pair → copy the public key here                       */
const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_KEY ?? ''

/* ═══════════════════════════════════════════════════════════════════════
   HOOK
═══════════════════════════════════════════════════════════════════════ */
export function usePushNotif() {
    const { showToast } = useStore()

    /* ── Register service worker + get FCM token ─────────────────────── */
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

        /* 3. Register service worker */
        let swReg: ServiceWorkerRegistration
        try {
            swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
        } catch (err) {
            console.error('[Push] SW registration failed:', err)
            return
        }

        /* 4. Get FCM token */
        try {
            const messaging = getMessaging(getApp())
            const token = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: swReg,
            })

            if (!token) {
                console.warn('[Push] No token received')
                return
            }

            /* 5. Save token to Firebase DB so Cloud Function can target this device */
            const db = getDatabase(getApp())
            await set(ref(db, `fcmTokens/${uid}`), {
                token,
                updatedAt: Date.now(),
                platform: 'web',
            })

            console.log('[Push] Token registered:', token.slice(0, 20) + '…')

            /* 6. Handle FOREGROUND messages (app is open + focused) */
            onMessage(messaging, payload => {
                const data = payload.data as Record<string, string> | undefined
                if (!data) return

                if (data.type === 'incoming_call') {
                    /* App is open — show in-app call overlay directly */
                    const cid = data.cid
                    const callerName = data.callerName ?? 'Unknown'
                    const callerPhoto = data.callerPhoto ?? ''
                    const mode = (data.mode ?? 'audio') as 'audio' | 'video'
                    const callerUid = data.callerUid ?? ''
                    const calleeUid = data.calleeUid ?? ''

                    const callData: CallData = {
                        peerName: callerName,
                        peerPhoto: callerPhoto,
                        callerName,
                        callerPhoto,
                        state: 'Incoming…',
                        isIncoming: true,
                        mode,
                        cid,
                        callerUid,
                        calleeUid,
                    }

                    useCipherUIStore.getState().setCallData(callData)
                }

                if (data.type === 'missed_call') {
                    showToast(`Missed call from ${data.callerName ?? 'Unknown'}`)
                }
            })

        } catch (err) {
            console.error('[Push] getToken failed:', err)
        }
    }, [showToast])

    return { initPush }
}