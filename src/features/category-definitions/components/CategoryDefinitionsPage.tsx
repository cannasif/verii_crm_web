import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CirclePlus,
  ChevronRight,
  GitBranchPlus,
  GripVertical,
  Layers3,
  ListTree,
  Package2,
  Pencil,
  RefreshCcw,
  Search,
  Sparkles,
  WandSparkles,
  Trash2,
} from 'lucide-react';
import { ProductSelectDialog, type ProductSelectionResult } from '@/components/shared';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';
import { useCatalogCategories } from '../hooks/useCatalogCategories';
import { useCatalogCategoryStocks } from '../hooks/useCatalogCategoryStocks';
import { useCatalogs } from '../hooks/useCatalogs';
import { useCreateCatalog } from '../hooks/useCreateCatalog';
import { useCreateCatalogCategory } from '../hooks/useCreateCatalogCategory';
import { useDeleteCatalog } from '../hooks/useDeleteCatalog';
import { useDeleteCatalogCategory } from '../hooks/useDeleteCatalogCategory';
import { useUpdateCatalog } from '../hooks/useUpdateCatalog';
import { useUpdateCatalogCategory } from '../hooks/useUpdateCatalogCategory';
import { useCreateStockCategoryAssignment } from '../hooks/useCreateStockCategoryAssignment';
import { useDeleteStockCategoryAssignment } from '../hooks/useDeleteStockCategoryAssignment';
import { useCategoryRules } from '../hooks/useCategoryRules';
import { useCreateCategoryRule } from '../hooks/useCreateCategoryRule';
import { useUpdateCategoryRule } from '../hooks/useUpdateCategoryRule';
import { useDeleteCategoryRule } from '../hooks/useDeleteCategoryRule';
import { useApplyCategoryRules } from '../hooks/useApplyCategoryRules';
import { usePreviewCategoryRules } from '../hooks/usePreviewCategoryRules';
import { useReorderCatalogCategories } from '../hooks/useReorderCatalogCategories';
import { useApplyStockHierarchyImport, usePreviewStockHierarchyImport } from '../hooks/useStockHierarchyImport';
import type { CatalogCategoryNodeDto, ProductCatalogDto } from '../types/category-definition-types';
import type { CatalogCategoryCreateDto, CatalogCategoryUpdateDto, CatalogStockHierarchyImportPreviewDto, CatalogStockHierarchyImportRequestDto, CategoryRuleApplyResultDto, CategoryRulePreviewResultDto, ProductCatalogCreateDto, ProductCatalogUpdateDto, ProductCategoryRuleCreateDto, ProductCategoryRuleDto, ProductCategoryRuleUpdateDto } from '../types/category-definition-types';
import { CreateCatalogDialog } from './CreateCatalogDialog';
import { CreateCategoryDialog } from './CreateCategoryDialog';
import { CategoryRuleDialog } from './CategoryRuleDialog';

function getCatalogTypeTranslationKey(catalogType: number): string {
  switch (catalogType) {
    case 1:
      return 'b2b';
    case 2:
      return 'b2c';
    case 3:
      return 'dealer';
    default:
      return 'custom';
  }
}

function getCurrentPath(stack: CatalogCategoryNodeDto[], selectedLeaf: CatalogCategoryNodeDto | null): CatalogCategoryNodeDto[] {
  if (!selectedLeaf) {
    return stack;
  }

  const lastStackItem = stack[stack.length - 1];
  if (lastStackItem?.catalogCategoryId === selectedLeaf.catalogCategoryId) {
    return stack;
  }

  return [...stack, selectedLeaf];
}

export function CategoryDefinitionsPage(): ReactElement {
  const { t } = useTranslation(['category-definitions', 'common']);
  const { setPageTitle } = useUIStore();
  const [activeTab, setActiveTab] = useState<'summary' | 'stocks' | 'rules' | 'tips'>('summary');
  const [selectedCatalogId, setSelectedCatalogId] = useState<number | null>(null);
  const [navigationStack, setNavigationStack] = useState<CatalogCategoryNodeDto[]>([]);
  const [selectedLeaf, setSelectedLeaf] = useState<CatalogCategoryNodeDto | null>(null);
  const [stockSearch, setStockSearch] = useState('');
  const [isCreateCatalogOpen, setIsCreateCatalogOpen] = useState(false);
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<ProductCatalogDto | null>(null);
  const [editingCategory, setEditingCategory] = useState<CatalogCategoryNodeDto | null>(null);
  const [catalogToDelete, setCatalogToDelete] = useState<ProductCatalogDto | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<CatalogCategoryNodeDto | null>(null);
  const [stockAssignmentToDelete, setStockAssignmentToDelete] = useState<number | null>(null);
  const [isProductSelectOpen, setIsProductSelectOpen] = useState(false);
  const [orderedCategories, setOrderedCategories] = useState<CatalogCategoryNodeDto[]>([]);
  const [draggedCategoryId, setDraggedCategoryId] = useState<number | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<number | null>(null);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ProductCategoryRuleDto | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<ProductCategoryRuleDto | null>(null);
  const [lastRuleApplyResult, setLastRuleApplyResult] = useState<CategoryRuleApplyResultDto | null>(null);
  const [lastRulePreviewResult, setLastRulePreviewResult] = useState<CategoryRulePreviewResultDto | null>(null);
  const [isStockHierarchyDialogOpen, setIsStockHierarchyDialogOpen] = useState(false);
  const [stockHierarchyPreviewResult, setStockHierarchyPreviewResult] = useState<CatalogStockHierarchyImportPreviewDto | null>(null);
  const [stockHierarchyOptions, setStockHierarchyOptions] = useState<CatalogStockHierarchyImportRequestDto>({
    includeCode1: true,
    includeCode2: true,
    includeCode3: true,
    assignStocks: true,
  });

  useEffect(() => {
    setPageTitle(t('categoryDefinitions.title'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  const catalogsQuery = useCatalogs();
  const catalogs = catalogsQuery.data ?? [];
  const selectedCatalog = useMemo<ProductCatalogDto | null>(
    () => catalogs.find((catalog) => catalog.id === selectedCatalogId) ?? null,
    [catalogs, selectedCatalogId]
  );

  useEffect(() => {
    if (!selectedCatalogId && catalogs.length > 0) {
      setSelectedCatalogId(catalogs[0].id);
    }
  }, [catalogs, selectedCatalogId]);

  const activeParent = navigationStack.length > 0 ? navigationStack[navigationStack.length - 1] : null;
  const targetParent = selectedLeaf ?? activeParent;
  const categoriesQuery = useCatalogCategories(selectedCatalogId, activeParent?.catalogCategoryId ?? null);
  const categories = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data]
  );
  const createCatalog = useCreateCatalog();
  const createCatalogCategory = useCreateCatalogCategory(selectedCatalogId);
  const updateCatalog = useUpdateCatalog();
  const updateCatalogCategory = useUpdateCatalogCategory(selectedCatalogId);
  const deleteCatalog = useDeleteCatalog();
  const deleteCatalogCategory = useDeleteCatalogCategory(selectedCatalogId);
  const createStockCategoryAssignment = useCreateStockCategoryAssignment(selectedCatalogId, selectedLeaf?.catalogCategoryId ?? null);
  const deleteStockCategoryAssignment = useDeleteStockCategoryAssignment(selectedCatalogId, selectedLeaf?.catalogCategoryId ?? null);
  const reorderCatalogCategories = useReorderCatalogCategories(selectedCatalogId);
  const rulesQuery = useCategoryRules(selectedCatalogId, selectedLeaf?.catalogCategoryId ?? null);
  const createCategoryRule = useCreateCategoryRule(selectedCatalogId, selectedLeaf?.catalogCategoryId ?? null);
  const updateCategoryRule = useUpdateCategoryRule(selectedCatalogId, selectedLeaf?.catalogCategoryId ?? null);
  const deleteCategoryRule = useDeleteCategoryRule(selectedCatalogId, selectedLeaf?.catalogCategoryId ?? null);
  const previewCategoryRules = usePreviewCategoryRules(selectedCatalogId, selectedLeaf?.catalogCategoryId ?? null);
  const applyCategoryRules = useApplyCategoryRules(selectedCatalogId, selectedLeaf?.catalogCategoryId ?? null);
  const previewStockHierarchyImport = usePreviewStockHierarchyImport(selectedCatalogId);
  const applyStockHierarchyImport = useApplyStockHierarchyImport(selectedCatalogId);

  const stocksQuery = useCatalogCategoryStocks(
    selectedCatalogId,
    selectedLeaf?.catalogCategoryId ?? null,
    { pageNumber: 1, pageSize: 20, search: stockSearch || undefined }
  );

  const currentPath = useMemo(
    () => getCurrentPath(navigationStack, selectedLeaf),
    [navigationStack, selectedLeaf]
  );

  useEffect(() => {
    setOrderedCategories(categories);
  }, [categoriesQuery.data, categories]);

  const breadcrumbItems = useMemo(
    () => [
      { label: t('sidebar.definitions') },
      { label: t('sidebar.productDefinitions') },
      { label: t('sidebar.categoryDefinitions'), isActive: true },
    ],
    [t]
  );

  const catalogTypeLabel = useMemo(() => {
    if (!selectedCatalog) {
      return t('categoryDefinitions.selectionValueEmpty');
    }

    return t(`categoryDefinitions.catalogTypes.${getCatalogTypeTranslationKey(selectedCatalog.catalogType)}`);
  }, [selectedCatalog, t]);

  const nextStepLabel = useMemo(() => {
    if (!selectedCatalog) {
      return t('categoryDefinitions.nextStepChooseCatalog');
    }

    if (!selectedLeaf && categories.length > 0) {
      return t('categoryDefinitions.nextStepSelectLeaf');
    }

    if (!selectedLeaf) {
      return t('categoryDefinitions.nextStepBrowseTree');
    }

    return t('categoryDefinitions.nextStepReviewStocks');
  }, [categories.length, selectedCatalog, selectedLeaf, t]);

  useEffect(() => {
    if (!selectedCatalog) {
      setActiveTab('summary');
      return;
    }

    if (selectedLeaf) {
      setActiveTab('stocks');
      return;
    }

    setActiveTab('summary');
  }, [selectedCatalog, selectedLeaf]);

  const handleCatalogSelect = (catalogId: number): void => {
    setSelectedCatalogId(catalogId);
    setNavigationStack([]);
    setSelectedLeaf(null);
    setStockSearch('');
  };

  const handleCategoryClick = (node: CatalogCategoryNodeDto): void => {
    if (node.isLeaf || !node.hasChildren) {
      setSelectedLeaf(node);
      return;
    }

    setSelectedLeaf(null);
    setNavigationStack((prev) => [...prev, node]);
  };

  const handleBack = (): void => {
    setSelectedLeaf(null);
    setNavigationStack((prev) => prev.slice(0, -1));
  };

  const handleRootReset = (): void => {
    setNavigationStack([]);
    setSelectedLeaf(null);
  };

  const handleCreateCatalog = async (data: ProductCatalogCreateDto): Promise<void> => {
    if (editingCatalog) {
      const updated = await updateCatalog.mutateAsync({ id: editingCatalog.id, data: data as ProductCatalogUpdateDto });
      setIsCreateCatalogOpen(false);
      setEditingCatalog(null);
      handleCatalogSelect(updated.id);
      return;
    }

    const created = await createCatalog.mutateAsync(data);
    setIsCreateCatalogOpen(false);
    handleCatalogSelect(created.id);
  };

  const handleCreateCategory = async (data: CatalogCategoryCreateDto): Promise<void> => {
    if (editingCategory) {
      await updateCatalogCategory.mutateAsync({
        catalogCategoryId: editingCategory.catalogCategoryId,
        data: data as CatalogCategoryUpdateDto,
      });
      setIsCreateCategoryOpen(false);
      setEditingCategory(null);
      await categoriesQuery.refetch();
      return;
    }

    await createCatalogCategory.mutateAsync(data);
    if (targetParent) {
      setSelectedLeaf(null);
      if (!navigationStack.some((item) => item.catalogCategoryId === targetParent.catalogCategoryId)) {
        setNavigationStack((prev) => [...prev, targetParent]);
      }
    } else {
      handleRootReset();
    }
    setIsCreateCategoryOpen(false);
    await categoriesQuery.refetch();
  };

  const handleDeleteCatalog = async (): Promise<void> => {
    if (!catalogToDelete) return;

    await deleteCatalog.mutateAsync(catalogToDelete.id);
    setCatalogToDelete(null);
    setSelectedCatalogId(null);
    setNavigationStack([]);
    setSelectedLeaf(null);
  };

  const handleDeleteCategory = async (): Promise<void> => {
    if (!categoryToDelete) return;

    await deleteCatalogCategory.mutateAsync(categoryToDelete.catalogCategoryId);
    setCategoryToDelete(null);
    if (selectedLeaf?.catalogCategoryId === categoryToDelete.catalogCategoryId) {
      setSelectedLeaf(null);
    }
    if (activeParent?.catalogCategoryId === categoryToDelete.catalogCategoryId) {
      setNavigationStack((prev) => prev.slice(0, -1));
    }
    await categoriesQuery.refetch();
  };

  const handleStockSelect = async (selection: ProductSelectionResult): Promise<void> => {
    if (!selection.id || !selectedLeaf) {
      return;
    }

    await createStockCategoryAssignment.mutateAsync({
      stockId: selection.id,
      isPrimary: (stocksQuery.data?.data?.length ?? 0) === 0,
      sortOrder: 0,
      note: null,
    });

    setIsProductSelectOpen(false);
    await stocksQuery.refetch();
  };

  const handleDeleteStockAssignment = async (): Promise<void> => {
    if (!stockAssignmentToDelete) return;
    await deleteStockCategoryAssignment.mutateAsync(stockAssignmentToDelete);
    setStockAssignmentToDelete(null);
    await stocksQuery.refetch();
  };

  const handleRuleSubmit = async (data: ProductCategoryRuleCreateDto): Promise<void> => {
    if (editingRule) {
      await updateCategoryRule.mutateAsync({
        ruleId: editingRule.id,
        data: data as ProductCategoryRuleUpdateDto,
      });
    } else {
      await createCategoryRule.mutateAsync(data);
    }

    setIsRuleDialogOpen(false);
    setEditingRule(null);
    await rulesQuery.refetch();
  };

  const handleDeleteRule = async (): Promise<void> => {
    if (!ruleToDelete) return;
    await deleteCategoryRule.mutateAsync(ruleToDelete.id);
    setRuleToDelete(null);
    await rulesQuery.refetch();
  };

  const handlePreviewRules = async (): Promise<void> => {
    if (!selectedLeaf) {
      return;
    }

    const result = await previewCategoryRules.mutateAsync();
    setLastRulePreviewResult(result);
  };

  const handleApplyRules = async (): Promise<void> => {
    if (!selectedLeaf) {
      return;
    }

    const result = await applyCategoryRules.mutateAsync();
    setLastRuleApplyResult(result);
    setLastRulePreviewResult(null);
    await stocksQuery.refetch();
  };

  const handlePreviewStockHierarchyImport = async (): Promise<void> => {
    if (!selectedCatalogId) {
      return;
    }

    const result = await previewStockHierarchyImport.mutateAsync(stockHierarchyOptions);
    setStockHierarchyPreviewResult(result);
    setIsStockHierarchyDialogOpen(true);
  };

  const handleApplyStockHierarchyImport = async (): Promise<void> => {
    if (!selectedCatalogId) {
      return;
    }

    await applyStockHierarchyImport.mutateAsync(stockHierarchyOptions);
    setIsStockHierarchyDialogOpen(false);
    setStockHierarchyPreviewResult(null);
    setNavigationStack([]);
    setSelectedLeaf(null);
    await categoriesQuery.refetch();
  };

  const handleCategoryDragStart = (catalogCategoryId: number): void => {
    setDraggedCategoryId(catalogCategoryId);
    setDragOverCategoryId(catalogCategoryId);
  };

  const handleCategoryDrop = async (targetCatalogCategoryId: number): Promise<void> => {
    if (!draggedCategoryId || draggedCategoryId === targetCatalogCategoryId || !selectedCatalogId) {
      setDraggedCategoryId(null);
      setDragOverCategoryId(null);
      return;
    }

    const sourceIndex = orderedCategories.findIndex((item) => item.catalogCategoryId === draggedCategoryId);
    const targetIndex = orderedCategories.findIndex((item) => item.catalogCategoryId === targetCatalogCategoryId);
    if (sourceIndex < 0 || targetIndex < 0) {
      setDraggedCategoryId(null);
      setDragOverCategoryId(null);
      return;
    }

    const next = [...orderedCategories];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    setOrderedCategories(next);
    setDraggedCategoryId(null);
    setDragOverCategoryId(null);

    await reorderCatalogCategories.mutateAsync({
      parentCatalogCategoryId: activeParent?.catalogCategoryId ?? null,
      orderedCatalogCategoryIds: next.map((item) => item.catalogCategoryId),
    });
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={breadcrumbItems} />

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t('categoryDefinitions.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('categoryDefinitions.description')}</p>
      </div>

      <Alert className="border-slate-200/80 bg-slate-50/80 dark:border-white/10 dark:bg-white/5">
        <Sparkles className="h-4 w-4" />
        <AlertTitle>{t('categoryDefinitions.guidedTitle')}</AlertTitle>
        <AlertDescription className="mt-3 grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl border bg-white/80 p-3 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-linear-to-r from-pink-600 to-orange-600 text-[10px] font-bold text-white shadow-md shadow-pink-500/20 opacity-50 grayscale-[0] dark:opacity-100 dark:grayscale-0">
                1
              </div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                {t('categoryDefinitions.stepCatalogTitle')}
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{t('categoryDefinitions.stepCatalogDescription')}</p>
          </div>
          <div className="rounded-xl border bg-white/80 p-3 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-linear-to-r from-pink-600 to-orange-600 text-[10px] font-bold text-white shadow-md shadow-pink-500/20 opacity-50 grayscale-[0] dark:opacity-100 dark:grayscale-0">
                2
              </div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                {t('categoryDefinitions.stepTreeTitle')}
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{t('categoryDefinitions.stepTreeDescription')}</p>
          </div>
          <div className="rounded-xl border bg-white/80 p-3 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-linear-to-r from-pink-600 to-orange-600 text-[10px] font-bold text-white shadow-md shadow-pink-500/20 opacity-50 grayscale-[0] dark:opacity-100 dark:grayscale-0">
                3
              </div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                {t('categoryDefinitions.stepStocksTitle')}
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{t('categoryDefinitions.stepStocksDescription')}</p>
          </div>
        </AlertDescription>
      </Alert>

      <Card className="border-slate-200/70 bg-white dark:border-white/10 dark:bg-white/5">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranchPlus className="h-4 w-4" />
            {t('categoryDefinitions.hierarchyBlueprintTitle')}
          </CardTitle>
          <CardDescription>{t('categoryDefinitions.hierarchyBlueprintDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 xl:grid-cols-5">
            {(['root', 'subcategory', 'brand', 'series', 'products'] as const).map((stage, index) => (
              <div
                key={stage}
                className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-r from-pink-600 to-orange-600 text-xs font-bold text-white shadow-lg shadow-pink-500/20 ring-1 ring-white/20 opacity-50 grayscale-[0] dark:opacity-100 dark:grayscale-0">
                    {index + 1}
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {t(`categoryDefinitions.hierarchyStages.${stage}.title`)}
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {t(`categoryDefinitions.hierarchyStages.${stage}.description`)}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/50 p-4 text-sm text-muted-foreground dark:border-white/10 dark:bg-white/5">
            <span className="font-medium text-foreground">{t('categoryDefinitions.hierarchyExampleLabel')}:</span>{' '}
            {t('categoryDefinitions.hierarchyExampleValue')}
          </div>
        </CardContent>
      </Card>

      <Card className="border-pink-200/70 bg-pink-50/50 dark:border-pink-500/20 dark:bg-pink-500/5">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-foreground">{t('categoryDefinitions.easyModeTitle')}</div>
            <p className="text-sm text-muted-foreground">{nextStepLabel}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {!selectedCatalog ? (
              <Button onClick={() => setIsCreateCatalogOpen(true)}>
                <CirclePlus className="mr-2 h-4 w-4" />
                {t('categoryDefinitions.actions.newCatalog')}
              </Button>
            ) : null}

            {selectedCatalog && orderedCategories.length === 0 ? (
              <Button onClick={() => setIsCreateCategoryOpen(true)}>
                <CirclePlus className="mr-2 h-4 w-4" />
                {t('categoryDefinitions.actions.addRootCategory')}
              </Button>
            ) : null}

            {selectedCatalog ? (
              <Button
                variant="outline"
                onClick={() => void handlePreviewStockHierarchyImport()}
                disabled={previewStockHierarchyImport.isPending}
              >
                <WandSparkles className="mr-2 h-4 w-4" />
                {previewStockHierarchyImport.isPending
                  ? t('categoryDefinitions.actions.previewingStockHierarchy')
                  : t('categoryDefinitions.actions.importFromRiiStock')}
              </Button>
            ) : null}

            {selectedLeaf ? (
              <>
                <Button onClick={() => setIsProductSelectOpen(true)}>
                  <CirclePlus className="mr-2 h-4 w-4" />
                  {t('categoryDefinitions.actions.addStock')}
                </Button>
                <Button variant="outline" onClick={() => { setActiveTab('rules'); setIsRuleDialogOpen(true); }}>
                  <CirclePlus className="mr-2 h-4 w-4" />
                  {t('categoryDefinitions.actions.addRule')}
                </Button>
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_440px]">
        <Card className="overflow-hidden rounded-[2rem] border-none bg-white dark:bg-[#180F22] shadow-xl relative z-10">
          <CardHeader className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-100 dark:bg-white/5 shadow-inner border border-pink-200 dark:border-white/10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-linear-to-br from-pink-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Layers3 className="h-6 w-6 text-pink-600 dark:text-pink-400 relative z-10" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">{t('categoryDefinitions.catalogsTitle')}</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">{t('categoryDefinitions.catalogsDescription')}</CardDescription>
              </div>
            </div>

            <Button
              className="w-full h-11 bg-linear-to-r from-pink-600 to-orange-600 text-white font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_20px_-10px_rgba(219,39,119,0.5)] rounded-xl
              opacity-90 grayscale-[0] 
              dark:opacity-100 dark:grayscale-0"
              onClick={() => setIsCreateCatalogOpen(true)}
            >
              <CirclePlus className="mr-2 h-5 w-5" />
              {t('categoryDefinitions.actions.newCatalog')}
            </Button>

            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1E1627] p-4 text-sm text-slate-500 dark:text-slate-400">
              <div className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-xs mb-3">{t('categoryDefinitions.selectionTitle')}</div>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{t('categoryDefinitions.selectionCatalog')}</span>
                  <Badge variant={selectedCatalog ? 'default' : 'outline'} className={cn("rounded-lg", selectedCatalog ? "bg-pink-500/10 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400 border-none" : "")}>
                    {selectedCatalog ? t('categoryDefinitions.ready') : t('categoryDefinitions.pending')}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{t('categoryDefinitions.selectionCategory')}</span>
                  <Badge variant={selectedLeaf ? 'default' : 'outline'} className={cn("rounded-lg", selectedLeaf ? "bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 border-none" : "")}>
                    {selectedLeaf ? t('categoryDefinitions.ready') : t('categoryDefinitions.pending')}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {catalogs.map((catalog) => {
              const isActive = selectedCatalogId === catalog.id;
              const typeLabel = t(`categoryDefinitions.catalogTypes.${getCatalogTypeTranslationKey(catalog.catalogType)}`);

              return (
                <button
                  key={catalog.id}
                  type="button"
                  onClick={() => handleCatalogSelect(catalog.id)}
                  className={cn(
                    'relative w-full rounded-2xl border px-5 py-4 text-left transition-all duration-300 overflow-hidden group',
                    isActive
                      ? 'border-transparent bg-slate-50 dark:bg-[#1E1627] shadow-lg ring-1 ring-pink-500/30'
                      : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#130822] hover:border-pink-400/50 dark:hover:border-pink-500/50'
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-linear-to-b from-pink-500 to-orange-500" />
                  )}
                  <div className="flex items-start justify-between gap-3 relative z-10">
                    <div>
                      <div className={cn("font-bold text-base", isActive ? "text-pink-700 dark:text-pink-400" : "text-slate-800 dark:text-white")}>
                        {catalog.name}
                      </div>
                      <div className="mt-1 font-mono text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">
                        #{catalog.code}
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("rounded-lg border-slate-200 dark:border-white/10", isActive && "border-pink-200 dark:border-pink-500/30 text-pink-600 dark:text-pink-400")}>
                      {typeLabel}
                    </Badge>
                  </div>
                  <p className="mt-3 line-clamp-2 text-xs font-medium text-slate-500 dark:text-slate-400 relative z-10">
                    {catalog.description || t('categoryDefinitions.catalogDescriptionFallback')}
                  </p>
                </button>
              );
            })}

            {!catalogsQuery.isLoading && catalogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1E1627] p-6 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                {t('categoryDefinitions.noCatalogs')}
              </div>
            ) : null}

            {selectedCatalog ? (
              <div className="rounded-2xl border border-dashed border-pink-200 dark:border-pink-500/30 bg-pink-50/50 dark:bg-pink-500/5 p-4 text-sm font-medium text-pink-600 dark:text-pink-400">
                <Sparkles className="inline-block w-4 h-4 mr-2 mb-0.5" />
                {t('categoryDefinitions.catalogHelperText')}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[2rem] border-none bg-white dark:bg-[#180F22] shadow-xl relative z-10">
          <CardHeader className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-100 dark:bg-white/5 shadow-inner border border-pink-200 dark:border-white/10 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-linear-to-br from-pink-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <ListTree className="h-6 w-6 text-pink-600 dark:text-pink-400 relative z-10" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">{t('categoryDefinitions.treeTitle')}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-1">{t('categoryDefinitions.treeDescription')}</CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  className="bg-linear-to-r from-pink-600 to-orange-600 text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_5px_15px_-5px_rgba(219,39,119,0.5)] rounded-xl
                  opacity-90 grayscale-[0] 
                  dark:opacity-100 dark:grayscale-0"
                  size="sm"
                  onClick={() => setIsCreateCategoryOpen(true)}
                  disabled={!selectedCatalogId}
                >
                  <CirclePlus className="mr-2 h-4 w-4" />
                  {targetParent
                    ? t('categoryDefinitions.actions.addSubCategory')
                    : t('categoryDefinitions.actions.addRootCategory')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRootReset}
                  className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#130822] hover:bg-slate-50 dark:hover:bg-white/5 font-semibold"
                >
                  {t('categoryDefinitions.root')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void categoriesQuery.refetch()}
                  className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#130822] hover:bg-slate-50 dark:hover:bg-white/5 font-semibold"
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {t('common.refresh')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handlePreviewStockHierarchyImport()}
                  disabled={!selectedCatalogId || previewStockHierarchyImport.isPending}
                  className="rounded-xl border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100 dark:border-pink-500/30 dark:bg-pink-500/10 dark:text-pink-300 dark:hover:bg-pink-500/20 font-semibold"
                >
                  <WandSparkles className="mr-2 h-4 w-4" />
                  {t('categoryDefinitions.actions.importFromRiiStock')}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1E1627] p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#130822] px-3 py-1.5 shadow-sm">{t('categoryDefinitions.root')}</span>
                {currentPath.map((item) => (
                  <div key={item.catalogCategoryId} className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                    <span className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#130822] px-3 py-1.5 shadow-sm">{item.name}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-pink-500" />
                {t('categoryDefinitions.treeReorderHint')}
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {activeParent ? (
              <Button variant="ghost" size="sm" className="px-3 rounded-lg font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5" onClick={handleBack}>
                <ChevronRight className="mr-1 h-4 w-4 rotate-180" />
                {t('common.back')}
              </Button>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              {orderedCategories.map((node) => {
                const isSelected = selectedLeaf?.catalogCategoryId === node.catalogCategoryId;
                return (
                  <button
                    key={node.catalogCategoryId}
                    type="button"
                    draggable
                    onClick={() => handleCategoryClick(node)}
                    onDragStart={() => handleCategoryDragStart(node.catalogCategoryId)}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (dragOverCategoryId !== node.catalogCategoryId) {
                        setDragOverCategoryId(node.catalogCategoryId);
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      void handleCategoryDrop(node.catalogCategoryId);
                    }}
                    onDragEnd={() => {
                      setDraggedCategoryId(null);
                      setDragOverCategoryId(null);
                    }}
                    className={cn(
                      'relative w-full rounded-2xl border p-5 text-left transition-all duration-300 overflow-hidden group',
                      isSelected
                        ? 'border-transparent bg-slate-50 dark:bg-[#1E1627] shadow-lg ring-1 ring-pink-500/30'
                        : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#130822] hover:border-pink-400/50 dark:hover:border-pink-500/50',
                      draggedCategoryId === node.catalogCategoryId && 'opacity-50 scale-[0.98]',
                      dragOverCategoryId === node.catalogCategoryId && draggedCategoryId !== node.catalogCategoryId && 'ring-2 ring-pink-400/60 bg-pink-50/30 dark:bg-pink-500/10'
                    )}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-linear-to-b from-pink-500 to-orange-500" />
                    )}
                    <div className="flex items-start justify-between gap-3 relative z-10">
                      <div className="flex items-start gap-3">
                        <span className={cn("mt-1 flex items-center justify-center p-1 rounded-md cursor-grab active:cursor-grabbing", isSelected ? "text-pink-500 dark:text-pink-400 bg-pink-100 dark:bg-pink-500/20" : "text-slate-400 bg-slate-100 dark:bg-white/5")}>
                          <GripVertical className="h-4 w-4" />
                        </span>
                        <div>
                          <div className={cn("font-bold text-base", isSelected ? "text-pink-700 dark:text-pink-400" : "text-slate-800 dark:text-white")}>{node.name}</div>
                          <div className="mt-1 font-mono text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">#{node.code}</div>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            <span className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#130822] px-2.5 py-1">
                              {t('categoryDefinitions.treeLevelLabel', { level: node.level })}
                            </span>
                            {node.fullPath ? (
                              <span className="line-clamp-1 truncate max-w-[150px]" title={node.fullPath}>{node.fullPath}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("rounded-lg shrink-0 border-slate-200 dark:border-white/10", node.isLeaf ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20" : "")}>
                        {node.isLeaf ? t('categoryDefinitions.leaf') : t('categoryDefinitions.branch')}
                      </Badge>
                    </div>
                    {node.description ? (
                      <p className="mt-4 line-clamp-2 text-sm font-medium text-slate-500 dark:text-slate-400 relative z-10">{node.description}</p>
                    ) : null}
                    <div className="mt-5 flex items-center justify-between text-xs font-bold text-slate-400 dark:text-slate-500 relative z-10 group-hover:text-pink-500 transition-colors">
                      <span>
                        {node.isLeaf ? t('categoryDefinitions.selectLeafAction') : t('categoryDefinitions.openBranchAction')}
                      </span>
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </button>
                );
              })}
            </div>

            {!categoriesQuery.isLoading && categories.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1E1627] p-8 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                {t('categoryDefinitions.noCategories')}
              </div>
            ) : null}

            {!selectedCatalog ? (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1E1627] p-8 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                {t('categoryDefinitions.chooseCatalogFirst')}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[2rem] border-none bg-white dark:bg-[#180F22] shadow-xl relative z-10 flex flex-col h-full">
          <CardHeader className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-100 dark:bg-white/5 shadow-inner border border-pink-200 dark:border-white/10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-linear-to-br from-pink-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Package2 className="h-6 w-6 text-pink-600 dark:text-pink-400 relative z-10" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">{t('categoryDefinitions.stocksTitle')}</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">{t('categoryDefinitions.selectionDescription')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'summary' | 'stocks' | 'rules' | 'tips')} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 bg-slate-100 dark:bg-white/5 rounded-xl p-1 shadow-inner h-12">
                <TabsTrigger value="summary" className="rounded-lg data-[state=active]:bg-white data-[state=active]:dark:bg-[#1E1627] data-[state=active]:text-pink-600 data-[state=active]:dark:text-pink-400 data-[state=active]:shadow-sm font-semibold transition-all">{t('categoryDefinitions.tabs.summary')}</TabsTrigger>
                <TabsTrigger value="stocks" className="rounded-lg data-[state=active]:bg-white data-[state=active]:dark:bg-[#1E1627] data-[state=active]:text-pink-600 data-[state=active]:dark:text-pink-400 data-[state=active]:shadow-sm font-semibold transition-all">{t('categoryDefinitions.tabs.stocks')}</TabsTrigger>
                <TabsTrigger value="rules" className="rounded-lg data-[state=active]:bg-white data-[state=active]:dark:bg-[#1E1627] data-[state=active]:text-pink-600 data-[state=active]:dark:text-pink-400 data-[state=active]:shadow-sm font-semibold transition-all">{t('categoryDefinitions.tabs.rules')}</TabsTrigger>
                <TabsTrigger value="tips" className="rounded-lg data-[state=active]:bg-white data-[state=active]:dark:bg-[#1E1627] data-[state=active]:text-pink-600 data-[state=active]:dark:text-pink-400 data-[state=active]:shadow-sm font-semibold transition-all">{t('categoryDefinitions.tabs.tips')}</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                <Alert className="border-pink-200 dark:border-pink-500/30 bg-pink-50/80 dark:bg-pink-500/5 rounded-2xl shadow-sm">
                  <Sparkles className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  <AlertTitle className="font-bold text-pink-800 dark:text-pink-300">{t('categoryDefinitions.summaryGuideTitle')}</AlertTitle>
                  <AlertDescription className="text-pink-700/80 dark:text-pink-400/80 font-medium mt-1">{nextStepLabel}</AlertDescription>
                </Alert>

                <div className="grid gap-4">
                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1E1627] p-5 shadow-sm transition-all hover:border-pink-500/30 group">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 group-hover:text-pink-500 dark:group-hover:text-pink-400 transition-colors">
                      {t('categoryDefinitions.selectionCatalog')}
                    </div>
                    <div className="mt-2 text-lg font-bold text-slate-800 dark:text-white">
                      {selectedCatalog?.name || t('categoryDefinitions.selectionValueEmpty')}
                    </div>
                    <div className="mt-1 text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">{catalogTypeLabel}</div>
                    {selectedCatalog ? (
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm" className="rounded-lg border-slate-200 dark:border-white/10 bg-white dark:bg-[#130822] hover:bg-slate-50 dark:hover:bg-white/5 font-semibold" onClick={() => { setEditingCatalog(selectedCatalog); setIsCreateCatalogOpen(true); }}>
                          <Pencil className="mr-2 h-4 w-4 text-pink-500" />
                          {t('common.edit')}
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-lg border-slate-200 dark:border-white/10 bg-white dark:bg-[#130822] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 font-semibold" onClick={() => setCatalogToDelete(selectedCatalog)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('common.delete.action')}
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1E1627] p-5 shadow-sm transition-all hover:border-pink-500/30 group">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 group-hover:text-pink-500 dark:group-hover:text-pink-400 transition-colors">
                      {t('categoryDefinitions.selectionCurrentLevel')}
                    </div>
                    <div className="mt-2 text-lg font-bold text-slate-800 dark:text-white">
                      {activeParent?.name || t('categoryDefinitions.root')}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
                      <span className="text-pink-500 dark:text-pink-400">{t('categoryDefinitions.selectionPath')}:</span>
                      {currentPath.length > 0 ? currentPath.map((item) => item.name).join(' / ') : t('categoryDefinitions.root')}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1E1627] p-5 shadow-sm transition-all hover:border-pink-500/30 group">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 group-hover:text-pink-500 dark:group-hover:text-pink-400 transition-colors">
                      {t('categoryDefinitions.selectionCategory')}
                    </div>
                    <div className="mt-2 text-lg font-bold text-slate-800 dark:text-white">
                      {selectedLeaf?.name || t('categoryDefinitions.selectionValueEmpty')}
                    </div>
                    <div className="mt-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
                      <span className="text-pink-500 dark:text-pink-400 mr-1">{t('categoryDefinitions.selectionTotalStocks')}:</span>
                      {selectedLeaf ? (stocksQuery.data?.totalCount ?? 0) : 0}
                    </div>
                    {selectedLeaf ? (
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm" className="rounded-lg border-slate-200 dark:border-white/10 bg-white dark:bg-[#130822] hover:bg-slate-50 dark:hover:bg-white/5 font-semibold" onClick={() => { setEditingCategory(selectedLeaf); setIsCreateCategoryOpen(true); }}>
                          <Pencil className="mr-2 h-4 w-4 text-pink-500" />
                          {t('common.edit')}
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-lg border-slate-200 dark:border-white/10 bg-white dark:bg-[#130822] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 font-semibold" onClick={() => setCategoryToDelete(selectedLeaf)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('common.delete.action')}
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/20 p-5 mt-2 bg-slate-50/50 dark:bg-[#1E1627]/50">
                    <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                      <GitBranchPlus className="h-5 w-5 text-pink-500" />
                      {t('categoryDefinitions.nextStepTitle')}
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">{nextStepLabel}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedCatalog && !selectedLeaf ? (
                        <Button className="bg-linear-to-r from-pink-600 to-orange-600 text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_5px_15px_-5px_rgba(219,39,119,0.5)] rounded-xl
                        opacity-90 grayscale-[0] 
                        dark:opacity-100 dark:grayscale-0" size="sm" onClick={() => setIsCreateCategoryOpen(true)}>
                          <CirclePlus className="mr-2 h-4 w-4" />
                          {targetParent
                            ? t('categoryDefinitions.actions.addSubCategory')
                            : t('categoryDefinitions.actions.addRootCategory')}
                        </Button>
                      ) : null}

                      {selectedLeaf ? (
                        <>
                          <Button className="bg-linear-to-r from-pink-600 to-orange-600 text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_5px_15px_-5px_rgba(219,39,119,0.5)] rounded-xl" size="sm" onClick={() => { setActiveTab('stocks'); setIsProductSelectOpen(true); }}>
                            <CirclePlus className="mr-2 h-4 w-4" />
                            {t('categoryDefinitions.actions.addStock')}
                          </Button>
                          <Button variant="outline" size="sm" className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#130822] hover:bg-slate-50 dark:hover:bg-white/5 font-semibold" onClick={() => { setActiveTab('rules'); setIsRuleDialogOpen(true); }}>
                            <CirclePlus className="mr-2 h-4 w-4" />
                            {t('categoryDefinitions.actions.addRule')}
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="stocks" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                <Alert className="border-pink-200 dark:border-pink-500/30 bg-pink-50/80 dark:bg-pink-500/5 rounded-2xl shadow-sm">
                  <Package2 className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  <AlertTitle className="font-bold text-pink-800 dark:text-pink-300">{t('categoryDefinitions.stocksGuideTitle')}</AlertTitle>
                  <AlertDescription className="text-pink-700/80 dark:text-pink-400/80 font-medium mt-1">{t('categoryDefinitions.stocksGuideDescription')}</AlertDescription>
                </Alert>

                <div className="flex items-center gap-2">
                  <Button
                    className="bg-linear-to-r from-pink-600 to-orange-600 text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_5px_15px_-5px_rgba(219,39,119,0.5)] rounded-xl h-11 px-6 opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
                    onClick={() => setIsProductSelectOpen(true)}
                    disabled={!selectedLeaf}
                  >
                    <CirclePlus className="mr-2 h-5 w-5" />
                    {t('categoryDefinitions.actions.addStock')}
                  </Button>
                </div>

                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-pink-500 transition-colors" />
                  <Input
                    value={stockSearch}
                    onChange={(event) => setStockSearch(event.target.value)}
                    placeholder={t('categoryDefinitions.stockSearchPlaceholder')}
                    className="pl-12 h-12 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1E1627] focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50 transition-all font-medium"
                    disabled={!selectedLeaf}
                  />
                </div>

                {!selectedLeaf ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1E1627] p-8 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                    {t('categoryDefinitions.selectLeafHint')}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-dashed border-pink-200 dark:border-pink-500/30 bg-pink-50/50 dark:bg-pink-500/5 p-4 text-sm font-medium text-pink-600 dark:text-pink-400 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      {t('categoryDefinitions.stocksHelperText')}
                    </div>

                    <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {t('categoryDefinitions.stocksDescriptionSelected', { category: selectedLeaf.name })}
                    </div>

                    <div className="space-y-3">
                      {(stocksQuery.data?.data ?? []).map((stock) => (
                        <div key={stock.stockId} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#1E1627] shadow-sm hover:border-pink-500/30 transition-all">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="font-bold text-base text-slate-800 dark:text-white">{stock.stockName}</div>
                              <div className="mt-1 font-mono text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">#{stock.erpStockCode}</div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {stock.isPrimaryCategory ? (
                                <span className="rounded-lg border border-pink-200 bg-pink-50 px-2.5 py-1 text-[11px] font-bold text-pink-600 dark:border-pink-500/30 dark:bg-pink-500/10 dark:text-pink-400 shadow-sm">
                                  {t('categoryDefinitions.primaryBadge')}
                                </span>
                              ) : null}
                              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg" onClick={() => setStockAssignmentToDelete(stock.stockCategoryId)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-medium text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-white/5 pt-4">
                            <div className="flex items-center gap-1.5"><span className="text-slate-400 dark:text-slate-500">{t('categoryDefinitions.meta.group')}:</span> <span className="text-slate-700 dark:text-slate-300">{[stock.grupKodu, stock.grupAdi].filter(Boolean).join(' - ') || '-'}</span></div>
                            <div className="flex items-center gap-1.5"><span className="text-slate-400 dark:text-slate-500">{t('categoryDefinitions.meta.code1')}:</span> <span className="text-slate-700 dark:text-slate-300">{[stock.kod1, stock.kod1Adi].filter(Boolean).join(' - ') || '-'}</span></div>
                            <div className="flex items-center gap-1.5"><span className="text-slate-400 dark:text-slate-500">{t('categoryDefinitions.meta.code2')}:</span> <span className="text-slate-700 dark:text-slate-300">{[stock.kod2, stock.kod2Adi].filter(Boolean).join(' - ') || '-'}</span></div>
                            <div className="flex items-center gap-1.5"><span className="text-slate-400 dark:text-slate-500">{t('categoryDefinitions.meta.code3')}:</span> <span className="text-slate-700 dark:text-slate-300">{[stock.kod3, stock.kod3Adi].filter(Boolean).join(' - ') || '-'}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {!stocksQuery.isLoading && (stocksQuery.data?.data?.length ?? 0) === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1E1627] p-8 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                        {t('categoryDefinitions.noStocks')}
                      </div>
                    ) : null}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="rules" className="space-y-4">
                <Alert className="border-slate-200/80 bg-slate-50/80 dark:border-white/10 dark:bg-white/5">
                  <WandSparkles className="h-4 w-4" />
                  <AlertTitle>{t('categoryDefinitions.rulesGuideTitle')}</AlertTitle>
                  <AlertDescription>{t('categoryDefinitions.rulesGuideDescription')}</AlertDescription>
                </Alert>

                <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3">
                  <Button
                    onClick={() => setIsRuleDialogOpen(true)}
                    disabled={!selectedLeaf}
                    className="rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_5px_15px_-5px_rgba(219,39,119,0.5)] disabled:opacity-90 disabled:grayscale-[0] disabled:hover:scale-100 px-8 h-11"
                  >
                    <CirclePlus className="mr-2 h-5 w-5" />
                    {t('categoryDefinitions.actions.addRule')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void handlePreviewRules()}
                    disabled={!selectedLeaf || (rulesQuery.data?.length ?? 0) === 0 || previewCategoryRules.isPending}
                    className="w-full sm:w-auto h-11 rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#130822] hover:bg-slate-50 dark:hover:bg-white/5 font-semibold px-6 shadow-sm"
                  >
                    <Search className="mr-2 h-4 w-4" />
                    {previewCategoryRules.isPending
                      ? t('categoryDefinitions.actions.previewingRules')
                      : t('categoryDefinitions.actions.previewRules')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void handleApplyRules()}
                    disabled={!selectedLeaf || (rulesQuery.data?.length ?? 0) === 0 || applyCategoryRules.isPending}
                    className="w-full sm:w-auto h-11 rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#130822] hover:bg-slate-50 dark:hover:bg-white/5 font-semibold px-6 shadow-sm"
                  >
                    <WandSparkles className="mr-2 h-4 w-4" />
                    {applyCategoryRules.isPending
                      ? t('categoryDefinitions.actions.applyingRules')
                      : t('categoryDefinitions.actions.applyRules')}
                  </Button>
                </div>

                {!selectedLeaf ? (
                  <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                    {t('categoryDefinitions.selectLeafHint')}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                      {t('categoryDefinitions.rulesHelperText')}
                    </div>

                    {lastRulePreviewResult ? (
                      <Alert className="border-slate-200/80 bg-slate-50/80 dark:border-white/10 dark:bg-white/5">
                        <Search className="h-4 w-4" />
                        <AlertTitle>{t('categoryDefinitions.rulePreviewSummaryTitle')}</AlertTitle>
                        <AlertDescription className="mt-2 space-y-4">
                          <div className="grid gap-2 text-sm md:grid-cols-2">
                            <div>{t('categoryDefinitions.rulePreviewSummary.matched', { count: lastRulePreviewResult.matchedStockCount })}</div>
                            <div>{t('categoryDefinitions.rulePreviewSummary.created', { count: lastRulePreviewResult.createdAssignmentCount })}</div>
                            <div>{t('categoryDefinitions.rulePreviewSummary.updated', { count: lastRulePreviewResult.updatedAssignmentCount })}</div>
                            <div>{t('categoryDefinitions.rulePreviewSummary.skipped', { count: lastRulePreviewResult.skippedManualAssignmentCount })}</div>
                          </div>

                          <div className="space-y-2">
                            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              {t('categoryDefinitions.rulePreviewListTitle')}
                            </div>
                            {lastRulePreviewResult.previewItems.length > 0 ? (
                              <div className="space-y-2">
                                {lastRulePreviewResult.previewItems.map((item) => (
                                  <div key={`${item.stockId}-${item.actionType}`} className="rounded-xl border bg-white/80 p-3 text-sm dark:border-white/10 dark:bg-white/5">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <div className="font-medium">{item.stockName}</div>
                                        <div className="mt-1 text-xs text-muted-foreground">{item.erpStockCode}</div>
                                      </div>
                                      <Badge variant="outline">
                                        {t(`categoryDefinitions.rulePreviewActions.${getRulePreviewActionLabel(item.actionType)}`)}
                                      </Badge>
                                    </div>
                                    <div className="mt-2 text-xs text-muted-foreground">
                                      {t('categoryDefinitions.rulePreviewMatchedRule', {
                                        rule: item.matchedRuleName,
                                        priority: item.priority,
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                                {t('categoryDefinitions.rulePreviewListEmpty')}
                              </div>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    {lastRuleApplyResult ? (
                      <Alert className="border-slate-200/80 bg-slate-50/80 dark:border-white/10 dark:bg-white/5">
                        <WandSparkles className="h-4 w-4" />
                        <AlertTitle>{t('categoryDefinitions.ruleApplySummaryTitle')}</AlertTitle>
                        <AlertDescription className="mt-2 grid gap-2 text-sm md:grid-cols-2">
                          <div>{t('categoryDefinitions.ruleApplySummary.matched', { count: lastRuleApplyResult.matchedStockCount })}</div>
                          <div>{t('categoryDefinitions.ruleApplySummary.created', { count: lastRuleApplyResult.createdAssignmentCount })}</div>
                          <div>{t('categoryDefinitions.ruleApplySummary.updated', { count: lastRuleApplyResult.updatedAssignmentCount })}</div>
                          <div>{t('categoryDefinitions.ruleApplySummary.skipped', { count: lastRuleApplyResult.skippedManualAssignmentCount })}</div>
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    {(rulesQuery.data ?? []).map((rule) => (
                      <div key={rule.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="font-medium">{rule.ruleName}</div>
                              <span className="rounded-full border px-2 py-1 text-[11px] text-muted-foreground">
                                {t('categoryDefinitions.rulePriority', { priority: rule.priority })}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {rule.ruleCode || '-'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => { setEditingRule(rule); setIsRuleDialogOpen(true); }}>
                              <Pencil className="mr-2 h-4 w-4" />
                              {t('common.edit')}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setRuleToDelete(rule)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t('common.delete.action')}
                            </Button>
                          </div>
                        </div>

                        <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium text-foreground">{t('categoryDefinitions.form.stockAttribute')}:</span>{' '}
                            {t(`categoryDefinitions.ruleAttributes.${getRuleAttributeLabel(rule.stockAttributeType)}`)}
                          </div>
                          <div>
                            <span className="font-medium text-foreground">{t('categoryDefinitions.form.operator')}:</span>{' '}
                            {t(`categoryDefinitions.ruleOperators.${getRuleOperatorLabel(rule.operatorType)}`)}
                          </div>
                          <div>
                            <span className="font-medium text-foreground">{t('categoryDefinitions.form.ruleValue')}:</span>{' '}
                            {rule.value}
                          </div>
                        </div>
                      </div>
                    ))}

                    {!rulesQuery.isLoading && (rulesQuery.data?.length ?? 0) === 0 ? (
                      <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                        {t('categoryDefinitions.noRules')}
                      </div>
                    ) : null}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="tips" className="space-y-3">
                <div className="rounded-2xl border p-4">
                  <div className="font-medium">{t('categoryDefinitions.tips.catalogTitle')}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{t('categoryDefinitions.tips.catalogDescription')}</p>
                </div>
                <div className="rounded-2xl border p-4">
                  <div className="font-medium">{t('categoryDefinitions.tips.branchTitle')}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{t('categoryDefinitions.tips.branchDescription')}</p>
                </div>
                <div className="rounded-2xl border p-4">
                  <div className="font-medium">{t('categoryDefinitions.tips.leafTitle')}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{t('categoryDefinitions.tips.leafDescription')}</p>
                </div>
                <div className="rounded-2xl border p-4">
                  <div className="font-medium">{t('categoryDefinitions.tips.exampleTitle')}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{t('categoryDefinitions.tips.exampleDescription')}</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <CreateCatalogDialog
        open={isCreateCatalogOpen}
        onOpenChange={(open) => {
          setIsCreateCatalogOpen(open);
          if (!open) setEditingCatalog(null);
        }}
        onSubmit={handleCreateCatalog}
        isLoading={createCatalog.isPending || updateCatalog.isPending}
        initialData={editingCatalog}
      />

      <CreateCategoryDialog
        open={isCreateCategoryOpen}
        onOpenChange={(open) => {
          setIsCreateCategoryOpen(open);
          if (!open) setEditingCategory(null);
        }}
        onSubmit={handleCreateCategory}
        isLoading={createCatalogCategory.isPending || updateCatalogCategory.isPending}
        targetLabel={editingCategory?.name || targetParent?.name || t('categoryDefinitions.root')}
        parentCatalogCategoryId={editingCategory?.parentCatalogCategoryId ?? targetParent?.catalogCategoryId ?? null}
        initialData={editingCategory}
      />

      <AlertDialog open={isStockHierarchyDialogOpen} onOpenChange={(open) => {
        setIsStockHierarchyDialogOpen(open);
        if (!open) setStockHierarchyPreviewResult(null);
      }}>
        <AlertDialogContent className="max-w-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <WandSparkles className="h-5 w-5 text-pink-600" />
              {t('categoryDefinitions.stockHierarchyImport.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('categoryDefinitions.stockHierarchyImport.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-5">
            <div className="grid gap-3 rounded-2xl border bg-slate-50/70 p-4 text-sm dark:border-white/10 dark:bg-white/5 md:grid-cols-2">
              {(['includeCode1', 'includeCode2', 'includeCode3', 'assignStocks'] as const).map((field) => (
                <label key={field} className="flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-3 dark:border-white/10 dark:bg-[#130822]">
                  <Checkbox
                    checked={stockHierarchyOptions[field]}
                    onCheckedChange={(checked) => {
                      setStockHierarchyOptions((prev) => ({
                        ...prev,
                        [field]: checked === true,
                      }));
                      setStockHierarchyPreviewResult(null);
                    }}
                  />
                  <span>
                    <span className="block font-semibold text-foreground">
                      {t(`categoryDefinitions.stockHierarchyImport.options.${field}.title`)}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {t(`categoryDefinitions.stockHierarchyImport.options.${field}.description`)}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            <Button
              variant="outline"
              className="w-full rounded-xl font-semibold"
              onClick={() => void handlePreviewStockHierarchyImport()}
              disabled={previewStockHierarchyImport.isPending}
            >
              <Search className="mr-2 h-4 w-4" />
              {previewStockHierarchyImport.isPending
                ? t('categoryDefinitions.actions.previewingStockHierarchy')
                : t('categoryDefinitions.actions.refreshStockHierarchyPreview')}
            </Button>

            {stockHierarchyPreviewResult ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border bg-white p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="text-xs font-bold uppercase text-muted-foreground">{t('categoryDefinitions.stockHierarchyImport.preview.sourceStock')}</div>
                    <div className="mt-2 text-2xl font-black">{stockHierarchyPreviewResult.sourceStockCount}</div>
                  </div>
                  <div className="rounded-2xl border bg-white p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="text-xs font-bold uppercase text-muted-foreground">{t('categoryDefinitions.stockHierarchyImport.preview.category')}</div>
                    <div className="mt-2 text-2xl font-black">{stockHierarchyPreviewResult.categoryCount}</div>
                  </div>
                  <div className="rounded-2xl border bg-white p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="text-xs font-bold uppercase text-muted-foreground">{t('categoryDefinitions.stockHierarchyImport.preview.newCategory')}</div>
                    <div className="mt-2 text-2xl font-black">{stockHierarchyPreviewResult.newCategoryCount}</div>
                  </div>
                  <div className="rounded-2xl border bg-white p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="text-xs font-bold uppercase text-muted-foreground">{t('categoryDefinitions.stockHierarchyImport.preview.newStockAssignment')}</div>
                    <div className="mt-2 text-2xl font-black">{stockHierarchyPreviewResult.newStockAssignmentCount}</div>
                  </div>
                </div>

                <div className="grid gap-2 text-sm md:grid-cols-4">
                  <Badge variant="outline">{t('categoryDefinitions.stockHierarchyImport.preview.group', { count: stockHierarchyPreviewResult.groupCount })}</Badge>
                  <Badge variant="outline">{t('categoryDefinitions.stockHierarchyImport.preview.code1', { count: stockHierarchyPreviewResult.code1Count })}</Badge>
                  <Badge variant="outline">{t('categoryDefinitions.stockHierarchyImport.preview.code2', { count: stockHierarchyPreviewResult.code2Count })}</Badge>
                  <Badge variant="outline">{t('categoryDefinitions.stockHierarchyImport.preview.code3', { count: stockHierarchyPreviewResult.code3Count })}</Badge>
                </div>

                <div className="rounded-2xl border border-dashed p-4 dark:border-white/10">
                  <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t('categoryDefinitions.stockHierarchyImport.preview.samples')}
                  </div>
                  <div className="mt-3 space-y-2">
                    {stockHierarchyPreviewResult.samples.map((sample) => (
                      <div key={sample.stockId} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/5">
                        <div className="font-semibold">{sample.path}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{sample.erpStockCode} · {sample.stockName}</div>
                      </div>
                    ))}
                    {stockHierarchyPreviewResult.samples.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        {t('categoryDefinitions.stockHierarchyImport.preview.noSamples')}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleApplyStockHierarchyImport()}
              disabled={!stockHierarchyPreviewResult || applyStockHierarchyImport.isPending}
            >
              {applyStockHierarchyImport.isPending
                ? t('categoryDefinitions.actions.applyingStockHierarchy')
                : t('categoryDefinitions.actions.applyStockHierarchy')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={catalogToDelete != null} onOpenChange={(open) => !open && setCatalogToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('categoryDefinitions.deleteCatalogConfirm', { name: catalogToDelete?.name ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeleteCatalog()} disabled={deleteCatalog.isPending}>
              {deleteCatalog.isPending ? t('common.deleting') : t('common.delete.action')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={categoryToDelete != null} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('categoryDefinitions.deleteCategoryConfirm', { name: categoryToDelete?.name ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeleteCategory()} disabled={deleteCatalogCategory.isPending}>
              {deleteCatalogCategory.isPending ? t('common.deleting') : t('common.delete.action')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={stockAssignmentToDelete != null} onOpenChange={(open) => !open && setStockAssignmentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('categoryDefinitions.deleteStockConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeleteStockAssignment()} disabled={deleteStockCategoryAssignment.isPending}>
              {deleteStockCategoryAssignment.isPending ? t('common.deleting') : t('common.delete.action')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProductSelectDialog
        open={isProductSelectOpen}
        onOpenChange={setIsProductSelectOpen}
        onSelect={handleStockSelect}
      />

      <CategoryRuleDialog
        open={isRuleDialogOpen}
        onOpenChange={(open) => {
          setIsRuleDialogOpen(open);
          if (!open) setEditingRule(null);
        }}
        onSubmit={handleRuleSubmit}
        isLoading={createCategoryRule.isPending || updateCategoryRule.isPending}
        initialData={editingRule}
        categoryName={selectedLeaf?.name ?? null}
        catalogId={selectedCatalog?.id ?? null}
        catalogCategoryId={selectedLeaf?.catalogCategoryId ?? null}
      />

      <AlertDialog open={ruleToDelete != null} onOpenChange={(open) => !open && setRuleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('categoryDefinitions.deleteRuleConfirm', { name: ruleToDelete?.ruleName ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeleteRule()} disabled={deleteCategoryRule.isPending}>
              {deleteCategoryRule.isPending ? t('common.deleting') : t('common.delete.action')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function getRuleAttributeLabel(value: number): string {
  switch (value) {
    case 1: return 'groupCode';
    case 2: return 'groupName';
    case 3: return 'code1';
    case 4: return 'code1Name';
    case 5: return 'code2';
    case 6: return 'code2Name';
    case 7: return 'code3';
    case 8: return 'code3Name';
    case 9: return 'code4';
    case 10: return 'code4Name';
    case 11: return 'code5';
    case 12: return 'code5Name';
    case 13: return 'manufacturerCode';
    case 14: return 'erpStockCode';
    default: return 'stockName';
  }
}

function getRuleOperatorLabel(value: number): string {
  switch (value) {
    case 1: return 'equals';
    case 2: return 'contains';
    case 3: return 'startsWith';
    case 4: return 'endsWith';
    default: return 'inList';
  }
}

function getRulePreviewActionLabel(value: number): string {
  switch (value) {
    case 1: return 'create';
    case 2: return 'update';
    default: return 'skip';
  }
}
