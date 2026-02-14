'use client'

import { usePathname } from 'next/navigation'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { primaryNav, secondaryNav } from '@/config/navigation'

const allNav = [...primaryNav, ...secondaryNav]

export function PageBreadcrumb() {
  const pathname = usePathname()
  const current = allNav.find((item) => item.href === pathname)

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>Fin</BreadcrumbItem>
        {current && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{current.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
