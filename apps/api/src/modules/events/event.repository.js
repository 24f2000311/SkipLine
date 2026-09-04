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
};
