import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import type { ReactElement } from 'react';
import { useRef } from 'react';
import {
  A4Canvas,
  getSectionFromDroppableId,
  parseTableIdFromDroppableId,
} from './components/A4Canvas';
import { Sidebar, type SidebarDragData } from './components/Sidebar';
import type { ReportElement, TableElement } from './models/report-element';
import { useReportStore } from './store/useReportStore';
import { createClientId } from '@/lib/create-client-id';
import i18n from '@/lib/i18n';

const DEFAULT_ELEMENT_WIDTH = 200;
const DEFAULT_ELEMENT_HEIGHT = 50;

function isSidebarDragData(data: unknown): data is SidebarDragData {
  const d = data as SidebarDragData | null;
  return (
    typeof d === 'object' &&
    d !== null &&
    typeof d.type === 'string' &&
    typeof d.path === 'string' &&
    typeof d.label === 'string'
  );
}

export function ReportDesignerPage(): ReactElement {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const addElement = useReportStore((s) => s.addElement);
  const addColumnToTable = useReportStore((s) => s.addColumnToTable);

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    const data = active.data.current;
    if (!isSidebarDragData(data)) return;

    const tableId = over?.id != null ? parseTableIdFromDroppableId(String(over.id)) : null;

    if (tableId != null) {
      if (data.type !== 'table-column') return;
      addColumnToTable(tableId, { label: data.label, path: data.path });
      return;
    }

    const overId = over?.id != null ? String(over.id) : null;
    const section = overId != null ? getSectionFromDroppableId(overId) : null;

    if (section == null || !canvasRef.current) return;
    if (data.type === 'table-column') return;

    if (data.type === 'table' && section !== 'content') return;
    if (data.type === 'image' && section === 'content') return;

    const translated = active.rect.current.translated;
    if (!translated) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = Math.round(translated.left - canvasRect.left);
    const y = Math.round(translated.top - canvasRect.top);

    if (data.type === 'text') {
      const newElement: ReportElement = {
        id: createClientId(),
        type: 'text',
        section,
        x,
        y,
        width: 200,
        height: 60,
        text: i18n.t('reportDesigner.defaults.doubleClickToEdit'),
        fontSize: 14,
        fontFamily: 'Arial',
      };
      addElement(newElement);
      return;
    }

    if (data.type === 'field') {
      const newElement: ReportElement = {
        id: createClientId(),
        type: 'field',
        section,
        x,
        y,
        width: DEFAULT_ELEMENT_WIDTH,
        height: DEFAULT_ELEMENT_HEIGHT,
        value: data.label,
        path: data.path,
      };
      addElement(newElement);
      return;
    }

    if (data.type === 'table') {
      const newTable: TableElement = {
        id: createClientId(),
        type: 'table',
        section,
        x,
        y,
        width: DEFAULT_ELEMENT_WIDTH,
        height: DEFAULT_ELEMENT_HEIGHT,
        columns: [],
      };
      addElement(newTable);
      return;
    }

    if (data.type === 'image') {
      const newElement: ReportElement = {
        id: createClientId(),
        type: 'image',
        section,
        x,
        y,
        width: 120,
        height: 80,
        value: data.value ?? data.label ?? '',
      };
      addElement(newElement);
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex h-full min-h-screen w-full">
        <Sidebar />
        <A4Canvas canvasRef={canvasRef} />
      </div>
    </DndContext>
  );
}
