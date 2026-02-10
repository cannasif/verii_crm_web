import type { ReactElement } from 'react';
import { usePdfReportDesignerStore } from '../store/usePdfReportDesignerStore';
import { isPdfTableElement } from '../types/pdf-report-template.types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FONT_FAMILIES, FONT_SIZES } from '../constants';

export function PdfInspectorPanel(): ReactElement {
  const getOrderedElements = usePdfReportDesignerStore((s) => s.getOrderedElements);
  const selectedIds = usePdfReportDesignerStore((s) => s.selectedIds);
  const updateElement = usePdfReportDesignerStore((s) => s.updateElement);
  const updateReportElement = usePdfReportDesignerStore((s) => s.updateReportElement);
  const elements = getOrderedElements();
  const selectedElement =
    selectedIds.length === 1 ? elements.find((el) => el.id === selectedIds[0]) : null;

  if (!selectedElement || isPdfTableElement(selectedElement)) {
    return (
      <div className="flex w-56 flex-col gap-3 border-l border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/30">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Inspector
        </span>
        <p className="text-xs text-slate-500">Öğe seçin veya birden fazla seçiliyse konum/size güncellenmez.</p>
      </div>
    );
  }

  const style = selectedElement.style ?? {};
  const opacity = style.opacity ?? 1;

  return (
    <div className="flex w-56 flex-col gap-3 border-l border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/30">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Inspector
      </span>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">X</Label>
          <Input
            type="number"
            value={selectedElement.x}
            onChange={(e) =>
              updateElement(selectedElement.id, { x: Number(e.target.value) || 0 })
            }
            className="h-8 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Y</Label>
          <Input
            type="number"
            value={selectedElement.y}
            onChange={(e) =>
              updateElement(selectedElement.id, { y: Number(e.target.value) || 0 })
            }
            className="h-8 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">W</Label>
          <Input
            type="number"
            value={selectedElement.width}
            onChange={(e) =>
              updateElement(selectedElement.id, { width: Number(e.target.value) || 0 })
            }
            className="h-8 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">H</Label>
          <Input
            type="number"
            value={selectedElement.height}
            onChange={(e) =>
              updateElement(selectedElement.id, { height: Number(e.target.value) || 0 })
            }
            className="h-8 text-xs"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-xs">zIndex</Label>
        <Input
          type="number"
          value={selectedElement.zIndex ?? ''}
          onChange={(e) =>
            updateElement(selectedElement.id, {
              zIndex: e.target.value === '' ? undefined : Number(e.target.value),
            })
          }
          className="h-8 text-xs"
          placeholder="auto"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-xs">Rotation (°)</Label>
        <Input
          type="number"
          value={selectedElement.rotation ?? 0}
          onChange={(e) =>
            updateElement(selectedElement.id, { rotation: Number(e.target.value) || 0 })
          }
          className="h-8 text-xs"
        />
      </div>
      {(
        <>
          <div className="flex flex-col gap-2">
            <Label className="text-xs">Yazı boyutu</Label>
            <Select
              value={String(selectedElement.fontSize ?? 14)}
              onValueChange={(v) =>
                updateReportElement(selectedElement.id, { fontSize: Number(v) })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} px
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs">Yazı tipi</Label>
            <Select
              value={selectedElement.fontFamily ?? 'Arial'}
              onValueChange={(v) =>
                updateReportElement(selectedElement.id, { fontFamily: v })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs">Hizalama</Label>
            <Select
              value={style.textAlign ?? 'left'}
              onValueChange={(v: 'left' | 'center' | 'right') =>
                updateReportElement(selectedElement.id, {
                  style: { ...style, textAlign: v },
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Sol</SelectItem>
                <SelectItem value="center">Orta</SelectItem>
                <SelectItem value="right">Sağ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs">Arka plan</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={style.background ?? '#ffffff'}
                onChange={(e) =>
                  updateReportElement(selectedElement.id, {
                    style: { ...style, background: e.target.value },
                  })
                }
                className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
              />
              <Input
                value={style.background ?? ''}
                onChange={(e) =>
                  updateReportElement(selectedElement.id, {
                    style: { ...style, background: e.target.value || undefined },
                  })
                }
                className="h-8 flex-1 text-xs"
                placeholder="transparent"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs">Opacity (0-1)</Label>
            <Input
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={opacity}
              onChange={(e) =>
                updateReportElement(selectedElement.id, {
                  style: { ...style, opacity: Number(e.target.value) || 0 },
                })
              }
              className="h-8 text-xs"
            />
          </div>
        </>
      )}
    </div>
  );
}

