import { useState } from 'react';
import type { Settings } from '../../../shared/types';
import { useAutoSave } from '../hooks/useAutoSave';
import type { SaveSettings } from '../hooks/useSettings';
import { Section, TextField } from './fields';

interface TeamFilterCardProps {
  settings: Settings;
  onSave: SaveSettings;
}

/** Lets the user restrict the recorded goals to the teams they name. */
export function TeamFilterCard({ settings, onSave }: TeamFilterCardProps) {
  const [recordedTeams, setRecordedTeams] = useState(settings.recordedTeams);
  const saveStatus = useAutoSave(
    recordedTeams,
    async (value) => (await onSave({ recordedTeams: value })).success,
  );

  return (
    <Section title="Équipes à enregistrer">
      <TextField
        label="Initiales des équipes"
        hint="Telles qu’affichées sur le bandeau, séparées par une virgule. Seuls les buts de ces équipes sont envoyés. Vide : tous les buts."
        placeholder="Exemple : ACH, CFC"
        value={recordedTeams}
        onChange={setRecordedTeams}
      />
      {saveStatus !== 'idle' && (
        <p className={`message message-${saveStatus === 'saved' ? 'good' : 'error'}`}>
          {saveStatus === 'saved' ? 'Équipes enregistrées.' : 'Non enregistré : texte trop long.'}
        </p>
      )}
    </Section>
  );
}
