import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const hashAccessToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

async function seed() {
  console.log("🌱 Starting Skipline Database Seeding...");

  // 1. Clean existing records
  await prisma.refreshToken.deleteMany({});
  await prisma.queueEntry.deleteMany({});
  await prisma.queue.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create Demo Organizer
  const passwordHash = await bcrypt.hash("Password123!", 10);
  const organizer = await prisma.user.create({
    data: {
      name: "Skipline Fest Organizer",
      email: "organizer@skipline.io",
      passwordHash,
      status: "ACTIVE",
    },
  });
  console.log(`✅ Created Demo Organizer: ${organizer.email} (Password: Password123!)`);

  // 3. Create Demo Event
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000);

  const event = await prisma.event.create({
    data: {
      organizerId: organizer.id,
      name: "Skipline Tech Summit 2026",
      description: "Annual Student Tech Festival & Hackathon Registration",
      venue: "Main Campus Auditorium",
      startAt: now,
      endAt: tomorrow,
      status: "LIVE",
    },
  });
  console.log(`✅ Created Demo Event: ${event.name}`);

  // 4. Create Demo Queues
  const regQueue = await prisma.queue.create({
    data: {
      eventId: event.id,
      name: "Registration & Badge Collection",
      description: "Counter 1 - Main Desk",
      status: "OPEN",
      maxCapacity: 200,
      priorityPolicy: "WEIGHTED_PRIORITY",
      vipWeight: 2,
      normalWeight: 1,
      maxVipStreak: 2,
      estimatedServiceTime: 5,
      agingIntervalSec: 300,
      agingScoreStep: 10,
    },
  });

  const swagQueue = await prisma.queue.create({
    data: {
      eventId: event.id,
      name: "Swag & Certificate Counter",
      description: "Counter 2 - Exit Hall",
      status: "OPEN",
      maxCapacity: 100,
      priorityPolicy: "FIFO",
      vipWeight: 2,
      normalWeight: 1,
      maxVipStreak: 2,
      estimatedServiceTime: 3,
    },
  });
  console.log(`✅ Created Demo Queues: '${regQueue.name}' & '${swagQueue.name}'`);

  // 5. Create Demo Queue Entries
  const rawTokenAlice = "sk_live_demo_alice_token_secret_1";
  const rawTokenBob = "sk_live_demo_bob_token_secret_2";
  const rawTokenCharlie = "sk_live_demo_charlie_vip_secret_3";
  const rawTokenDavid = "sk_live_demo_david_token_secret_4";
  const rawTokenEva = "sk_live_demo_eva_vip_secret_5";

  const entriesData = [
    {
      queueId: regQueue.id,
      token: "A-001",
      accessTokenHash: hashAccessToken(rawTokenAlice),
      sessionId: "sess_demo_alice_001",
      customerName: "Alice Smith",
      customerPhone: "+1234567891",
      priority: "NORMAL",
      status: "WAITING",
      sequenceNumber: 1n,
      joinedAt: new Date(now.getTime() - 900000), // 15 min ago
    },
    {
      queueId: regQueue.id,
      token: "A-002",
      accessTokenHash: hashAccessToken(rawTokenBob),
      sessionId: "sess_demo_bob_002",
      customerName: "Bob Johnson",
      priority: "NORMAL",
      status: "WAITING",
      sequenceNumber: 2n,
      joinedAt: new Date(now.getTime() - 600000), // 10 min ago
    },
    {
      queueId: regQueue.id,
      token: "V-003",
      accessTokenHash: hashAccessToken(rawTokenCharlie),
      sessionId: "sess_demo_charlie_003",
      customerName: "Charlie Brown (Speaker)",
      priority: "VIP",
      status: "WAITING",
      sequenceNumber: 3n,
      joinedAt: new Date(now.getTime() - 300000), // 5 min ago
    },
    {
      queueId: regQueue.id,
      token: "A-004",
      accessTokenHash: hashAccessToken(rawTokenDavid),
      sessionId: "sess_demo_david_004",
      customerName: "David Miller",
      priority: "NORMAL",
      status: "WAITING",
      sequenceNumber: 4n,
      joinedAt: new Date(now.getTime() - 120000), // 2 min ago
    },
    {
      queueId: regQueue.id,
      token: "V-005",
      accessTokenHash: hashAccessToken(rawTokenEva),
      sessionId: "sess_demo_eva_005",
      customerName: "Eva Green (Sponsor)",
      priority: "VIP",
      status: "WAITING",
      sequenceNumber: 5n,
      joinedAt: now,
    },
  ];

  for (const entryData of entriesData) {
    await prisma.queueEntry.create({ data: entryData });
  }

  console.log(`✅ Seeded 5 Initial Queue Entries (3 Normal, 2 VIP) into '${regQueue.name}'`);
  console.log("🚀 Seeding completed successfully!");
}

seed()
  .catch((e) => {
    console.error("Seeding Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
