interface UpdateBannerProps {
  version: string;
}

/** Tells that a newer release exists and opens its download page. */
export function UpdateBanner({ version }: UpdateBannerProps) {
  return (
    <div className="banner">
      <span>La version {version} est disponible.</span>
      <button className="button" onClick={() => void window.api.openExternalPage('latestRelease')}>
        Télécharger
      </button>
    </div>
  );
}
