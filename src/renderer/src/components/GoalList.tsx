import type { GoalRecord } from '../../../shared/types';

interface GoalListProps {
  goals: GoalRecord[];
}

const UNKNOWN_SCORE = '?';

function formatTime(time: number): string {
  return new Date(time).toLocaleTimeString('fr-FR');
}

export function GoalList({ goals }: GoalListProps) {
  if (goals.length === 0) {
    return <p className="muted">Aucun but détecté depuis le lancement.</p>;
  }

  return (
    <ul className="goal-list">
      {goals.map((goal) => (
        <li key={goal.time} className="goal">
          <span className="goal-time">{formatTime(goal.time)}</span>
          <span className="goal-score">
            {goal.score.home ?? UNKNOWN_SCORE} - {goal.score.away ?? UNKNOWN_SCORE}
          </span>
          <span className={goal.published ? 'goal-status goal-ok' : 'goal-status goal-failed'}>
            {goal.published ? 'Envoyé sur Discord' : (goal.error ?? 'Échec')}
          </span>
        </li>
      ))}
    </ul>
  );
}
