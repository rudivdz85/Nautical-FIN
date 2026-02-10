interface RequestInfo {
  method: string
  path: string
  query?: Record<string, string>
  ip?: string
  userAgent?: string
}

interface UserInfo {
  id: string
  clerkId?: string
  subscriptionTier?: string
}

interface WideEventData {
  type: string
  startTime: number
  durationMs?: number
  request?: RequestInfo
  user?: UserInfo
  metadata: Record<string, unknown>
  dbQueryCount: number
  dbQueryDurationMs: number
  statusCode?: number
  status?: string
  error?: {
    code: string
    message: string
    stack?: string
  }
}

export class WideEvent {
  private data: WideEventData

  constructor(type: string) {
    this.data = {
      type,
      startTime: Date.now(),
      metadata: {},
      dbQueryCount: 0,
      dbQueryDurationMs: 0,
    }
  }

  setRequest(request: RequestInfo): this {
    this.data.request = request
    return this
  }

  setUser(user: UserInfo): this {
    this.data.user = user
    return this
  }

  addMetadata(meta: Record<string, unknown>): this {
    Object.assign(this.data.metadata, meta)
    return this
  }

  incrementDbQuery(durationMs?: number): this {
    this.data.dbQueryCount++
    if (durationMs !== undefined) {
      this.data.dbQueryDurationMs += durationMs
    }
    return this
  }

  setError(error: { code: string; message: string; stack?: string }): this {
    this.data.error = error
    return this
  }

  finalize(statusCode: number, status: string): this {
    this.data.statusCode = statusCode
    this.data.status = status
    this.data.durationMs = Date.now() - this.data.startTime
    return this
  }

  toJSON(): WideEventData {
    return { ...this.data }
  }
}
