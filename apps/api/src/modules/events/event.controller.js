import * as eventService from "./event.service.js";

export const eventController = {
  async create(req, res, next) {
    try {
      const event = await eventService.createEvent(req.user.id, req.body);
      res.status(201).json({
        success: true,
        message: "Event created successfully",
        data: event,
      });
    } catch (error) {
      next(error);
    }
  },

  async getAll(req, res, next) {
    try {
      const events = await eventService.getOrganizerEvents(req.user.id);
      res.status(200).json({
        success: true,
        data: events,
      });
    } catch (error) {
      next(error);
    }
  },

  async getOne(req, res, next) {
    try {
      const event = await eventService.getEventById(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        data: event,
      });
    } catch (error) {
      next(error);
    }
  },

  async getAnalytics(req, res, next) {
    try {
      const analytics = await eventService.getEventAnalytics(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const updatedEvent = await eventService.updateEvent(req.params.id, req.user.id, req.body);
      res.status(200).json({
        success: true,
        message: "Event updated successfully",
        data: updatedEvent,
      });
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await eventService.deleteEvent(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        message: "Event deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  },
};
