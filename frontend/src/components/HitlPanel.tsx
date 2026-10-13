import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '../api/client'
import type { HitlProposal } from '../api/types'
import { useI18n } from '../i18n/I18nProvider'

interface HitlPanelProps {
  refreshKey?: number
  onResolved?: () => void
}

export function HitlPanel({ refreshKey = 0, onResolved }: HitlPanelProps) {
  const { t } = useI18n()
  const [pending, setPending] = useState<HitlProposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedbackById, setFeedbackById] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await apiClient.listHitlProposals('pending')
      setPending(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  async function approve(id: string) {
    setBusyId(id)
    setError(null)
    try {
      await apiClient.approveHitlProposal(id, feedbackById[id] || 'Approved')
      await load()
      onResolved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setBusyId(null)
    }
  }

  async function reject(id: string) {
    const feedback = (feedbackById[id] ?? '').trim()
    if (!feedback) {
      setError(t('hitl.rejectNeedsFeedback'))
      return
    }
    setBusyId(id)
    setError(null)
    try {
      await apiClient.rejectHitlProposal(id, feedback)
      await load()
      onResolved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="panel hitl-panel" aria-labelledby="hitl-heading">
      <div className="panel-header-row">
        <h2 id="hitl-heading">{t('hitl.title')}</h2>
        <button type="button" onClick={() => void load()} disabled={loading}>
          {t('common.refresh')}
        </button>
      </div>
      <p className="panel-lead">{t('hitl.lead')}</p>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {loading && <p className="muted">{t('common.loading')}</p>}

      {!loading && pending.length === 0 && (
        <p className="muted">{t('hitl.none')}</p>
      )}

      <ul className="hitl-list">
        {pending.map((p) => (
          <li key={p.id} className="hitl-item">
            <div className="hitl-item-head">
              <strong>{p.summary}</strong>
              <code className="hitl-action">{p.action}</code>
            </div>
            <pre className="hitl-payload">
              {JSON.stringify(p.payload, null, 2)}
            </pre>
            <label className="hitl-feedback-label">
              {t('hitl.feedback')}
              <textarea
                rows={2}
                value={feedbackById[p.id] ?? ''}
                onChange={(e) =>
                  setFeedbackById((prev) => ({
                    ...prev,
                    [p.id]: e.target.value,
                  }))
                }
                placeholder={t('hitl.feedbackPlaceholder')}
              />
            </label>
            <div className="hitl-actions">
              <button
                type="button"
                className="btn-primary"
                disabled={busyId === p.id}
                onClick={() => void approve(p.id)}
              >
                {t('common.approve')}
              </button>
              <button
                type="button"
                disabled={busyId === p.id}
                onClick={() => void reject(p.id)}
              >
                {t('common.reject')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
