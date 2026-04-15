// Simple in-memory nonce store for QR validation
class NonceStore {
  private nonces = new Map<string, number>();
  
  // Store a nonce with expiry time
  store(nonce: string, expiryMs: number = 30000): void {
    const expireAt = Date.now() + expiryMs;
    this.nonces.set(nonce, expireAt);
    
    // Clean up expired nonces periodically
    setTimeout(() => this.cleanup(), expiryMs);
  }
  
  // Check if nonce exists and is not expired
  isUsed(nonce: string): boolean {
    const expireAt = this.nonces.get(nonce);
    if (!expireAt) return false;
    
    if (Date.now() > expireAt) {
      this.nonces.delete(nonce);
      return false;
    }
    
    return true;
  }
  
  // Remove expired nonces
  private cleanup(): void {
    const now = Date.now();
    for (const [nonce, expireAt] of this.nonces.entries()) {
      if (now > expireAt) {
        this.nonces.delete(nonce);
      }
    }
  }
}

export const nonceStore = new NonceStore();