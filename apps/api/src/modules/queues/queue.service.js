import AppError from "../../shared/errors/AppError.js";
import { queueRepository } from "./queue.repository.js";
import { eventRepository } from "../events/event.repository.js";
import { authRepository } from "../auth/auth.repository.js";
import { broadcastToQueue } from "../../infrastructure/websocket/websocket.server.js";

export const createQueue = async (organizerId, data) => {
  const { eventId, name, description, maxCapacity, priorityPolicy, vipWeight, normalWeight, estimatedServiceTime, maxVipStreak, agingIntervalSec, agingScoreStep } = data;

  if (!eventId || !name) {
    throw new AppError("eventId and name are required to create a queue", 400, "MISSING_REQUIRED_FIELDS");
  }

  const event = await eventRepository.findByIdAndOrganizer(eventId, organizerId);
  if (!event) {
    throw new AppError("Event not found or unauthorized", 404, "EVENT_NOT_FOUND");
  }

  const organizer = await authRepository.findUserById(organizerId);
  if (!organizer || !organizer.emailVerifiedAt) {
    throw new AppError("Email verification required to create queues", 403, "EMAIL_NOT_VERIFIED");
  }

  let parsedCapacity = null;
  if (maxCapacity !== undefined && maxCapacity !== null) {
    parsedCapacity = Number(maxCapacity);
    if (parsedCapacity <= 0) {
      throw new AppError("maxCapacity must be greater than 0", 400, "INVALID_CAPACITY");
    }
  }

  return queueRepository.create({
    eventId,
    name,
    description: description || null,
    status: "OPEN",
    maxCapacity: parsedCapacity,
    priorityPolicy: priorityPolicy || "FIFO",
    vipWeight: vipWeight ? Number(vipWeight) : 2,
    normalWeight: normalWeight ? Number(normalWeight) : 1,
    estimatedServiceTime: estimatedServiceTime ? Number(estimatedServiceTime) : 5,
    maxVipStreak: maxVipStreak ? Number(maxVipStreak) : 2,
    agingIntervalSec: agingIntervalSec ? Number(agingIntervalSec) : 300,
    agingScoreStep: agingScoreStep ? Number(agingScoreStep) : 10,
  });
};

export const getQueuesForEvent = async (eventId, organizerId) => {
  const event = await eventRepository.findByIdAndOrganizer(eventId, organizerId);
  if (!event) {
    throw new AppError("Event not found or unauthorized", 404, "EVENT_NOT_FOUND");
  }
  return queueRepository.findByEventId(eventId);
};

export const getQueueById = async (id, organizerId) => {
  const queue = await queueRepository.findById(id);
  if (!queue || queue.event.organizerId !== organizerId) {
    throw new AppError("Queue not found or unauthorized", 404, "QUEUE_NOT_FOUND");
  }
  return queue;
};

export const getQueuePublic = async (id) => {
  const queue = await queueRepository.findById(id);
  if (!queue) {
    throw new AppError("Queue not found", 404, "QUEUE_NOT_FOUND");
  }

  if (queue.event.status === "DRAFT") {
    throw new AppError(
      "The event for this queue is not publicly available yet.",
      403,
      "EVENT_UNAVAILABLE"
    );
  }
  
  // Return only safe fields for the public
  return {
    id: queue.id,
    eventId: queue.eventId,
    name: queue.name,
    description: queue.description,
    status: queue.status,
    estimatedServiceTime: queue.estimatedServiceTime,
    _count: queue._count,
    event: {
      name: queue.event.name,
      description: queue.event.description,
      venue: queue.event.venue,
      venueMapUrl: queue.event.venueMapUrl,
      startAt: queue.event.startAt,
      endAt: queue.event.endAt,
    }
  };
};

export const updateQueue = async (id, organizerId, data) => {
  const queue = await queueRepository.findById(id);
  if (!queue || queue.event.organizerId !== organizerId) {
    throw new AppError("Queue not found or unauthorized", 404, "QUEUE_NOT_FOUND");
  }

  if (data.status !== undefined && queue.status !== data.status) {
    if (queue.status === "CLOSED") {
      throw new AppError("Cannot change status of a CLOSED queue", 400, "INVALID_STATE_TRANSITION");
    }
  }

  const updatePayload = {};
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.status !== undefined) updatePayload.status = data.status; // OPEN, PAUSED, CLOSED
  if (data.maxCapacity !== undefined) {
    if (data.maxCapacity !== null) {
      const parsedCapacity = Number(data.maxCapacity);
      if (parsedCapacity <= 0) {
        throw new AppError("maxCapacity must be greater than 0", 400, "INVALID_CAPACITY");
      }
      updatePayload.maxCapacity = parsedCapacity;
    } else {
      updatePayload.maxCapacity = null;
    }
  }
  if (data.priorityPolicy !== undefined) updatePayload.priorityPolicy = data.priorityPolicy;
  if (data.vipWeight !== undefined) updatePayload.vipWeight = Number(data.vipWeight);
  if (data.normalWeight !== undefined) updatePayload.normalWeight = Number(data.normalWeight);
  if (data.estimatedServiceTime !== undefined) updatePayload.estimatedServiceTime = Number(data.estimatedServiceTime);
  if (data.maxVipStreak !== undefined) updatePayload.maxVipStreak = Number(data.maxVipStreak);
  if (data.agingIntervalSec !== undefined) updatePayload.agingIntervalSec = Number(data.agingIntervalSec);
  if (data.agingScoreStep !== undefined) updatePayload.agingScoreStep = Number(data.agingScoreStep);

  let result;
  let cancelledIds = [];
  if (updatePayload.status === "CLOSED" && queue.status !== "CLOSED") {
    const txRes = await queueRepository.updateQueueAndCancelWaitingEntries(id, updatePayload);
    result = txRes.updatedQueue;
    cancelledIds = txRes.cancelledEntryIds;
  } else {
    result = await queueRepository.update(id, updatePayload);
  }

  broadcastToQueue(id, "QUEUE_UPDATED", { queueId: id });

  for (const entryId of cancelledIds) {
    broadcastToQueue(id, "QUEUE_ENTRY_UPDATED", { entryId, status: "CANCELLED" });
  }

  return result;
};

export const deleteQueue = async (id, organizerId) => {
  return queueRepository.deleteQueueTransactional(id, organizerId);
};
