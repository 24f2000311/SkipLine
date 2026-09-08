import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateEffectiveScore,
  isEntryRequeueEligible,
  selectNextQueueEntry,
  handleNoShow
} from './queue-entry.service.js';
import { queueEntryRepository } from './queue-entry.repository.js';
import { QUEUE_ENTRY_STATUS } from './queue-entry.constants.js';

// Mock dependencies
vi.mock('./queue-entry.repository.js', () => ({
  queueEntryRepository: {
    findById: vi.fn(),
    update: vi.fn()
  }
}));

vi.mock('../../infrastructure/websocket/websocket.server.js', () => ({
  broadcastToQueue: vi.fn()
}));

describe('Queue Engine Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TEST GROUP 1 — calculateEffectiveScore', () => {
    const queue = {
      vipWeight: 2,
      normalWeight: 1,
      agingIntervalSec: 300,
      agingScoreStep: 10
    };

    it('1. Fresh NORMAL entry (base score = 10)', () => {
      const now = new Date();
      const entry = { priority: 'NORMAL', joinedAt: now };
      expect(calculateEffectiveScore(entry, queue, now)).toBe(10);
    });

    it('2. Fresh VIP entry (base score = 20)', () => {
      const now = new Date();
      const entry = { priority: 'VIP', joinedAt: now };
      expect(calculateEffectiveScore(entry, queue, now)).toBe(20);
    });

    it('3. NORMAL entry after exactly one aging interval', () => {
      const now = new Date();
      const entry = { priority: 'NORMAL', joinedAt: new Date(now.getTime() - 300000) }; // 300s ago
      expect(calculateEffectiveScore(entry, queue, now)).toBe(20); // 10 base + 10 aging
    });

    it('4. NORMAL entry immediately before the aging boundary', () => {
      const now = new Date();
      const entry = { priority: 'NORMAL', joinedAt: new Date(now.getTime() - 299000) }; // 299s ago
      expect(calculateEffectiveScore(entry, queue, now)).toBe(10);
    });

    it('5. NORMAL entry immediately after the aging boundary', () => {
      const now = new Date();
      const entry = { priority: 'NORMAL', joinedAt: new Date(now.getTime() - 301000) }; // 301s ago
      expect(calculateEffectiveScore(entry, queue, now)).toBe(20);
    });

    it('6. Long waiting time (multiple aging intervals)', () => {
      const now = new Date();
      const entry = { priority: 'NORMAL', joinedAt: new Date(now.getTime() - 600000) }; // 600s ago (2 intervals)
      expect(calculateEffectiveScore(entry, queue, now)).toBe(30); // 10 base + 20 aging
    });

    it('7. VIP aging', () => {
      const now = new Date();
      const entry = { priority: 'VIP', joinedAt: new Date(now.getTime() - 300000) }; // 300s ago
      expect(calculateEffectiveScore(entry, queue, now)).toBe(30); // 20 base + 10 aging
    });

    it('8. Verify calculation uses custom queue configuration', () => {
      const customQueue = {
        vipWeight: 5,
        normalWeight: 2,
        agingIntervalSec: 60,
        agingScoreStep: 5
      };
      const now = new Date();
      const entryNormal = { priority: 'NORMAL', joinedAt: new Date(now.getTime() - 60000) }; // 60s
      const entryVip = { priority: 'VIP', joinedAt: new Date(now.getTime() - 120000) }; // 120s
      
      expect(calculateEffectiveScore(entryNormal, customQueue, now)).toBe(25); // 20 base + 5 aging
      expect(calculateEffectiveScore(entryVip, customQueue, now)).toBe(60); // 50 base + 10 aging
    });
  });

  describe('TEST GROUP 2 — isEntryRequeueEligible', () => {
    it('1. Entry with no requeue restriction is eligible', () => {
      const entry = { requeueAfterCallCount: null };
      expect(isEntryRequeueEligible(entry, 10)).toBe(true);
      expect(isEntryRequeueEligible(entry, 0)).toBe(true);
    });

    it('2. Current totalCallsCount is below requeueAfterCallCount', () => {
      const entry = { requeueAfterCallCount: 15 };
      expect(isEntryRequeueEligible(entry, 14)).toBe(false);
    });

    it('3. Current totalCallsCount exactly equals requeueAfterCallCount', () => {
      const entry = { requeueAfterCallCount: 15 };
      expect(isEntryRequeueEligible(entry, 15)).toBe(true);
    });

    it('4. Current totalCallsCount exceeds requeueAfterCallCount', () => {
      const entry = { requeueAfterCallCount: 15 };
      expect(isEntryRequeueEligible(entry, 20)).toBe(true);
    });

    it('5. Verify only intended waiting/requeue conditions are considered', () => {
      const entry = { requeueAfterCallCount: undefined };
      expect(isEntryRequeueEligible(entry, 10)).toBe(true);
    });
  });

  describe('TEST GROUP 3 — selectNextQueueEntry', () => {
    const defaultQueue = {
      vipWeight: 2,
      normalWeight: 1,
      agingIntervalSec: 300,
      agingScoreStep: 10,
      totalCallsCount: 10,
      consecutiveVipCount: 0,
      maxVipStreak: 2
    };

    const now = new Date();

    it('1. Empty candidate list', () => {
      expect(selectNextQueueEntry(defaultQueue, [], now)).toBeNull();
    });

    it('2. Single eligible NORMAL entry', () => {
      const entry = { priority: 'NORMAL', joinedAt: now, sequenceNumber: '1', requeueAfterCallCount: null };
      const res = selectNextQueueEntry(defaultQueue, [entry], now);
      expect(res.selectedEntry).toBe(entry);
      expect(res.nextConsecutiveVipCount).toBe(0);
    });

    it('3. Single eligible VIP entry', () => {
      const entry = { priority: 'VIP', joinedAt: now, sequenceNumber: '1', requeueAfterCallCount: null };
      const res = selectNextQueueEntry(defaultQueue, [entry], now);
      expect(res.selectedEntry).toBe(entry);
      expect(res.nextConsecutiveVipCount).toBe(1);
    });

    it('4. VIP vs NORMAL (VIP score 20, NORMAL score 10)', () => {
      const entryNormal = { priority: 'NORMAL', joinedAt: now, sequenceNumber: '1' };
      const entryVip = { priority: 'VIP', joinedAt: now, sequenceNumber: '2' };
      const res = selectNextQueueEntry(defaultQueue, [entryNormal, entryVip], now);
      expect(res.selectedEntry).toBe(entryVip);
    });

    it('5. Aging can allow NORMAL to overtake VIP', () => {
      const entryNormal = { priority: 'NORMAL', joinedAt: new Date(now.getTime() - 600000), sequenceNumber: '1' }; // Score: 10 + 20 = 30
      const entryVip = { priority: 'VIP', joinedAt: now, sequenceNumber: '2' }; // Score: 20
      const res = selectNextQueueEntry(defaultQueue, [entryNormal, entryVip], now);
      expect(res.selectedEntry).toBe(entryNormal);
    });

    it('6. Equal effective score, sequenceNumber is tie-breaker (lower wins)', () => {
      const entry1 = { priority: 'NORMAL', joinedAt: now, sequenceNumber: '2' };
      const entry2 = { priority: 'NORMAL', joinedAt: now, sequenceNumber: '1' };
      const res = selectNextQueueEntry(defaultQueue, [entry1, entry2], now);
      expect(res.selectedEntry).toBe(entry2);
    });

    it('7. Requeued entry below its requeue threshold is ignored', () => {
      const eligibleEntry = { priority: 'NORMAL', joinedAt: now, sequenceNumber: '1' };
      const ignoredEntry = { priority: 'VIP', joinedAt: now, sequenceNumber: '2', requeueAfterCallCount: 15 };
      const res = selectNextQueueEntry(defaultQueue, [eligibleEntry, ignoredEntry], now);
      expect(res.selectedEntry).toBe(eligibleEntry);
    });

    it('8. Requeued entry exactly at its threshold becomes eligible', () => {
      const entry1 = { priority: 'NORMAL', joinedAt: now, sequenceNumber: '1' };
      const entry2 = { priority: 'VIP', joinedAt: now, sequenceNumber: '2', requeueAfterCallCount: 10 }; // Queue totalCallsCount is 10
      const res = selectNextQueueEntry(defaultQueue, [entry1, entry2], now);
      expect(res.selectedEntry).toBe(entry2); // VIP wins
    });

    it('9. VIP streak protection', () => {
      const queueWithStreak = { ...defaultQueue, consecutiveVipCount: 2 };
      const entryNormal = { priority: 'NORMAL', joinedAt: now, sequenceNumber: '1' };
      const entryVip = { priority: 'VIP', joinedAt: now, sequenceNumber: '2' };
      const res = selectNextQueueEntry(queueWithStreak, [entryNormal, entryVip], now);
      expect(res.selectedEntry).toBe(entryNormal);
      expect(res.nextConsecutiveVipCount).toBe(0);
    });

    it('10. VIP streak below the limit', () => {
      const queueWithStreak = { ...defaultQueue, consecutiveVipCount: 1 };
      const entryNormal = { priority: 'NORMAL', joinedAt: now, sequenceNumber: '1' };
      const entryVip = { priority: 'VIP', joinedAt: now, sequenceNumber: '2' };
      const res = selectNextQueueEntry(queueWithStreak, [entryNormal, entryVip], now);
      expect(res.selectedEntry).toBe(entryVip);
      expect(res.nextConsecutiveVipCount).toBe(2);
    });

    it('11. No eligible NORMAL exists after the VIP streak limit', () => {
      const queueWithStreak = { ...defaultQueue, consecutiveVipCount: 2 };
      const entryVip = { priority: 'VIP', joinedAt: now, sequenceNumber: '2' };
      const res = selectNextQueueEntry(queueWithStreak, [entryVip], now);
      expect(res.selectedEntry).toBe(entryVip);
      expect(res.nextConsecutiveVipCount).toBe(3); // Falls back to VIP
    });

    it('12. Ineligible entries are filtered', () => {
      const queue = { ...defaultQueue, totalCallsCount: 10 };
      const penaltyEntry = { priority: 'VIP', joinedAt: now, sequenceNumber: '1', requeueAfterCallCount: 15 };
      const eligibleEntry = { priority: 'NORMAL', joinedAt: now, sequenceNumber: '2' };
      const res = selectNextQueueEntry(queue, [penaltyEntry, eligibleEntry], now);
      expect(res.selectedEntry).toBe(eligibleEntry);
    });

    it('13. Multiple candidates with different scores, highest wins', () => {
      const e1 = { priority: 'NORMAL', joinedAt: now, sequenceNumber: '1' }; // 10
      const e2 = { priority: 'VIP', joinedAt: now, sequenceNumber: '2' }; // 20
      const e3 = { priority: 'VIP', joinedAt: new Date(now.getTime() - 600000), sequenceNumber: '3' }; // 40
      const res = selectNextQueueEntry(defaultQueue, [e1, e2, e3], now);
      expect(res.selectedEntry).toBe(e3);
    });

    it('14. Multiple candidates with equal score, sequenceNumber deterministic', () => {
      const e1 = { priority: 'NORMAL', joinedAt: now, sequenceNumber: '3' };
      const e2 = { priority: 'NORMAL', joinedAt: now, sequenceNumber: '1' };
      const e3 = { priority: 'NORMAL', joinedAt: now, sequenceNumber: '2' };
      const res = selectNextQueueEntry(defaultQueue, [e1, e2, e3], now);
      expect(res.selectedEntry).toBe(e2);
    });
  });

  describe('TEST GROUP 4 — handleNoShow', () => {
    const getMockEntry = (overrides = {}) => ({
      id: 'entry-1',
      queueId: 'queue-1',
      status: QUEUE_ENTRY_STATUS.CALLED,
      priority: 'NORMAL',
      noShowCount: 0,
      token: 'T-1',
      queue: { totalCallsCount: 100 },
      ...overrides
    });

    it('1. NORMAL 1st no-show', async () => {
      const mockEntry = getMockEntry({ priority: 'NORMAL', noShowCount: 0 });
      queueEntryRepository.findById.mockResolvedValue(mockEntry);
      queueEntryRepository.update.mockResolvedValue({ ...mockEntry, status: QUEUE_ENTRY_STATUS.WAITING, noShowCount: 1 });

      const res = await handleNoShow('entry-1');
      expect(queueEntryRepository.update).toHaveBeenCalledWith('entry-1', expect.objectContaining({
        status: QUEUE_ENTRY_STATUS.WAITING,
        noShowCount: 1,
        requeueAfterCallCount: 105 // 100 + 5
      }));
      expect(res.status).toBe(QUEUE_ENTRY_STATUS.WAITING);
    });

    it('2. NORMAL 2nd no-show', async () => {
      const mockEntry = getMockEntry({ priority: 'NORMAL', noShowCount: 1 });
      queueEntryRepository.findById.mockResolvedValue(mockEntry);
      queueEntryRepository.update.mockResolvedValue({ ...mockEntry, status: QUEUE_ENTRY_STATUS.WAITING, noShowCount: 2 });

      await handleNoShow('entry-1');
      expect(queueEntryRepository.update).toHaveBeenCalledWith('entry-1', expect.objectContaining({
        status: QUEUE_ENTRY_STATUS.WAITING,
        noShowCount: 2,
        requeueAfterCallCount: 115 // 100 + 15
      }));
    });

    it('3. NORMAL 3rd no-show -> SKIPPED', async () => {
      const mockEntry = getMockEntry({ priority: 'NORMAL', noShowCount: 2 });
      queueEntryRepository.findById.mockResolvedValue(mockEntry);
      queueEntryRepository.update.mockResolvedValue({ ...mockEntry, status: QUEUE_ENTRY_STATUS.SKIPPED, noShowCount: 3 });

      await handleNoShow('entry-1');
      expect(queueEntryRepository.update).toHaveBeenCalledWith('entry-1', expect.objectContaining({
        status: QUEUE_ENTRY_STATUS.SKIPPED,
        noShowCount: 3
      }));
    });

    it('4. VIP 1st no-show', async () => {
      const mockEntry = getMockEntry({ priority: 'VIP', noShowCount: 0 });
      queueEntryRepository.findById.mockResolvedValue(mockEntry);
      queueEntryRepository.update.mockResolvedValue({ ...mockEntry, status: QUEUE_ENTRY_STATUS.WAITING, noShowCount: 1 });

      await handleNoShow('entry-1');
      expect(queueEntryRepository.update).toHaveBeenCalledWith('entry-1', expect.objectContaining({
        status: QUEUE_ENTRY_STATUS.WAITING,
        noShowCount: 1,
        requeueAfterCallCount: 103 // 100 + 3
      }));
    });

    it('5. VIP 2nd no-show', async () => {
      const mockEntry = getMockEntry({ priority: 'VIP', noShowCount: 1 });
      queueEntryRepository.findById.mockResolvedValue(mockEntry);
      queueEntryRepository.update.mockResolvedValue({ ...mockEntry, status: QUEUE_ENTRY_STATUS.WAITING, noShowCount: 2 });

      await handleNoShow('entry-1');
      expect(queueEntryRepository.update).toHaveBeenCalledWith('entry-1', expect.objectContaining({
        status: QUEUE_ENTRY_STATUS.WAITING,
        noShowCount: 2,
        requeueAfterCallCount: 108 // 100 + 8
      }));
    });

    it('6. VIP 3rd no-show -> SKIPPED', async () => {
      const mockEntry = getMockEntry({ priority: 'VIP', noShowCount: 2 });
      queueEntryRepository.findById.mockResolvedValue(mockEntry);
      queueEntryRepository.update.mockResolvedValue({ ...mockEntry, status: QUEUE_ENTRY_STATUS.SKIPPED, noShowCount: 3 });

      await handleNoShow('entry-1');
      expect(queueEntryRepository.update).toHaveBeenCalledWith('entry-1', expect.objectContaining({
        status: QUEUE_ENTRY_STATUS.SKIPPED,
        noShowCount: 3
      }));
    });

    it('7. Throws error if entry is not CALLED', async () => {
      const mockEntry = getMockEntry({ status: QUEUE_ENTRY_STATUS.WAITING });
      queueEntryRepository.findById.mockResolvedValue(mockEntry);

      await expect(handleNoShow('entry-1')).rejects.toThrow(/Cannot mark no-show for entry in status 'WAITING'/);
    });
  });

  describe('EDGE CASES', () => {
    it('only ineligible candidates (all penalized) - selects the best anyway', () => {
      const queue = { vipWeight: 2, normalWeight: 1, totalCallsCount: 10 };
      const now = new Date();
      const p1 = { priority: 'NORMAL', joinedAt: now, sequenceNumber: '1', requeueAfterCallCount: 15 };
      const p2 = { priority: 'VIP', joinedAt: now, sequenceNumber: '2', requeueAfterCallCount: 15 };
      
      const res = selectNextQueueEntry(queue, [p1, p2], now);
      // Fallback is to pick the best from the ineligible
      expect(res.selectedEntry).toBe(p2);
    });
  });
});
