import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const FILES = [
  'src/features/title-management/components/TitleManagementPage.tsx',
  'src/features/sales-type-management/components/SalesTypeManagementPage.tsx',
  'src/features/product-pricing-group-by-management/components/ProductPricingGroupByManagementPage.tsx',
  'src/features/activity-shipping-management/components/ActivityTypeManagementPage.tsx',
  'src/features/activity-meeting-type-management/components/ActivityTypeManagementPage.tsx',
  'src/features/user-discount-limit-management/components/UserDiscountLimitManagementPage.tsx',
  'src/features/shipping-address-management/components/ShippingAddressManagementPage.tsx',
  'src/features/pricing-rule/components/PricingRuleManagementPage.tsx',
  'src/features/district-management/components/DistrictManagementPage.tsx',
  'src/features/country-management/components/CountryManagementPage.tsx',
  'src/features/city-management/components/CityManagementPage.tsx',
  'src/features/approval-user-role-management/components/ApprovalUserRoleManagementPage.tsx',
  'src/features/approval-role-management/components/ApprovalRoleManagementPage.tsx',
  'src/features/approval-role-group-management/components/ApprovalRoleGroupManagementPage.tsx',
  'src/features/approval-flow-management/components/ApprovalFlowManagementPage.tsx',
  'src/features/activity-type/components/ActivityTypeManagementPage.tsx',
];

const needle =
  /variant="outline"\r?\n(\s+)size="sm"\r?\n(\s+)onClick=\{\(\) => handleRefresh\(\)\}/g;

for (const rel of FILES) {
  const p = path.join(ROOT, rel);
  let s = fs.readFileSync(p, 'utf8');
  const n = s.replace(needle, 'variant="outline"\n$1size="sm"\n$1className={MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME}\n$2onClick={() => handleRefresh()}');
  if (n !== s) {
    fs.writeFileSync(p, n, 'utf8');
    console.log('patched', rel);
  } else {
    console.log('skip', rel);
  }
}
