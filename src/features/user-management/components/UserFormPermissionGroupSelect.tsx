import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { usePermissionGroupOptionsQuery } from '../hooks/usePermissionGroupOptionsQuery';

interface UserFormPermissionGroupSelectProps {
  value: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}

export function UserFormPermissionGroupSelect({
  value,
  onChange,
  disabled = false,
}: UserFormPermissionGroupSelectProps): ReactElement {
  const { t } = useTranslation('user-management');
  const { data: items = [], isLoading } = usePermissionGroupOptionsQuery();

  const handleToggle = (id: number): void => {
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const handleSelectAll = (checked: boolean): void => {
    if (checked) {
      onChange(items.map((i) => i.value));
    } else {
      onChange([]);
    }
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        {t('table.loading')}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Checkbox
          id="user-form-select-all-groups"
          checked={items.length > 0 && value.length === items.length}
          onCheckedChange={(c) => handleSelectAll(!!c)}
          disabled={disabled || items.length === 0}
        />
        <label
          htmlFor="user-form-select-all-groups"
          className="text-sm font-medium cursor-pointer"
        >
          {t('form.selectAll')}
        </label>
      </div>
      <div className="max-h-[200px] overflow-y-auto border rounded-lg p-2 space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            {t('form.permissionGroupsNoData')}
          </p>
        ) : (
          items.map((item) => (
            <div key={item.value} className="flex items-center gap-2">
              <Checkbox
                id={`user-form-group-${item.value}`}
                checked={value.includes(item.value)}
                onCheckedChange={() => handleToggle(item.value)}
                disabled={disabled}
              />
              <label
                htmlFor={`user-form-group-${item.value}`}
                className="text-sm cursor-pointer flex-1"
              >
                {item.label}
              </label>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
