import * as queueService from "./queue.service.js";

export const queueController = {
  async create(req, res, next) {
    try {
      const queue = await queueService.createQueue(req.user.id, req.body);
      res.status(201).json({
        success: true,
        message: "Queue created successfully",
        data: queue,
      });
    } catch (error) {
      next(error);
    }
  },

  async getByEvent(req, res, next) {
    try {
      const { eventId } = req.params;
      const queues = await queueService.getQueuesForEvent(eventId, req.user.id);
      res.status(200).json({
        success: true,
        data: queues,
      });
    } catch (error) {
      next(error);
    }
  },

  async getOne(req, res, next) {
    try {
      const queue = await queueService.getQueueById(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        data: queue,
      });
    } catch (error) {
      next(error);
    }
  },

  async getPublic(req, res, next) {
    try {
      const queue = await queueService.getQueuePublic(req.params.id);
      res.status(200).json({
        success: true,
        data: queue,
      });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const updatedQueue = await queueService.updateQueue(req.params.id, req.user.id, req.body);
      res.status(200).json({
        success: true,
        message: "Queue updated successfully",
        data: updatedQueue,
      });
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await queueService.deleteQueue(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        message: "Queue deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  },
};
