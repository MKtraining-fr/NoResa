import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

// Sur l'app native (Android/iOS), on ouvre directement sur l'espace adhérent :
// si une session existe → accueil membre, sinon ProtectedRoute renvoie vers /connexion.
const isNativeApp = Capacitor.isNativePlatform();

// Layouts + garde d'accès : chargés normalement (nécessaires à la structure des routes)
import PublicLayout from './layouts/PublicLayout';
import AppLayout from './layouts/AppLayout';
import MemberLayout from './layouts/MemberLayout';
import ProtectedRoute from './lib/ProtectedRoute';

// Pages : chargées à la demande (code-splitting -> bundle initial plus léger)
const HomePage = lazy(() => import('./pages/public/HomePage'));
const FeaturesPage = lazy(() => import('./pages/public/FeaturesPage'));
const PricingPage = lazy(() => import('./pages/public/PricingPage'));
const ContactPage = lazy(() => import('./pages/public/ContactPage'));
const LoginPage = lazy(() => import('./pages/public/LoginPage'));
const RegisterGymPage = lazy(() => import('./pages/public/RegisterGymPage'));
const GymsExplorerPage = lazy(() => import('./pages/public/GymsExplorerPage'));
const GymPublicPage = lazy(() => import('./pages/public/GymPublicPage'));

const AdminDashboard = lazy(() => import('./pages/app/AdminDashboard'));
const CRMPage = lazy(() => import('./pages/app/CRMPage'));
const PlanningPage = lazy(() => import('./pages/app/PlanningPage'));
const FinancePage = lazy(() => import('./pages/app/FinancePage'));
const BoutiquePage = lazy(() => import('./pages/app/BoutiquePage'));
const TeamPage = lazy(() => import('./pages/app/TeamPage'));
const SettingsPage = lazy(() => import('./pages/app/SettingsPage'));
const MessageriePage = lazy(() => import('./pages/app/MessageriePage'));
const SurveillancePage = lazy(() => import('./pages/app/SurveillancePage'));
const AccessControlPage = lazy(() => import('./pages/app/AccessControlPage'));
const InscriptionPage = lazy(() => import('./pages/app/InscriptionPage'));

const MemberHome = lazy(() => import('./pages/member/MemberHome'));
const MemberReservations = lazy(() => import('./pages/member/MemberReservations'));
const MemberSubscription = lazy(() => import('./pages/member/MemberSubscription'));
const MemberProfile = lazy(() => import('./pages/member/MemberProfile'));
const MemberNotifications = lazy(() => import('./pages/member/MemberNotifications'));
const MemberMessages = lazy(() => import('./pages/member/MemberMessages'));
const MemberDossier = lazy(() => import('./pages/member/MemberDossier'));
const MemberInfos = lazy(() => import('./pages/member/MemberInfos'));
const MemberParrainage = lazy(() => import('./pages/member/MemberParrainage'));
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
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={isNativeApp ? <Navigate to="/membre" replace /> : <HomePage />} />
            <Route path="/fonctionnalites" element={<FeaturesPage />} />
            <Route path="/tarifs" element={<PricingPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/connexion" element={<LoginPage />} />
            <Route path="/inscription-salle" element={<RegisterGymPage />} />
            <Route path="/salles" element={<GymsExplorerPage />} />
            <Route path="/salle/:gymId" element={<GymPublicPage />} />
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
            <Route path="planning/coachs" element={<PlanningPage view="coachs" />} />

            {/* Finance Sub-routes */}
            <Route path="finance" element={<FinancePage />} />
            <Route path="finance/abonnements" element={<FinancePage view="abonnements" />} />
            <Route path="finance/paiements" element={<FinancePage view="paiements" />} />

            {/* Boutique Sub-routes */}
            <Route path="boutique" element={<BoutiquePage />} />
            <Route path="boutique/produits" element={<BoutiquePage view="produits" />} />
            <Route path="boutique/ventes" element={<BoutiquePage view="ventes" />} />
            <Route path="boutique/fournisseurs" element={<BoutiquePage view="fournisseurs" />} />

            {/* Access Control Route */}
            <Route path="acces" element={<AccessControlPage />} />

            {/* Surveillance Route */}
            <Route path="surveillance" element={<SurveillancePage />} />

            <Route path="equipe" element={<TeamPage />} />

            {/* Settings Sub-routes */}
            <Route path="messagerie" element={<MessageriePage />} />
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
            <Route path="reservations" element={<MemberReservations />} />
            <Route path="mon-abonnement" element={<MemberSubscription />} />
            <Route path="profil" element={<MemberProfile />} />
            <Route path="notifications" element={<MemberNotifications />} />
            <Route path="messagerie" element={<MemberMessages />} />
            <Route path="dossier" element={<MemberDossier />} />
            <Route path="infos" element={<MemberInfos />} />
            <Route path="parrainage" element={<MemberParrainage />} />
            <Route path="qr" element={<MemberQr />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
};

export default App;
