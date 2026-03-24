import { lazy, type ComponentType } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { MainLayout } from '@/components/shared/MainLayout';
import { RouteErrorFallback } from '@/components/shared/RouteErrorFallback';
import { ForbiddenPage } from '@/components/shared/ForbiddenPage';
import AuthLayout from '@/layouts/AuthLayout';
import { getAppBasePath } from '@/lib/api-config';

const lazyImport = <T extends Record<string, unknown>, K extends keyof T>(
  factory: () => Promise<T>,
  name: K
) =>
  lazy(async () => {
    const module = await factory();
    return { default: module[name] as ComponentType };
  });

const LoginPage = lazyImport(() => import('@/features/auth'), 'LoginPage');
const ResetPasswordPage = lazyImport(() => import('@/features/auth'), 'ResetPasswordPage');
const ForgotPasswordPage = lazyImport(() => import('@/features/auth'), 'ForgotPasswordPage');
const DashboardPage = lazyImport(() => import('@/features/dashboard'), 'DashboardPage');
const TitleManagementPage = lazyImport(() => import('@/features/title-management'), 'TitleManagementPage');
const UserManagementPage = lazyImport(() => import('@/features/user-management'), 'UserManagementPage');
const MailSettingsPage = lazyImport(() => import('@/features/mail-settings'), 'MailSettingsPage');
const CountryManagementPage = lazyImport(() => import('@/features/country-management'), 'CountryManagementPage');
const CityManagementPage = lazyImport(() => import('@/features/city-management'), 'CityManagementPage');
const DistrictManagementPage = lazyImport(() => import('@/features/district-management'), 'DistrictManagementPage');
const CustomerTypeManagementPage = lazyImport(() => import('@/features/customer-type-management'), 'CustomerTypeManagementPage');
const CustomerManagementPage = lazyImport(() => import('@/features/customer-management'), 'CustomerManagementPage');
const ConflictInboxPage = lazyImport(() => import('@/features/customer-dedupe'), 'ConflictInboxPage');
const Customer360Page = lazyImport(() => import('@/features/customer-360'), 'Customer360Page');
const Salesmen360Page = lazyImport(() => import('@/features/salesman-360'), 'Salesmen360Page');
const ContactManagementPage = lazyImport(() => import('@/features/contact-management'), 'ContactManagementPage');
const PaymentTypeManagementPage = lazyImport(() => import('@/features/payment-type-management'), 'PaymentTypeManagementPage');
const UserDiscountLimitManagementPage = lazyImport(() => import('@/features/user-discount-limit-management'), 'UserDiscountLimitManagementPage');
const ProductPricingGroupByManagementPage = lazyImport(() => import('@/features/product-pricing-group-by-management'), 'ProductPricingGroupByManagementPage');
const ProductPricingManagementPage = lazyImport(() => import('@/features/product-pricing-management'), 'ProductPricingManagementPage');
const ActivityManagementPage = lazyImport(() => import('@/features/activity-management'), 'ActivityManagementPage');
const ActivityTypeManagementPage = lazyImport(() => import('@/features/activity-type'), 'ActivityTypeManagementPage');
const ShippingAddressManagementPage = lazyImport(() => import('@/features/shipping-address-management'), 'ShippingAddressManagementPage');
const DailyTasksPage = lazyImport(() => import('@/features/daily-tasks'), 'DailyTasksPage');
const ErpCustomerManagementPage = lazyImport(() => import('@/features/erp-customer-management'), 'ErpCustomerManagementPage');
const ApprovalRoleGroupManagementPage = lazyImport(() => import('@/features/approval-role-group-management'), 'ApprovalRoleGroupManagementPage');
const ApprovalUserRoleManagementPage = lazyImport(() => import('@/features/approval-user-role-management'), 'ApprovalUserRoleManagementPage');
const ApprovalRoleManagementPage = lazyImport(() => import('@/features/approval-role-management'), 'ApprovalRoleManagementPage');
const ApprovalFlowManagementPage = lazyImport(() => import('@/features/approval-flow-management'), 'ApprovalFlowManagementPage');
const QuotationCreateForm = lazyImport(() => import('@/features/quotation'), 'QuotationCreateForm');
const QuotationDetailPage = lazyImport(() => import('@/features/quotation'), 'QuotationDetailPage');
const QuotationListPage = lazyImport(() => import('@/features/quotation'), 'QuotationListPage');
const WaitingApprovalsPage = lazyImport(() => import('@/features/quotation'), 'WaitingApprovalsPage');
const DemandCreateForm = lazyImport(() => import('@/features/demand'), 'DemandCreateForm');
const DemandDetailPage = lazyImport(() => import('@/features/demand'), 'DemandDetailPage');
const DemandListPage = lazyImport(() => import('@/features/demand'), 'DemandListPage');
const DemandWaitingApprovalsPage = lazyImport(() => import('@/features/demand'), 'WaitingApprovalsPage');
const OrderCreateForm = lazyImport(() => import('@/features/order'), 'OrderCreateForm');
const OrderDetailPage = lazyImport(() => import('@/features/order'), 'OrderDetailPage');
const OrderListPage = lazyImport(() => import('@/features/order'), 'OrderListPage');
const OrderWaitingApprovalsPage = lazyImport(() => import('@/features/order'), 'WaitingApprovalsPage');
const PricingRuleManagementPage = lazyImport(() => import('@/features/pricing-rule'), 'PricingRuleManagementPage');
const StockListPage = lazyImport(() => import('@/features/stock'), 'StockListPage');
const StockDetailPage = lazyImport(() => import('@/features/stock'), 'StockDetailPage');
const DocumentSerialTypeManagementPage = lazyImport(() => import('@/features/document-serial-type-management'), 'DocumentSerialTypeManagementPage');
const SalesTypeManagementPage = lazyImport(() => import('@/features/sales-type-management'), 'SalesTypeManagementPage');
const ReportDesignerListPage = lazyImport(() => import('@/features/pdf-report-designer'), 'PdfReportDesignerListPage');
const ReportDesignerCreatePage = lazyImport(() => import('@/features/pdf-report-designer'), 'PdfReportDesignerCreatePage');
const PdfTablePresetManagementPage = lazyImport(() => import('@/features/pdf-report-designer'), 'PdfTablePresetManagementPage');
const ReportsListPage = lazyImport(() => import('@/features/report-builder/pages'), 'ReportsListPage');
const ReportBuilderPage = lazyImport(() => import('@/features/report-builder/pages'), 'ReportBuilderPage');
const ReportViewerPage = lazyImport(() => import('@/features/report-builder/pages'), 'ReportViewerPage');
const ReportDefinitionList = lazyImport(() => import('@/features/powerbi'), 'ReportDefinitionList');
const GroupList = lazyImport(() => import('@/features/powerbi'), 'GroupList');
const UserGroupList = lazyImport(() => import('@/features/powerbi'), 'UserGroupList');
const GroupReportDefinitionList = lazyImport(() => import('@/features/powerbi'), 'GroupReportDefinitionList');
const PowerbiConfigurationPage = lazyImport(() => import('@/features/powerbi-configuration'), 'PowerbiConfigurationPage');
const PowerbiReportsListPage = lazyImport(() => import('@/features/powerbi-viewer'), 'PowerbiReportsListPage');
const PowerbiReportViewerPage = lazyImport(() => import('@/features/powerbi-viewer'), 'PowerbiReportViewerPage');
const PowerbiReportSyncPage = lazyImport(() => import('@/features/powerbi-sync'), 'PowerbiReportSyncPage');
const PowerbiRlsPage = lazyImport(() => import('@/features/powerbi-rls'), 'PowerbiRlsPage');
const PermissionDefinitionsPage = lazyImport(() => import('@/features/access-control'), 'PermissionDefinitionsPage');
const PermissionGroupsPage = lazyImport(() => import('@/features/access-control'), 'PermissionGroupsPage');
const UserGroupAssignmentsPage = lazyImport(() => import('@/features/access-control'), 'UserGroupAssignmentsPage');
const HangfireMonitoringPage = lazyImport(() => import('@/features/hangfire-monitoring'), 'HangfireMonitoringPage');
const ProfilePage = lazyImport(() => import('@/features/user-detail-management'), 'ProfilePage');
const GoogleConnectionPage = lazyImport(() => import('@/features/google-integration'), 'GoogleConnectionPage');
const GoogleSyncPage = lazyImport(() => import('@/features/google-integration'), 'GoogleSyncPage');
const GoogleLogsPage = lazyImport(() => import('@/features/google-integration'), 'GoogleLogsPage');
const GoogleAuthInformationPage = lazyImport(() => import('@/features/google-integration'), 'GoogleAuthInformationPage');
const OutlookConnectionPage = lazyImport(() => import('@/features/outlook-integration'), 'OutlookConnectionPage');
const OutlookSyncPage = lazyImport(() => import('@/features/outlook-integration'), 'OutlookSyncPage');
const OutlookLogsPage = lazyImport(() => import('@/features/outlook-integration'), 'OutlookLogsPage');
const OutlookAuthInformationPage = lazyImport(() => import('@/features/outlook-integration'), 'OutlookAuthInformationPage');

export function createAppRouter() {
  return createBrowserRouter([
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      ),
      errorElement: <RouteErrorFallback />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: 'forbidden', element: <ForbiddenPage /> },
        { path: 'report-designer', element: <ReportDesignerListPage /> },
        { path: 'report-designer/create', element: <ReportDesignerCreatePage /> },
        { path: 'report-designer/edit/:id', element: <ReportDesignerCreatePage /> },
        { path: 'report-designer/table-presets', element: <PdfTablePresetManagementPage /> },
        { path: 'reports', element: <ReportsListPage /> },
        { path: 'reports/my', element: <ReportsListPage /> },
        { path: 'reports/my/:id', element: <ReportViewerPage /> },
        { path: 'reports/new', element: <ReportBuilderPage /> },
        { path: 'reports/:id/edit', element: <ReportBuilderPage /> },
        { path: 'reports/:id/edit/preview', element: <ReportViewerPage /> },
        { path: 'reports/:id', element: <ReportViewerPage /> },
        { path: 'powerbi/configuration', element: <PowerbiConfigurationPage /> },
        { path: 'powerbi/reports', element: <PowerbiReportsListPage /> },
        { path: 'powerbi/reports/:id', element: <PowerbiReportViewerPage /> },
        { path: 'powerbi/sync', element: <PowerbiReportSyncPage /> },
        { path: 'powerbi/report-definitions', element: <ReportDefinitionList /> },
        { path: 'powerbi/groups', element: <GroupList /> },
        { path: 'powerbi/user-groups', element: <UserGroupList /> },
        { path: 'powerbi/group-report-definitions', element: <GroupReportDefinitionList /> },
        { path: 'powerbi/rls', element: <PowerbiRlsPage /> },
        { path: 'title-management', element: <TitleManagementPage /> },
        { path: 'user-management', element: <UserManagementPage /> },
        { path: 'country-management', element: <CountryManagementPage /> },
        { path: 'city-management', element: <CityManagementPage /> },
        { path: 'district-management', element: <DistrictManagementPage /> },
        { path: 'customer-type-management', element: <CustomerTypeManagementPage /> },
        { path: 'customer-management', element: <CustomerManagementPage /> },
        { path: 'customers/conflict-inbox', element: <ConflictInboxPage /> },
        { path: 'customer-360/:customerId', element: <Customer360Page /> },
        { path: 'salesmen-360/:userId', element: <Salesmen360Page /> },
        { path: 'contact-management', element: <ContactManagementPage /> },
        { path: 'payment-type-management', element: <PaymentTypeManagementPage /> },
        { path: 'user-discount-limit-management', element: <UserDiscountLimitManagementPage /> },
        { path: 'users/mail-settings', element: <MailSettingsPage /> },
        { path: 'product-pricing-group-by-management', element: <ProductPricingGroupByManagementPage /> },
        { path: 'product-pricing-management', element: <ProductPricingManagementPage /> },
        { path: 'activity-management', element: <ActivityManagementPage /> },
        { path: 'activity-type-management', element: <ActivityTypeManagementPage /> },
        { path: 'shipping-address-management', element: <ShippingAddressManagementPage /> },
        { path: 'daily-tasks', element: <DailyTasksPage /> },
        { path: 'erp-customers', element: <ErpCustomerManagementPage /> },
        { path: 'approval-role-group-management', element: <ApprovalRoleGroupManagementPage /> },
        { path: 'approval-user-role-management', element: <ApprovalUserRoleManagementPage /> },
        { path: 'approval-role-management', element: <ApprovalRoleManagementPage /> },
        { path: 'approval-flow-management', element: <ApprovalFlowManagementPage /> },
        { path: 'quotations', element: <QuotationListPage /> },
        { path: 'quotations/create', element: <QuotationCreateForm /> },
        { path: 'quotations/:id', element: <QuotationDetailPage /> },
        { path: 'quotations/waiting-approvals', element: <WaitingApprovalsPage /> },
        { path: 'demands', element: <DemandListPage /> },
        { path: 'demands/create', element: <DemandCreateForm /> },
        { path: 'demands/:id', element: <DemandDetailPage /> },
        { path: 'demands/waiting-approvals', element: <DemandWaitingApprovalsPage /> },
        { path: 'orders', element: <OrderListPage /> },
        { path: 'orders/create', element: <OrderCreateForm /> },
        { path: 'orders/:id', element: <OrderDetailPage /> },
        { path: 'orders/waiting-approvals', element: <OrderWaitingApprovalsPage /> },
        { path: 'pricing-rules', element: <PricingRuleManagementPage /> },
        { path: 'stocks', element: <StockListPage /> },
        { path: 'stocks/:id', element: <StockDetailPage /> },
        { path: 'document-serial-type-management', element: <DocumentSerialTypeManagementPage /> },
        { path: 'definitions/sales-type-management', element: <SalesTypeManagementPage /> },
        { path: 'access-control/permission-definitions', element: <PermissionDefinitionsPage /> },
        { path: 'access-control/permission-groups', element: <PermissionGroupsPage /> },
        { path: 'access-control/user-group-assignments', element: <UserGroupAssignmentsPage /> },
        { path: 'hangfire-monitoring', element: <HangfireMonitoringPage /> },
        { path: 'settings/integrations/google', element: <GoogleConnectionPage /> },
        { path: 'settings/integrations/google/sync', element: <GoogleSyncPage /> },
        { path: 'settings/integrations/google/logs', element: <GoogleLogsPage /> },
        { path: 'settings/integrations/google/auth', element: <GoogleAuthInformationPage /> },
        { path: 'settings/integrations/outlook', element: <OutlookConnectionPage /> },
        { path: 'settings/integrations/outlook/sync', element: <OutlookSyncPage /> },
        { path: 'settings/integrations/outlook/logs', element: <OutlookLogsPage /> },
        { path: 'settings/integrations/outlook/auth', element: <OutlookAuthInformationPage /> },
        { path: 'profile', element: <ProfilePage /> },
      ],
    },
    {
      path: '/auth',
      element: <AuthLayout />,
      children: [
        { path: 'login', element: <LoginPage /> },
        { path: 'reset-password', element: <ResetPasswordPage /> },
        { path: 'forgot-password', element: <ForgotPasswordPage /> },
      ],
    },
    {
      path: '/reset-password',
      element: <AuthLayout />,
      children: [{ index: true, element: <ResetPasswordPage /> }],
    },
  ], {
    basename: getAppBasePath(),
  });
}
