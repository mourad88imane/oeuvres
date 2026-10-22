/**
 * ============================================================
 * AXIOS CLIENT — Instance configurée avec intercepteurs JWT
 * ============================================================
 * - Injecte automatiquement le token Bearer dans chaque requête
 * - Rafraîchit automatiquement le token expiré (rotation)
 * - Redirige vers /login si le refresh échoue
 * - Ajoute X-Request-ID / X-Correlation-ID pour la corrélation des logs
 * - Monitor les performances des appels API (timing, erreurs)
 */
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { v4 as uuidv4 } from "uuid";
import i18n from "../i18n/i18n";
import { useAuthStore } from "@modules/auth/store/authStore";

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || "/api/v1";

// ── Instance principale ────────────────────────────────────
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ── Instance séparée pour le refresh (évite la boucle infinie) ──
const refreshClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
});

// ── Flag pour éviter les refresh simultanés ────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  failedQueue = [];
};

// ── Intercepteur de requête ────────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Marquer le début de la requête pour le calcul de durée
    (config as any)._startTime = performance.now();

    // Injecter le token JWT
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Ajouter la langue utilisateur pour les exports PDF/Excel/CSV
    config.headers["Accept-Language"] = i18n.language;

    // Ajouter des IDs uniques pour la corrélation des logs
    const requestId = uuidv4();
    config.headers["X-Request-ID"] = requestId;
    config.headers["X-Correlation-ID"] = requestId;

    return config;
  },
  (error) => Promise.reject(error)
);

// ── Intercepteur de réponse (monitoring + refresh automatique) ──
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    logApiCall(response);
    return response;
  },
  async (error: AxiosError) => {
    if (error.config) {
      logApiCall(null, error);
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Si 401 et pas déjà en train de retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = useAuthStore.getState().refreshToken;

      // Pas de refresh token → déconnexion
      if (!refreshToken) {
        useAuthStore.getState().logout();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      // Mettre en file les requêtes pendant le refresh
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await refreshClient.post("/auth/token/refresh/", {
          refresh: refreshToken,
        });

        // Le refresh renvoie désormais le profil utilisateur FRAIS
        // (must_change_password, rôle, permissions) — les claims JWT sont
        // périmés une fois le mot de passe changé et ne doivent JAMAIS
        // écraser l'état réel en base.
        const { access, refresh, user: freshUser } = response.data;

        // Mettre à jour le store
        useAuthStore.getState().setTokens(access, refresh, freshUser);

        // Relancer les requêtes en attente
        processQueue(null, access);

        // Relancer la requête originale
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── Monitoring des appels API ───────────────────────────────
function logApiCall(response: AxiosResponse | null, error?: AxiosError) {
  try {
    const config = (response?.config || error?.config) as any;
    if (!config) return;

    const startTime = config._startTime;
    const durationMs = startTime ? Math.round(performance.now() - startTime) : 0;
    const method = (config.method || "?").toUpperCase();
    const url = config.url || "?";
    const status = response?.status || error?.response?.status || 0;

    if ((import.meta as any).env.DEV) {
      const level = status >= 400 ? "warn" : "log";
      console[level](`[API] ${method} ${url} → ${status} (${durationMs}ms)`);
    }

    // Stocker les alertes lentes en localStorage pour analyse
    if (durationMs > 5000) {
      const slowCalls = JSON.parse(localStorage.getItem("slow_api_calls") || "[]");
      slowCalls.push({ method, url, status, durationMs, timestamp: new Date().toISOString() });
      localStorage.setItem("slow_api_calls", JSON.stringify(slowCalls.slice(-50)));
    }
  } catch {
    // Le monitoring ne doit jamais casser l'app
  }
}

export default apiClient;
