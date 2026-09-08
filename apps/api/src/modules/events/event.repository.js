import prisma from "../../infrastructure/database/prisma.js";

export const eventRepository = {
  async create(data) {
    return prisma.event.create({
      data,
      include: {
        queues: true,
      },
    });
  },

  async findByOrganizerId(organizerId) {
    return prisma.event.findMany({
      where: { organizerId },
      include: {
        queues: true,
      },
      orderBy: { startAt: "desc" },
    });
  },

  async findByIdAndOrganizer(id, organizerId) {
    return prisma.event.findFirst({
      where: { id, organizerId },
      include: {
        queues: true,
      },
    });
  },

  async update(id, data) {
    return prisma.event.update({
      where: { id },
      data,
      include: {
        queues: true,
      },
    });
  },

  async delete(id) {
    return prisma.event.delete({
      where: { id },
    });
  },

  async updateEventAndCancelEntries(eventId, eventData) {
    return prisma.$transaction(async (tx) => {
      const updatedEvent = await tx.event.update({
        where: { id: eventId },
        data: eventData,
        include: {
          queues: true,
        },
      });

      const queueIds = updatedEvent.queues.map((q) => q.id);
      if (queueIds.length > 0) {
        await tx.queueEntry.updateMany({
          where: {
            queueId: { in: queueIds },
            status: { in: ["WAITING", "CALLED"] },
          },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
          },
        });
      }

      return updatedEvent;
    });
  },
};
