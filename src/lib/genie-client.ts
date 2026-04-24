type MessageHandler = (data: any) => void;

class GenieWebSocketClient {
  private ws: WebSocket | null = null;
  private messageHandler: MessageHandler | null = null;

  connect(datasetId: string, onMessage: MessageHandler) {
    this.messageHandler = onMessage;
    
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const wsUrl = apiUrl.replace('http', 'ws');
    
    this.ws = new WebSocket(`${wsUrl}/ws/ai/chat?dataset_id=${datasetId}`);
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.messageHandler?.(data);
      } catch (e) {
        console.error('WebSocket parse error:', e);
      }
    };
  }

  send(message: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'message', content: message }));
    }
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }
}

export const genieClient = new GenieWebSocketClient();