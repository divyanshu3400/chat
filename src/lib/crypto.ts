// ECDH P-256 + AES-GCM end-to-end encryption helpers

export const Crypto = {
  async genPair(): Promise<CryptoKeyPair> {
    return crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey']
    );
  },

  async exportPub(key: CryptoKey): Promise<string> {
    const raw = await crypto.subtle.exportKey('spki', key);
    return btoa(String.fromCharCode(...new Uint8Array(raw)));
  },

  async importPub(b64: string): Promise<CryptoKey> {
    const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    return crypto.subtle.importKey(
      'spki', raw, { name: 'ECDH', namedCurve: 'P-256' }, true, []
    );
  },

  async exportPriv(key: CryptoKey): Promise<string> {
    const raw = await crypto.subtle.exportKey('pkcs8', key);
    return btoa(String.fromCharCode(...new Uint8Array(raw)));
  },

  async importPriv(b64: string): Promise<CryptoKey> {
    const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    return crypto.subtle.importKey(
      'pkcs8', raw, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']
    );
  },

  async derive(privKey: CryptoKey, pubKey: CryptoKey): Promise<CryptoKey> {
    return crypto.subtle.deriveKey(
      { name: 'ECDH', public: pubKey },
      privKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  },

  async encrypt(sharedKey: CryptoKey, text: string): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      sharedKey,
      new TextEncoder().encode(text)
    );
    const b = new Uint8Array(iv.byteLength + ct.byteLength);
    b.set(iv);
    b.set(new Uint8Array(ct), iv.byteLength);
    return btoa(String.fromCharCode(...b));
  },

  async decrypt(sharedKey: CryptoKey, b64: string): Promise<string> {
    try {
      const b = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const pt = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: b.slice(0, 12) },
        sharedKey,
        b.slice(12)
      );
      return new TextDecoder().decode(pt);
    } catch {
      return '[🔐 encrypted]';
    }
  },
};
