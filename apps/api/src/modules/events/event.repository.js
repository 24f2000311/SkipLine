import prisma from "../../infrastructure/database/prisma.js";

export const eventRepository = {
  async create(data) {
    return prisma.event.create({
      data,
      include: {
        queues: {
          include: {
            _count: {
              select: { entries: true },
            },
          },
        },
      },
    });
  },

  async findByOrganizerId(organizerId) {
    return prisma.event.findMany({
      where: { organizerId },
      include: {
        queues: {
          include: {
            _count: {
              select: { entries: true },
            },
          },
        },
      },
      orderBy: { startAt: "desc" },
    });
  },

  async countEntriesForEvent(eventId) {
    return prisma.queueEntry.count({
      where: {
        queue: {
          eventId,
        },
      },
    });
  },

  async findByIdAndOrganizer(id, organizerId) {
    return prisma.event.findFirst({
      where: { id, organizerId },
      include: {
        queues: {
          include: {
            _count: {
              select: { entries: true },
            },
          },
        },
      },
    });
  },

  async update(id, data) {
    return prisma.event.update({
      where: { id },
      data,
      include: {
        queues: {
          include: {
            _count: {
              select: { entries: true },
            },
          },
        },
      },
    });
  },

  async delete(id) {
    return prisma.event.delete({
      where: { id },
    });
  },

  async deleteEventWithQueues(id) {
    return prisma.$transaction(async (tx) => {
      // First delete all queues associated with the event
      await tx.queue.deleteMany({
        where: { eventId: id },
      });

      // Then delete the event itself
      return tx.event.delete({
        where: { id },
      });
    });
  },

  async getEventAnalytics(id) {
    // Get all completed entries to calculate times
    const completedEntries = await prisma.queueEntry.findMany({
      where: {
        queue: { eventId: id },
        status: "COMPLETED",
        joinedAt: { not: null },
        calledAt: { not: null },
        servingAt: { not: null },
        completedAt: { not: null }
      },
      select: {
        joinedAt: true,
        calledAt: true,
        servingAt: true,
        completedAt: true
      }
    });

    let totalWaitMs = 0;
    let totalServiceMs = 0;

    completedEntries.forEach(entry => {
      totalWaitMs += (entry.calledAt.getTime() - entry.joinedAt.getTime());
      totalServiceMs += (entry.completedAt.getTime() - entry.servingAt.getTime());
    });

    const averageWaitTimeMs = completedEntries.length > 0 ? Math.round(totalWaitMs / completedEntries.length) : 0;
    const averageServiceTimeMs = completedEntries.length > 0 ? Math.round(totalServiceMs / completedEntries.length) : 0;

    const stats = await prisma.queueEntry.groupBy({
      by: ['status'],
      where: { queue: { eventId: id } },
      _count: true
    });

    const totalJoined = await prisma.queueEntry.count({
      where: { queue: { eventId: id } }
    });

    let totalServed = 0;
    let noShows = 0;
    let cancelled = 0;

    stats.forEach(s => {
      if (s.status === 'COMPLETED') totalServed = s._count;
      if (s.status === 'SKIPPED') noShows += s._count; // Assuming SKIPPED is no-show or we have noShowCount > 0
      if (s.status === 'CANCELLED') cancelled = s._count;
    });

    // Also count entries with noShowCount > 0
    const noShowEntries = await prisma.queueEntry.count({
      where: { queue: { eventId: id }, noShowCount: { gt: 0 } }
    });

    return {
      totalJoined,
      totalServed,
      noShows: Math.max(noShows, noShowEntries),
      cancelled,
      averageWaitTimeMs,
      averageServiceTimeMs
    };
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
      let cancelledEntries = [];
      if (queueIds.length > 0) {
        cancelledEntries = await tx.queueEntry.findMany({
          where: { queueId: { in: queueIds }, status: { in: ["WAITING", "CALLED"] } },
          select: { id: true, queueId: true }
        });

        if (cancelledEntries.length > 0) {
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
      }

      return { updatedEvent, cancelledEntries };
    });
  },
};
