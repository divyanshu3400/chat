// public/sw.js

self.addEventListener('push', event => {
    if (!event.data) return

    let data = {}
    try { data = event.data.json() } catch { return }

    /* Forward to the open page client for foreground handling */
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
            if (clients.length > 0) {
                /* App is open — postMessage instead of showing notification */
                clients.forEach(client => client.postMessage(data))
                return
            }

            /* App is in background — show system notification */
            const title = data.title ?? 'New message'
            const options = {
                body: data.body ?? '',
                icon: data.icon ?? '/icon-192.png',
                badge: '/badge-72.png',
                data: { cid: data.cid, type: data.type },
                actions: data.type === 'incoming_call'
                    ? [
                        { action: 'accept', title: 'Accept' },
                        { action: 'decline', title: 'Decline' },
                    ]
                    : [],
            }
            return self.registration.showNotification(title, options)
        })
    )
})

self.addEventListener('notificationclick', event => {
    event.notification.close()
    const data = event.notification.data ?? {}

    if (event.action === 'decline') {
        /* Tell the app to mark call as declined */
        event.waitUntil(
            self.clients.matchAll({ type: 'window' }).then(clients => {
                clients.forEach(c => c.postMessage({ type: 'DECLINE_CALL', cid: data.cid }))
            })
        )
        return
    }

    /* Focus or open app window */
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
            if (clients.length > 0) return clients[0].focus()
            return self.clients.openWindow('/')
        })
    )
})