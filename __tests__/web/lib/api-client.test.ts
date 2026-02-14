import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient, ApiError } from '@/lib/api-client'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  }
}

describe('ApiError', () => {
  it('sets code, message, status, and name', () => {
    const error = new ApiError('NOT_FOUND', 'Item not found', 404)
    expect(error.code).toBe('NOT_FOUND')
    expect(error.message).toBe('Item not found')
    expect(error.status).toBe(404)
    expect(error.name).toBe('ApiError')
  })

  it('is an instance of Error', () => {
    const error = new ApiError('ERR', 'test', 500)
    expect(error).toBeInstanceOf(Error)
  })
})

describe('apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('get', () => {
    it('returns data on success', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: { id: '1', name: 'Test' } }))

      const result = await apiClient.get<{ id: string; name: string }>('/api/test')

      expect(result).toEqual({ id: '1', name: 'Test' })
      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        headers: { 'Content-Type': 'application/json' },
      })
    })

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404),
      )

      await expect(apiClient.get('/api/missing')).rejects.toThrow(ApiError)

      try {
        mockFetch.mockResolvedValueOnce(
          jsonResponse({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404),
        )
        await apiClient.get('/api/missing')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        const apiError = error as ApiError
        expect(apiError.code).toBe('NOT_FOUND')
        expect(apiError.message).toBe('Not found')
        expect(apiError.status).toBe(404)
      }
    })
  })

  describe('post', () => {
    it('sends POST with JSON body and returns data', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: { id: '2' } }, 201))

      const result = await apiClient.post<{ id: string }>('/api/items', { name: 'New' })

      expect(result).toEqual({ id: '2' })
      expect(mockFetch).toHaveBeenCalledWith('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New' }),
      })
    })

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ error: { code: 'VALIDATION_ERROR', message: 'Invalid data' } }, 400),
      )

      await expect(apiClient.post('/api/items', {})).rejects.toThrow(ApiError)
    })
  })

  describe('patch', () => {
    it('sends PATCH with JSON body and returns data', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: { id: '1', name: 'Updated' } }))

      const result = await apiClient.patch<{ id: string; name: string }>('/api/items/1', { name: 'Updated' })

      expect(result).toEqual({ id: '1', name: 'Updated' })
      expect(mockFetch).toHaveBeenCalledWith('/api/items/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      })
    })

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404),
      )

      await expect(apiClient.patch('/api/items/999', {})).rejects.toThrow(ApiError)
    })
  })

  describe('delete', () => {
    it('sends DELETE request', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: undefined }))

      await apiClient.delete('/api/items/1')

      expect(mockFetch).toHaveBeenCalledWith('/api/items/1', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })
    })

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404),
      )

      await expect(apiClient.delete('/api/items/999')).rejects.toThrow(ApiError)
    })
  })
})
