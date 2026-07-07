import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { AppLayout }      from "@shared/components/layout/AppLayout";
import { ProtectedRoute } from "@shared/components/layout/ProtectedRoute";
import { PageLoader }     from "@shared/components/ui/PageLoader";

const lz = (fn: () => Promise<Record<string, React.ComponentType>>, name: string) =>
  lazy(() => fn().then(m => ({ default: m[name] })));

const LoginPage          = lz(() => import("@modules/auth/pages/LoginPage"),                    "LoginPage");
const ChangePasswordPage = lz(() => import("@modules/auth/pages/ChangePasswordPage"),           "ChangePasswordPage");
const DashboardPage      = lz(() => import("@modules/dashboard/pages/DashboardPage"),           "DashboardPage");
const EmployeesPage      = lz(() => import("@modules/employees/pages/EmployeesListPage"),        "EmployeesPage");
const EmployeeDetailPage = lz(() => import("@modules/employees/pages/EmployeeDetailPage"),       "EmployeeDetailPage");
const BenefitsPage       = lz(() => import("@modules/benefits/pages/BenefitsListPage"),          "BenefitsPage");
const BenefitDetailPage  = lz(() => import("@modules/benefits/pages/BenefitDetailPage"),         "BenefitDetailPage");
const FinanceDashboard   = lz(() => import("@modules/finance/pages/FinanceDashboardPage"),       "FinanceDashboardPage");
const PaymentsPage       = lz(() => import("@modules/finance/pages/PaymentsPage"),               "PaymentsPage");
const BudgetsPage        = lz(() => import("@modules/finance/pages/BudgetsPage"),                "BudgetsPage");
const ConventionDash     = lz(() => import("@modules/conventions/pages/ConventionsDashboardPage"), "ConventionsDashboardPage");
const ConventionDetail   = lz(() => import("@modules/conventions/pages/ConventionDetailPage"),     "ConventionDetailPage");
const ConventionCreate   = lz(() => import("@modules/conventions/pages/ConventionCreatePage"),     "ConventionCreatePage");
const PartnersPage       = lz(() => import("@modules/conventions/pages/PartnersPage"),             "PartnersPage");
const PartnerDetailPage  = lz(() => import("@modules/conventions/pages/PartnerDetailPage"),        "PartnerDetailPage");
const PartnerEditPage    = lz(() => import("@modules/conventions/pages/PartnerEditPage"),          "PartnerEditPage");
const UsersPage          = lz(() => import("@modules/users/pages/UsersPage"),                    "UsersPage");
const UserCreatePage     = lz(() => import("@modules/users/pages/UserCreatePage"),               "UserCreatePage");
const AnalyticsDashPage  = lz(() => import("@modules/analytics/pages/AnalyticsDashboardPage"),   "AnalyticsDashboardPage");
const BeneficiariesPage  = lz(() => import("@modules/beneficiaries/pages/BeneficiariesListPage"), "BeneficiariesListPage");
const ReportsPage        = lz(() => import("@modules/analytics/pages/ReportsPage"),               "ReportsPage");
const DecisionSupportPage = lz(() => import("@modules/analytics/pages/DecisionSupportPage"),      "DecisionSupportPage");
const AdvancedVizPage = lz(() => import("@modules/analytics/pages/AdvancedVisualizationPage"),    "AdvancedVisualizationPage");
const NotificationPrefsPage = lz(() => import("@modules/notifications/pages/NotificationPreferencesPage"), "NotificationPreferencesPage");
const MonitoringPage = lz(() => import("@modules/monitoring/pages/MonitoringDashboardPage"), "MonitoringDashboardPage");
const DocumentListPage = lz(() => import("@modules/documents/pages/DocumentListPage"), "DocumentListPage");
const AIAssistantPage  = lz(() => import("@modules/ai/pages/AIAssistantPage"),                 "AIAssistantPage");
const PredictiveAnalyticsPage = lz(() => import("@modules/ai/pages/PredictiveAnalyticsPage"), "PredictiveAnalyticsPage");
const MedicalAnalysisPage = lz(() => import("@modules/medical-coverage/pages/MedicalAnalysisPage"), "MedicalAnalysisPage");
const NewCoverageRequest = lz(() => import("@modules/medical-coverage/pages/NewCoverageRequestPage"), "NewCoverageRequestPage");
const MedicalAnalysisDetail = lz(() => import("@modules/medical-coverage/pages/MedicalAnalysisDetailPage"), "MedicalAnalysisDetailPage");
const MedicalImagingPage = lz(() => import("@modules/medical-coverage/pages/MedicalImagingPage"), "MedicalImagingPage");
const MedicalImagingDetail = lz(() => import("@modules/medical-coverage/pages/MedicalImagingDetailPage"), "MedicalImagingDetailPage");
const MedicalCenterPage = lz(() => import("@modules/medical-coverage/pages/MedicalCenterPage"), "MedicalCenterPage");
const MedicalCenterDetail = lz(() => import("@modules/medical-coverage/pages/MedicalCenterDetailPage"), "MedicalCenterDetailPage");
const LoansListPage      = lz(() => import("@modules/loans/pages/LoansListPage"),                 "LoansListPage");
const LoanDetailPage     = lz(() => import("@modules/loans/pages/LoanDetailPage"),                "LoanDetailPage");
const LoanCreatePage     = lz(() => import("@modules/loans/pages/LoanCreatePage"),                "LoanCreatePage");
const EmployeeCreatePage = lz(() => import("@modules/employees/pages/EmployeeCreatePage"),       "EmployeeCreatePage");
const EmployeeEditPage   = lz(() => import("@modules/employees/pages/EmployeeEditPage"),         "EmployeeEditPage");
const BeneficiaryCreatePage = lz(() => import("@modules/beneficiaries/pages/BeneficiaryCreatePage"), "BeneficiaryCreatePage");
const PartnerCreatePage  = lz(() => import("@modules/conventions/pages/PartnerCreatePage"),       "PartnerCreatePage");
const CoverageRequestsListPage = lz(() => import("@modules/medical-coverage/pages/CoverageRequestsListPage"), "CoverageRequestsListPage");
const CoverageRequestDetailPage = lz(() => import("@modules/medical-coverage/pages/CoverageRequestDetailPage"), "CoverageRequestDetailPage");
const VouchersListPage = lz(() => import("@modules/medical-coverage/pages/VouchersListPage"), "VouchersListPage");
const HistoryPage = lz(() => import("@modules/medical-coverage/pages/HistoryPage"), "HistoryPage");
const InvoicesListPage = lz(() => import("@modules/invoicing/pages/InvoicesListPage"), "InvoicesListPage");
const InvoiceCreatePage = lz(() => import("@modules/invoicing/pages/InvoiceCreatePage"), "InvoiceCreatePage");
const InvoiceDetailPage = lz(() => import("@modules/invoicing/pages/InvoiceDetailPage"), "InvoiceDetailPage");
const SystemSettingsPage = lz(() => import("@modules/administration/pages/SystemSettingsPage"), "SystemSettingsPage");
const OrgStructurePage = lz(() => import("@modules/organization/pages/OrgStructurePage"), "OrgStructurePage");
const OrgFunctionsPage = lz(() => import("@modules/organization/pages/FunctionsPage"), "FunctionsPage");
const OrgGradesPage = lz(() => import("@modules/organization/pages/GradesPage"), "GradesPage");
const CommitteeParametersPage = lz(() => import("@modules/administration/pages/CommitteeParametersPage"), "CommitteeParametersPage");
const WorkflowRulesPage  = lz(() => import("@modules/administration/pages/WorkflowRulesPage"),  "WorkflowRulesPage");
const WorkflowDesignerPage = lz(() => import("@modules/administration/pages/WorkflowDesignerPage"), "WorkflowDesignerPage");
const ApprovalMatrixPage = lz(() => import("@modules/administration/pages/ApprovalMatrixPage"), "ApprovalMatrixPage");
const UserRoleAssignmentPage = lz(() => import("@modules/administration/pages/UserRoleAssignmentPage"), "UserRoleAssignmentPage");
const AuditLogsPage      = lz(() => import("@modules/administration/pages/AuditLogsPage"),      "AuditLogsPage");
const RolesManagementPage = lz(() => import("@modules/administration/pages/RolesManagementPage"), "RolesManagementPage");
const PermissionsManagementPage = lz(() => import("@modules/administration/pages/PermissionsManagementPage"), "PermissionsManagementPage");
const NotFoundPage       = lz(() => import("@shared/components/ui/NotFoundPage"),               "NotFoundPage");
const ForbiddenPage      = lz(() => import("@shared/components/ui/ForbiddenPage"),              "ForbiddenPage");

const W = (C: React.ComponentType) => <Suspense fallback={<PageLoader />}><C /></Suspense>;

const router = createBrowserRouter([
  { path: "/login",           element: W(LoginPage) },
  { path: "/change-password", element: W(ChangePasswordPage) },
  { path: "/403",             element: W(ForbiddenPage) },
  {
    element: <ProtectedRoute />,
    children: [{
      element: <AppLayout />,
      children: [
        { path: "/",          element: <Navigate to="/dashboard" replace /> },
        { path: "/dashboard", element: W(DashboardPage) },
        { path: "/benefits",     element: W(BenefitsPage) },
        { path: "/benefits/:id", element: W(BenefitDetailPage) },
        // Employees — admin, gestionnaire, comptable, department_manager, director
        { element: <ProtectedRoute roles={["admin","gestionnaire","comptable","department_manager","director"]} />, children: [
          { path: "/employees",       element: W(EmployeesPage) },
          { path: "/employees/new",   element: W(EmployeeCreatePage) },
          { path: "/employees/:id",     element: W(EmployeeDetailPage) },
          { path: "/employees/:id/edit", element: W(EmployeeEditPage) },
        ]},
        // Finance — admin, comptable
        { element: <ProtectedRoute roles={["admin","comptable"]} />, children: [
          { path: "/finance",          element: W(FinanceDashboard) },
          { path: "/finance/payments", element: W(PaymentsPage) },
          { path: "/finance/budgets",  element: W(BudgetsPage) },
        ]},
        // Conventions — admin, gestionnaire, comptable, department_manager, director
        { element: <ProtectedRoute roles={["admin","gestionnaire","comptable","department_manager","director"]} />, children: [
          { path: "/conventions",              element: W(ConventionDash) },
          { path: "/conventions/partners",        element: W(PartnersPage) },
          { path: "/conventions/partners/new",    element: W(PartnerCreatePage) },
          { path: "/conventions/partners/:id",    element: W(PartnerDetailPage) },
          { path: "/conventions/partners/:id/edit", element: W(PartnerEditPage) },
          { path: "/conventions/new",          element: W(ConventionCreate) },
          { path: "/conventions/:id",          element: W(ConventionDetail) },
        ]},
        // Analytics & Reporting
        { path: "/reporting", element: W(ReportsPage) },
        { element: <ProtectedRoute roles={["admin"]} />, children: [
          { path: "/analytics",            element: W(AnalyticsDashPage) },
          { path: "/analytics/decisions",   element: W(DecisionSupportPage) },
          { path: "/analytics/visualizations", element: W(AdvancedVizPage) },
        ]},
        // Admin
        { element: <ProtectedRoute roles={["admin"]} />, children: [
          { path: "/users",                element: W(UsersPage) },
          { path: "/users/new",            element: W(UserCreatePage) },
          { path: "/settings",             element: <Navigate to="/admin/system-settings" replace /> },
          { path: "/admin/system-settings", element: W(SystemSettingsPage) },
          { path: "/admin/committee-params", element: W(CommitteeParametersPage) },
          { path: "/admin/workflow-rules",   element: W(WorkflowRulesPage) },
          { path: "/admin/workflow-designer", element: W(WorkflowDesignerPage) },
          { path: "/admin/approval-matrix",  element: W(ApprovalMatrixPage) },
          { path: "/admin/user-roles",       element: W(UserRoleAssignmentPage) },
          { path: "/admin/audit-logs",       element: W(AuditLogsPage) },
          { path: "/admin/roles",           element: W(RolesManagementPage) },
          { path: "/admin/permissions",     element: W(PermissionsManagementPage) },
          { path: "/admin/org-structure",   element: W(OrgStructurePage) },
          { path: "/admin/functions",       element: W(OrgFunctionsPage) },
          { path: "/admin/grades",          element: W(OrgGradesPage) },
          { path: "/monitoring",           element: W(MonitoringPage) },
          { path: "/ai/assistant",         element: W(AIAssistantPage) },
          { path: "/ai/predictive",        element: W(PredictiveAnalyticsPage) },
        ]},
        // Medical Coverage — admin, gestionnaire, comptable, department_manager, director
        { element: <ProtectedRoute roles={["admin","gestionnaire","comptable","department_manager","director"]} />, children: [
          // Analysis
          { path: "/medical-coverage/analysis", element: W(MedicalAnalysisPage) },
          { path: "/medical-coverage/analysis/new", element: <Navigate to="/medical-coverage/new" replace /> },
          { path: "/medical-coverage/analysis/:id", element: W(MedicalAnalysisDetail) },
          { path: "/medical-coverage/imaging", element: W(MedicalImagingPage) },
          { path: "/medical-coverage/imaging/new", element: <Navigate to="/medical-coverage/new" replace /> },
          { path: "/medical-coverage/imaging/:id", element: W(MedicalImagingDetail) },
          { path: "/medical-coverage/center", element: W(MedicalCenterPage) },
          { path: "/medical-coverage/center/new", element: <Navigate to="/medical-coverage/new" replace /> },
          { path: "/medical-coverage/center/:id", element: W(MedicalCenterDetail) },
          { path: "/medical-coverage/new", element: W(NewCoverageRequest) },
          // Loans — admin, gestionnaire, comptable
          { path: "/loans",     element: W(LoansListPage) },
          { path: "/loans/new", element: W(LoanCreatePage) },
          { path: "/loans/:id", element: W(LoanDetailPage) },
          // Coverage Requests
          { path: "/medical-coverage/requests",     element: W(CoverageRequestsListPage) },
          { path: "/medical-coverage/requests/new", element: <Navigate to="/medical-coverage/new" replace /> },
          { path: "/medical-coverage/requests/:id", element: W(CoverageRequestDetailPage) },
          // Vouchers
          { path: "/medical-coverage/vouchers", element: W(VouchersListPage) },
          // History
          { path: "/medical-coverage/history", element: W(HistoryPage) },
          // Invoicing — admin, gestionnaire, comptable
          { path: "/invoicing",     element: W(InvoicesListPage) },
          { path: "/invoicing/new", element: W(InvoiceCreatePage) },
          { path: "/invoicing/:id", element: W(InvoiceDetailPage) },
        ]},
        // Notification preferences
        { element: <ProtectedRoute />, children: [
          { path: "/preferences/notifications", element: W(NotificationPrefsPage) },
        ]},
        { element: <ProtectedRoute roles={["admin","gestionnaire","department_manager","director"]} />, children: [
          { path: "/beneficiaries",     element: W(BeneficiariesPage) },
          { path: "/beneficiaries/new", element: W(BeneficiaryCreatePage) },
        ]},
        // Documents — admin, gestionnaire, comptable, department_manager, director
        { element: <ProtectedRoute roles={["admin","gestionnaire","comptable","department_manager","director"]} />, children: [
          { path: "/documents", element: W(DocumentListPage) },
        ]},
      ],
    }],
  },
  { path: "*", element: W(NotFoundPage) },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
