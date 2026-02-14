export interface ApiSuccessResponse<T> {
  data: T
}

export interface ApiErrorResponse {
  error: {
    code: string
    message: string
  }
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface AuthenticatedUser {
  id: string
  clerkId: string
  email: string
  displayName: string | null
  onboardingCompleted: boolean
}

