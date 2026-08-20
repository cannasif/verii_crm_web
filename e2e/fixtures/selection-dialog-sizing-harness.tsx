import { StrictMode, useMemo, useState, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '../../src/components/ui/dialog';
import {
  SelectionDialogContent,
  type SelectionDialogSize,
} from '../../src/components/shared/SelectionDialogContent';
import { Input } from '../../src/components/ui/input';
import '../../src/index.css';

const RESULTS = Array.from({ length: 30 }, (_, index) => `Kayıt ${index + 1}`);

function Harness(): ReactElement {
  const [size, setSize] = useState<SelectionDialogSize>('customer');
  const [search, setSearch] = useState('');
  const filteredResults = useMemo(
    () => RESULTS.filter((result) => result.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr'))),
    [search]
  );

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <label className="flex max-w-xs flex-col gap-2 font-semibold">
        Modal boyutu
        <select
          aria-label="Modal boyutu"
          value={size}
          onChange={(event) => setSize(event.target.value as SelectionDialogSize)}
          className="h-10 rounded-lg border bg-white px-3"
        >
          <option value="customer">Müşteri</option>
          <option value="compact">Kompakt</option>
          <option value="medium">Orta</option>
          <option value="catalog">Katalog</option>
        </select>
      </label>

      <Dialog open>
        <SelectionDialogContent
          size={size}
          showCloseButton={false}
          className="w-[calc(100vw-1rem)] max-w-4xl gap-0 bg-white p-0"
        >
          <DialogHeader className="shrink-0 border-b bg-slate-50 px-5 py-4 text-left">
            <DialogTitle>Seçim ekranı</DialogTitle>
            <DialogDescription>Arama sonucu değişirken dış ölçü sabit kalmalıdır.</DialogDescription>
          </DialogHeader>
          <div className="shrink-0 border-b p-4">
            <Input
              aria-label="Sonuç ara"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Sonuç ara"
            />
          </div>
          <div data-testid="selection-results" className="min-h-0 flex-1 overflow-y-auto p-4">
            {filteredResults.length === 0 ? (
              <div className="flex min-h-full items-center justify-center text-slate-500">Sonuç bulunamadı</div>
            ) : (
              <div className="space-y-2">
                {filteredResults.map((result) => (
                  <div key={result} data-testid="selection-result" className="h-12 rounded-lg border bg-white px-4 py-3">
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>
        </SelectionDialogContent>
      </Dialog>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Harness />
  </StrictMode>
);
