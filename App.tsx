import React, { Suspense, lazy, useEffect } from 'react';
import AppErrorBoundary from './components/AppErrorBoundary';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { supabase } from './lib/supabaseClient';

// Sur l'app native (Android/iOS), on ouvre directement sur l'espace adhérent :
// si une session existe → accueil membre, sinon ProtectedRoute renvoie vers /connexion.
const isNativeApp = Capacitor.isNativePlatform();

// Lien e-mail « créer mon mot de passe » : dès qu'une session de récupération est
// détectée, on route vers la page dédiée.
const RecoveryHandler: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') navigate('/definir-mot-de-passe', { replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);
  return null;
};

// Mode borne : retour automatique à l'accueil /borne après inactivité, SANS quitter
// le plein écran (contrairement au timer d'inactivité d'Edge qui ferme la session).
const KIOSK_IDLE_MS = 120000; // 2 min
const KioskIdleReset: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    if (!isKiosk()) return;
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        // Sécurité borne partagée : si un membre était connecté, on le déconnecte.
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session) await supabase.auth.signOut();
        } catch { /* noop */ }
        // Bascule sur l'écran de veille (vidéo + annonces). Une touche y ramène à
        // l'accueil ; la veille se recharge périodiquement pour récupérer les MAJ.
        if (!/#\/veille/.test(window.location.hash)) navigate('/veille', { replace: true });
      }, KIOSK_IDLE_MS);
    };
    const events = ['pointerdown', 'keydown', 'touchstart', 'mousemove', 'wheel'] as const;
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    arm();
    return () => { clearTimeout(timer); events.forEach((e) => window.removeEventListener(e, arm)); };
  }, [navigate]);
  return null;
};

// Layouts + garde d'accès : chargés normalement (nécessaires à la structure des routes)
import PublicLayout from './layouts/PublicLayout';
import SalleLayout from './layouts/SalleLayout';
import AppLayout from './layouts/AppLayout';
import MemberLayout from './layouts/MemberLayout';
import ProtectedRoute from './lib/ProtectedRoute';
import MemberAccessGate from './components/MemberAccessGate';
import { isKiosk } from './lib/kiosk';

// En mode borne (kiosque), les pages marketing NoResa redirigent vers /borne :
// l'adhérent ne doit jamais retomber sur la vitrine SaaS.
const NoKiosk: React.FC<{ children: React.ReactElement }> = ({ children }) =>
  isKiosk() ? <Navigate to="/borne" replace /> : children;

// Pages : chargées à la demande (code-splitting -> bundle initial plus léger)
const HomePage = lazy(() => import('./pages/public/HomePage'));
const FeaturesPage = lazy(() => import('./pages/public/FeaturesPage'));
const PricingPage = lazy(() => import('./pages/public/PricingPage'));
const ContactPage = lazy(() => import('./pages/public/ContactPage'));
const LoginPage = lazy(() => import('./pages/public/LoginPage'));
const SetPasswordPage = lazy(() => import('./pages/public/SetPasswordPage'));
const MandateThanksPage = lazy(() => import('./pages/public/MandateThanksPage'));
const RegisterMemberPage = lazy(() => import('./pages/public/RegisterMemberPage'));
const BornePage = lazy(() => import('./pages/public/BornePage'));
const DecouvertePage = lazy(() => import('./pages/public/salle/DecouvertePage'));
const ActivitesPage = lazy(() => import('./pages/public/salle/ActivitesPage'));
const TarifsPage = lazy(() => import('./pages/public/salle/TarifsPage'));
const FaqPage = lazy(() => import('./pages/public/salle/FaqPage'));
const SalleLoginPage = lazy(() => import('./pages/public/salle/SalleLoginPage'));
const InfosPage = lazy(() => import('./pages/public/salle/InfosPage'));
const VeillePage = lazy(() => import('./pages/public/salle/VeillePage'));
const RegisterGymPage = lazy(() => import('./pages/public/RegisterGymPage'));
const GymsExplorerPage = lazy(() => import('./pages/public/GymsExplorerPage'));
const GymPublicPage = lazy(() => import('./pages/public/GymPublicPage'));

const AdminDashboard = lazy(() => import('./pages/app/AdminDashboard'));
const CRMPage = lazy(() => import('./pages/app/CRMPage'));
const PlanningPage = lazy(() => import('./pages/app/PlanningPage'));
const FinancePage = lazy(() => import('./pages/app/FinancePage'));
const StatsPage = lazy(() => import('./pages/app/StatsPage'));
const UnpaidPage = lazy(() => import('./pages/app/UnpaidPage'));
const CancellationsPage = lazy(() => import('./pages/app/CancellationsPage'));
const AnnouncementsPage = lazy(() => import('./pages/app/AnnouncementsPage'));
const BoutiquePage = lazy(() => import('./pages/app/BoutiquePage'));
const ProductDetailPage = lazy(() => import('./pages/app/ProductDetailPage'));
const SupplierDetailPage = lazy(() => import('./pages/app/SupplierDetailPage'));
const TeamPage = lazy(() => import('./pages/app/TeamPage'));
const SettingsPage = lazy(() => import('./pages/app/SettingsPage'));
const MessageriePage = lazy(() => import('./pages/app/MessageriePage'));
const SurveillancePage = lazy(() => import('./pages/app/SurveillancePage'));
const AccessControlPage = lazy(() => import('./pages/app/AccessControlPage'));
const InscriptionPage = lazy(() => import('./pages/app/InscriptionPage'));
const MusicPage = lazy(() => import('./pages/app/MusicPage'));
const ClimatePage = lazy(() => import('./pages/app/ClimatePage'));

const MemberHome = lazy(() => import('./pages/member/MemberHome'));
const MemberReservations = lazy(() => import('./pages/member/MemberReservations'));
const MemberSubscription = lazy(() => import('./pages/member/MemberSubscription'));
const MemberProfile = lazy(() => import('./pages/member/MemberProfile'));
const MemberNotifications = lazy(() => import('./pages/member/MemberNotifications'));
const MemberMessages = lazy(() => import('./pages/member/MemberMessages'));
const MemberDossier = lazy(() => import('./pages/member/MemberDossier'));
const MemberInfos = lazy(() => import('./pages/member/MemberInfos'));
const MemberQr = lazy(() => import('./pages/member/MemberQr'));

// Écran d'attente pendant le chargement d'une page
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[40vh] w-full">
    <div className="flex flex-col items-center gap-3 text-gray-400">
      <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-indigo-600 animate-spin" />
      <span className="text-sm font-semibold">Chargement…</span>
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <HashRouter>
      <RecoveryHandler />
      <KioskIdleReset />
      <AppErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/definir-mot-de-passe" element={<SetPasswordPage />} />
          <Route path="/merci-inscription" element={<MandateThanksPage />} />
          <Route path="/inscription" element={<RegisterMemberPage />} />
          {/* Écran de veille de la borne — plein écran, hors layout */}
          <Route path="/veille" element={<VeillePage />} />
          {/* Mini-site public « La SaLLe » (borne + web) — univers salle, hors marketing NoResa */}
          <Route element={<SalleLayout />}>
            <Route path="/borne" element={<BornePage />} />
            <Route path="/decouverte" element={<DecouvertePage />} />
            <Route path="/activites" element={<ActivitesPage />} />
            <Route path="/tarifs" element={<TarifsPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/infos" element={<InfosPage />} />
            <Route path="/connexion-salle" element={<SalleLoginPage />} />
          </Route>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={isNativeApp ? <Navigate to="/membre" replace /> : <NoKiosk><HomePage /></NoKiosk>} />
            <Route path="/fonctionnalites" element={<NoKiosk><FeaturesPage /></NoKiosk>} />
            <Route path="/tarifs" element={<NoKiosk><PricingPage /></NoKiosk>} />
            <Route path="/contact" element={<NoKiosk><ContactPage /></NoKiosk>} />
            <Route path="/connexion" element={<LoginPage />} />
            <Route path="/inscription-salle" element={<NoKiosk><RegisterGymPage /></NoKiosk>} />
            <Route path="/salles" element={<NoKiosk><GymsExplorerPage /></NoKiosk>} />
            <Route path="/salle/:gymId" element={<NoKiosk><GymPublicPage /></NoKiosk>} />
          </Route>

          {/* Admin/Back-Office Routes */}
          <Route path="/app" element={<ProtectedRoute space="app"><AppLayout /></ProtectedRoute>}>
            <Route index element={<AdminDashboard />} />

            {/* Nouvelle inscription (parcours tablette + contrat signé) */}
            <Route path="inscription" element={<InscriptionPage />} />

            {/* CRM Sub-routes */}
            <Route path="crm" element={<CRMPage />} />
            <Route path="crm/prospects" element={<CRMPage tab="prospects" />} />
            <Route path="crm/membres" element={<CRMPage tab="membres" />} />
            <Route path="crm/partenaires" element={<CRMPage tab="partenaires" />} />

            {/* Planning Sub-routes */}
            <Route path="planning" element={<PlanningPage />} />
            <Route path="planning/cours" element={<PlanningPage view="cours" />} />

            {/* Finance Sub-routes */}
            <Route path="finance" element={<FinancePage />} />
            <Route path="finance/abonnements" element={<FinancePage view="abonnements" />} />
            <Route path="finance/paiements" element={<FinancePage view="paiements" />} />
            <Route path="finance/impayes" element={<UnpaidPage />} />
            <Route path="finance/resiliations" element={<CancellationsPage />} />
            <Route path="finance/statistiques" element={<StatsPage />} />
            <Route path="statistiques" element={<StatsPage />} />

            {/* Boutique Sub-routes */}
            <Route path="boutique" element={<BoutiquePage />} />
            <Route path="boutique/produits" element={<BoutiquePage view="produits" />} />
            <Route path="boutique/ventes" element={<BoutiquePage view="ventes" />} />
            <Route path="boutique/fournisseurs" element={<BoutiquePage view="fournisseurs" />} />
            <Route path="boutique/produit/:id" element={<ProductDetailPage />} />
            <Route path="boutique/fournisseur/:id" element={<SupplierDetailPage />} />

            {/* Access Control Route */}
            <Route path="acces" element={<AccessControlPage />} />

            {/* Surveillance Route */}
            <Route path="surveillance" element={<SurveillancePage />} />

            {/* Musique / ambiance (radio internet) */}
            <Route path="musique" element={<MusicPage />} />

            {/* Climatisation (réglages des unités) */}
            <Route path="climatisation" element={<ClimatePage />} />

            <Route path="equipe" element={<TeamPage />} />

            {/* Settings Sub-routes */}
            <Route path="messagerie" element={<MessageriePage />} />
            <Route path="annonces" element={<AnnouncementsPage />} />
            <Route path="parametres" element={<SettingsPage />} />
            <Route path="parametres/groupes" element={<SettingsPage section="groupes" />} />
            <Route path="parametres/faq" element={<SettingsPage section="faq" />} />
            <Route path="parametres/app" element={<SettingsPage section="app" />} />
            <Route path="parametres/salle" element={<SettingsPage section="salle" />} />
            <Route path="parametres/mon-compte" element={<SettingsPage section="compte" />} />
          </Route>

          {/* Member Space Routes */}
          <Route path="/membre" element={<ProtectedRoute space="member"><MemberLayout /></ProtectedRoute>}>
            <Route index element={<MemberHome />} />
            <Route path="reservations" element={<MemberAccessGate><MemberReservations /></MemberAccessGate>} />
            <Route path="mon-abonnement" element={<MemberAccessGate><MemberSubscription /></MemberAccessGate>} />
            <Route path="profil" element={<MemberProfile />} />
            <Route path="notifications" element={<MemberNotifications />} />
            <Route path="messagerie" element={<MemberMessages />} />
            <Route path="dossier" element={<MemberAccessGate><MemberDossier /></MemberAccessGate>} />
            <Route path="infos" element={<MemberInfos />} />
            <Route path="qr" element={<MemberQr />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      </AppErrorBoundary>
    </HashRouter>
  );
};

export default App;
