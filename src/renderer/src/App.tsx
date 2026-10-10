import { useState } from 'react';
import { CalibrationPanel } from './components/CalibrationPanel';
import { SettingsForm } from './components/SettingsForm';
import { StatusPanel } from './components/StatusPanel';
import { useAppState } from './hooks/useAppState';
import { useSettings } from './hooks/useSettings';

type TabId = 'status' | 'settings' | 'calibration';

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'status', label: 'État' },
  { id: 'settings', label: 'Réglages' },
  { id: 'calibration', label: 'Calibration' },
];

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('status');
  const state = useAppState();
  const { settings, save } = useSettings();

  if (state === null || settings === null) {
    return <p className="loading">Chargement…</p>;
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Record2Discord</h1>
        <nav className="tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={tab.id === activeTab ? 'tab tab-active' : 'tab'}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="content">
        {activeTab === 'status' && <StatusPanel state={state} webhookConfigured={settings.discordWebhookUrl !== ''} />}
        {activeTab === 'settings' && <SettingsForm settings={settings} onSave={save} />}
        {activeTab === 'calibration' && <CalibrationPanel settings={settings} onSave={save} />}
      </main>
    </div>
  );
}
