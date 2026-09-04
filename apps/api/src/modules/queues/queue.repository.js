import prisma from "../../infrastructure/database/prisma.js";

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
};
