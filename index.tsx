import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./lib/AuthContext";
import { supabase } from "./lib/supabaseClient";

/**
 * Lien e-mail « créer / réinitialiser mon mot de passe » : Supabase renvoie les
 * jetons (ou une erreur) dans le fragment d'URL (#access_token=… / #error=…). Or
 * l'app utilise un HashRouter : au montage, il verrait ce hash comme une route
 * inconnue et redirigerait vers l'accueil en RÉÉCRIVANT le hash — la session
 * serait perdue (d'où « on tombe sur la page d'accueil »).
 *
 * On capture donc le fragment AVANT le rendu de React, on repositionne tout de
 * suite la route sur /definir-mot-de-passe (les jetons sont déjà en mémoire), puis
 * on établit la session. detectSessionInUrl est désactivé côté client pour que
 * Supabase ne touche jamais l'URL et n'entre pas en concurrence avec ce traitement.
 */
const rawHash = window.location.hash.replace(/^#/, "");
const authParams =
  rawHash.includes("access_token=") || rawHash.includes("error=")
    ? new URLSearchParams(rawHash)
    : null;

if (authParams) {
  // Lien expiré / invalide : on garde le motif pour l'afficher sur la page.
  const err =
    authParams.get("error_description") ||
    authParams.get("error_code") ||
    authParams.get("error");
  if (err && !authParams.get("access_token")) {
    try { sessionStorage.setItem("pwd_link_error", err); } catch { /* noop */ }
  }
  // Depuis un lien e-mail on va TOUJOURS sur la page mot de passe (formulaire si le
  // lien est valide, message clair s'il est expiré) — jamais sur l'accueil.
  history.replaceState(
    null,
    "",
    window.location.pathname + window.location.search + "#/definir-mot-de-passe",
  );
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
