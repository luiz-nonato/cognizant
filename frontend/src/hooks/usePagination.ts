import { useMemo, useState } from 'react'

export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number]

export function usePagination<T>(items: T[], initialSize: PageSize = 10) {
  const [pageSize, setPageSizeState] = useState<PageSize>(initialSize)
  const [page, setPage] = useState(1)

  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
  const safePage = Math.min(page, totalPages)

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, safePage, pageSize])

  function setPageSize(size: PageSize) {
    setPageSizeState(size)
    setPage(1)
  }

  function goTo(next: number) {
    setPage(Math.min(Math.max(1, next), totalPages))
  }

  return {
    page: safePage,
    pageSize,
    total,
    totalPages,
    pageItems,
    setPageSize,
    goTo,
    rangeStart: total === 0 ? 0 : (safePage - 1) * pageSize + 1,
    rangeEnd: Math.min(safePage * pageSize, total),
  }
}
