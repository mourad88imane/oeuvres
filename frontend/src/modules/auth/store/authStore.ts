/**
 * ============================================================
 * AUTH STORE — État d'authentification global (Zustand)
 * ============================================================
 * Gère : tokens JWT, profil utilisateur, état de connexion.
 * Persistance dans sessionStorage (pas localStorage → sécurité).
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { jwtDecode } from "jwt-decode";

// ── Types ──────────────────────────────────────────────────
/** Les 8 rôles métier du backend (apps.users.User.Role). */
export type UserRole =
  | "admin"
  | "gestionnaire"
  | "comptable"
  | "consultant"
  | "social_agent"
  | "department_manager"
  | "committee_member"
  | "director";

/** Profil utilisateur — source unique de vérité (login, refresh, /auth/me/). */
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  role_display: string;
  must_change_password: boolean;
  password_changed_at: string | null;
  /** Jours restants avant expiration (backend), null si politique désactivée ou compte hérité. */
  password_expires_in_days?: number | null;
  /** Fenêtre d'avertissement configurée (backend) : informer quand ≤ ce seuil. */
  password_expiration_warning_days?: number | null;
  date_joined?: string | null;
  avatar: string | null;
  tenant_id?: string | null;
  tenant_name?: string | null;
  permissions?: string[];
  preferences?: {
    language: "fr" | "ar";
    theme: "light" | "dark";
    layout_direction: "ltr" | "rtl";
  };
}

interface JwtPayload {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  must_change_password: boolean;
  tenant_id?: string | null;
  permissions?: string[];
  exp: number;
}

const MODULE_CODENAME_MAP: Record<string, string[]> = {
  employees: ["employee"],
  benefits: ["benefit"],
  beneficiaries: ["beneficiary"],
  loans: ["loan"],
  finance: ["finance"],
  conventions: ["convention", "partner"],
  analytics: ["report", "statistics"],
  reports: ["report"],
  admin: ["user", "role", "settings"],
  medical_coverage: ["coverage"],
  dashboard: ["dashboard"],
  assistance: ["assistance"],
  dependent: ["dependent"],
  invoice: ["invoice"],
  contract: ["contract"],
  statistics: ["statistics"],
  user: ["user"],
  role: ["role"],
  settings: ["settings"],
};

interface AuthState {
  // État
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setTokens: (accessToken: string, refreshToken: string, userData?: Partial<UserProfile>) => void;
  setUser: (user: UserProfile) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  isTokenExpired: () => boolean;
  hasRole: (...roles: string[]) => boolean;
  hasPermission: (codename: string) => boolean;
  hasModuleAccess: (module: string) => boolean;
  canApprove: () => boolean;
  canPay: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ── État initial ──────────────────────────────────
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,

      // ── Actions ───────────────────────────────────────
      setTokens: (accessToken, refreshToken, userData?: Partial<UserProfile>) => {
        try {
          const payload = jwtDecode<JwtPayload>(accessToken);
          const user: UserProfile = {
            id: userData?.id || payload.user_id,
            email: userData?.email || payload.email,
            full_name: userData?.full_name || payload.full_name,
            role: (userData?.role || payload.role) as UserProfile["role"],
            role_display: userData?.role_display || payload.role,
            must_change_password: userData?.must_change_password ?? payload.must_change_password,
            password_changed_at: userData?.password_changed_at ?? null,
            password_expires_in_days: userData?.password_expires_in_days ?? null,
            password_expiration_warning_days: userData?.password_expiration_warning_days ?? null,
            date_joined: userData?.date_joined ?? null,
            avatar: userData?.avatar || null,
            tenant_id: userData?.tenant_id || payload.tenant_id || null,
            tenant_name: userData?.tenant_name || null,
            preferences: userData?.preferences || { language: "fr", theme: "light", layout_direction: "ltr" },
            permissions: userData?.permissions || payload.permissions || [],
          };
          set({ accessToken, refreshToken, user, isAuthenticated: true });
        } catch {
          set({ accessToken, refreshToken, isAuthenticated: true });
        }
      },

      setUser: (user) => set({ user }),

      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      isTokenExpired: () => {
        const { accessToken } = get();
        if (!accessToken) return true;
        try {
          const { exp } = jwtDecode<JwtPayload>(accessToken);
          // Considérer expiré 30 secondes avant l'expiration réelle
          return Date.now() >= (exp - 30) * 1000;
        } catch {
          return true;
        }
      },

      hasRole: (...roles) => {
        const { user } = get();
        return user ? roles.includes(user.role) : false;
      },

      hasPermission: (codename) => {
        const { user } = get();
        if (!user) return false;
        if (user.role === "admin") return true;
        return user.permissions?.includes(codename) ?? false;
      },

      hasModuleAccess: (module) => {
        const { user } = get();
        if (!user) return false;
        if (user.role === "admin") return true;
        if (!user.permissions) return false;
        const prefixes = MODULE_CODENAME_MAP[module];
        if (!prefixes) return false;
        return user.permissions.some((p) => prefixes.some((prefix) => p.startsWith(prefix + ".")));
      },

      canApprove: () => {
        const { user } = get();
        return user ? ["admin", "gestionnaire"].includes(user.role) : false;
      },

      canPay: () => {
        const { user } = get();
        return user ? ["admin", "comptable"].includes(user.role) : false;
      },
    }),
    {
      name: "auth-storage",
      // sessionStorage : données effacées à la fermeture du navigateur
      storage: createJSONStorage(() => sessionStorage),
      // Normaliser les sessions persistées avant ce champ : garantit la forme
      // déclarée `password_changed_at: string | null` même pour d'anciens profils.
      migrate: (persisted: unknown) => {
        const state = persisted as { user?: UserProfile | null } | null;
        if (state?.user) {
          if (typeof state.user.password_changed_at === "undefined") {
            state.user.password_changed_at = null;
          }
          if (typeof state.user.password_expires_in_days === "undefined") {
            state.user.password_expires_in_days = null;
          }
          if (typeof state.user.password_expiration_warning_days === "undefined") {
            state.user.password_expiration_warning_days = null;
          }
          if (typeof state.user.date_joined === "undefined") {
            state.user.date_joined = null;
          }
        }
        return state;
      },
      // Persister uniquement les tokens (pas l'état de chargement)
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
