o changes added to commit (use "git add" and/or "git commit -a")
PS C:\Pro\Noresa> cd C:\Pro\Noresa
PS C:\Pro\Noresa>
PS C:\Pro\Noresa> # 1) Le lien Messagerie est-il bien dans ton fichier local ?
PS C:\Pro\Noresa> Select-String -Path constants.tsx -Pattern "messagerie"

constants.tsx:48:  { label: 'Messagerie', path: '/app/messagerie', icon: MessageSquare },
constants.tsx:56:  { label: 'Messages', path: '/membre/messagerie', icon: MessageSquare },


PS C:\Pro\Noresa>
PS C:\Pro\Noresa> # 2) Quel est l'état réel par rapport au dépôt distant ?
PS C:\Pro\Noresa> git log --oneline -5
49bd23e (HEAD -> main, origin/main) Messagerie : pages + liens de menu (staff & membre)
ca3201d Espace membre : page messagerie
dc0482f Messagerie staff + horaires d'ouverture
330541e Inscription : badge requis uniquement pour un abonnement
fec0844 Groupes : saisie a l'inscription + edition sur la fiche
PS C:\Pro\Noresa> git status
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   package-lock.json
        modified:   package.json
        modified:   pages/member/MemberReservations.tsx
        modified:   vite.config.ts

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        android/
        capacitor.config.ts
        lib/GroupsSettingsPage.tsx
        lib/memberSelfApi.ts
        lib/planningApi.ts
        pages/member/MemberHome.tsx

no changes added to commit (use "git add" and/or "git commit -a")
PS C:\Pro\Noresa>