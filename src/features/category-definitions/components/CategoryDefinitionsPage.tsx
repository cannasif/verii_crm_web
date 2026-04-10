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
import type { CatalogCategoryNodeDto, ProductCatalogDto } from '../types/category-definition-types';
import type { CatalogCategoryCreateDto, CatalogCategoryUpdateDto, CategoryRuleApplyResultDto, CategoryRulePreviewResultDto, ProductCatalogCreateDto, ProductCatalogUpdateDto, ProductCategoryRuleCreateDto, ProductCategoryRuleDto, ProductCategoryRuleUpdateDto } from '../types/category-definition-types';
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
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              1. {t('categoryDefinitions.stepCatalogTitle')}
            </div>
            <p className="mt-1 text-sm">{t('categoryDefinitions.stepCatalogDescription')}</p>
          </div>
          <div className="rounded-xl border bg-white/80 p-3 dark:border-white/10 dark:bg-white/5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              2. {t('categoryDefinitions.stepTreeTitle')}
            </div>
            <p className="mt-1 text-sm">{t('categoryDefinitions.stepTreeDescription')}</p>
          </div>
          <div className="rounded-xl border bg-white/80 p-3 dark:border-white/10 dark:bg-white/5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              3. {t('categoryDefinitions.stepStocksTitle')}
            </div>
            <p className="mt-1 text-sm">{t('categoryDefinitions.stepStocksDescription')}</p>
          </div>
        </AlertDescription>
      </Alert>

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
        <Card className="border-slate-200/70 dark:border-white/10">
          <CardHeader className="space-y-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
              <Layers3 className="h-4 w-4" />
              {t('categoryDefinitions.catalogsTitle')}
            </CardTitle>
              <CardDescription>{t('categoryDefinitions.catalogsDescription')}</CardDescription>
            </div>
            <Button className="w-full" onClick={() => setIsCreateCatalogOpen(true)}>
              <CirclePlus className="mr-2 h-4 w-4" />
              {t('categoryDefinitions.actions.newCatalog')}
            </Button>

            <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">{t('categoryDefinitions.selectionTitle')}</div>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span>{t('categoryDefinitions.selectionCatalog')}</span>
                  <Badge variant={selectedCatalog ? 'default' : 'outline'}>
                    {selectedCatalog ? t('categoryDefinitions.ready') : t('categoryDefinitions.pending')}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>{t('categoryDefinitions.selectionCategory')}</span>
                  <Badge variant={selectedLeaf ? 'default' : 'outline'}>
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
                    'w-full rounded-2xl border px-4 py-4 text-left transition-all',
                    isActive
                      ? 'border-pink-500/50 bg-pink-50 text-pink-700 shadow-sm dark:border-pink-500/40 dark:bg-pink-500/10 dark:text-pink-200'
                      : 'border-slate-200 bg-white hover:border-pink-300 hover:bg-pink-50/50 dark:border-white/10 dark:bg-white/5 dark:hover:border-pink-500/30 dark:hover:bg-pink-500/10'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{catalog.name}</div>
                      <div className="mt-1 text-xs opacity-75">{catalog.code}</div>
                    </div>
                    <Badge variant={isActive ? 'default' : 'outline'}>{typeLabel}</Badge>
                  </div>
                  <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                    {catalog.description || t('categoryDefinitions.catalogDescriptionFallback')}
                  </p>
                </button>
              );
            })}

            {!catalogsQuery.isLoading && catalogs.length === 0 ? (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                {t('categoryDefinitions.noCatalogs')}
              </div>
            ) : null}

            {selectedCatalog ? (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                {t('categoryDefinitions.catalogHelperText')}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 dark:border-white/10">
          <CardHeader className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ListTree className="h-4 w-4" />
                  {t('categoryDefinitions.treeTitle')}
                </CardTitle>
                <CardDescription>{t('categoryDefinitions.treeDescription')}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateCategoryOpen(true)}
                  disabled={!selectedCatalogId}
                >
                  <CirclePlus className="mr-2 h-4 w-4" />
                  {targetParent
                    ? t('categoryDefinitions.actions.addSubCategory')
                    : t('categoryDefinitions.actions.addRootCategory')}
                </Button>
                <Button variant="outline" size="sm" onClick={handleRootReset}>
                  {t('categoryDefinitions.root')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => void categoriesQuery.refetch()}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {t('common.refresh')}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border px-3 py-1">{t('categoryDefinitions.root')}</span>
              {currentPath.map((item) => (
                <div key={item.catalogCategoryId} className="flex items-center gap-2">
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="rounded-full border px-3 py-1">{item.name}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{t('categoryDefinitions.treeReorderHint')}</p>
          </CardHeader>

          <CardContent className="space-y-4">
            {activeParent ? (
              <Button variant="ghost" size="sm" className="px-0" onClick={handleBack}>
                {t('common.back')}
              </Button>
            ) : null}

              <div className="grid gap-3 md:grid-cols-2">
              {orderedCategories.map((node) => (
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
                    'rounded-2xl border p-4 text-left transition-colors',
                    selectedLeaf?.catalogCategoryId === node.catalogCategoryId
                      ? 'border-pink-500/50 bg-pink-50 dark:border-pink-500/40 dark:bg-pink-500/10'
                      : 'border-slate-200 bg-white hover:border-pink-300 hover:bg-pink-50/50 dark:border-white/10 dark:bg-white/5 dark:hover:border-pink-500/30 dark:hover:bg-pink-500/10',
                    draggedCategoryId === node.catalogCategoryId && 'opacity-60',
                    dragOverCategoryId === node.catalogCategoryId && draggedCategoryId !== node.catalogCategoryId && 'ring-2 ring-pink-400/60'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-muted-foreground">
                        <GripVertical className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="font-medium">{node.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{node.code}</div>
                      </div>
                    </div>
                    <Badge variant={node.isLeaf ? 'secondary' : 'outline'}>
                      {node.isLeaf ? t('categoryDefinitions.leaf') : t('categoryDefinitions.branch')}
                    </Badge>
                  </div>
                  {node.description ? (
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{node.description}</p>
                  ) : null}
                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {node.isLeaf ? t('categoryDefinitions.selectLeafAction') : t('categoryDefinitions.openBranchAction')}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </button>
              ))}
            </div>

            {!categoriesQuery.isLoading && categories.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                {t('categoryDefinitions.noCategories')}
              </div>
            ) : null}

            {!selectedCatalog ? (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                {t('categoryDefinitions.chooseCatalogFirst')}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 dark:border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package2 className="h-4 w-4" />
              {t('categoryDefinitions.stocksTitle')}
            </CardTitle>
            <CardDescription>{t('categoryDefinitions.selectionDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'summary' | 'stocks' | 'rules' | 'tips')} className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="summary">{t('categoryDefinitions.tabs.summary')}</TabsTrigger>
                <TabsTrigger value="stocks">{t('categoryDefinitions.tabs.stocks')}</TabsTrigger>
                <TabsTrigger value="rules">{t('categoryDefinitions.tabs.rules')}</TabsTrigger>
                <TabsTrigger value="tips">{t('categoryDefinitions.tabs.tips')}</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
                <Alert className="border-slate-200/80 bg-slate-50/80 dark:border-white/10 dark:bg-white/5">
                  <Sparkles className="h-4 w-4" />
                  <AlertTitle>{t('categoryDefinitions.summaryGuideTitle')}</AlertTitle>
                  <AlertDescription>{nextStepLabel}</AlertDescription>
                </Alert>

                <div className="grid gap-3">
                  <div className="rounded-2xl border p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t('categoryDefinitions.selectionCatalog')}
                    </div>
                  <div className="mt-1 font-medium">
                      {selectedCatalog?.name || t('categoryDefinitions.selectionValueEmpty')}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{catalogTypeLabel}</div>
                    {selectedCatalog ? (
                      <div className="mt-3 flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setEditingCatalog(selectedCatalog); setIsCreateCatalogOpen(true); }}>
                          <Pencil className="mr-2 h-4 w-4" />
                          {t('common.edit')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setCatalogToDelete(selectedCatalog)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('common.delete.action')}
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t('categoryDefinitions.selectionCurrentLevel')}
                    </div>
                    <div className="mt-1 font-medium">
                      {activeParent?.name || t('categoryDefinitions.root')}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t('categoryDefinitions.selectionPath')}: {currentPath.map((item) => item.name).join(' / ') || t('categoryDefinitions.root')}
                    </div>
                  </div>

                  <div className="rounded-2xl border p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t('categoryDefinitions.selectionCategory')}
                    </div>
                    <div className="mt-1 font-medium">
                      {selectedLeaf?.name || t('categoryDefinitions.selectionValueEmpty')}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t('categoryDefinitions.selectionTotalStocks')}: {selectedLeaf ? (stocksQuery.data?.totalCount ?? 0) : 0}
                    </div>
                    {selectedLeaf ? (
                      <div className="mt-3 flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setEditingCategory(selectedLeaf); setIsCreateCategoryOpen(true); }}>
                          <Pencil className="mr-2 h-4 w-4" />
                          {t('common.edit')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setCategoryToDelete(selectedLeaf)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('common.delete.action')}
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-dashed p-4">
                    <div className="flex items-center gap-2 font-medium">
                      <GitBranchPlus className="h-4 w-4" />
                      {t('categoryDefinitions.nextStepTitle')}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{nextStepLabel}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedCatalog && !selectedLeaf ? (
                        <Button variant="outline" size="sm" onClick={() => setIsCreateCategoryOpen(true)}>
                          <CirclePlus className="mr-2 h-4 w-4" />
                          {targetParent
                            ? t('categoryDefinitions.actions.addSubCategory')
                            : t('categoryDefinitions.actions.addRootCategory')}
                        </Button>
                      ) : null}

                      {selectedLeaf ? (
                        <>
                          <Button size="sm" onClick={() => { setActiveTab('stocks'); setIsProductSelectOpen(true); }}>
                            <CirclePlus className="mr-2 h-4 w-4" />
                            {t('categoryDefinitions.actions.addStock')}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => { setActiveTab('rules'); setIsRuleDialogOpen(true); }}>
                            <CirclePlus className="mr-2 h-4 w-4" />
                            {t('categoryDefinitions.actions.addRule')}
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="stocks" className="space-y-4">
                <Alert className="border-slate-200/80 bg-slate-50/80 dark:border-white/10 dark:bg-white/5">
                  <Package2 className="h-4 w-4" />
                  <AlertTitle>{t('categoryDefinitions.stocksGuideTitle')}</AlertTitle>
                  <AlertDescription>{t('categoryDefinitions.stocksGuideDescription')}</AlertDescription>
                </Alert>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setIsProductSelectOpen(true)}
                    disabled={!selectedLeaf}
                  >
                    <CirclePlus className="mr-2 h-4 w-4" />
                    {t('categoryDefinitions.actions.addStock')}
                  </Button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={stockSearch}
                    onChange={(event) => setStockSearch(event.target.value)}
                    placeholder={t('categoryDefinitions.stockSearchPlaceholder')}
                    className="pl-10"
                    disabled={!selectedLeaf}
                  />
                </div>

                {!selectedLeaf ? (
                  <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                    {t('categoryDefinitions.selectLeafHint')}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                      {t('categoryDefinitions.stocksHelperText')}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      {t('categoryDefinitions.stocksDescriptionSelected', { category: selectedLeaf.name })}
                    </div>

                    {(stocksQuery.data?.data ?? []).map((stock) => (
                      <div key={stock.stockId} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{stock.stockName}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{stock.erpStockCode}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {stock.isPrimaryCategory ? (
                              <span className="rounded-full border px-2 py-1 text-[11px] text-pink-600 dark:text-pink-300">
                                {t('categoryDefinitions.primaryBadge')}
                              </span>
                            ) : null}
                            <Button variant="outline" size="sm" onClick={() => setStockAssignmentToDelete(stock.stockCategoryId)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t('categoryDefinitions.actions.removeStock')}
                            </Button>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                          <div>{t('categoryDefinitions.meta.group')}: {[stock.grupKodu, stock.grupAdi].filter(Boolean).join(' - ') || '-'}</div>
                          <div>{t('categoryDefinitions.meta.code1')}: {[stock.kod1, stock.kod1Adi].filter(Boolean).join(' - ') || '-'}</div>
                          <div>{t('categoryDefinitions.meta.code2')}: {[stock.kod2, stock.kod2Adi].filter(Boolean).join(' - ') || '-'}</div>
                          <div>{t('categoryDefinitions.meta.code3')}: {[stock.kod3, stock.kod3Adi].filter(Boolean).join(' - ') || '-'}</div>
                        </div>
                      </div>
                    ))}

                    {!stocksQuery.isLoading && (stocksQuery.data?.data?.length ?? 0) === 0 ? (
                      <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
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

                <div className="flex items-center gap-2">
                  <Button onClick={() => setIsRuleDialogOpen(true)} disabled={!selectedLeaf}>
                    <CirclePlus className="mr-2 h-4 w-4" />
                    {t('categoryDefinitions.actions.addRule')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void handlePreviewRules()}
                    disabled={!selectedLeaf || (rulesQuery.data?.length ?? 0) === 0 || previewCategoryRules.isPending}
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
