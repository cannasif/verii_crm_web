import { type ReactElement, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { toast } from 'sonner';
import { systemSettingsApi } from '../api/systemSettingsApi';
import { SystemSettingsForm } from '../components/SystemSettingsForm';
import { useSystemSettingsQuery } from '../hooks/useSystemSettingsQuery';
import { useUpdateSystemSettingsMutation } from '../hooks/useUpdateSystemSettingsMutation';
import type { UpdateSystemSettingsDto } from '../types/systemSettings';

export function SystemSettingsPage(): ReactElement {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const { data, isLoading } = useSystemSettingsQuery();
  const updateMutation = useUpdateSystemSettingsMutation();
  const erpConnectionMutation = useMutation({
    mutationFn: () => systemSettingsApi.testErpConnection(),
    onSuccess: (response) => {
      toast.success(response.message || t('systemSettings.ErpConnection.TestSucceeded'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('systemSettings.ErpConnection.TestFailed'));
    },
  });

  useEffect(() => {
    setPageTitle(t('systemSettings.PageTitle'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  const handleSubmit = async (values: UpdateSystemSettingsDto): Promise<void> => {
    const payload: UpdateSystemSettingsDto = {
      numberFormat: values.numberFormat,
      decimalPlaces: values.decimalPlaces,
      restrictCustomersBySalesRepMatch: values.restrictCustomersBySalesRepMatch,
      hideDemandVatRate: values.hideDemandVatRate,
      hideQuotationVatRate: values.hideQuotationVatRate,
      hideOrderVatRate: values.hideOrderVatRate,
      readonlyDemandVatRate: values.readonlyDemandVatRate,
      readonlyQuotationVatRate: values.readonlyQuotationVatRate,
      readonlyOrderVatRate: values.readonlyOrderVatRate,
      catalogGroupCodeLabel: values.catalogGroupCodeLabel?.trim() || null,
      catalogCode1Label: values.catalogCode1Label?.trim() || null,
      catalogCode2Label: values.catalogCode2Label?.trim() || null,
      catalogCode3Label: values.catalogCode3Label?.trim() || null,
      catalogCode4Label: values.catalogCode4Label?.trim() || null,
      catalogCode5Label: values.catalogCode5Label?.trim() || null,
      customerCodeRuleEnabled: values.customerCodeRuleEnabled,
      customerCodeMask: values.customerCodeMask?.trim() || null,
      customerCodeExample: values.customerCodeExample?.trim() || null,
      customerCodeErrorMessage: values.customerCodeErrorMessage?.trim() || null,
      demandApprovalCompletionAction: values.demandApprovalCompletionAction,
      quotationApprovalCompletionAction: values.quotationApprovalCompletionAction,
      orderApprovalCompletionAction: values.orderApprovalCompletionAction,
      documentFieldLabels: values.documentFieldLabels,
    };

    await updateMutation.mutateAsync(payload);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('systemSettings.PageTitle')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('systemSettings.PageDescription')}</p>
      </div>
      <SystemSettingsForm
        data={data}
        isLoading={isLoading}
        isSubmitting={updateMutation.isPending}
        erpConnectionTest={erpConnectionMutation.data}
        isTestingErpConnection={erpConnectionMutation.isPending}
        erpConnectionError={erpConnectionMutation.error?.message}
        onTestErpConnection={() => erpConnectionMutation.mutateAsync()}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
