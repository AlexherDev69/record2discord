import { useEffect, useState } from 'react';

const COPYRIGHT = '© 2026 AlexherApps';

/** Version, copyright and a link to the project page. */
export function AppFooter() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    void window.api.getAppInfo().then((info) => setVersion(info.version));
  }, []);

  return (
    <footer className="footer">
      <span>
        {COPYRIGHT}
        {version !== null && ` · Version ${version}`}
      </span>
      <button className="link" onClick={() => void window.api.openExternalPage('repository')}>
        Page GitHub
      </button>
    </footer>
  );
}
