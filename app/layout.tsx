import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Cipher',
    template: '%s | Cipher',
  },
  description: 'End-to-end encrypted realtime chat',

  applicationName: 'Cipher',

  manifest: '/manifest.json',

  keywords: [
    'chat app',
    'encrypted chat',
    'realtime messaging',
    'secure chat',
  ],

  authors: [{ name: 'Cipher Team' }],
  creator: 'Cipher',
  publisher: 'Cipher',

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  metadataBase: new URL('https://cipher.netlify.app'),

  alternates: {
    canonical: '/',
  },

  openGraph: {
    title: 'Cipher',
    description: 'End-to-end encrypted realtime chat',
    url: '/',
    siteName: 'Cipher',
    locale: 'en_US',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Cipher',
    description: 'End-to-end encrypted realtime chat',
  },

  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' }, // fallback
    ],
    apple: [
      { url: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
    ],
  },

  appleWebApp: {
    capable: true,
    title: 'Cipher',
    statusBarStyle: 'black-translucent',
  },

  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  themeColor: '#080b14',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-accent="cyan">
      <body>
        <div className="ambient">
          <div className="ambient-blob" />
          <div className="ambient-blob" />
          <div className="ambient-blob" />
        </div>

        {children}
      </body>
    </html>
  )
}