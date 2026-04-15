import { type ReactElement, Suspense, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield01Icon } from 'hugeicons-react';
import { PageLoader } from './PageLoader';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { TooltipProvider } from '@/components/ui/tooltip';
import { RoutePermissionGuard } from '@/features/access-control/components/RoutePermissionGuard';
import { useMyPermissionsQuery } from '@/features/access-control/hooks/useMyPermissionsQuery';
import { filterNavItemsByPermission } from '@/features/access-control/utils/filterNavItems';
import { 
  DashboardCircleIcon, 
  UserGroupIcon, 
  Calendar03Icon, 
  PackageIcon, 
  ShoppingBag03Icon, 
  CheckmarkCircle02Icon, 
  SlidersHorizontalIcon, 
  Settings02Icon,
  File01Icon,
  Analytics01Icon
} from 'hugeicons-react';

interface NavItem {
  title: string;
  href?: string;
  icon?: ReactElement;
  children?: NavItem[];
  defaultExpanded?: boolean;
}
interface MainLayoutProps {
  navItems?: NavItem[];
}

export function MainLayout({ navItems }: MainLayoutProps): ReactElement {
  const { t } = useTranslation(['common', 'report-designer']);
  const { data: permissions, isLoading, isError } = useMyPermissionsQuery();
  const canManageIntegrationAuth =
    permissions?.isSystemAdmin === true ||
    ['tenantadmin', 'systemadmin'].includes((permissions?.roleTitle ?? '').trim().toLowerCase());

  const defaultNavItems: NavItem[] = useMemo(() => {
    const iconSize = 22;

    const logicalMenuStructure: NavItem[] = [
      {
        title: t('sidebar.home'),
        href: '/',
        icon: <DashboardCircleIcon size={iconSize} className="text-blue-500" />,
      },
      {
        title: t('sidebar.salesManagement'),
        icon: <ShoppingBag03Icon size={iconSize} className="text-orange-500" />,
        children: [
          {
            title: t('sidebar.demands'),
            children: [
              { title: t('sidebar.demandCreateWizard'), href: '/demands/create' },
              { title: t('sidebar.waitingApprovalDemands'), href: '/demands/waiting-approvals' },
              { title: t('sidebar.demandList'), href: '/demands' },
            ],
          },
          {
            title: t('sidebar.proposals'),
            children: [
              { title: t('sidebar.quotationCreateWizard'), href: '/quotations/create' },
              { title: t('sidebar.waitingApprovals'), href: '/quotations/waiting-approvals' },
              { title: t('sidebar.quotationList'), href: '/quotations' },
            ],
          },
          {
            title: t('sidebar.orders'),
            children: [
              { title: t('sidebar.orderCreateWizard'), href: '/orders/create' },
              { title: t('sidebar.waitingApprovalOrders'), href: '/orders/waiting-approvals' },
              { title: t('sidebar.orderList'), href: '/orders' },
            ],
          },
        ],
      },
      {
        title: t('sidebar.customers'),
        icon: <UserGroupIcon size={iconSize} className="text-purple-500" />,
        children: [
          { title: t('sidebar.customerManagement'), href: '/customer-management' },
          { title: t('sidebar.customersConflictInbox'), href: '/customers/conflict-inbox' },
          { title: t('sidebar.erpCustomerManagement'), href: '/erp-customers' },
          { title: t('sidebar.contactManagement'), href: '/contact-management' },
          { title: t('sidebar.customerTypeManagement'), href: '/customer-type-management' },
        ],
      },
      {
        title: t('sidebar.activities'),
        icon: <Calendar03Icon size={iconSize} className="text-emerald-500" />,
        children: [
          { title: t('sidebar.dailyTasks'), href: '/daily-tasks' },
          { title: t('sidebar.activityManagement'), href: '/activity-management' },
          { title: t('sidebar.activityTypeManagement'), href: '/activity-type-management' },
        ],
      },
      {
        title: t('sidebar.productAndStock'),
        icon: <PackageIcon size={iconSize} className="text-pink-500" />,
        children: [
          { title: t('sidebar.stockManagement'), href: '/stocks' },
          { title: t('sidebar.productPricingManagement'), href: '/product-pricing-management' },
          { title: t('sidebar.productPricingGroupByManagement'), href: '/product-pricing-group-by-management' },
          { title: t('sidebar.pricingRuleManagement'), href: '/pricing-rules' },
        ],
      },
      {
        title: t('sidebar.powerbi'),
        icon: <Analytics01Icon size={iconSize} className="text-amber-500" />,
        children: [
          { title: t('sidebar.powerbiConfiguration'), href: '/powerbi/configuration' },
          { title: t('sidebar.powerbiReportsView'), href: '/powerbi/reports' },
          { title: t('sidebar.powerbiSync'), href: '/powerbi/sync' },
          { title: t('sidebar.powerbiReportDefinitions'), href: '/powerbi/report-definitions' },
          { title: t('sidebar.powerbiGroups'), href: '/powerbi/groups' },
          { title: t('sidebar.powerbiUserGroups'), href: '/powerbi/user-groups' },
          { title: t('sidebar.powerbiGroupReportMapping'), href: '/powerbi/group-report-definitions' },
          { title: t('sidebar.powerbiRls'), href: '/powerbi/rls' },
        ],
      },
      {
        title: t('sidebar.reports'),
        icon: <File01Icon size={iconSize} className="text-cyan-500" />,
        children: [
          { title: t('sidebar.salesKpi'), href: '/salesmen-360/me' },
          {
            title: t('sidebar.reportBuilder'),
            children: [
              { title: t('sidebar.reportsList'), href: '/reports' },
              { title: t('sidebar.myReports'), href: '/reports/my' },
              { title: t('sidebar.reportsCreate'), href: '/reports/new' },
            ],
          },
          {
            title: t('sidebar.pdfBuilder'),
            children: [
              { title: t('pdfReportDesigner.list'), href: '/pdf-report-designer' },
              { title: t('pdfReportDesigner.create'), href: '/pdf-report-designer/create' },
            ],
          },
        ],
      },
      {
        title: t('sidebar.approvalDefinitions'),
        icon: <CheckmarkCircle02Icon size={iconSize} className="text-teal-500" />,
        children: [
          { title: t('sidebar.approvalFlowManagement'), href: '/approval-flow-management' },
          { title: t('sidebar.approvalRoleGroupManagement'), href: '/approval-role-group-management' },
          { title: t('sidebar.approvalRoleManagement'), href: '/approval-role-management' },
          { title: t('sidebar.approvalUserRoleManagement'), href: '/approval-user-role-management' },
        ],
      },
      {
        title: t('sidebar.definitions'),
        icon: <SlidersHorizontalIcon size={iconSize} className="text-slate-500" />,
        children: [
          {
            title: t('sidebar.customerDefinitions'),
            children: [
              { title: t('sidebar.countryManagement'), href: '/country-management' },
              { title: t('sidebar.cityManagement'), href: '/city-management' },
              { title: t('sidebar.districtManagement'), href: '/district-management' },
              { title: t('sidebar.shippingAddressManagement'), href: '/shipping-address-management' },
              { title: t('sidebar.titleManagement'), href: '/title-management' },
            ],
          },
          {
            title: t('sidebar.activityDefinitions'),
            children: [
              { title: t('sidebar.activityMeetingTypeManagement'), href: '/definitions/activity-meeting-type-management' },
              { title: t('sidebar.activityTopicPurposeManagement'), href: '/definitions/activity-topic-purpose-management' },
              { title: t('sidebar.activityShippingManagement'), href: '/definitions/activity-shipping-management' },
            ],
          },
          {
            title: t('sidebar.commercialDefinitions'),
            children: [
              { title: t('sidebar.paymentTypeManagement'), href: '/payment-type-management' },
              { title: t('sidebar.documentSerialTypeManagement'), href: '/document-serial-type-management' },
              { title: t('sidebar.salesTypeManagement'), href: '/definitions/sales-type-management' },
              { title: t('sidebar.salesRepManagement'), href: '/definitions/sales-rep-management' },
              { title: t('sidebar.salesRepMatchManagement'), href: '/definitions/sales-rep-match-management' },
              { title: t('sidebar.userDiscountLimitManagement'), href: '/user-discount-limit-management' },
            ],
          },
          {
            title: t('sidebar.productDefinitions'),
            children: [
              { title: t('sidebar.categoryDefinitions'), href: '/definitions/category-definitions' },
            ],
          },
        ],
      },
      {
        title: t('sidebar.accessControl'),
        icon: <Shield01Icon size={iconSize} className="text-violet-500" />,
        children: [
          { title: t('sidebar.userManagement'), href: '/user-management' },
          { title: t('sidebar.mailSettings'), href: '/users/mail-settings' },
          { title: t('sidebar.permissionDefinitions'), href: '/access-control/permission-definitions' },
          { title: t('sidebar.permissionGroups'), href: '/access-control/permission-groups' },
          { title: t('sidebar.userGroupAssignments'), href: '/access-control/user-group-assignments' },
          {
            title: t('menu', { ns: 'hangfire-monitoring', defaultValue: 'Hangfire İzleme' }),
            href: '/hangfire-monitoring',
          },
        ],
      },
      {
        title: t('sidebar.settings'),
        icon: <Settings02Icon size={iconSize} className="text-gray-500" />,
        children: [
          {
            title: t('sidebar.googleIntegration'),
            children: [
              { title: t('sidebar.googleIntegrationConnection'), href: '/settings/integrations/google' },
              { title: t('sidebar.googleIntegrationSync'), href: '/settings/integrations/google/sync' },
              { title: t('sidebar.googleIntegrationLogs'), href: '/settings/integrations/google/logs' },
              { title: t('sidebar.googleIntegrationAuthInformation'), href: '/settings/integrations/google/auth' },
            ],
          },
          {
            title: t('sidebar.outlookIntegration'),
            children: [
              { title: t('sidebar.outlookIntegrationConnection'), href: '/settings/integrations/outlook' },
              { title: t('sidebar.outlookIntegrationSync'), href: '/settings/integrations/outlook/sync' },
              { title: t('sidebar.outlookIntegrationLogs'), href: '/settings/integrations/outlook/logs' },
              { title: t('sidebar.outlookIntegrationAuthInformation'), href: '/settings/integrations/outlook/auth' },
            ],
          },
        ],
      },
    ];

    return logicalMenuStructure;
  }, [t]);

  const items = useMemo(() => {
    const raw = navItems ?? defaultNavItems;
    const hideRestrictedAuthItems = (items: NavItem[]): NavItem[] =>
      items
        .map((item) => {
          if (!item.children) return item;

          const filteredChildren = hideRestrictedAuthItems(item.children).filter((child) => {
            if (
              child.href !== '/settings/integrations/google/auth' &&
              child.href !== '/settings/integrations/outlook/auth'
            ) {
              return true;
            }

            return canManageIntegrationAuth;
          });

          return {
            ...item,
            children: filteredChildren,
          };
        })
        .filter((item) => !item.children || item.children.length > 0);

    const normalized = hideRestrictedAuthItems(raw);

    if (isLoading) return normalized;
    if (permissions) return filterNavItemsByPermission(normalized, permissions);
    if (isError) return normalized;
    return normalized;
  }, [navItems, defaultNavItems, permissions, isLoading, isError, canManageIntegrationAuth]);

  return (
    <div className="relative flex min-h-dvh h-[100dvh] w-full overflow-hidden bg-[#f8f9fc] dark:bg-[#0c0516] font-['Outfit'] transition-colors duration-300">
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
         <div className="absolute top-[-10%] left-[-10%] w-[80vw] max-w-[800px] aspect-square rounded-full bg-pink-300/30 dark:bg-pink-600/5 blur-[80px] md:blur-[120px] mix-blend-multiply dark:mix-blend-normal transition-colors duration-500" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] max-w-[600px] aspect-square rounded-full bg-orange-300/30 dark:bg-orange-600/5 blur-[60px] md:blur-[100px] mix-blend-multiply dark:mix-blend-normal transition-colors duration-500" />
      </div>

      <div className="relative z-20 h-full">
        <Sidebar items={items} />
      </div>

      <div className="flex flex-1 flex-col h-full overflow-hidden relative z-10">
        <Navbar />
        <TooltipProvider delayDuration={200}>
          <main className="flex-1 overflow-auto p-4 md:p-6 text-foreground scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            <div className="w-full min-h-full max-w-[1920px] mx-auto">
              <Suspense fallback={<PageLoader />}>
                <RoutePermissionGuard />
              </Suspense>
            </div>
          </main>
        </TooltipProvider>
        <Footer />
      </div>
      
    </div>
  );
}
