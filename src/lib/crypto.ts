// End-to-end encryption using Web Crypto API (ECDH + AES-GCM)
export const Crypto = {
  async genPair() {
    return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey'])
  },
  async exportPub(k: CryptoKey) {
    const r = await crypto.subtle.exportKey('spki', k)
    return btoa(String.fromCharCode(...new Uint8Array(r)))
  },
  
  async importPub(b64: string) {
    const r = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    return crypto.subtle.importKey('spki', r, { name: 'ECDH', namedCurve: 'P-256' }, true, [])
  },
  async derive(priv: CryptoKey, pub: CryptoKey) {
    return crypto.subtle.deriveKey(
      { name: 'ECDH', public: pub }, priv,
      { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    )
  },
  async enc(sk: CryptoKey, text: string) {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, sk, new TextEncoder().encode(text)
    )
    const b = new Uint8Array(iv.byteLength + ct.byteLength)
    b.set(iv); b.set(new Uint8Array(ct), iv.byteLength)
    return btoa(String.fromCharCode(...b))
  },
  async dec(sk: CryptoKey, b64: string): Promise<string> {
    try {
      const b = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(0, 12) }, sk, b.slice(12))
      return new TextDecoder().decode(pt)
    } catch { return '[🔐 encrypted]' }
  },
  async exportPriv(k: CryptoKey) {
    const r = await crypto.subtle.exportKey('pkcs8', k)
    return btoa(String.fromCharCode(...new Uint8Array(r)))
  },
  async importPriv(b64: string) {
    const r = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    return crypto.subtle.importKey('pkcs8', r, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey'])
  },
}

export async function loadOrGenKeys(uid: string) {
  const sp   = localStorage.getItem(`cipher_pk_${uid}`)
  const spub = localStorage.getItem(`cipher_pub_${uid}`)
  if (sp && spub) {
    const privateKey = await Crypto.importPriv(sp)
    const publicKey  = await Crypto.importPub(spub)
    return { privateKey, publicKey }
  }
  const kp = await Crypto.genPair() as CryptoKeyPair
  const privB64 = await Crypto.exportPriv(kp.privateKey)
  const pubB64  = await Crypto.exportPub(kp.publicKey)
  localStorage.setItem(`cipher_pk_${uid}`, privB64)
  localStorage.setItem(`cipher_pub_${uid}`, pubB64)
  return kp
}
