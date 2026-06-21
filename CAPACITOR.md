# App mobile Android (Capacitor)

L'app adhérent web est empaquetée en application Android native via **Capacitor**.
Le web (Cloudflare) et le mobile partagent le même code ; seule la base des chemins diffère.

- **App ID** : `fr.lasalle.app`
- **Nom** : `La Salle`
- **webDir** : `dist` (le build web est embarqué dans l'app)

## Prérequis (sur ta machine)

- **Android Studio** (inclut le SDK Android **et un JDK 21** dans son dossier `jbr/`).
- **JDK 21 obligatoire** : Capacitor 8 ne compile pas avec le JDK 17. Le plus simple
  est de réutiliser celui d'Android Studio (voir ci-dessous), sans rien installer.
- Les dépendances npm déjà installées (`npm install`).

## Générer / mettre à jour l'app

À chaque modification du code web, resynchronise le bundle dans le projet Android :

```bash
npm run cap:sync      # build web (chemins relatifs) + copie dans android/
npm run cap:open      # ouvre le projet dans Android Studio
```

Dans Android Studio :
- **Lancer sur un appareil/émulateur** : bouton ▶︎ Run.
- **Générer un APK** : menu *Build → Build Bundle(s) / APK(s) → Build APK(s)*.

Ou en ligne de commande (PowerShell, APK de debug) :

```powershell
# Pointer Gradle sur le JDK 21 embarqué dans Android Studio (sinon erreur "invalid source release: 21")
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
cd C:\Pro\Noresa\android
.\gradlew.bat assembleDebug
# APK généré : android\app\build\outputs\apk\debug\app-debug.apk
```

Pour rendre le JDK 21 permanent (à faire une fois, puis rouvrir PowerShell) :

```powershell
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Android\Android Studio\jbr", "User")
```

Pour un **APK de release** (à publier), il faut d'abord configurer une clé de signature
(keystore) dans `android/app/build.gradle`, puis `./gradlew assembleRelease`.

## Scripts npm disponibles

| Script | Rôle |
|---|---|
| `npm run build` | Build **web** (base `/`) — c'est lui que Cloudflare utilise. **Ne pas** confondre. |
| `npm run build:mobile` | Build avec chemins **relatifs** (`--base=./`) pour le webview mobile. |
| `npm run cap:sync` | `build:mobile` + copie des assets dans `android/`. |
| `npm run cap:open` | Ouvre le projet Android dans Android Studio. |
| `npm run cap:run` | `cap:sync` + lance directement sur l'appareil connecté. |

## Important

- Le **déploiement web (Cloudflare)** reste sur `npm run build` (base `/`) — le mobile
  n'y change rien.
- **Internet requis** : l'app charge Tailwind et les polices depuis un CDN, et parle à
  Supabase. Hors-ligne, le style n'est pas complet (amélioration possible plus tard :
  bundler Tailwind en local).
- Le bundle synchronisé (`android/app/src/main/assets/public`) est **régénéré** par
  `cap:sync` et n'est pas versionné (gitignore Capacitor) : seul le projet Android source
  est dans le dépôt.
