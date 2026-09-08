import { afterAll } from 'vitest';
import prisma from '../../src/infrastructure/database/prisma.js';

// No beforeEach wipe here! The test suite relies on 'prisma db push --accept-data-loss' 
// running before vitest to provide a clean database.
// Tests create unique data (UUIDs) and don't interfere with each other.

afterAll(async () => {
  await prisma.$disconnect();
});
