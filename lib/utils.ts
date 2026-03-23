import { Chat } from '@/types'
import hljs from 'highlight.js'

function esc(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function mdRender(text: string): string {
  if (!text) return ''
  let s = esc(text)
  // code blocks
  s = s.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const hi = lang && hljs.getLanguage(lang)
      ? hljs.highlight(code.trim(), { language: lang }).value
      : hljs.highlightAuto(code.trim()).value
    return `<pre><code class="hljs">${hi}</code></pre>`
  })
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>')
  s = s.replace(/(https?:\/\/[^\s<&]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:var(--ac2)">$1</a>')
  s = s.replace(/\n/g, '<br/>')
  return s
}

export function fmtTime(ts: number | null | undefined): string {
  if (!ts) return ''
  return new Date(+ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function fmtBytes(b: number): string {
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1048576).toFixed(1) + ' MB'
}

export function fmtDur(ms: number): string {
  const s = Math.round(ms / 1000)
  return Math.floor(s / 60) + ':' + (s % 60).toString().padStart(2, '0')
}

export { esc }

export function dateSep(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'long' })
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: diffDays > 365 ? 'numeric' : undefined })
}

export function sameDay(a: number, b: number) {
  const da = new Date(a), db = new Date(b)
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
}


export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  // Return date in format MM/DD
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

/**
 * Format timestamp to time only (e.g., "2:30 PM")
 */
export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Format timestamp to date (e.g., "March 22, 2026")
 */
export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Truncate text to specified length with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHAT UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Sort chats by most recent first
 */
export const sortChatsByRecent = (chats: Chat[]): Chat[] => {
  return [...chats].sort((a, b) => {
    const timeA = a.timestamp || 0
    const timeB = b.timestamp || 0
    return timeB - timeA
  })
}

/**
 * Filter chats by search query
 */
export const filterChats = (chats: Chat[], query: string): Chat[] => {
  const lowerQuery = query.toLowerCase()
  return chats.filter(
    (chat) =>
      chat.name.toLowerCase().includes(lowerQuery) ||
      chat.lastMessage?.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Get initials from name for avatar
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Get avatar background color based on name
 */
export const getAvatarColor = (name: string): string => {
  const colors = [
    '#6366f1', // indigo
    '#06b6d4', // cyan
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#ec4899', // pink
  ]
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

/* ═══════════════════════════════════════════════════════════════════════════
   DOM & BROWSER UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Detect if device is mobile
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

/**
 * Get viewport width
 */
export const getViewportWidth = (): number => {
  if (typeof window === 'undefined') return 0
  return window.innerWidth
}

/**
 * Get viewport height
 */
export const getViewportHeight = (): number => {
  if (typeof window === 'undefined') return 0
  return window.innerHeight
}

/**
 * Check if device is in portrait orientation
 */
export const isPortrait = (): boolean => {
  if (typeof window === 'undefined') return true
  return window.innerHeight > window.innerWidth
}

/**
 * Check if touch is supported
 */
export const isTouchSupported = (): boolean => {
  if (typeof window === 'undefined') return false
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   ANIMATION & EASING
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Easing functions for animations
 */
export const easing = {
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => t * (2 - t),
  easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => --t * t * t + 1,
}

/**
 * Linear interpolation
 */
export const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * t
}

/* ═══════════════════════════════════════════════════════════════════════════
   VALIDATION UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Validate email address
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate chat name
 */
export const isValidChatName = (name: string): boolean => {
  return name.trim().length >= 1 && name.length <= 100
}

/**
 * Validate message content
 */
export const isValidMessage = (content: string): boolean => {
  return content.trim().length > 0 && content.length <= 5000
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOCAL STORAGE UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Get item from localStorage with fallback
 */
export const getLocalStorage = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : fallback
  } catch {
    return fallback
  }
}

/**
 * Set item in localStorage
 */
export const setLocalStorage = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    console.warn(`Failed to save to localStorage: ${key}`)
  }
}

/**
 * Remove item from localStorage
 */
export const removeLocalStorage = (key: string): void => {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(key)
  } catch {
    console.warn(`Failed to remove from localStorage: ${key}`)
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   MISC UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Generate unique ID
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
) => {
  let timeout: NodeJS.Timeout
  return ((...args: any[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }) as T
}

/**
 * Throttle function
 */
export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
) => {
  let lastRun = 0
  return ((...args: any[]) => {
    const now = Date.now()
    if (now - lastRun >= delay) {
      fn(...args)
      lastRun = now
    }
  }) as T
}

/**
 * Deep clone object
 */
export const deepClone = <T extends object>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj))
}

// ── Utility: strip undefined values recursively ──
export function stripUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map(stripUndefined) as any
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)])
    ) as any
  }
  return obj
}