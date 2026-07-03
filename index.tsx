import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./lib/AuthContext";
import { supabase } from "./lib/supabaseClient";

/**
 * Lien e-mail « créer / réinitialiser mon mot de passe » : Supabase renvoie les
 * jetons dans le fragment d'URL (#access_token=…&type=recovery). Or l'app utilise
 * un HashRouter : au montage, il verrait ce hash comme une route inconnue et
 * redirigerait vers l'accueil en RÉÉCRIVANT le hash — effaçant les jetons avant
 * que la session ne soit établie (d'où « on tombe sur la page d'accueil »).
 *
 * On capture donc les jetons AVANT le rendu, on repositionne tout de suite la
 * route (/definir-mot-de-passe), puis on établit la session à partir des jetons
 * mémorisés. detectSessionInUrl ne trouvera plus rien à traiter : pas de conflit.
 */
const rawHash = window.location.hash.replace(/^#/, "");
const authParams =
  rawHash.includes("access_token=") || rawHash.includes("error=")
    ? new URLSearchParams(rawHash)
    : null;

if (authParams) {
  const type = authParams.get("type");
  const isPwdLink =
    !!authParams.get("access_token") &&
    (type === "recovery" || type === "invite" || type === "signup");
  const dest = isPwdLink ? "#/definir-mot-de-passe" : "#/connexion";
  // On remet la bonne route tout de suite (les jetons sont déjà en mémoire),
  // avant que le HashRouter ne s'en empare.
  history.replaceState(null, "", window.location.pathname + window.location.search + dest);
}

async function boot() {
  if (authParams) {
    const access_token = authParams.get("access_token");
    const refresh_token = authParams.get("refresh_token");
    if (access_token && refresh_token) {
      try {
        await supabase.auth.setSession({ access_token, refresh_token });
      } catch (e) {
        console.error("setSession (lien e-mail)", e);
      }
    }
  }

  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>
  );
}

boot();
