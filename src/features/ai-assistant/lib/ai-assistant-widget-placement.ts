export const widgetViewportPadding = 16;
export const edgeSnapThresholdPx = 80;
export const edgeDetachThresholdPx = 40;
export const aiAssistantWidgetPositionStorageKey = 'crm-ai-assistant-widget-position';
export const aiAssistantWidgetEdgeAttachmentStorageKey = 'crm-ai-assistant-edge-attachment';
export const aiAssistantWidgetPlacementResetOnShowStorageKey = 'crm-ai-assistant-reset-placement-on-show';

export type WidgetPosition = {
  x: number;
  y: number;
};

export type WidgetSize = {
  width: number;
  height: number;
};

export const aiAssistantClosedWidgetRailSize: WidgetSize = {
  width: 120,
  height: 72,
};

export type WidgetContentBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type WidgetEdgeAttachment = 'none' | 'right' | 'left';

export function readSidebarRightEdge(): number {
  if (typeof window === 'undefined') {
    return widgetViewportPadding;
  }

  const sidebarElement = document.querySelector('.app-sidebar-panel');
  const sidebarRect = sidebarElement?.getBoundingClientRect();
  return sidebarRect?.right ?? widgetViewportPadding;
}

export function readViewportBounds(): WidgetContentBounds {
  if (typeof window === 'undefined') {
    return {
      left: widgetViewportPadding,
      top: widgetViewportPadding,
      right: 1200,
      bottom: 800,
    };
  }

  return {
    left: widgetViewportPadding,
    top: widgetViewportPadding,
    right: window.innerWidth - widgetViewportPadding,
    bottom: window.innerHeight - widgetViewportPadding,
  };
}

export function readWidgetContentBounds(): WidgetContentBounds {
  if (typeof window === 'undefined') {
    return {
      left: widgetViewportPadding,
      top: widgetViewportPadding,
      right: 1200,
      bottom: 800,
    };
  }

  const sidebarRight = readSidebarRightEdge();
  const left =
    sidebarRight > widgetViewportPadding
      ? sidebarRight + widgetViewportPadding
      : widgetViewportPadding;

  return {
    left,
    top: widgetViewportPadding,
    right: window.innerWidth - widgetViewportPadding,
    bottom: window.innerHeight - widgetViewportPadding,
  };
}

export function clampToContentBounds(
  position: WidgetPosition,
  size: WidgetSize,
  bounds: WidgetContentBounds
): WidgetPosition {
  const maxX = Math.max(bounds.left, bounds.right - size.width);
  const maxY = Math.max(bounds.top, bounds.bottom - size.height);

  return {
    x: Math.min(Math.max(position.x, bounds.left), maxX),
    y: Math.min(Math.max(position.y, bounds.top), maxY),
  };
}

export function clampVerticalPosition(
  y: number,
  size: WidgetSize,
  bounds: WidgetContentBounds
): number {
  const maxY = Math.max(bounds.top, bounds.bottom - size.height);
  return Math.min(Math.max(y, bounds.top), maxY);
}

export function getDistanceToContentRightEdge(
  position: WidgetPosition,
  size: WidgetSize,
  bounds: WidgetContentBounds
): number {
  return bounds.right - (position.x + size.width);
}

export function getDistanceToSidebarRightEdge(position: WidgetPosition): number {
  return Math.abs(position.x - readSidebarRightEdge());
}

export function isNearContentRightEdge(
  position: WidgetPosition,
  size: WidgetSize,
  bounds: WidgetContentBounds,
  threshold = edgeSnapThresholdPx
): boolean {
  return getDistanceToContentRightEdge(position, size, bounds) <= threshold;
}

export function isNearSidebarRightEdge(
  position: WidgetPosition,
  threshold = edgeSnapThresholdPx
): boolean {
  return getDistanceToSidebarRightEdge(position) <= threshold;
}

export function getRightEdgeAttachedPosition(
  y: number,
  size: WidgetSize,
  bounds: WidgetContentBounds
): WidgetPosition {
  return clampToContentBounds(
    {
      x: bounds.right - size.width,
      y,
    },
    size,
    bounds
  );
}

export function getLeftEdgeAttachedPosition(
  y: number,
  size: WidgetSize,
  bounds: WidgetContentBounds
): WidgetPosition {
  return {
    x: readSidebarRightEdge(),
    y: clampVerticalPosition(y, size, bounds),
  };
}

export function getRightAlignedPosition(
  y: number,
  size: WidgetSize,
  bounds: WidgetContentBounds
): WidgetPosition {
  return getRightEdgeAttachedPosition(y, size, bounds);
}

export function resolveWidgetDragPosition(
  rawPosition: WidgetPosition,
  size: WidgetSize,
  bounds: WidgetContentBounds,
  options: {
    edgeAttachment: WidgetEdgeAttachment;
    isOpen: boolean;
    allowSnap: boolean;
  }
): { position: WidgetPosition; edgeAttachment: WidgetEdgeAttachment } {
  const distanceToRight = getDistanceToContentRightEdge(rawPosition, size, bounds);
  const distanceToSidebarRight = getDistanceToSidebarRightEdge(rawPosition);

  if (
    options.allowSnap &&
    !options.isOpen &&
    distanceToSidebarRight <= edgeSnapThresholdPx
  ) {
    return {
      position: getLeftEdgeAttachedPosition(rawPosition.y, size, bounds),
      edgeAttachment: 'left',
    };
  }

  if (options.allowSnap && distanceToRight <= edgeSnapThresholdPx) {
    const nextPosition = options.isOpen
      ? getRightAlignedPosition(rawPosition.y, size, bounds)
      : getRightEdgeAttachedPosition(rawPosition.y, size, bounds);

    return {
      position: nextPosition,
      edgeAttachment: 'right',
    };
  }

  if (options.edgeAttachment === 'right' && distanceToRight > edgeDetachThresholdPx) {
    return {
      position: clampToContentBounds(rawPosition, size, bounds),
      edgeAttachment: 'none',
    };
  }

  if (options.edgeAttachment === 'left' && distanceToSidebarRight > edgeDetachThresholdPx) {
    return {
      position: clampToContentBounds(rawPosition, size, bounds),
      edgeAttachment: 'none',
    };
  }

  if (options.edgeAttachment === 'right') {
    const nextPosition = options.isOpen
      ? getRightAlignedPosition(rawPosition.y, size, bounds)
      : getRightEdgeAttachedPosition(rawPosition.y, size, bounds);

    return {
      position: nextPosition,
      edgeAttachment: 'right',
    };
  }

  if (options.edgeAttachment === 'left') {
    return {
      position: getLeftEdgeAttachedPosition(rawPosition.y, size, bounds),
      edgeAttachment: 'left',
    };
  }

  return {
    position: clampToContentBounds(rawPosition, size, bounds),
    edgeAttachment: 'none',
  };
}

export function createDefaultWidgetPosition(
  bounds: WidgetContentBounds,
  size: WidgetSize
): WidgetPosition {
  return clampToContentBounds(
    {
      x: bounds.right - size.width - 24,
      y: bounds.bottom - size.height - 24,
    },
    size,
    bounds
  );
}

export function createBottomRightRailPlacement(
  bounds: WidgetContentBounds = readWidgetContentBounds()
): { position: WidgetPosition; edgeAttachment: WidgetEdgeAttachment } {
  return {
    position: createDefaultWidgetPosition(bounds, aiAssistantClosedWidgetRailSize),
    edgeAttachment: 'right',
  };
}

export function persistBottomRightRailPlacement(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  const { position, edgeAttachment } = createBottomRightRailPlacement();
  window.localStorage.setItem(aiAssistantWidgetPositionStorageKey, JSON.stringify(position));
  window.localStorage.setItem(aiAssistantWidgetEdgeAttachmentStorageKey, edgeAttachment);
}

export function requestAiAssistantWidgetPlacementResetOnShow(): void {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return;
  }

  persistBottomRightRailPlacement();
  window.sessionStorage.setItem(aiAssistantWidgetPlacementResetOnShowStorageKey, '1');
}

export function hasAiAssistantWidgetPlacementResetPending(): boolean {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return false;
  }

  return window.sessionStorage.getItem(aiAssistantWidgetPlacementResetOnShowStorageKey) === '1';
}

export function consumeAiAssistantWidgetPlacementResetOnShow(): boolean {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return false;
  }

  const shouldReset = hasAiAssistantWidgetPlacementResetPending();

  if (shouldReset) {
    window.sessionStorage.removeItem(aiAssistantWidgetPlacementResetOnShowStorageKey);
  }

  return shouldReset;
}

export function readInitialWidgetPlacement(): {
  position: WidgetPosition;
  edgeAttachment: WidgetEdgeAttachment;
} {
  if (typeof window === 'undefined') {
    return createBottomRightRailPlacement();
  }

  if (window.sessionStorage.getItem(aiAssistantWidgetPlacementResetOnShowStorageKey) === '1') {
    return createBottomRightRailPlacement();
  }

  const rawPosition = window.localStorage.getItem(aiAssistantWidgetPositionStorageKey);
  const edgeAttachment = parseWidgetEdgeAttachment(
    window.localStorage.getItem(aiAssistantWidgetEdgeAttachmentStorageKey) ??
      window.localStorage.getItem('crm-ai-assistant-edge-attached')
  );

  if (!rawPosition) {
    return createBottomRightRailPlacement();
  }

  try {
    const parsed = JSON.parse(rawPosition) as Partial<WidgetPosition>;
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') {
      return createBottomRightRailPlacement();
    }

    const bounds = readWidgetContentBounds();
    const position = clampToContentBounds(
      { x: parsed.x, y: parsed.y },
      aiAssistantClosedWidgetRailSize,
      bounds
    );

    return { position, edgeAttachment };
  } catch {
    return createBottomRightRailPlacement();
  }
}

export function parseWidgetEdgeAttachment(value: string | null): WidgetEdgeAttachment {
  if (value === 'left' || value === 'right' || value === 'none') {
    return value;
  }

  if (value === 'true') {
    return 'right';
  }

  return 'right';
}
