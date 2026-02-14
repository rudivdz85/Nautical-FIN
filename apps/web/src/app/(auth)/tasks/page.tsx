import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { tasksService } from '@fin/core/services'
import { TasksPageClient } from './tasks-page-client'

export default async function TasksPage() {
  const user = await getAuthenticatedUser()
  const tasks = await tasksService.list(db, user.id)

  return <TasksPageClient initialTasks={tasks} />
}
