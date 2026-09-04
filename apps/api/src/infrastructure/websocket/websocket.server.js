import { WebSocketServer, WebSocket } from "ws";

let wss = null;

/**
 * Maps queueId -> Set of connected WebSocket clients listening for queue updates.
 */
const queueSubscriptions = new Map();

/**
 * Initializes the WebSocket server attached to the HTTP server.
 * @param {import("http").Server} httpServer
 */
export const initWebSocketServer = (httpServer) => {
  wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws, req) => {
    ws.isAlive = true;
    ws.subscribedQueues = new Set();

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString());
        const { action, queueId } = message;

        if (action === "SUBSCRIBE" && queueId) {
          ws.subscribedQueues.add(queueId);
          if (!queueSubscriptions.has(queueId)) {
            queueSubscriptions.set(queueId, new Set());
          }
          queueSubscriptions.get(queueId).add(ws);

          ws.send(
            JSON.stringify({
              event: "SUBSCRIBED",
              queueId,
              message: `Subscribed to real-time updates for queue ${queueId}`,
            })
          );
        } else if (action === "UNSUBSCRIBE" && queueId) {
          ws.subscribedQueues.delete(queueId);
          if (queueSubscriptions.has(queueId)) {
            queueSubscriptions.get(queueId).delete(ws);
          }
        }
      } catch (err) {
        ws.send(
          JSON.stringify({
            event: "ERROR",
            message: "Invalid WebSocket message format. Expected JSON.",
          })
        );
      }
    });

    ws.on("close", () => {
      ws.subscribedQueues.forEach((queueId) => {
        if (queueSubscriptions.has(queueId)) {
          queueSubscriptions.get(queueId).delete(ws);
        }
      });
    });
  });

  // Heartbeat ping/pong interval
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval);
  });

  console.log("⚡ WebSocket Server initialized on path /ws");
  return wss;
};

/**
 * Broadcasts a real-time event to all clients subscribed to a given queueId.
 * @param {string} queueId
 * @param {string} eventType - e.g., 'QUEUE_ENTRY_JOINED', 'QUEUE_ENTRY_CALLED', 'QUEUE_ENTRY_UPDATED'
 * @param {object} payload
 */
export const broadcastToQueue = (queueId, eventType, payload) => {
  if (!queueSubscriptions.has(queueId)) return;

  const message = JSON.stringify({
    event: eventType,
    queueId,
    timestamp: new Date().toISOString(),
    data: payload,
  });

  queueSubscriptions.get(queueId).forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};
