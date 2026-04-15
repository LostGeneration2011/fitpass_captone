class SimpleEventEmitter {
  private listeners: { [event: string]: Function[] } = {};

  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: Function) {
    if (!this.listeners[event]) return;
    const index = this.listeners[event].indexOf(callback);
    if (index > -1) {
      this.listeners[event].splice(index, 1);
    }
  }

  emit(event: string, ...args: any[]) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }
}

class RefreshEventEmitter extends SimpleEventEmitter {
  private isRefreshing = false;
  private refreshTimeout: NodeJS.Timeout | null = null;

  triggerRefresh(screenName?: string) {
    // Prevent infinite loops by debouncing refresh calls
    if (this.isRefreshing) {
      console.log(`⏸️ Refresh already in progress, ignoring duplicate trigger for: ${screenName}`);
      return;
    }

    // Clear any pending refresh
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    // Set refreshing flag to prevent loops
    this.isRefreshing = true;
    console.log(`🔄 Triggering refresh${screenName ? ` for ${screenName}` : ' globally'}...`);
    
    // Emit the refresh event
    this.emit('refresh', screenName);
    
    // Reset the flag after a short delay to allow this refresh cycle to complete
    this.refreshTimeout = setTimeout(() => {
      this.isRefreshing = false;
      this.refreshTimeout = null;
      console.log(`✅ Refresh cycle completed for: ${screenName || 'global'}`);
    }, 1000); // 1 second cooldown
  }

  onRefresh(callback: (screenName?: string) => void): () => void {
    this.on('refresh', callback);
    return () => this.off('refresh', callback);
  }
}

export const refreshEmitter = new RefreshEventEmitter();