import { useState } from 'react';
import { CLIP_HEIGHT_OPTIONS, CLIP_MAX_SIZE_MB_OPTIONS } from '../../../core/config';
import type { IpcResult, Settings } from '../../../shared/types';
import { useAutoSave, type AutoSaveStatus } from '../hooks/useAutoSave';
import { ClipQualityHint } from './ClipQualityHint';
import { CheckboxField, NumberField, Section, SelectField, TextField } from './fields';
import { ShortcutField } from './ShortcutField';

interface SettingsFormProps {
  settings: Settings;
  onSave: (settings: Settings) => Promise<IpcResult<Settings>>;
}

interface Feedback {
  kind: 'good' | 'error';
  text: string;
}

const MAX_SIZE_LABELS: Record<number, string> = {
  10: '10 Mo (serveur sans boost)',
  50: '50 Mo (serveur boost niveau 2)',
  100: '100 Mo (serveur boost niveau 3)',
};

const SAVE_STATUS_LABELS: Record<AutoSaveStatus, string> = {
  idle: 'Les réglages s’enregistrent tout seuls.',
  saved: 'Réglages enregistrés.',
  invalid: 'Non enregistré : vérifie l’URL du webhook et les valeurs saisies.',
};

export function SettingsForm({ settings, onSave }: SettingsFormProps) {
  const [draft, setDraft] = useState<Settings>(settings);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const update = <Key extends keyof Settings>(key: Key, value: Settings[Key]): void => {
    setDraft((current) => ({ ...current, [key]: value }));
    setFeedback(null);
  };

  const saveStatus = useAutoSave(draft, async (value) => (await onSave(value)).success);

  const testWebhook = async (): Promise<void> => {
    const result = await window.api.testWebhook(draft.discordWebhookUrl);
    setFeedback(
      result.success ? { kind: 'good', text: 'Message de test envoyé sur Discord.' } : { kind: 'error', text: result.error },
    );
  };

  return (
    <div className="stack">
      <Section title="Discord">
        <TextField
          label="URL du webhook"
          hint="Paramètres du salon > Intégrations > Webhooks > Copier l’URL."
          value={draft.discordWebhookUrl}
          secret
          placeholder="https://discord.com/api/webhooks/..."
          onChange={(value) => update('discordWebhookUrl', value.trim())}
        />
        <TextField
          label="Message"
          hint="{home} et {away} : scores. {homeTeam} et {awayTeam} : équipe à domicile (en haut) et à l’extérieur (en bas). {scorer} : équipe qui a marqué."
          value={draft.messageTemplate}
          onChange={(value) => update('messageTemplate', value)}
        />
        <button className="button button-secondary" onClick={() => void testWebhook()}>
          Envoyer un message de test
        </button>
      </Section>

      <Section title="Clip">
        <div className="field-row">
          <NumberField
            label="Durée du clip (s)"
            value={draft.clipSeconds}
            min={5}
            max={60}
            onChange={(value) => update('clipSeconds', value)}
          />
          <NumberField
            label="Secondes gardées après le but"
            value={draft.postGoalDelaySeconds}
            min={0}
            max={30}
            onChange={(value) => update('postGoalDelaySeconds', value)}
          />
        </div>
        <div className="field-row">
          <SelectField
            label="Résolution"
            value={draft.clipHeight}
            options={CLIP_HEIGHT_OPTIONS.map((height) => ({ value: height, label: `${height}p` }))}
            onChange={(value) => update('clipHeight', value)}
          />
          <SelectField
            label="Taille maximale"
            value={draft.maxClipSizeMb}
            options={CLIP_MAX_SIZE_MB_OPTIONS.map((size) => ({ value: size, label: MAX_SIZE_LABELS[size] ?? `${size} Mo` }))}
            onChange={(value) => update('maxClipSizeMb', value)}
          />
        </div>
        <ClipQualityHint
          clipSeconds={draft.clipSeconds}
          clipHeight={draft.clipHeight}
          maxClipSizeMb={draft.maxClipSizeMb}
        />
        <CheckboxField
          label="Supprimer les fichiers locaux après l’envoi"
          hint="Efface le replay d’OBS et le clip une fois Discord servi. Rien n’est supprimé si l’envoi échoue."
          checked={draft.deleteLocalFiles}
          onChange={(checked) => update('deleteLocalFiles', checked)}
        />
      </Section>

      <Section title="Extrait manuel">
        <ShortcutField
          label="Raccourci clavier"
          hint="Fonctionne aussi en jeu : envoie les dernières secondes sur Discord (durée du clip ci-dessus). La touche n’est alors plus transmise au jeu. Retour arrière pour le retirer."
          value={draft.manualClipShortcut}
          onChange={(value) => update('manualClipShortcut', value)}
        />
      </Section>

      <Section title="OBS">
        <div className="field-row">
          <TextField
            label="Adresse du serveur WebSocket"
            value={draft.obsWebsocketUrl}
            onChange={(value) => update('obsWebsocketUrl', value.trim())}
          />
          <TextField
            label="Mot de passe WebSocket"
            value={draft.obsWebsocketPassword}
            secret
            onChange={(value) => update('obsWebsocketPassword', value)}
          />
        </div>
        <CheckboxField
          label="Lancer OBS automatiquement"
          hint="Ouvre OBS réduit, replay buffer actif, s’il n’est pas déjà lancé."
          checked={draft.launchObs}
          onChange={(checked) => update('launchObs', checked)}
        />
        <TextField label="Emplacement d’OBS" value={draft.obsPath} onChange={(value) => update('obsPath', value)} />
      </Section>

      <Section title="Système">
        <CheckboxField
          label="Démarrer avec Windows"
          hint="L’application se lance réduite dans la zone de notification."
          checked={draft.startWithWindows}
          onChange={(checked) => update('startWithWindows', checked)}
        />
      </Section>

      <div className="actions">
        <span className={`message message-${saveStatus === 'invalid' ? 'error' : 'good'}`}>
          {SAVE_STATUS_LABELS[saveStatus]}
        </span>
        {feedback !== null && <span className={`message message-${feedback.kind}`}>{feedback.text}</span>}
      </div>
    </div>
  );
}
