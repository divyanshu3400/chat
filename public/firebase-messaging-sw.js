/**
 * public/firebase-messaging-sw.js
 *
 * Firebase Cloud Messaging service worker.
 * Handles push notifications when the app is in the background or closed.
 *
 * IMPORTANT: This file must be at /public/firebase-messaging-sw.js
 * so it is served from the root: https://yourdomain.com/firebase-messaging-sw.js
 *
 * Replace all YOUR_* values with your actual Firebase config values.
 * These CANNOT use process.env — service workers run outside Next.js.
 * Hardcode them here (they are safe to expose — they are public API keys).
 */

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

firebase.initializeApp({
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_PROJECT.firebaseapp.com',
    databaseURL: 'https://YOUR_PROJECT-default-rtdb.firebaseio.com',
    projectId: 'YOUR_PROJECT',
    storageBucket: 'YOUR_PROJECT.appspot.com',
    messagingSenderId: 'YOUR_SENDER_ID',
    appId: 'YOUR_APP_ID',
})

const messaging = firebase.messaging()

/* ── Handle background messages ─────────────────────────────────────── */
messaging.onBackgroundMessage(payload => {
    const data = payload.data ?? {}

    if (data.type === 'incoming_call') {
        /* Show a rich call notification */
        return self.registration.showNotification('Incoming call', {
            body: `${data.callerName ?? 'Someone'} is calling you (${data.mode ?? 'audio'})`,
            icon: data.callerPhoto || '/icons/cipher-icon-192.png',
            badge: '/icons/cipher-badge-72.png',
            tag: `call-${data.cid}`,         /* prevents duplicate notifications */
            renotify: true,
            vibrate: [200, 100, 200, 100, 200],  /* buzz pattern */
            requireInteraction: true,            /* stays until dismissed */
            data: {
                url: `/?call=${data.cid}`,  /* deep link to open the app */
                cid: data.cid,
                callerName: data.callerName,
                mode: data.mode,
            },
            actions: [
                { action: 'accept', title: '✓ Accept' },
                { action: 'decline', title: '✕ Decline' },
            ],
        })
    }

    if (data.type === 'missed_call') {
        return self.registration.showNotification('Missed call', {
            body: `You missed a call from ${data.callerName ?? 'Unknown'}`,
            icon: data.callerPhoto || '/icons/cipher-icon-192.png',
            badge: '/icons/cipher-badge-72.png',
            tag: `missed-${data.cid}`,
            data: { url: '/' },
        })
    }

    /* Fallback for any other notification type */
    if (payload.notification) {
        return self.registration.showNotification(
            payload.notification.title ?? 'Cipher',
            {
                body: payload.notification.body ?? '',
                icon: payload.notification.icon || '/icons/cipher-icon-192.png',
                badge: '/icons/cipher-badge-72.png',
                data: { url: '/' },
            }
        )
    }
})

/* ── Notification click handler ─────────────────────────────────────── */
self.addEventListener('notificationclick', event => {
    event.notification.close()

    const data = event.notification.data ?? {}
    const action = event.action

    /* Handle Accept / Decline action buttons */
    if (action === 'accept' || action === 'decline') {
        const targetUrl = action === 'accept'
            ? `/?call=${data.cid}&action=accept`
            : `/?call=${data.cid}&action=decline`

        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then(windowClients => {
                    /* If app is already open, focus it and send a message */
                    for (const client of windowClients) {
                        if (client.url.includes(self.location.origin)) {
                            client.focus()
                            client.postMessage({
                                type: action === 'accept' ? 'ACCEPT_CALL' : 'DECLINE_CALL',
                                cid: data.cid,
                            })
                            return
                        }
                    }
                    /* Otherwise open the app */
                    return clients.openWindow(targetUrl)
                })
        )
        return
    }

    /* Default click — just open / focus the app */
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(windowClients => {
                for (const client of windowClients) {
                    if (client.url.includes(self.location.origin)) {
                        return client.focus()
                    }
                }
                return clients.openWindow(data.url || '/')
            })
    )
})