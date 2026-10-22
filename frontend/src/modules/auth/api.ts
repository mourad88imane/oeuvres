/**
 * AUTH API — Appels API d'authentification
 */
import apiClient from "@shared/api/apiClient";
import type { UserProfile } from "./store/authStore";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  status: string;
  message: string;
  access: string;
  refresh: string;
  /** Profil utilisateur — même type que le store (login et refresh renvoient
   *  le même payload via build_user_payload côté backend). */
  user: UserProfile;
}

/** Réponse du token refresh — même payload user que le login. */
export interface TokenRefreshResponse {
  status: string;
  access: string;
  refresh: string;
  user: UserProfile;
}

export const authApi = {
  login: (credentials: LoginCredentials) =>
    apiClient.post<LoginResponse>("/auth/login/", credentials),

  logout: (refreshToken: string) =>
    apiClient.post("/auth/logout/", { refresh: refreshToken }),

  refreshToken: (refresh: string) =>
    apiClient.post<TokenRefreshResponse>("/auth/token/refresh/", { refresh }),

  getMe: () => apiClient.get("/auth/me/"),

  verifyToken: () => apiClient.get("/auth/verify/"),

  changePassword: (data: {
    old_password: string;
    new_password: string;
    confirm_password: string;
  }) => apiClient.post("/users/change-password/", data),

  updatePreferences: (data: { language?: string; theme?: string; layout_direction?: string }) =>
    apiClient.patch("/auth/preferences/", data),
};
