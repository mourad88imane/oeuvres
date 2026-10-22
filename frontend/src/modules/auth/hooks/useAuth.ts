/**
 * useAuth — Hook d'authentification
 * Encapsule toute la logique de login/logout/refresh.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { authApi, LoginCredentials } from "../api";
import { useAuthStore } from "../store/authStore";

export function useAuth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { i18n } = useTranslation();
  const { user, isAuthenticated, logout: storeLogout, setTokens, hasRole, hasPermission, hasModuleAccess, canApprove, canPay } = useAuthStore();

  // ── Login ───────────────────────────────────────────────
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (response) => {
      const { access, refresh, user: userData } = response.data;
      setTokens(access, refresh, userData);

      // Appliquer la langue préférée de l'utilisateur
      const lang = userData.preferences?.language || "fr";
      if (lang !== i18n.language) {
        i18n.changeLanguage(lang);
      }

      // Redirection selon l'état du compte
      if (userData.must_change_password) {
        navigate("/change-password", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    },
  });

  // ── Logout ──────────────────────────────────────────────
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const { refreshToken } = useAuthStore.getState();
      if (refreshToken) {
        try {
          await authApi.logout(refreshToken);
        } catch {
          return;
        }
      }
    },
    onSettled: () => {
      // Toujours nettoyer le store même si l'API échoue
      storeLogout();
      queryClient.clear();
      navigate("/login", { replace: true });
    },
  });

  return {
    user,
    isAuthenticated,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    hasRole,
    hasPermission,
    hasModuleAccess,
    canApprove,
    canPay,
  };
}
