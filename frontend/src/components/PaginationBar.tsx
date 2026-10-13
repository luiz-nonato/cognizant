import { PAGE_SIZE_OPTIONS, type PageSize } from '../hooks/usePagination'
import { useI18n } from '../i18n/I18nProvider'

interface PaginationBarProps {
  page: number
  pageSize: PageSize
  total: number
  totalPages: number
  rangeStart: number
  rangeEnd: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: PageSize) => void
}

export function PaginationBar({
  page,
  pageSize,
  total,
  totalPages,
  rangeStart,
  rangeEnd,
  onPageChange,
  onPageSizeChange,
}: PaginationBarProps) {
  const { t } = useI18n()

  return (
    <div className="pagination-bar" role="navigation" aria-label={t('pager.label')}>
      <label className="pager-size">
        {t('pager.perPage')}
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSize)}
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <span className="pager-range muted">
        {total === 0
          ? t('pager.empty')
          : t('pager.range')
              .replace('{start}', String(rangeStart))
              .replace('{end}', String(rangeEnd))
              .replace('{total}', String(total))}
      </span>
      <div className="pager-nav">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {t('pager.prev')}
        </button>
        <span className="pager-page">
          {t('pager.page')
            .replace('{page}', String(page))
            .replace('{pages}', String(totalPages))}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {t('pager.next')}
        </button>
      </div>
    </div>
  )
}
