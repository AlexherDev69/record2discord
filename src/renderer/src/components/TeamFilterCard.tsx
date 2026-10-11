import { useState } from 'react';
import type { IpcResult, Settings } from '../../../shared/types';
import { Section, TextField } from './fields';

interface TeamFilterCardProps {
  settings: Settings;
  onSave: (settings: Settings) => Promise<IpcResult<Settings>>;
}

/** Lets the user restrict the recorded goals to the teams they name. */
export function TeamFilterCard({ settings, onSave }: TeamFilterCardProps) {
  const [recordedTeams, setRecordedTeams] = useState(settings.recordedTeams);
  const [message, setMessage] = useState<string | null>(null);

  const save = async (): Promise<void> => {
    const result = await onSave({ ...settings, recordedTeams });
    setMessage(result.success ? 'Équipes enregistrées.' : 'Texte trop long.');
  };

  return (
    <Section title="Équipes à enregistrer">
      <TextField
        label="Initiales des équipes"
        hint="Telles qu’affichées sur le bandeau, séparées par une virgule. Seuls les buts de ces équipes sont envoyés. Vide : tous les buts."
        placeholder="Exemple : ACH, CFC"
        value={recordedTeams}
        onChange={setRecordedTeams}
      />
      <div className="actions">
        <button className="button" onClick={() => void save()}>
          Enregistrer les équipes
        </button>
        {message !== null && <p className="message message-fair">{message}</p>}
      </div>
    </Section>
  );
}
