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
  DashboardSquare02Icon, 
  UserGroupIcon, 
  Calendar03Icon, 
  PackageIcon, 
  ShoppingBag03Icon, 
  CheckmarkCircle02Icon, 
  SlidersHorizontalIcon, 
  UserCircleIcon, 
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
  const { t } = useTranslation();
  const { data: permissions, isLoading, isError } = useMyPermissionsQuery();

  const defaultNavItems: NavItem[] = useMemo(() => {
    const iconSize = 22;

    const logicalMenuStructure: NavItem[] = [
      {
        title: t('sidebar.home', 'Ana Sayfa'),
        href: '/',
        icon: <DashboardSquare02Icon size={iconSize} className="text-blue-500" />,
      },
      {
        title: t('sidebar.salesManagement', 'Satış Hunisi'),
        icon: <ShoppingBag03Icon size={iconSize} className="text-orange-500" />,
        children: [
          {
            title: t('sidebar.demands', 'Talepler'),
            children: [
              { title: t('sidebar.demandCreateWizard', 'Yeni Talep Oluştur'), href: '/demands/create' },
              { title: t('sidebar.waitingApprovalDemands', 'Onay Bekleyen Talepler'), href: '/demands/waiting-approvals' },
              { title: t('sidebar.demandList', 'Talep Listesi'), href: '/demands' },
            ],
          },
          {
            title: t('sidebar.proposals', 'Teklifler'),
            children: [
              { title: t('sidebar.quotationCreateWizard', 'Yeni Teklif Oluştur'), href: '/quotations/create' },
              { title: t('sidebar.waitingApprovals', 'Onay Bekleyen Teklifler'), href: '/quotations/waiting-approvals' },
              { title: t('sidebar.quotationList', 'Teklif Listesi'), href: '/quotations' },
            ],
          },
          {
            title: t('sidebar.orders', 'Siparişler'),
            children: [
              { title: t('sidebar.orderCreateWizard', 'Yeni Sipariş Oluştur'), href: '/orders/create' },
              { title: t('sidebar.waitingApprovalOrders', 'Onay Bekleyen Siparişler'), href: '/orders/waiting-approvals' },
              { title: t('sidebar.orderList', 'Sipariş Listesi'), href: '/orders' },
            ],
          },
        ],
      },
      {
        title: t('sidebar.customers', 'Müşteriler'),
        icon: <UserGroupIcon size={iconSize} className="text-purple-500" />,
        children: [
          { title: t('sidebar.customerManagement', 'Müşteri Yönetimi'), href: '/customer-management' },
          { title: t('sidebar.customersConflictInbox', 'Çakışma Gelen Kutusu'), href: '/customers/conflict-inbox' },
          { title: t('sidebar.erpCustomerManagement', 'ERP Müşteri'), href: '/erp-customers' },
          { title: t('sidebar.contactManagement', 'Müşteri İletişimleri'), href: '/contact-management' },
          { title: t('sidebar.customerTypeManagement', 'Müşteri Tipleri'), href: '/customer-type-management' },
        ],
      },
      {
        title: t('sidebar.activities', 'Aktiviteler'),
        icon: <Calendar03Icon size={iconSize} className="text-emerald-500" />,
        children: [
          { title: t('sidebar.dailyTasks', 'Günlük İşler'), href: '/daily-tasks' },
          { title: t('sidebar.activityManagement', 'Aktivite Yönetimi'), href: '/activity-management' },
          { title: t('sidebar.activityTypeManagement', 'Aktivite Tipleri'), href: '/activity-type-management' },
        ],
      },
      {
        title: t('sidebar.productAndStock', 'Ürün & Fiyat'),
        icon: <PackageIcon size={iconSize} className="text-pink-500" />,
        children: [
          { title: t('sidebar.stockManagement', 'Stok Yönetimi'), href: '/stocks' },
          { title: t('sidebar.productPricingManagement', 'Ürün Fiyatlandırma'), href: '/product-pricing-management' },
          { title: t('sidebar.productPricingGroupByManagement', 'Fiyat Grubu Yönetimi'), href: '/product-pricing-group-by-management' },
          { title: t('sidebar.pricingRuleManagement', 'Fiyat Kuralları'), href: '/pricing-rules' },
        ],
      },
      {
        title: t('sidebar.powerbi', 'PowerBI'),
        icon: <Analytics01Icon size={iconSize} className="text-amber-500" />,
        children: [
          { title: t('sidebar.powerbiConfiguration', 'PowerBI Konfigürasyon'), href: '/powerbi/configuration' },
          { title: t('sidebar.powerbiReportsView', 'PowerBI Raporları (Görüntüle)'), href: '/powerbi/reports' },
          { title: t('sidebar.powerbiSync', 'PowerBI Senkronizasyon'), href: '/powerbi/sync' },
          { title: t('sidebar.powerbiReportDefinitions', 'PowerBI Raporları'), href: '/powerbi/report-definitions' },
          { title: t('sidebar.powerbiGroups', 'PowerBI Grupları'), href: '/powerbi/groups' },
          { title: t('sidebar.powerbiUserGroups', 'PowerBI Kullanıcı Grupları'), href: '/powerbi/user-groups' },
          { title: t('sidebar.powerbiGroupReportMapping', 'PowerBI Grup-Rapor Eşleştirme'), href: '/powerbi/group-report-definitions' },
          { title: t('sidebar.powerbiRls', 'RLS Yönetimi'), href: '/powerbi/rls' },
        ],
      },
      {
        title: t('sidebar.reports', 'Raporlar'),
        icon: <File01Icon size={iconSize} className="text-cyan-500" />,
        children: [
          { title: t('sidebar.salesKpi', 'Satış KPI'), href: '/salesmen-360/me' },
          {
            title: t('sidebar.reportBuilder', 'Report Builder'),
            children: [
              { title: t('sidebar.reportsList', 'Liste'), href: '/reports' },
              { title: t('sidebar.reportsCreate', 'Yeni Oluştur'), href: '/reports/new' },
            ],
          },
          {
            title: t('sidebar.pdfBuilder', 'PDF Builder'),
            children: [
              { title: t('pdfReportDesigner.list', 'Listele'), href: '/report-designer' },
              { title: t('pdfReportDesigner.create', 'Oluştur'), href: '/report-designer/create' },
            ],
          },
        ],
      },
      {
        title: t('sidebar.approvalDefinitions', 'Onay Tanım Grubu'),
        icon: <CheckmarkCircle02Icon size={iconSize} className="text-teal-500" />,
        children: [
          { title: t('sidebar.approvalFlowManagement', 'Onay Akış Yönetimi'), href: '/approval-flow-management' },
          { title: t('sidebar.approvalRoleGroupManagement', 'Onay Rol Grubu Yönetimi'), href: '/approval-role-group-management' },
          { title: t('sidebar.approvalRoleManagement', 'Onay Rol Yönetimi'), href: '/approval-role-management' },
          { title: t('sidebar.approvalUserRoleManagement', 'Onay Kullanıcı Rolü Yönetimi'), href: '/approval-user-role-management' },
        ],
      },
      {
        title: t('sidebar.definitions', 'Tanımlar'),
        icon: <SlidersHorizontalIcon size={iconSize} className="text-slate-500" />,
        children: [
          { title: t('sidebar.countryManagement', 'Ülke Yönetimi'), href: '/country-management' },
          { title: t('sidebar.cityManagement', 'Şehir Yönetimi'), href: '/city-management' },
          { title: t('sidebar.districtManagement', 'İlçe Yönetimi'), href: '/district-management' },
          { title: t('sidebar.shippingAddressManagement', 'Sevk Adresi Yönetimi'), href: '/shipping-address-management' },
          { title: t('sidebar.titleManagement', 'Ünvan Yönetimi'), href: '/title-management' },
          { title: t('sidebar.paymentTypeManagement', 'Ödeme Tipi Yönetimi'), href: '/payment-type-management' },
          { title: t('sidebar.documentSerialTypeManagement', 'Dosya Tip Yönetimi'), href: '/document-serial-type-management' },
        ],
      },
      {
        title: t('sidebar.users', 'Kullanıcılar'),
        icon: <UserCircleIcon size={iconSize} className="text-indigo-500" stroke="currentColor" />,
        children: [
          { title: t('sidebar.userDiscountLimitManagement', 'Kullanıcı İskonto Limit Yönetimi'), href: '/user-discount-limit-management' },
        ],
      },
      {
        title: t('sidebar.accessControl', 'Erişim Kontrolü'),
        icon: <Shield01Icon size={iconSize} className="text-violet-500" />,
        children: [
          { title: t('sidebar.userManagement', 'Kullanıcı Yönetimi'), href: '/user-management' },
          { title: t('sidebar.mailSettings', 'Mail Ayarları'), href: '/users/mail-settings' },
          { title: t('sidebar.permissionDefinitions', 'İzin Tanımları'), href: '/access-control/permission-definitions' },
          { title: t('sidebar.permissionGroups', 'İzin Grupları'), href: '/access-control/permission-groups' },
          { title: t('sidebar.userGroupAssignments', 'Kullanıcı Grup Atamaları'), href: '/access-control/user-group-assignments' },
          {
            title: t('menu', { ns: 'hangfire-monitoring', defaultValue: 'Hangfire İzleme' }),
            href: '/hangfire-monitoring',
          },
        ],
      },
      {
        title: t('sidebar.settings', 'Ayarlar'),
        icon: <Settings02Icon size={iconSize} className="text-gray-500" />,
        href: '#',
      },
    ];

    return logicalMenuStructure;
  }, [t]);

  const items = useMemo(() => {
    const raw = navItems ?? defaultNavItems;
    if (isLoading) return raw;
    if (permissions) return filterNavItemsByPermission(raw, permissions);
    if (isError) return raw;
    return raw;
  }, [navItems, defaultNavItems, permissions, isLoading, isError]);

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-[#f8f9fc] dark:bg-[#0c0516] font-['Outfit'] transition-colors duration-300">
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
         <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] rounded-full bg-pink-300/30 dark:bg-pink-600/5 blur-[120px] mix-blend-multiply dark:mix-blend-normal transition-colors duration-500" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-orange-300/30 dark:bg-orange-600/5 blur-[100px] mix-blend-multiply dark:mix-blend-normal transition-colors duration-500" />
      </div>

      <div className="relative z-20 h-full">
        <Sidebar items={items} />
      </div>

      <div className="flex flex-1 flex-col h-full overflow-hidden relative z-10">
        <Navbar />
        <TooltipProvider delayDuration={200}>
          <main className="flex-1 overflow-y-auto p-4 text-foreground scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            <div className="w-full min-h-full">
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
