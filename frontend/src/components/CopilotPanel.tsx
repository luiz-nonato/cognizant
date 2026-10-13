import { useState, type FormEvent } from 'react'
import type { CopilotChatResponse } from '../api/types'
import { apiClient } from '../api/client'

interface CopilotPanelProps {
  recipeId: string
}

/**
 * Non-streaming recipe copilot (CrewAI runtime contract).
 * Week 4 bonus: shows optional crew_plan / agent_reasoning when present.
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
        agent does not invent a second set of numbers. When the LLM path runs,
        optional crew plan and agent reasoning artifacts appear below the reply.
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

          {(response.crew_plan || response.agent_reasoning) && (
            <div className="copilot-artifacts">
              <h4>Planning &amp; reasoning</h4>
              {response.crew_plan && (
                <>
                  <p className="muted">Crew plan</p>
                  <pre className="hitl-payload">{response.crew_plan}</pre>
                </>
              )}
              {response.agent_reasoning && (
                <>
                  <p className="muted">Agent reasoning</p>
                  <pre className="hitl-payload">{response.agent_reasoning}</pre>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
