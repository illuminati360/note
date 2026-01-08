/**
 * AsyncMessages - Manages request/response matching for WebView async messages
 * 
 * Problems solved:
 * 1. Ensures each getContent() request receives the correct response
 * 2. Avoids using a single setTimeout as timeout mechanism
 * 3. Supports multiple concurrent requests
 */
class AsyncMessages {
  private subscriptions: Map<string, (value: any) => void> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  
  /**
   * Generate a unique message ID
   */
  private generateMessageId(): string {
    return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  }
  
  /**
   * Send an async message and return a Promise
   * @param type Message type
   * @param sendMessage Function to send the message
   * @param timeout Timeout in milliseconds
   */
  sendAsyncMessage<T>(
    type: string,
    sendMessage: (type: string, payload?: any) => void,
    timeout: number = 5000
  ): Promise<T | null> {
    const messageId = this.generateMessageId();
    
    return new Promise<T | null>((resolve) => {
      // Register listener
      this.subscriptions.set(messageId, resolve);
      
      // Set timeout
      const timeoutId = setTimeout(() => {
        if (this.subscriptions.has(messageId)) {
          this.subscriptions.delete(messageId);
          this.timeouts.delete(messageId);
          console.warn(`AsyncMessage timeout for messageId: ${messageId}`);
          resolve(null);
        }
      }, timeout);
      
      this.timeouts.set(messageId, timeoutId);
      
      // Send message with messageId attached
      sendMessage(type, { messageId });
    });
  }
  
  /**
   * Handle a received response
   * @param messageId Message ID
   * @param value Response value
   * @returns Whether a matching request was found
   */
  handleResponse(messageId: string, value: any): boolean {
    const resolver = this.subscriptions.get(messageId);
    
    if (resolver) {
      // Cleanup
      this.subscriptions.delete(messageId);
      const timeoutId = this.timeouts.get(messageId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.timeouts.delete(messageId);
      }
      
      // Resolve the Promise
      resolver(value);
      return true;
    }
    
    return false;
  }
  
  /**
   * Cleanup all pending requests
   */
  cleanup() {
    this.timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    this.subscriptions.clear();
    this.timeouts.clear();
  }
}

export const asyncMessages = new AsyncMessages();
