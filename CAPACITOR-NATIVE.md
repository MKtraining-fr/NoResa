# NoResa — Apps natives (Android + iOS) : mise en place

Une **seule base de code** produit la PWA **et** les apps (Capacitor). Le code natif
(`lib/native.ts`) ne s'exécute que dans l'app compilée ; en PWA il est inerte.

- **Web / PWA** : `npm run build` → déployé sur Cloudflare Pages (inchangé).
- **Apps** : `npm run build:mobile` puis `npx cap sync` → Android Studio / Xcode.

Modèle **bundlé** (l'app embarque une version du site) **+ OTA Capgo** (les correctifs
JS/HTML arrivent sans repasser par le store ; seuls les changements natifs — plugins,
push, icône — exigent une republication).

---

## Déjà fait dans le repo (code)
- Plugins installés : `@capacitor/app`, `@capacitor/push-notifications`, `@capgo/capacitor-updater`, `@capacitor/ios`.
- `capacitor.config.ts` : `CapacitorUpdater.autoUpdate` + présentation des push.
- `lib/native.ts` (`initNative()` appelé dans `index.tsx`) : OTA `notifyAppReady`, rafraîchissement au retour au premier plan, deep-links, enregistrement push.
- `syncPushToken()` rappelé après login (`AuthContext`).
- Table `device_push_tokens` + RPC `save_push_token` (Supabase) — les jetons sont déjà collectés.

## À faire (toi / externe)

### 1. Générer les plateformes
```bash
npm run build:mobile
npx cap add ios        # sur Mac uniquement
npx cap sync
```
(Android existe déjà dans `android/`.)

### 2. Icône + splash « La Salle »
Déposer un logo carré ≥ 1024×1024 dans `resources/icon.png` (+ `resources/splash.png` 2732×2732), puis :
```bash
npx @capacitor/assets generate --iconBackgroundColor '#0b1220' --splashBackgroundColor '#0b1220'
npx cap sync
```

### 3. Notifications push (FCM Android / APNs iOS)
- **Firebase** : créer un projet, ajouter une app Android (`fr.lasalle.app`) → télécharger `google-services.json` dans `android/app/`. Ajouter une app iOS (`fr.lasalle.app`) → `GoogleService-Info.plist` dans le projet Xcode.
- iOS : activer *Push Notifications* + *Background Modes → Remote notifications* dans Xcode, et charger la clé APNs dans Firebase.
- **Envoi serveur (à développer)** : une Edge Function `send-push-native` qui lit `device_push_tokens` et pousse via l'API FCM v1. À brancher là où sont publiées les annonces (aujourd'hui Web Push/VAPID pour la PWA — cf. mémoire `announcements-push`). Les jetons sont déjà stockés ; il reste ce connecteur d'envoi + le secret `FCM_SERVICE_ACCOUNT` (JSON du compte de service Firebase) dans Supabase.

### 4. OTA Capgo
```bash
npm i -g @capgo/cli
npx @capgo/cli login <APIKEY>      # compte Capgo (cloud ou self-host)
npx @capgo/cli app add fr.lasalle.app
```
Puis, à chaque correctif JS :
```bash
npm run build:mobile
npx @capgo/cli bundle upload fr.lasalle.app --channel production
```
Les apps installées récupèrent la mise à jour au prochain lancement, **sans passer par le store**.

### 5. Build & publication
- **Android** : `npx cap open android` → keystore de signature → *Generate Signed Bundle (AAB)* → Google Play Console (compte 25 $ une fois).
- **iOS** (Mac) : `npx cap open ios` → signer avec le compte Apple (celui de MuscleFlow) → Archive → App Store Connect. **Bundle id distinct** `fr.lasalle.app` (ne pas réutiliser celui de MuscleFlow).

### 6. Versionnage
Bumper la version app à chaque publication store : `android/app/build.gradle` (`versionCode`/`versionName`) et la cible iOS dans Xcode. Les mises à jour **OTA** ne changent pas la version store.

---

## Rappels
- Les liens e-mail (mot de passe) et retours de paiement ouvrent le **navigateur** (https). L'utilisateur crée son mot de passe dans le navigateur puis se connecte dans l'app avec e-mail + mot de passe. Pour un retour *dans* l'app, prévoir plus tard des **Universal/App Links** (héberger `apple-app-site-association` + `assetlinks.json` sur `noresa.pages.dev`).
- Ne jamais committer les fichiers de signature (keystore, `.p12`) ni `google-services.json`/`GoogleService-Info.plist` s'ils contiennent des secrets sensibles — les gérer hors dépôt.
