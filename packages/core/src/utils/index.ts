import type { ApiSuccessResponse, ApiErrorResponse } from '../types/common'

export function successResponse<T>(data: T): ApiSuccessResponse<T> {
  return { data }
}

export function errorResponse(code: string, message: string): ApiErrorResponse {
  return { error: { code, message } }
}
