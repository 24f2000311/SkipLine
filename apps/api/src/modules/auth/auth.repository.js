import prisma from "../../infrastructure/database/prisma.js";

export const authRepository = {
  async findUserByEmail(email) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  },

  async findUserById(id) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async createUser(data) {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        phone: data.phone || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });
  },

  async updateLastLogin(userId) {
    return prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  },

  async createRefreshToken({ userId, tokenHash, expiresAt }) {
    return prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  },

  async findRefreshToken(tokenHash) {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: true,
      },
    });
  },

  async deleteRefreshToken(tokenHash) {
    return prisma.refreshToken.deleteMany({
      where: { tokenHash },
    });
  },

  async deleteAllUserRefreshTokens(userId) {
    return prisma.refreshToken.deleteMany({
      where: { userId },
    });
  },

  async createAuthToken({ userId, type, tokenHash, expiresAt }, client = prisma) {
    return client.authToken.create({
      data: {
        userId,
        type,
        tokenHash,
        expiresAt,
      },
    });
  },

  async findActiveAuthToken(tokenHash, type, client = prisma) {
    return client.authToken.findFirst({
      where: {
        tokenHash,
        type,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });
  },

  async findAuthTokenByHash(tokenHash, type, client = prisma) {
    return client.authToken.findFirst({
      where: {
        tokenHash,
        type,
      },
      include: {
        user: true,
      },
    });
  },

  async markAuthTokenUsed(id, client = prisma) {
    return client.authToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  },

  async invalidateActiveAuthTokens(userId, type, client = prisma) {
    return client.authToken.updateMany({
      where: {
        userId,
        type,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });
  },

  async markUserEmailVerified(userId, client = prisma) {
    return client.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });
  },


  async updateUserPassword(userId, passwordHash, client = prisma) {
    return client.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  },

  /**
   * Atomically deletes an organizer account and all owned resources:
   * QueueEntries -> Queues -> Events -> RefreshTokens -> AuthTokens -> User.
   * @param {string} userId
   * @returns {Promise<{ deletedQueueIds: string[], deletedEventIds: string[] }>}
   */
  async deleteAccountTransaction(userId) {
    return prisma.$transaction(async (tx) => {
      // 1. Find all events belonging to the organizer
      const events = await tx.event.findMany({
        where: { organizerId: userId },
        select: { id: true },
      });
      const eventIds = events.map((e) => e.id);

      // 2. Find all queues belonging to those events
      let queueIds = [];
      if (eventIds.length > 0) {
        const queues = await tx.queue.findMany({
          where: { eventId: { in: eventIds } },
          select: { id: true },
        });
        queueIds = queues.map((q) => q.id);
      }

      // 3. Delete all QueueEntries (active, completed, cancelled, skipped)
      if (queueIds.length > 0) {
        await tx.queueEntry.deleteMany({
          where: { queueId: { in: queueIds } },
        });
      }

      // 4. Delete all Queues
      if (queueIds.length > 0) {
        await tx.queue.deleteMany({
          where: { id: { in: queueIds } },
        });
      }

      // 5. Delete all Events
      if (eventIds.length > 0) {
        await tx.event.deleteMany({
          where: { organizerId: userId },
        });
      }

      // 6. Delete all RefreshTokens
      await tx.refreshToken.deleteMany({
        where: { userId },
      });

      // 7. Delete all AuthTokens
      await tx.authToken.deleteMany({
        where: { userId },
      });

      // 8. Delete User
      await tx.user.delete({
        where: { id: userId },
      });

      return {
        deletedQueueIds: queueIds,
        deletedEventIds: eventIds,
      };
    });
  },
};
