import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHealth, sendChatMessage } from '@/lib/api';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('API Error Handling', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getHealth', () => {
    it('handles 500 server error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal Server Error' }),
      });

      await expect(getHealth()).rejects.toThrow('Internal Server Error');
    });

    it('handles network failure', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(getHealth()).rejects.toThrow('Failed to fetch');
    });

    it('handles malformed JSON response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      });

      await expect(getHealth()).rejects.toThrow('Request failed with status 400');
    });

    it('handles 429 rate limit', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: 'Too many requests' }),
      });

      await expect(getHealth()).rejects.toThrow('Too many requests');
    });
  });

  describe('sendChatMessage', () => {
    it('handles 401 unauthorized', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Authentication required' }),
      });

      await expect(
        sendChatMessage({ sessionId: 's1', messages: [{ role: 'user', content: 'Hi' }], token: 'expired' })
      ).rejects.toThrow('Authentication required');
    });

    it('handles 400 validation error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Message content cannot be empty' }),
      });

      await expect(
        sendChatMessage({ sessionId: 's1', messages: [{ role: 'user', content: '' }] })
      ).rejects.toThrow('Message content cannot be empty');
    });

    it('handles timeout scenario', async () => {
      mockFetch.mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 100))
      );

      await expect(
        sendChatMessage({ sessionId: 's1', messages: [{ role: 'user', content: 'Hi' }] })
      ).rejects.toThrow('Request timeout');
    });

    it('handles 503 service unavailable', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ error: 'Service temporarily unavailable' }),
      });

      await expect(
        sendChatMessage({ sessionId: 's1', messages: [{ role: 'user', content: 'Hi' }] })
      ).rejects.toThrow('Service temporarily unavailable');
    });

    it('handles empty error response body', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.resolve(null),
      });

      await expect(
        sendChatMessage({ sessionId: 's1', messages: [{ role: 'user', content: 'Hi' }] })
      ).rejects.toThrow('Request failed with status 502');
    });
  });
});
