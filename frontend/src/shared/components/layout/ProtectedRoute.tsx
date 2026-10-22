/**
 * PROTECTED ROUTE — Protection des routes par authentification et rôle
 *
 * Usage :
 *   <ProtectedRoute>                          → authentifié seulement
 *   <ProtectedRoute roles={["admin"]}>        → admin seulement
 *   <ProtectedRoute roles={["admin","gestionnaire"]}>  → OR logic
 */
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@modules/auth/store/authStore";

interface ProtectedRouteProps {
  /** Module (RBAC) requis. Vérifie si l'utilisateur a une permission dans ce module. */
  module?: string;
  /** Rôles autorisés (legacy). Si vide et pas de module → tout utilisateur authentifié. */
  roles?: string[];
  /** Redirection si non autorisé (défaut : /login) */
  redirectTo?: string;
}

export function ProtectedRoute({
  module,
  roles = [],
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, user, hasModuleAccess } = useAuthStore();

  // 1. Non authentifié → login
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // 2. Vérification module (RBAC dynamique)
  if (module && !hasModuleAccess(module)) {
    return <Navigate to="/403" replace />;
  }

  // 3. Vérification rôle (legacy — fallback si pas de module)
  if (!module && roles.length > 0 && user && !roles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  // 4. Doit changer son mot de passe → forcer le changement
  if (user?.must_change_password && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
}

// ── HOC version (alternative) ────────────────────────────
interface RoleGuardProps {
  children: React.ReactNode;
  /** Permission codename exacte (ex: "benefit.create"). Admin bypass built-in. */
  permission?: string;
  /** Permissions (OR — au moins une doit être possédée) */
  permissions?: string[];
  /** Module RBAC (vérifie n'importe quelle permission du module) */
  module?: string;
  /** Rôles autorisés (legacy) */
  roles?: string[];
  /** Contenu si non autorisé (défaut: null) */
  fallback?: React.ReactNode;
}

/**
 * RoleGuard — Affiche les enfants uniquement si la permission/rôle/module correspond.
 *
 * Usage :
 *   <RoleGuard permission="benefit.create">
 *     <button>Créer</button>
 *   </RoleGuard>
 *   <RoleGuard permissions={["benefit.create","benefit.update"]}>
 *     <button>Créer ou modifier</button>
 *   </RoleGuard>
 *   <RoleGuard roles={["admin"]}>
 *     <button>Supprimer</button>
 *   </RoleGuard>
 *   <RoleGuard module="benefits">
 *     <button>Accès module</button>
 *   </RoleGuard>
 */
export function RoleGuard({ children, roles, module, permission, permissions, fallback = null }: RoleGuardProps) {
  const { user, hasPermission, hasModuleAccess } = useAuthStore();
  if (permission) {
    if (!hasPermission(permission)) return <>{fallback}</>;
    return <>{children}</>;
  }
  if (permissions) {
    if (!permissions.some(p => hasPermission(p))) return <>{fallback}</>;
    return <>{children}</>;
  }
  if (module) {
    if (!hasModuleAccess(module)) return <>{fallback}</>;
    return <>{children}</>;
  }
  if (!user || !roles || !roles.includes(user.role)) return <>{fallback}</>;
  return <>{children}</>;
}
