import { eq, and, inArray } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { tasks } from '../db/schema'
import type { Task, NewTask, TaskStatus } from '../types/tasks'

type Database = NeonHttpDatabase

export const tasksRepository = {
  async findByUserId(
    db: Database,
    userId: string,
    statuses?: TaskStatus[],
  ): Promise<Task[]> {
    if (statuses && statuses.length > 0) {
      return db
        .select()
        .from(tasks)
        .where(
          and(eq(tasks.userId, userId), inArray(tasks.status, statuses)),
        )
        .orderBy(tasks.dueDate, tasks.priority)
    }

    return db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(tasks.dueDate, tasks.priority)
  },

  async findById(db: Database, id: string, userId: string): Promise<Task | undefined> {
    const results = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .limit(1)

    return results[0]
  },

  async create(db: Database, data: NewTask): Promise<Task> {
    const results = await db.insert(tasks).values(data).returning()
    return results[0]!
  },

  async update(
    db: Database,
    id: string,
    userId: string,
    data: Partial<
      Pick<
        Task,
        | 'title'
        | 'description'
        | 'priority'
        | 'status'
        | 'dueDate'
        | 'dueTime'
        | 'snoozedUntil'
        | 'actionPath'
        | 'completedAt'
        | 'dismissedAt'
        | 'metadata'
      >
    >,
  ): Promise<Task | undefined> {
    const results = await db
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning()

    return results[0]
  },

  async delete(db: Database, id: string, userId: string): Promise<boolean> {
    const results = await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning({ id: tasks.id })

    return results.length > 0
  },
}
