export function createSalesMapPinCanvas(color: string, label?: string, selected = false): HTMLCanvasElement {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return canvas;

  const pinX = size / 2;
  const tipY = size - 4;
  const headRadius = selected ? 22 : 18;
  const headCenterY = tipY - headRadius * 2.15;
  const labelTop = 8;

  if (label) {
    context.font = 'bold 18px ui-sans-serif, system-ui, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const metrics = context.measureText(label);
    const boxWidth = Math.max(36, metrics.width + 14);
    const boxHeight = 22;
    const boxX = pinX - boxWidth / 2;
    context.fillStyle = 'rgba(15, 23, 42, 0.88)';
    context.beginPath();
    context.moveTo(boxX + 6, labelTop);
    context.arcTo(boxX + boxWidth, labelTop, boxX + boxWidth, labelTop + boxHeight, 6);
    context.arcTo(boxX + boxWidth, labelTop + boxHeight, boxX, labelTop + boxHeight, 6);
    context.arcTo(boxX, labelTop + boxHeight, boxX, labelTop, 6);
    context.arcTo(boxX, labelTop, boxX + boxWidth, labelTop, 6);
    context.closePath();
    context.fill();
    context.fillStyle = '#ffffff';
    context.fillText(label, pinX, labelTop + boxHeight / 2 + 0.5);
  }

  context.beginPath();
  context.moveTo(pinX, tipY);
  context.bezierCurveTo(
    pinX + headRadius * 1.35,
    tipY - headRadius * 0.95,
    pinX + headRadius * 1.35,
    headCenterY - headRadius * 0.15,
    pinX,
    headCenterY - headRadius,
  );
  context.bezierCurveTo(
    pinX - headRadius * 1.35,
    headCenterY - headRadius * 0.15,
    pinX - headRadius * 1.35,
    tipY - headRadius * 0.95,
    pinX,
    tipY,
  );
  context.closePath();
  context.fillStyle = color;
  context.fill();
  context.lineWidth = selected ? 4 : 3;
  context.strokeStyle = selected ? '#fbbf24' : '#ffffff';
  context.stroke();

  context.beginPath();
  context.arc(pinX, headCenterY - headRadius * 0.15, headRadius * 0.38, 0, Math.PI * 2);
  context.fillStyle = '#ffffff';
  context.fill();

  return canvas;
}
