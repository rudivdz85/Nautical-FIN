import { db } from '@/lib/db'
import { faqItemsService } from '@fin/core/services'
import { HelpPageClient } from './help-page-client'

export default async function HelpPage() {
  const faqItems = await faqItemsService.list(db)

  return <HelpPageClient faqItems={faqItems} />
}
