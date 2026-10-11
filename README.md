# Record2Discord

Application Windows qui surveille un match d'EA Sports FC, enregistre automatiquement chaque but et publie le clip dans un salon Discord.

Tout tourne en local : la seule sortie réseau est l'envoi du clip à Discord.

## Fonctionnement

1. OBS garde en permanence la dernière minute de jeu en mémoire (tampon de relecture).
2. Record2Discord lit le score sur le bandeau deux fois par seconde.
3. Quand le score augmente, il demande à OBS de sauvegarder le tampon.
4. Le clip est réencodé pour passer sous la limite de taille de Discord, puis envoyé par webhook.

## Prérequis

- Windows 10 ou 11.
- [OBS Studio](https://obsproject.com/fr) 28 ou plus récent.
- Une carte graphique NVIDIA (l'encodage des clips utilise NVENC).
- Un salon Discord dont tu peux gérer les webhooks.

## Installation

1. Télécharge et lance `Record2Discord-Setup-x.y.z.exe`.
2. Windows peut afficher un avertissement SmartScreen, car l'installeur n'est pas signé : clique sur « Informations complémentaires », puis « Exécuter quand même ».
3. Configure OBS (section suivante), puis l'application.

## Configurer OBS

À faire une seule fois. Le même guide est disponible dans l'application, onglet **Guide OBS**.

### 1. Capturer le jeu

- Dans le panneau **Sources**, clique sur **+** puis **Capture de jeu**.
- Mode : **Capturer une fenêtre spécifique**, puis choisis le jeu (il doit être lancé).
- Si l'aperçu reste noir en match, utilise une source **Capture d'écran** à la place.

### 2. Régler la vidéo

- **Paramètres > Vidéo** : résolution de base et de sortie égales à celle de ton écran.
- Ne réduis pas la résolution de sortie : le score doit rester net pour être lu.

### 3. Régler l'enregistrement

- **Paramètres > Sortie** : passe le **Mode de sortie** sur **Avancé**.
- Onglet **Enregistrement** : format MP4 ou MKV, encodeur vidéo **NVIDIA NVENC H.264**.
- Contrôle du débit : **CBR à 20 000 Kbps**, largement suffisant pour des clips Discord.

### 4. Activer le tampon de relecture

- Toujours dans **Paramètres > Sortie**, onglet **Tampon de relecture**.
- Coche **Activer le tampon de relecture**, durée maximale **60 s**, mémoire maximale **1024 Mo**.
- Inutile de le démarrer à la main : Record2Discord s'en charge.

### 5. Activer le serveur WebSocket

- **Outils > Paramètres du serveur WebSocket** : coche **Activer le serveur WebSocket**.
- Laisse le port **4455** et l'authentification activée.
- Clique sur **Afficher les informations de connexion**, copie le mot de passe, puis **Appliquer**.

## Configurer Record2Discord

1. Dans Discord : **Paramètres du salon > Intégrations > Webhooks > Nouveau webhook > Copier l'URL**.
2. Dans l'application, onglet **Réglages** : colle l'URL du webhook et le mot de passe WebSocket d'OBS, puis **Enregistrer**.
3. Clique sur **Envoyer un message de test** pour vérifier le salon.
4. Lance un match : dans l'onglet **État**, les voyants OBS, Bandeau du score et Discord doivent être verts.

Fermer la fenêtre laisse l'application tourner dans la zone de notification. Pour la quitter : clic droit sur son icône, puis **Quitter**.

## Réglages disponibles

| Réglage | Rôle |
|---|---|
| Message | Texte posté avec le clip. `{home}` et `{away}` sont remplacés par le score. |
| Durée du clip | Longueur du clip envoyé. Plus il est court, meilleure est l'image. |
| Secondes gardées après le but | Temps de célébration conservé à la fin du clip. |
| Résolution | 720p ou 1080p. |
| Taille maximale | 10 Mo par défaut, 50 ou 100 Mo si le serveur Discord est boosté. |
| Supprimer les fichiers locaux | Efface le replay et le clip une fois l'envoi réussi. |
| Lancer OBS automatiquement | Ouvre OBS réduit s'il n'est pas déjà lancé. |
| Démarrer avec Windows | Lance l'application réduite à l'ouverture de session. |

## Calibration

Les zones du score sont préréglées pour le bandeau d'EA Sports FC 27 sur un écran 16:9. L'onglet **Calibration** ne sert que si le bandeau change de place (mise à jour du jeu, autre taille de HUD, écran ultra-large) : capture une image en match, puis entoure chaque chiffre du score à la souris.

Pour vérifier la calibration sans rien toucher, ouvre l'onglet **Calibration** pendant un match : le bloc **Ce que lit l'application** affiche en direct l'image de chaque zone et le chiffre reconnu. Chaque image doit montrer un seul chiffre entier. Si le jeu se met en pause quand tu le quittes, la dernière lecture faite en match reste affichée.

## Limites connues

- Le score affiché dans le message est fiable de 0 à 9. Au-delà, il est compté à partir du dernier score lu.
- Si l'application est lancée pendant la célébration d'un but, ce but n'est pas détecté.
- Les noms d'équipes ne sont pas lus à l'écran.

## Développement

```bash
pnpm install
pnpm dev        # lance l'application en mode développement
pnpm test       # tests unitaires
pnpm dist       # construit l'installeur dans dist/
```

Le code est organisé en `src/core` (réglages, configuration), `src/features` (détection, enregistrement, clip, publication), `src/electron` (processus principal) et `src/renderer` (interface React).

Les journaux et les réglages sont stockés dans `%APPDATA%\Record2Discord`.
