interface GuideStep {
  title: string;
  instructions: string[];
}

const STEPS: GuideStep[] = [
  {
    title: 'Capturer le jeu',
    instructions: [
      'Dans le panneau Sources, clique sur + puis Capture de jeu.',
      'Mode : Capturer une fenêtre spécifique, puis choisis le jeu (il doit être lancé).',
      'Si l’aperçu reste noir en match, utilise une source Capture d’écran à la place.',
    ],
  },
  {
    title: 'Régler la vidéo',
    instructions: [
      'Paramètres > Vidéo : résolution de base et de sortie égales à celle de ton écran.',
      'Ne réduis pas la résolution de sortie : le score doit rester net pour être lu.',
    ],
  },
  {
    title: 'Régler l’enregistrement',
    instructions: [
      'Paramètres > Sortie : passe le Mode de sortie sur Avancé.',
      'Onglet Enregistrement : format MP4 ou MKV, encodeur vidéo NVIDIA NVENC H.264.',
      'Contrôle du débit : CBR à 20 000 Kbps, largement suffisant pour des clips Discord.',
    ],
  },
  {
    title: 'Activer le tampon de relecture',
    instructions: [
      'Toujours dans Paramètres > Sortie, onglet Tampon de relecture.',
      'Coche Activer le tampon de relecture, durée maximale 60 s, mémoire maximale 1024 Mo.',
      'Inutile de le démarrer à la main : Record2Discord s’en charge.',
    ],
  },
  {
    title: 'Activer le serveur WebSocket',
    instructions: [
      'Outils > Paramètres du serveur WebSocket : coche Activer le serveur WebSocket.',
      'Laisse le port 4455 et l’authentification activée.',
      'Clique sur Afficher les informations de connexion, copie le mot de passe, puis Appliquer.',
    ],
  },
  {
    title: 'Relier Record2Discord',
    instructions: [
      'Onglet Réglages : colle le mot de passe WebSocket et l’URL du webhook Discord, puis Enregistrer.',
      'Onglet État : en match, les trois voyants doivent être verts.',
    ],
  },
];

/** Step by step OBS setup, shown in the app so it can be followed next to OBS. */
export function ObsGuide() {
  return (
    <section className="card">
      <h2>Configurer OBS</h2>
      <p className="muted">
        À faire une seule fois. Il faut OBS Studio 28 ou plus récent et une carte graphique NVIDIA.
      </p>
      <ol className="guide">
        {STEPS.map((step) => (
          <li key={step.title} className="guide-step">
            <div className="indicator-label">{step.title}</div>
            <ul>
              {step.instructions.map((instruction) => (
                <li key={instruction}>{instruction}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
