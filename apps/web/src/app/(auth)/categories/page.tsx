import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { categoriesService } from '@fin/core/services'
import { CategoriesPageClient } from './categories-page-client'

export default async function CategoriesPage() {
  const user = await getAuthenticatedUser()
  const categories = await categoriesService.list(db, user.id)

  return <CategoriesPageClient initialCategories={categories} />
}
