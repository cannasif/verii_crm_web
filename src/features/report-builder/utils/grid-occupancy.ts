export interface GridSpan {
  colSpan: number;
  rowSpan: number;
}

export function clampGridSpan(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function tryPlaceFirstFit(
  grid: boolean[][],
  cols: number,
  rows: number,
  maxCols: number,
  maxRows: number,
): { row: number; col: number } | null {
  if (cols < 1 || rows < 1 || cols > maxCols || rows > maxRows) return null;
  for (let row = 0; row <= maxRows - rows; row += 1) {
    for (let col = 0; col <= maxCols - cols; col += 1) {
      let canPlace = true;
      for (let dr = 0; dr < rows && canPlace; dr += 1) {
        for (let dc = 0; dc < cols && canPlace; dc += 1) {
          if (grid[row + dr][col + dc]) canPlace = false;
        }
      }
      if (canPlace) {
        for (let dr = 0; dr < rows; dr += 1) {
          for (let dc = 0; dc < cols; dc += 1) {
            grid[row + dr][col + dc] = true;
          }
        }
        return { row, col };
      }
    }
  }
  return null;
}

export function buildOccupancyGrid(
  layouts: Record<string, GridSpan>,
  ids: string[],
  maxCols: number,
  maxRows: number,
): { grid: boolean[][]; placedAll: boolean } {
  const grid: boolean[][] = Array.from({ length: maxRows }, () => Array<boolean>(maxCols).fill(false));
  let placedAll = true;
  ids.forEach((id) => {
    const layout = layouts[id];
    if (!layout) return;
    const cols = clampGridSpan(layout.colSpan, 1, maxCols);
    const rows = clampGridSpan(layout.rowSpan, 1, maxRows);
    const placement = tryPlaceFirstFit(grid, cols, rows, maxCols, maxRows);
    if (!placement) placedAll = false;
  });
  return { grid, placedAll };
}

export function canFitInGridOccupancy(
  grid: boolean[][],
  cols: number,
  rows: number,
  maxCols: number,
  maxRows: number,
): boolean {
  if (cols < 1 || rows < 1 || cols > maxCols || rows > maxRows) return false;
  for (let row = 0; row <= maxRows - rows; row += 1) {
    for (let col = 0; col <= maxCols - cols; col += 1) {
      let canPlace = true;
      for (let dr = 0; dr < rows && canPlace; dr += 1) {
        for (let dc = 0; dc < cols && canPlace; dc += 1) {
          if (grid[row + dr][col + dc]) canPlace = false;
        }
      }
      if (canPlace) return true;
    }
  }
  return false;
}

export function canCanvasHoldAllSpans(
  layouts: Record<string, GridSpan>,
  ids: string[],
  newMaxCols: number,
  newMaxRows: number,
): boolean {
  return buildOccupancyGrid(layouts, ids, newMaxCols, newMaxRows).placedAll;
}
