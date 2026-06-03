import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHealth, sendChatMessage } from '@/lib/api';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('API client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getHealth', () => {
    it('returns health data on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, status: 'healthy', timestamp: '2026-01-01' }),
      });

      const result = await getHealth();
      expect(result.success).toBe(true);
      expect(result.status).toBe('healthy');
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      await expect(getHealth()).rejects.toThrow('Server error');
    });
  });

  describe('sendChatMessage', () => {
    it('sends POST with correct headers and body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { message: 'Hi!', sessionId: 's1' } }),
      });

      const result = await sendChatMessage({
        sessionId: 's1',
        messages: [{ role: 'user', content: 'Hello' }],
        token: 'test-token',
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        }),
      }));

      expect(result.data.message).toBe('Hi!');
    });

    it('works without auth token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { message: 'Hi!', sessionId: 's1' } }),
      });

      await sendChatMessage({
        sessionId: 's1',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
        headers: expect.not.objectContaining({
          'Authorization': expect.anything(),
        }),
      }));
    });
  });
});
