import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCustomerQueueUrl, getGoogleMapsUrl, getAppUrl } from '@/lib/url';
import { generateMetadata } from '@/app/(customer)/q/[queueId]/layout';

describe('Skipline Hardening: URLs, Maps, and Open Graph Metadata', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('Canonical Customer URL Builder (getCustomerQueueUrl)', () => {
    it('constructs single canonical URL adhering to https://<domain>/q/<queueId>', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://skipline.me';
      const queueId = 'queue-uuid-1234';
      const url = getCustomerQueueUrl(queueId);

      expect(url).toBe('https://skipline.me/q/queue-uuid-1234');
    });

    it('strips trailing slashes from base URL gracefully', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://skipline.me///';
      const queueId = 'queue-abc';
      const url = getCustomerQueueUrl(queueId);

      expect(url).toBe('https://skipline.me/q/queue-abc');
    });

    it('safely URI-encodes queueId with special characters', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://skipline.me';
      const queueId = 'queue special/test&id';
      const url = getCustomerQueueUrl(queueId);

      expect(url).toBe('https://skipline.me/q/queue%20special%2Ftest%26id');
    });

    it('never embeds accessTokenHash, sessionId, or credentials in customer URL', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://skipline.me';
      const queueId = '550e8400-e29b-41d4-a716-446655440000';
      const url = getCustomerQueueUrl(queueId);

      expect(url).not.toContain('accessToken');
      expect(url).not.toContain('token=');
      expect(url).not.toContain('sessionId');
      expect(url).not.toContain('auth');
      expect(url).not.toContain('credential');
      expect(url).not.toContain('phone');
    });
  });

  describe('Google Maps URL Builder (getGoogleMapsUrl)', () => {
    it('returns explicit venueMapUrl when provided with https', () => {
      const url = getGoogleMapsUrl({
        venue: 'Grand Ballroom',
        venueMapUrl: 'https://maps.google.com/?cid=123456789',
      });

      expect(url).toBe('https://maps.google.com/?cid=123456789');
    });

    it('prepends https:// to venueMapUrl if missing protocol', () => {
      const url = getGoogleMapsUrl({
        venue: 'Grand Ballroom',
        venueMapUrl: 'goo.gl/maps/xyz123',
      });

      expect(url).toBe('https://goo.gl/maps/xyz123');
    });

    it('falls back to structured search query when only venue name is provided', () => {
      const url = getGoogleMapsUrl({
        venue: 'Madison Square Garden, New York',
        venueMapUrl: null,
      });

      expect(url).toBe(
        'https://www.google.com/maps/search/?api=1&query=Madison%20Square%20Garden%2C%20New%20York'
      );
    });

    it('returns null when neither venue nor venueMapUrl is provided', () => {
      expect(getGoogleMapsUrl({})).toBeNull();
      expect(getGoogleMapsUrl({ venue: '', venueMapUrl: '   ' })).toBeNull();
      expect(getGoogleMapsUrl({ venue: null, venueMapUrl: null })).toBeNull();
    });
  });

  describe('Open Graph Metadata Generation (layout.tsx)', () => {
    it('generates rich metadata from public queue and event info', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://skipline.me';
      process.env.NEXT_PUBLIC_API_URL = 'https://api.skipline.me';

      const mockPublicData = {
        success: true,
        data: {
          id: 'q-42',
          name: 'VIP Registration',
          event: {
            name: 'Tech Innovators Summit 2026',
          },
        },
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockPublicData,
      } as Response);

      const metadata = await generateMetadata({
        params: Promise.resolve({ queueId: 'q-42' }),
      });

      expect(metadata.title).toBe('Join VIP Registration - Tech Innovators Summit 2026 | Skipline');
      expect(metadata.description).toContain('Join the VIP Registration queue for Tech Innovators Summit 2026');
      expect(metadata.alternates?.canonical).toBe('https://skipline.me/q/q-42');
      expect(metadata.openGraph?.url).toBe('https://skipline.me/q/q-42');
      expect(metadata.openGraph?.title).toBe('Join VIP Registration - Tech Innovators Summit 2026 | Skipline');
      expect((metadata.twitter as any)?.card).toBe('summary_large_image');
    });

    it('falls back gracefully without throwing when API fetch fails', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://skipline.me';
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      const metadata = await generateMetadata({
        params: Promise.resolve({ queueId: 'q-error' }),
      });

      expect(metadata.title).toBe('Join Queue | Skipline');
      expect(metadata.alternates?.canonical).toBe('https://skipline.me/q/q-error');
      expect(metadata.openGraph?.siteName).toBe('Skipline');
    });

    it('exposes NO sensitive data in any metadata fields', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://skipline.me';
      process.env.NEXT_PUBLIC_API_URL = 'https://api.skipline.me';

      // Simulating a response to verify serializer guarantees
      const mockPublicData = {
        success: true,
        data: {
          id: 'q-safe',
          name: 'General Admission',
          event: {
            name: 'Music Festival',
          },
        },
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockPublicData,
      } as Response);

      const metadata = await generateMetadata({
        params: Promise.resolve({ queueId: 'q-safe' }),
      });

      const serialized = JSON.stringify(metadata);

      expect(serialized).not.toContain('accessTokenHash');
      expect(serialized).not.toContain('sessionId');
      expect(serialized).not.toContain('organizerId');
      expect(serialized).not.toContain('password');
      expect(serialized).not.toContain('secret');
      expect(serialized).not.toContain('phone');
    });
  });
});
