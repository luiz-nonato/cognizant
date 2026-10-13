import { useState, type FormEvent } from 'react'
import type { CopilotChatResponse } from '../api/types'
import { apiClient } from '../api/client'

interface CopilotPanelProps {
  recipeId: string
}

/**
 * Non-streaming recipe copilot (CrewAI runtime contract).
 * Uses apiClient (live when VITE_API_BASE_URL is set; else mock).
 */
export function CopilotPanel({ recipeId }: CopilotPanelProps) {
  const [message, setMessage] = useState('Why is this unit cost what it is?')
  const [response, setResponse] = useState<CopilotChatResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = message.trim()
    if (!trimmed || busy) return

    setBusy(true)
    setError(null)
    try {
      const result = await apiClient.postCopilotChat({
        message: trimmed,
        context: { screen: 'recipe', entity_ids: [recipeId] },
      })
      setResponse(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Copilot request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel copilot-panel" aria-labelledby="copilot-heading">
      <h3 id="copilot-heading">Costing copilot</h3>
      <p className="muted">
        Non-streaming chat (CrewAI). Explains engine figures for this recipe —
        agent does not invent a second set of numbers.
      </p>

      <form className="copilot-form" onSubmit={onSubmit}>
        <label htmlFor="copilot-message">Message</label>
        <textarea
          id="copilot-message"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={busy}
        />
        <button type="submit" disabled={busy || !message.trim()}>
          {busy ? 'Asking…' : 'Ask costing analyst'}
        </button>
      </form>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {response && (
        <div className="copilot-response" data-testid="copilot-response">
          <p className="copilot-reply">{response.reply}</p>
          <dl className="detail-grid compact">
            <div>
              <dt>Agent</dt>
              <dd>
                <code>{response.agent}</code>
              </dd>
            </div>
            <div>
              <dt>Grounding</dt>
              <dd>
                Based on engine cost as of{' '}
                <time dateTime={response.grounding_timestamp}>
                  {response.grounding_timestamp}
                </time>
              </dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  )
}
