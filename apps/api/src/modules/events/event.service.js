import AppError from "../../shared/errors/AppError.js";
import { eventRepository } from "./event.repository.js";
import { broadcastToQueue } from "../../infrastructure/websocket/websocket.server.js";

export const createEvent = async (organizerId, { name, description, venue, venueMapUrl, startAt, endAt, status }) => {
  if (!name || !startAt || !endAt) {
    throw new AppError("Name, startAt, and endAt are required to create an event", 400, "MISSING_REQUIRED_FIELDS");
  }

  const startDate = new Date(startAt);
  const endDate = new Date(endAt);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new AppError("Invalid startAt or endAt date format", 400, "INVALID_DATE_FORMAT");
  }

  if (startDate >= endDate) {
    throw new AppError("startAt date must be before endAt date", 400, "INVALID_DATE_RANGE");
  }

  return eventRepository.create({
    organizerId,
    name,
    description: description || null,
    venue: venue || null,
    venueMapUrl: venueMapUrl || null,
    startAt: startDate,
    endAt: endDate,
    status: "DRAFT",
  });
};

export const getOrganizerEvents = async (organizerId) => {
  return eventRepository.findByOrganizerId(organizerId);
};

export const getEventById = async (id, organizerId) => {
  const event = await eventRepository.findByIdAndOrganizer(id, organizerId);
  if (!event) {
    throw new AppError("Event not found or unauthorized", 404, "EVENT_NOT_FOUND");
  }
  return event;
};

export const getEventAnalytics = async (id, organizerId) => {
  // Verify ownership
  const event = await eventRepository.findByIdAndOrganizer(id, organizerId);
  if (!event) {
    throw new AppError("Event not found or unauthorized", 404, "EVENT_NOT_FOUND");
  }

  return eventRepository.getEventAnalytics(id);
};

export const updateEvent = async (id, organizerId, data) => {
  const event = await eventRepository.findByIdAndOrganizer(id, organizerId);
  if (!event) {
    throw new AppError("Event not found or unauthorized", 404, "EVENT_NOT_FOUND");
  }

  const updatePayload = {};
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.venue !== undefined) updatePayload.venue = data.venue;
  if (data.venueMapUrl !== undefined) updatePayload.venueMapUrl = data.venueMapUrl;
  if (data.status !== undefined) updatePayload.status = data.status;
  
  let newStartAt = event.startAt;
  let newEndAt = event.endAt;

  if (data.startAt !== undefined) {
    newStartAt = new Date(data.startAt);
    if (isNaN(newStartAt.getTime())) throw new AppError("Invalid startAt date format", 400, "INVALID_DATE_FORMAT");
    updatePayload.startAt = newStartAt;
  }
  
  if (data.endAt !== undefined) {
    newEndAt = new Date(data.endAt);
    if (isNaN(newEndAt.getTime())) throw new AppError("Invalid endAt date format", 400, "INVALID_DATE_FORMAT");
    updatePayload.endAt = newEndAt;
  }

  if (newStartAt >= newEndAt) {
    throw new AppError("startAt date must be before endAt date", 400, "INVALID_DATE_RANGE");
  }

  let result;
  let cancelledEntries = [];
  if (updatePayload.status === "CANCELLED" && event.status !== "CANCELLED") {
    const txRes = await eventRepository.updateEventAndCancelEntries(id, updatePayload);
    result = txRes.updatedEvent;
    cancelledEntries = txRes.cancelledEntries;
  } else {
    result = await eventRepository.update(id, updatePayload);
  }

  // Event updates affect all queues belonging to the event
  result.queues.forEach(queue => {
    broadcastToQueue(queue.id, "QUEUE_UPDATED", { queueId: queue.id });
  });

  for (const entry of cancelledEntries) {
    broadcastToQueue(entry.queueId, "QUEUE_ENTRY_UPDATED", { entryId: entry.id, status: "CANCELLED" });
  }

  return result;
};

export const deleteEvent = async (id, organizerId) => {
  const event = await eventRepository.findByIdAndOrganizer(id, organizerId);
  if (!event) {
    throw new AppError("Event not found or unauthorized", 404, "EVENT_NOT_FOUND");
  }

  if (event.status !== "DRAFT" && event.status !== "SCHEDULED") {
    throw new AppError("Only DRAFT or SCHEDULED events can be deleted. For active events, please cancel or complete them instead.", 400, "INVALID_STATE_TRANSITION");
  }

  const entriesCount = await eventRepository.countEntriesForEvent(id);
  if (entriesCount > 0) {
    throw new AppError("Cannot delete an event that has participant history. Please cancel it instead.", 400, "EVENT_HAS_HISTORY");
  }

  return eventRepository.deleteEventWithQueues(id);
};
