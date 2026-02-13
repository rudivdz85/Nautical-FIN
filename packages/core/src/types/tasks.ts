import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { tasks } from '../db/schema'

export type Task = InferSelectModel<typeof tasks>
export type NewTask = InferInsertModel<typeof tasks>
export type TaskType = Task['taskType']
export type TaskPriority = Task['priority']
export type TaskStatus = Task['status']
