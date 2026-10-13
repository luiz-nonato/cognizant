import { useState, type FormEvent } from 'react'
import type { CopilotChatResponse } from '../api/types'
import { apiClient } from '../api/client'
import { useI18n } from '../i18n/I18nProvider'

interface CopilotPanelProps {
  recipeId: string
}

export function CopilotPanel({ recipeId }: CopilotPanelProps) {
  const { t } = useI18n()
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
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel copilot-panel" aria-labelledby="copilot-heading">
      <h3 id="copilot-heading">{t('copilot.title')}</h3>
      <p className="muted">{t('copilot.lead')}</p>

      <form className="copilot-form" onSubmit={onSubmit}>
        <label htmlFor="copilot-message">{t('copilot.message')}</label>
        <textarea
          id="copilot-message"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={busy}
        />
        <button type="submit" disabled={busy || !message.trim()}>
          {busy ? t('copilot.asking') : t('copilot.ask')}
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
              <dt>{t('copilot.agent')}</dt>
              <dd>
                <code>{response.agent}</code>
              </dd>
            </div>
            <div>
              <dt>{t('copilot.grounding')}</dt>
              <dd>
                <time dateTime={response.grounding_timestamp}>
                  {response.grounding_timestamp}
                </time>
              </dd>
            </div>
          </dl>

          {(response.crew_plan || response.agent_reasoning) && (
            <div className="copilot-artifacts">
              <h4>{t('copilot.artifacts')}</h4>
              {response.crew_plan && (
                <>
                  <p className="muted">{t('copilot.crewPlan')}</p>
                  <pre className="hitl-payload">{response.crew_plan}</pre>
                </>
              )}
              {response.agent_reasoning && (
                <>
                  <p className="muted">{t('copilot.agentReasoning')}</p>
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
