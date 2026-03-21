import type { ReactElement } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { ReportWidget } from '../types';
import { cn } from '@/lib/utils';

function getWidgetWidthClass(size?: ReportWidget['size']): string {
  if (size === 'full') return 'md:col-span-3';
  if (size === 'half') return 'md:col-span-2';
  return 'md:col-span-1';
}

function getWidgetHeightClass(height?: ReportWidget['height']): string {
  if (height === 'lg') return 'min-h-[260px]';
  if (height === 'sm') return 'min-h-[150px]';
  return 'min-h-[200px]';
}

interface DashboardLayoutPreviewProps {
  widgets: ReportWidget[];
  activeWidgetId?: string;
  onSelect?: (widgetId: string) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

interface SortableWidgetCardProps {
  widget: ReportWidget;
  index: number;
  isActive: boolean;
  onSelect?: (widgetId: string) => void;
}

function SortableWidgetCard({
  widget,
  index,
  isActive,
  onSelect,
}: SortableWidgetCardProps): ReactElement {
  const { t } = useTranslation('common');
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onSelect?.(widget.id)}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'rounded-lg border p-4 text-left transition-colors',
        getWidgetWidthClass(widget.size),
        getWidgetHeightClass(widget.height),
        isActive ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted/40',
        isDragging && 'opacity-70 shadow-lg'
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{widget.title || t('common.reportBuilder.widgetTitleFallback', { index: index + 1 })}</span>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            {widget.size === 'full'
              ? t('common.reportBuilder.widgetSize.full')
              : widget.size === 'half'
                ? t('common.reportBuilder.widgetSize.half')
                : t('common.reportBuilder.widgetSize.third')}
          </span>
          <span className="rounded-full bg-muted px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            {widget.height === 'lg'
              ? t('common.reportBuilder.widgetHeight.lg')
              : widget.height === 'sm'
                ? t('common.reportBuilder.widgetHeight.sm')
                : t('common.reportBuilder.widgetHeight.md')}
          </span>
          <span
            className="cursor-grab rounded-md border border-dashed p-1 text-muted-foreground active:cursor-grabbing"
            onClick={(event) => event.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-3.5" />
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded border border-dashed p-2 text-center text-muted-foreground">{t('common.reportBuilder.header')}</div>
        <div className="rounded border border-dashed p-2 text-center text-muted-foreground">{t('common.reportBuilder.legend')}</div>
        <div className="rounded border border-dashed p-2 text-center text-muted-foreground">{t(`common.reportBuilder.chartTypes.${widget.chartType}`)}</div>
      </div>
    </button>
  );
}

export function DashboardLayoutPreview({
  widgets,
  activeWidgetId,
  onSelect,
  onReorder,
}: DashboardLayoutPreviewProps): ReactElement {
  const { t } = useTranslation('common');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (event: DragEndEvent): void => {
    if (!onReorder || !event.over || event.active.id === event.over.id) return;
    const oldIndex = widgets.findIndex((widget) => widget.id === event.active.id);
    const newIndex = widgets.findIndex((widget) => widget.id === event.over?.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(oldIndex, newIndex);
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">{t('common.reportBuilder.dashboardLayout')}</h3>
        <p className="text-muted-foreground text-xs">
          {t('common.reportBuilder.dashboardLayoutDescription')}
        </p>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgets.map((widget) => widget.id)} strategy={rectSortingStrategy}>
          <div className="grid gap-3 md:grid-cols-3">
            {widgets.map((widget, index) => (
              <SortableWidgetCard
                key={widget.id}
                widget={widget}
                index={index}
                isActive={widget.id === activeWidgetId}
                onSelect={onSelect}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
