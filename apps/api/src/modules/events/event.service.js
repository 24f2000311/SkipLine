import AppError from "../../shared/errors/AppError.js";
import { eventRepository } from "./event.repository.js";

export const createEvent = async (organizerId, { name, description, venue, startAt, endAt, status }) => {
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
    startAt: startDate,
    endAt: endDate,
    status: status || "DRAFT",
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

export const updateEvent = async (id, organizerId, data) => {
  const event = await eventRepository.findByIdAndOrganizer(id, organizerId);
  if (!event) {
    throw new AppError("Event not found or unauthorized", 404, "EVENT_NOT_FOUND");
  }

  const updatePayload = {};
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.venue !== undefined) updatePayload.venue = data.venue;
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.startAt !== undefined) updatePayload.startAt = new Date(data.startAt);
  if (data.endAt !== undefined) updatePayload.endAt = new Date(data.endAt);

  return eventRepository.update(id, updatePayload);
};

export const deleteEvent = async (id, organizerId) => {
  const event = await eventRepository.findByIdAndOrganizer(id, organizerId);
  if (!event) {
    throw new AppError("Event not found or unauthorized", 404, "EVENT_NOT_FOUND");
  }
  return eventRepository.delete(id);
};
