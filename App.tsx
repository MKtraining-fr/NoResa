
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import AppLayout from './layouts/AppLayout';
import MemberLayout from './layouts/MemberLayout';

// Public Pages
import HomePage from './pages/public/HomePage';
import FeaturesPage from './pages/public/FeaturesPage';
import PricingPage from './pages/public/PricingPage';
import ContactPage from './pages/public/ContactPage';
import LoginPage from './pages/public/LoginPage';
import RegisterGymPage from './pages/public/RegisterGymPage';
import GymsExplorerPage from './pages/public/GymsExplorerPage';
import GymPublicPage from './pages/public/GymPublicPage';

// Back-Office Pages
import AdminDashboard from './pages/app/AdminDashboard';
import CRMPage from './pages/app/CRMPage';
import PlanningPage from './pages/app/PlanningPage';
import FinancePage from './pages/app/FinancePage';
import BoutiquePage from './pages/app/BoutiquePage';
import TeamPage from './pages/app/TeamPage';
import SettingsPage from './pages/app/SettingsPage';
import SurveillancePage from './pages/app/SurveillancePage';
import AccessControlPage from './pages/app/AccessControlPage';

// Member Pages
import MemberDashboard from './pages/member/MemberDashboard';
import MemberReservations from './pages/member/MemberReservations';
import MemberSubscription from './pages/member/MemberSubscription';
import MemberProfile from './pages/member/MemberProfile';
import MemberNotifications from './pages/member/MemberNotifications';

import { UserRole } from './types';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<{ role: UserRole } | null>(null);

  return (
    <HashRouter>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/fonctionnalites" element={<FeaturesPage />} />
          <Route path="/tarifs" element={<PricingPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/connexion" element={<LoginPage onLogin={(role) => setCurrentUser({ role })} />} />
          <Route path="/inscription-salle" element={<RegisterGymPage />} />
          <Route path="/salles" element={<GymsExplorerPage />} />
          <Route path="/salle/:gymId" element={<GymPublicPage />} />
        </Route>

        {/* Admin/Back-Office Routes */}
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<AdminDashboard />} />
          
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
          <Route path="parametres" element={<SettingsPage />} />
          <Route path="parametres/salle" element={<SettingsPage section="salle" />} />
          <Route path="parametres/mon-compte" element={<SettingsPage section="compte" />} />
        </Route>

        {/* Member Space Routes */}
        <Route path="/membre" element={<MemberLayout />}>
          <Route index element={<MemberDashboard />} />
          <Route path="reservations" element={<MemberReservations />} />
          <Route path="mon-abonnement" element={<MemberSubscription />} />
          <Route path="profil" element={<MemberProfile />} />
          <Route path="notifications" element={<MemberNotifications />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
