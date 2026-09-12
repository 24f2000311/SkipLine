import { WebSocketServer, WebSocket } from "ws";
import url from "url";
import { verifyAccessToken } from "../../modules/auth/auth.utils.js";
import { hashAccessToken } from "../../modules/queue-entries/queue-entry.utils.js";
import prisma from "../database/prisma.js";

let wss = null;

/**
 * Maps queueId -> Set of connected WebSocket clients listening for queue updates.
 */
const queueSubscriptions = new Map();

const isValidUUID = (uuid) => {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid);
};

/**
 * Initializes the WebSocket server attached to the HTTP server.
 * @param {import("http").Server} httpServer
 */
export const initWebSocketServer = (httpServer) => {
  wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws, req) => {
    ws.isAlive = true;
    ws.subscribedQueues = new Set();

    try {
      const parsedUrl = url.parse(req.url, true);
      const token = parsedUrl.query.token;

      if (token) {
        const decoded = verifyAccessToken(token);
        ws.organizerId = decoded.id;
      }
    } catch (err) {
      ws.send(JSON.stringify({ event: "ERROR", message: "Invalid or expired token" }));
      ws.close(4001, "Unauthorized");
      return;
    }

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", async (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString());
        const { action, queueId, accessToken } = message;

        if (!action || (action !== "SUBSCRIBE" && action !== "UNSUBSCRIBE")) {
          ws.send(JSON.stringify({ event: "ERROR", message: "Invalid or malformed action" }));
          return;
        }

        if (!queueId || !isValidUUID(queueId)) {
          ws.send(JSON.stringify({ event: "ERROR", message: "Missing or invalid queueId" }));
          return;
        }

        if (action === "SUBSCRIBE") {
          // Authentication & Authorization check
          if (ws.organizerId) {
            // Organizer Auth
            const queue = await prisma.queue.findUnique({
              where: { id: queueId },
              include: { event: true },
            });
            if (!queue || queue.event.organizerId !== ws.organizerId) {
              ws.send(JSON.stringify({ event: "ERROR", message: "Unauthorized queue access" }));
              return;
            }
          } else {
            // Customer Auth
            if (!accessToken) {
              ws.send(JSON.stringify({ event: "ERROR", message: "Missing credentials" }));
              return;
            }

            const hash = hashAccessToken(accessToken);
            const entry = await prisma.queueEntry.findFirst({
              where: { queueId, accessTokenHash: hash },
            });

            if (!entry) {
              ws.send(JSON.stringify({ event: "ERROR", message: "Invalid customer credential or unauthorized queue" }));
              return;
            }
            ws.customerEntryId = entry.id; // Server-side context
          }

          // Subscribed!
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
        } else if (action === "UNSUBSCRIBE") {
          // Only unsubscribe if we were already subscribed
          if (ws.subscribedQueues.has(queueId)) {
            ws.subscribedQueues.delete(queueId);
            if (queueSubscriptions.has(queueId)) {
              queueSubscriptions.get(queueId).delete(ws);
            }
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

/**
 * Cleans up all real-time resources associated with a deleted organizer account:
 * 1. Broadcasts QUEUE_DELETED and clears subscriptions for all deleted queues.
 * 2. Terminates any active WebSocket connections owned by the organizer.
 * @param {string} organizerId
 * @param {string[]} deletedQueueIds
 */
export const cleanupOrganizerWebSockets = (organizerId, deletedQueueIds = []) => {
  if (!wss) return;

  // 1. Notify and unsubscribe any clients listening to deleted queues
  for (const queueId of deletedQueueIds) {
    if (queueSubscriptions.has(queueId)) {
      const subscribers = queueSubscriptions.get(queueId);
      const closeMsg = JSON.stringify({
        event: "QUEUE_DELETED",
        queueId,
        timestamp: new Date().toISOString(),
        message: "This queue has been deleted and is no longer available.",
      });

      subscribers.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(closeMsg);
        }
        client.subscribedQueues?.delete(queueId);
      });
      queueSubscriptions.delete(queueId);
    }
  }

  // 2. Terminate any active organizer connections
  wss.clients.forEach((client) => {
    if (client.organizerId === organizerId) {
      client.close(4001, "Account deleted");
    }
  });
};
