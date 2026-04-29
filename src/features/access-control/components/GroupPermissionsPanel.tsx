import { type ReactElement, useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { usePermissionGroupQuery } from '../hooks/usePermissionGroupQuery';
import { useSetPermissionGroupPermissionsMutation } from '../hooks/useSetPermissionGroupPermissionsMutation';
import { PermissionDefinitionMultiSelect } from './PermissionDefinitionMultiSelect';
import { FieldHelpTooltip } from './FieldHelpTooltip';
import { Settings, ShieldCheck, X, Lock } from 'lucide-react';

interface GroupPermissionsPanelProps {
  groupId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY_IDS: number[] = [];
const LABEL_STYLE = 'text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2';

export function GroupPermissionsPanel({
  groupId,
  open,
  onOpenChange,
}: GroupPermissionsPanelProps): ReactElement {
  const { t } = useTranslation(['access-control', 'common']);
  const { data: group } = usePermissionGroupQuery(groupId);
  const setPermissions = useSetPermissionGroupPermissionsMutation();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const isSystemAdminGroup = group?.isSystemAdmin === true;

  const serverIds = useMemo(() => group?.permissionDefinitionIds ?? EMPTY_IDS, [group?.permissionDefinitionIds]);

  useEffect(() => {
    setSelectedIds(serverIds.length > 0 ? [...serverIds] : []);
  }, [open, serverIds]);

  const handleSave = async (): Promise<void> => {
    if (groupId == null) return;
    await setPermissions.mutateAsync({ id: groupId, dto: { permissionDefinitionIds: selectedIds } });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[95%] !max-w-5xl overflow-hidden flex flex-col border border-slate-100 dark:border-white/10 p-0 text-slate-900 shadow-2xl dark:bg-[#130822] dark:text-white sm:w-full rounded-2xl [&>button:last-of-type]:hidden">
        <DialogPrimitive.Close className="absolute right-6 top-6 z-50 rounded-2xl bg-slate-100 p-2.5 text-slate-400 transition-all duration-200 hover:bg-red-600 hover:text-white active:scale-90 dark:bg-white/5 dark:text-white/40 dark:hover:bg-red-600 dark:hover:text-white">
          <X size={20} strokeWidth={2.5} />
        </DialogPrimitive.Close>

        <DialogHeader className="p-8 pb-0 shrink-0">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] bg-linear-to-br from-pink-500 to-orange-600 shadow-lg shadow-pink-500/20">
              <Settings size={32} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {t('permissionGroups.permissionsPanel.title')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                <span className="text-slate-600 dark:text-slate-400 font-bold">{group?.name}</span> - {t('permissionGroups.permissionsPanel.description')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-0 sm:pt-0 custom-scrollbar">
          <div className="space-y-6 pt-6 border-t border-dashed border-slate-200 dark:border-white/10">
            {isSystemAdminGroup && (
              <div className="flex items-center gap-3 rounded-2xl border border-amber-300/50 bg-amber-50/50 px-4 py-3 text-xs font-bold text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                <ShieldCheck className="size-4 shrink-0" />
                {t('permissionGroups.systemAdminLocked', 'System Admin grubu değiştirilemez')}
              </div>
            )}

            {group?.permissionCodes && group.permissionCodes.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">

                  {t('permissionGroups.permissionsPanel.currentCodes')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.permissionCodes.map((code) => (
                    <Badge key={code} variant="secondary" className="font-mono text-[12px] bg-slate-100 dark:bg-[#180F22] border-slate-200 dark:border-white/20">
                      {code}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p className={LABEL_STYLE}>
                <Lock size={16} className="text-pink-500" />
                {t('permissionGroups.form.permissions')}
                <FieldHelpTooltip text={t('help.permissionGroup.permissions')} />
              </p>
              <div className="w-full overflow-hidden">
                <PermissionDefinitionMultiSelect
                  value={selectedIds}
                  onChange={setSelectedIds}
                  disabled={setPermissions.isPending || isSystemAdminGroup}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-8 py-4 shrink-0 border-t border-dashed border-slate-200 dark:border-white/10 mt-auto">
          <div className="flex flex-row items-center justify-end gap-3 w-full">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={setPermissions.isPending}
              className="h-11 px-6 rounded-xl dark:bg-[#180F22] font-bold border border-slate-200 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10 text-xs sm:text-sm"
            >
              {t('common.cancel')}
            </Button>
            <div className="inline-flex items-center gap-2">
              <FieldHelpTooltip text={t('help.permissionGroup.save')} side="top" />
              <Button
                onClick={handleSave}
                disabled={setPermissions.isPending || isSystemAdminGroup}
                className="h-11 px-6 sm:px-10 rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-pink-500/25 text-xs sm:text-sm"
              >
                {setPermissions.isPending ? (
                  <>
                    <X className="mr-2 size-4 animate-spin" />
                    {t('common.saving')}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 size-4" />
                    {t('common.save')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

