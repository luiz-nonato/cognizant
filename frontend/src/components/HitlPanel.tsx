import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '../api/client'
import type { HitlProposal } from '../api/types'

interface HitlPanelProps {
  /** Bump to force a refresh after creating a proposal elsewhere. */
  refreshKey?: number
  onResolved?: () => void
}

export function HitlPanel({ refreshKey = 0, onResolved }: HitlPanelProps) {
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
      setError(err instanceof Error ? err.message : 'Failed to load HITL queue')
    } finally {
      setLoading(false)
    }
  }, [])

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
      setError(err instanceof Error ? err.message : 'Approve failed')
    } finally {
      setBusyId(null)
    }
  }

  async function reject(id: string) {
    const feedback = (feedbackById[id] ?? '').trim()
    if (!feedback) {
      setError('Reject requires feedback explaining why.')
      return
    }
    setBusyId(id)
    setError(null)
    try {
      await apiClient.rejectHitlProposal(id, feedback)
      await load()
      onResolved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="panel hitl-panel" aria-labelledby="hitl-heading">
      <div className="panel-header-row">
        <h2 id="hitl-heading">Human-in-the-loop</h2>
        <button type="button" onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
      </div>
      <p className="panel-lead">
        Pending write proposals wait here. Approve executes the domain mutation;
        reject records feedback and leaves stock/orders unchanged.
      </p>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {loading && <p className="muted">Loading pending proposals…</p>}

      {!loading && pending.length === 0 && (
        <p className="muted">No pending approvals.</p>
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
              Feedback (required to reject)
              <textarea
                rows={2}
                value={feedbackById[p.id] ?? ''}
                onChange={(e) =>
                  setFeedbackById((prev) => ({
                    ...prev,
                    [p.id]: e.target.value,
                  }))
                }
                placeholder="Optional note on approve; required on reject"
              />
            </label>
            <div className="hitl-actions">
              <button
                type="button"
                className="btn-primary"
                disabled={busyId === p.id}
                onClick={() => void approve(p.id)}
              >
                Approve
              </button>
              <button
                type="button"
                disabled={busyId === p.id}
                onClick={() => void reject(p.id)}
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
