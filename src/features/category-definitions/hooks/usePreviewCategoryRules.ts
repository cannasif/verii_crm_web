import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { categoryDefinitionsApi } from '../api/category-definitions-api';
import type { CategoryRulePreviewResultDto } from '../types/category-definition-types';

export const usePreviewCategoryRules = (
  catalogId?: number | null,
  catalogCategoryId?: number | null
): UseMutationResult<CategoryRulePreviewResultDto, Error, void> => {
  const { t } = useTranslation(['category-definitions', 'common']);

  return useMutation({
    mutationFn: () => categoryDefinitionsApi.previewCategoryRules(catalogId!, catalogCategoryId!),
    onError: (error) => {
      toast.error(error.message || t('categoryDefinitions.messages.rulePreviewError'));
    },
  });
};
