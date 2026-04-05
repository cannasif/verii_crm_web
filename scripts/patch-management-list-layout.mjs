import fs from 'node:fs';
import path from 'node:path';

const IMPORT_BLOCK = `import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
  MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME,
} from '@/lib/management-list-layout';
`;

const FILES = [
  'src/features/user-discount-limit-management/components/UserDiscountLimitManagementPage.tsx',
  'src/features/sales-type-management/components/SalesTypeManagementPage.tsx',
  'src/features/product-pricing-group-by-management/components/ProductPricingGroupByManagementPage.tsx',
  'src/features/document-serial-type-management/components/DocumentSerialTypeManagementPage.tsx',
  'src/features/activity-shipping-management/components/ActivityTypeManagementPage.tsx',
  'src/features/activity-meeting-type-management/components/ActivityTypeManagementPage.tsx',
  'src/features/user-management/components/UserManagementPage.tsx',
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

for (const rel of FILES) {
  const p = path.join(ROOT, rel);
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('MANAGEMENT_LIST_CARD_CLASSNAME')) {
    console.log('skip (already patched):', rel);
    continue;
  }
  if (!s.includes("from '@/lib/column-preferences'")) {
    console.warn('no column-preferences import:', rel);
    continue;
  }
  s = s.replace(
    "import { loadColumnPreferences } from '@/lib/column-preferences';",
    `import { loadColumnPreferences } from '@/lib/column-preferences';\n${IMPORT_BLOCK}`
  );
  s = s.replace(
    '<Card className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm">',
    '<Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>'
  );
  s = s.replace('<CardHeader className="space-y-4">', '<CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>');
  s = s.replace(/<CardTitle>/g, '<CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>');

  s = s.replace(
    /(size="sm"\n)(\s+)(onClick=\{\(\) => handleRefresh\(\)\})/,
    '$1$2className={MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME}\n$2$3'
  );

  const m = s.match(/<CardContent>\r?\n(\s+)<(\w+Table)/);
  if (!m) {
    console.warn('no CardContent+Table match:', rel);
    fs.writeFileSync(p, s, 'utf8');
    continue;
  }
  const indent = m[1];
  const tableName = m[2];
  s = s.replace(
    `<CardContent>\n${indent}<${tableName}`,
    `<CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>\n${indent}<div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>\n${indent}<${tableName}`
  );
  const closeSelf = s.replace(
    /(\s+disablePaginationButtons=\{[^}]+\}\s*\r?\n\s+\/>)\s*\r?\n(\s+)<\/CardContent>/,
    `$1\n${indent}</div>\n$2</CardContent>`
  );
  if (closeSelf !== s) {
    s = closeSelf;
  } else {
    const closeExplicit = s.replace(
      new RegExp(`(</${tableName}>\\s*\\r?\\n)(\\s+)</CardContent>`),
      `$1${indent}</div>\n$2</CardContent>`
    );
    if (closeExplicit !== s) s = closeExplicit;
    else console.warn('close shell not matched:', rel);
  }

  fs.writeFileSync(p, s, 'utf8');
  console.log('patched:', rel);
}
