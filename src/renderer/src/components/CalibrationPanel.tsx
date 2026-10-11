import { useEffect, useState } from 'react';
import type { CalibrationPreview, RegionPreview, ScoreRegions, Settings } from '../../../shared/types';
import { useLivePreview } from '../hooks/useLivePreview';
import type { SaveSettings } from '../hooks/useSettings';
import { isScoreboardVisible, type LivePreview } from '../lib/livePreview';
import { RegionSelector, type Side } from './RegionSelector';
import { TeamFilterCard } from './TeamFilterCard';

interface CalibrationPanelProps {
  settings: Settings;
  onSave: SaveSettings;
}

interface SidePreviewProps {
  label: string;
  preview: RegionPreview;
}

// Leaves time to switch back to the game, which pauses when it loses focus.
const CAPTURE_DELAY_SECONDS = 10;
const MS_PER_SECOND = 1000;
const CAPTURE_NOTE = 'Lecture sur l’image capturée, avec les zones en cours de dessin.';

const SIDE_LABELS: Record<Side, string> = {
  home: 'Score du haut',
  away: 'Score du bas',
};

// Drawing a rectangle moves on to the other score, so no button is needed to pick one.
const OTHER_SIDE: Record<Side, Side> = { home: 'away', away: 'home' };

function describePreview(preview: RegionPreview): string {
  if (!preview.looksLikeScoreboard) {
    return 'Pas un chiffre du bandeau';
  }
  const digit = preview.digit === null ? 'Chiffre non reconnu' : `Lu : ${preview.digit}`;
  return `${digit} · Équipe : ${preview.teamName ?? 'non lue'}`;
}

function describeLive(livePreview: LivePreview | null, error: string | null): string {
  if (error !== null) {
    return error;
  }
  if (livePreview === null) {
    return 'Lecture en cours…';
  }
  if (!livePreview.isCurrent) {
    return 'Bandeau masqué (jeu en pause ?) : voici la dernière lecture faite en match.';
  }
  return isScoreboardVisible(livePreview.preview)
    ? 'Lecture en direct. Chaque image doit montrer un seul chiffre entier, et le chiffre lu doit être le bon.'
    : 'Bandeau du score introuvable pour l’instant. Lance un match : la lecture se met à jour toute seule.';
}

function SidePreview({ label, preview }: SidePreviewProps) {
  return (
    <div className="preview">
      <img src={preview.imageDataUrl} alt={label} />
      <div>
        <div className="indicator-label">{label}</div>
        <div className="indicator-detail">{describePreview(preview)}</div>
      </div>
    </div>
  );
}

export function CalibrationPanel({ settings, onSave }: CalibrationPanelProps) {
  const [frame, setFrame] = useState<string | null>(null);
  const [regions, setRegions] = useState<ScoreRegions>(settings.scoreRegions);
  const [activeSide, setActiveSide] = useState<Side>('home');
  const [hasRedrawn, setHasRedrawn] = useState(false);
  const [preview, setPreview] = useState<CalibrationPreview | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (frame === null) {
      return;
    }
    // Regions change on every mouse move while drawing: only the answer for the latest ones is shown.
    let isLatest = true;
    void window.api.previewRegions(regions).then((result) => {
      if (isLatest) {
        setPreview(result.success ? result.data : null);
      }
    });
    return () => {
      isLatest = false;
    };
  }, [frame, regions]);

  useEffect(() => {
    if (countdown === null || countdown <= 0) {
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), MS_PER_SECOND);
    return () => clearTimeout(timer);
  }, [countdown]);

  const live = useLivePreview(regions, frame === null);
  const shownPreview = frame === null ? (live.livePreview?.preview ?? null) : preview;

  const capture = async (): Promise<void> => {
    setMessage(null);
    setCountdown(CAPTURE_DELAY_SECONDS);
    const result = await window.api.captureFrame(CAPTURE_DELAY_SECONDS);
    setCountdown(null);
    if (result.success) {
      setFrame(result.data);
    } else {
      setMessage(result.error);
    }
  };

  const save = async (): Promise<void> => {
    const result = await onSave({ scoreRegions: regions });
    setMessage(result.success ? 'Zones enregistrées.' : 'Zones invalides : redessine-les sur l’image.');
  };

  return (
    <div className="stack">
      <section className="card">
        <h2>Zones du score</h2>
        <p className="muted">
          Par défaut, il n’y a rien à faire ici : les zones du bandeau d’origine du jeu sont déjà enregistrées. La
          capture sert seulement si le bandeau a changé de place : lance-la, reviens dans le jeu en plein match, puis
          entoure chaque chiffre au plus près sur l’image, sans toucher le bord du bandeau.
        </p>
        <div className="actions">
          <button className="button" disabled={countdown !== null} onClick={() => void capture()}>
            {countdown === null ? `Capturer dans ${CAPTURE_DELAY_SECONDS} s` : `Capture dans ${countdown} s…`}
          </button>
          {hasRedrawn && (
            <button className="button" onClick={() => void save()}>
              Enregistrer les zones
            </button>
          )}
        </div>
        {frame !== null && (
          <p className="message">
            Pour recalibrer, trace un rectangle autour du {SIDE_LABELS[activeSide].toLowerCase()} sur l’image.
          </p>
        )}
        {message !== null && <p className="message message-fair">{message}</p>}
      </section>
      <section className="card">
        <h2>Ce que lit l’application</h2>
        <p className="muted">{frame === null ? describeLive(live.livePreview, live.error) : CAPTURE_NOTE}</p>
        {shownPreview !== null && (
          <div className="previews">
            <SidePreview label={SIDE_LABELS.home} preview={shownPreview.home} />
            <SidePreview label={SIDE_LABELS.away} preview={shownPreview.away} />
          </div>
        )}
      </section>
      <TeamFilterCard settings={settings} onSave={onSave} />
      {frame !== null && (
        <RegionSelector
          frameDataUrl={frame}
          regions={regions}
          activeSide={activeSide}
          onChange={(region) => setRegions((current) => ({ ...current, [activeSide]: region }))}
          onDrawEnd={() => {
            setHasRedrawn(true);
            setActiveSide(OTHER_SIDE[activeSide]);
          }}
        />
      )}
    </div>
  );
}
