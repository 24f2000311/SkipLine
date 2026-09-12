import prisma from "../../infrastructure/database/prisma.js";
import AppError from "../../shared/errors/AppError.js";

export const queueRepository = {
  async create(data) {
    return prisma.queue.create({
      data,
      include: {
        event: true,
      },
    });
  },

  async findByEventId(eventId) {
    return prisma.queue.findMany({
      where: { eventId },
      include: {
        _count: {
          select: {
            entries: {
              where: { status: "WAITING" },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  async findById(id) {
    return prisma.queue.findUnique({
      where: { id },
      include: {
        event: true,
        _count: {
          select: {
            entries: {
              where: { status: "WAITING" },
            },
          },
        },
      },
    });
  },

  async update(id, data) {
    return prisma.queue.update({
      where: { id },
      data,
      include: {
        event: true,
      },
    });
  },

  async delete(id) {
    return prisma.queue.delete({
      where: { id },
    });
  },

  async deleteQueueTransactional(id, organizerId) {
    return prisma.$transaction(async (tx) => {
      const queue = await tx.queue.findUnique({
        where: { id },
        include: { event: true },
      });

      if (!queue || queue.event.organizerId !== organizerId) {
        throw new AppError("Queue not found or unauthorized", 404, "QUEUE_NOT_FOUND");
      }

      if (queue.status === "OPEN") {
        throw new AppError("Queue cannot be deleted while it is open. Please pause or close it first.", 400, "QUEUE_IS_OPEN");
      }

      const activeCount = await tx.queueEntry.count({
        where: {
          queueId: id,
          status: { in: ["WAITING", "CALLED", "SERVING"] },
        },
      });

      if (activeCount > 0) {
        throw new AppError("Queue cannot be deleted while participants are active.", 400, "QUEUE_HAS_ACTIVE_PARTICIPANTS");
      }

      const totalEntries = await tx.queueEntry.count({
        where: { queueId: id },
      });

      if (totalEntries > 0) {
        throw new AppError("Cannot delete a queue that has participant history. Please close it instead.", 400, "QUEUE_HAS_HISTORY");
      }

      return tx.queue.delete({
        where: { id },
      });
    });
  },

  async updateQueueAndCancelWaitingEntries(queueId, queueData) {
    return prisma.$transaction(async (tx) => {
      const updatedQueue = await tx.queue.update({
        where: { id: queueId },
        data: queueData,
        include: {
          event: true,
        },
      });

      const affectedEntries = await tx.queueEntry.findMany({
        where: { queueId, status: "WAITING" },
        select: { id: true }
      });

      if (affectedEntries.length > 0) {
        await tx.queueEntry.updateMany({
          where: {
            queueId,
            status: "WAITING",
          },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
          },
        });
      }

      return { updatedQueue, cancelledEntryIds: affectedEntries.map(e => e.id) };
    });
  },
};
