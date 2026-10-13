import { useI18n } from '../i18n/I18nProvider'

export function FutureWorkBadge() {
  const { t } = useI18n()
  return <span className="future-work-badge">{t('future.work')}</span>
}
