import fs from 'node:fs';
import path from 'node:path';

const FILES = [
  'src/features/user-discount-limit-management/components/UserDiscountLimitManagementPage.tsx',
  'src/features/sales-type-management/components/SalesTypeManagementPage.tsx',
  'src/features/product-pricing-group-by-management/components/ProductPricingGroupByManagementPage.tsx',
  'src/features/activity-shipping-management/components/ActivityTypeManagementPage.tsx',
  'src/features/activity-meeting-type-management/components/ActivityTypeManagementPage.tsx',
  'src/features/title-management/components/TitleManagementPage.tsx',
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

const ROOT = path.resolve(import.meta.dirname, '..');
const RE_OPEN = /<CardContent>\r?\n(\s+)</;

for (const rel of FILES) {
  const p = path.join(ROOT, rel);
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('<CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>')) {
    console.log('skip', rel);
    continue;
  }
  const m = s.match(RE_OPEN);
  if (!m) {
    console.warn('pattern not found', rel);
    continue;
  }
  const indent = m[1];
  s = s.replace(RE_OPEN, (_, indent) => {
    return `<CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>\n${indent}<div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>\n${indent}<`;
  });
  fs.writeFileSync(p, s, 'utf8');
  console.log('fixed', rel);
}
