import type { AppState, Score } from '../../../shared/types';
import { GoalList } from './GoalList';

interface StatusPanelProps {
  state: AppState;
  webhookConfigured: boolean;
}

interface IndicatorProps {
  label: string;
  active: boolean;
  detail: string;
}

const UNKNOWN_SCORE = '?';

function formatScore(score: Score | null): string {
  return score === null ? 'Pas encore lu' :`${score.home ?? UNKNOWN_SCORE} - ${score.away ?? UNKNOWN_SCORE}`;
}

function Indicator({ label, active, detail }: IndicatorProps) {
  return (
    <div className="indicator">
      <span className={active ? 'dot dot-on' : 'dot dot-off'} />
      <div>
        <div className="indicator-label">{label}</div>
        <div className="indicator-detail">{detail}</div>
      </div>
    </div>
  );
}

export function StatusPanel({ state, webhookConfigured }: StatusPanelProps) {
  const { status, goals } = state;

  return (
    <div className="stack">
      <section className="card">
        <h2>Surveillance</h2>
        <div className="indicators">
          <Indicator
            label="OBS"
            active={status.obsConnected}
            detail={status.obsConnected ? 'Connecté, replay buffer actif' : 'Non connecté'}
          />
          <Indicator
            label="Bandeau du score"
            active={status.scoreboardVisible}
            detail={status.scoreboardVisible ? 'Visible à l’écran' : 'Non visible (menu, ralenti ou hors match)'}
          />
          <Indicator
            label="Discord"
            active={webhookConfigured}
            detail={webhookConfigured ? 'Webhook configuré' : 'Webhook à renseigner dans Réglages'}
          />
        </div>
        <div className="score">
          <span className="score-label">Score lu</span>
          <span className="score-value">{formatScore(status.score)}</span>
        </div>
        {status.error !== null && <p className="message message-error">{status.error}</p>}
      </section>
      <section className="card">
        <h2>Derniers buts</h2>
        <GoalList goals={goals} />
      </section>
    </div>
  );
}
