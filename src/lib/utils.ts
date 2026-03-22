import hljs from 'highlight.js';

export function esc(s: string | undefined | null): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function fmtTime(ts: number | undefined | null): string {
  if (!ts) return '';
  return new Date(+ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

export function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

export function mdRender(text: string): string {
  if (!text) return '';
  let s = esc(text);

  // Code blocks
  s = s.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const highlighted =
      lang && hljs.getLanguage(lang)
        ? hljs.highlight(code.trim(), { language: lang }).value
        : hljs.highlightAuto(code.trim()).value;
    return `<pre><code class="hljs">${highlighted}</code></pre>`;
  });

  // Inline code
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Links
  s = s.replace(/(https?:\/\/[^\s<&]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--ac2)">$1</a>');
  // Newlines
  s = s.replace(/\n/g, '<br/>');

  return s;
}

export function clsx(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export const EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🔥'];

export const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};


/* ═══════════════════════════════════════════════════════════════
   STATUS LABEL
═══════════════════════════════════════════════════════════════ */
export function getStatusLabel(status: string, isIncoming: boolean): string {
  switch (status) {
    case 'ringing': return isIncoming ? 'Incoming…' : 'Ringing…'
    case 'connecting': return 'Connecting…'
    case 'connected': return 'Connected'
    case 'failed': return 'Call failed'
    case 'ended': return 'Call ended'
    default: return isIncoming ? 'Incoming…' : 'Connecting…'
  }
}
