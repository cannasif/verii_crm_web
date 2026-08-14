import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Compass,
  Minus,
  Navigation,
  Plus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type SalesMapPanDirection = 'up' | 'down' | 'left' | 'right';

export interface SalesMapPanVector {
  x: number;
  y: number;
}

export type SalesMapNavVariant = 'joystick' | 'dpad';

interface SalesMapNavControlsProps {
  variant?: SalesMapNavVariant;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onPan: (vector: SalesMapPanVector) => void;
  onResetNorth: () => void;
  zoomInLabel: string;
  zoomOutLabel: string;
  panLabel: string;
  panUpLabel: string;
  panDownLabel: string;
  panLeftLabel: string;
  panRightLabel: string;
  compassLabel: string;
  expandLabel: string;
  collapseLabel: string;
  className?: string;
}

function NavButton({
  label,
  onClick,
  onHoldStart,
  onHoldEnd,
  children,
  className,
}: {
  label: string;
  onClick?: () => void;
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(event) => {
        event.stopPropagation();
        if (!onHoldStart) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        onHoldStart();
      }}
      onPointerUp={(event) => {
        event.stopPropagation();
        onHoldEnd?.();
      }}
      onPointerCancel={() => onHoldEnd?.()}
      onLostPointerCapture={() => onHoldEnd?.()}
      onClick={(event) => {
        event.stopPropagation();
        if (onHoldStart) return;
        onClick?.();
      }}
      className={cn(
        'flex h-9 w-9 items-center justify-center text-slate-700 transition hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/10',
        className,
      )}
    >
      {children}
    </button>
  );
}

function normalizeJoystickVector(clientX: number, clientY: number, rect: DOMRect): SalesMapPanVector {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const radius = Math.min(rect.width, rect.height) * 0.42;
  const rawX = (clientX - centerX) / radius;
  const rawY = (clientY - centerY) / radius;
  const length = Math.hypot(rawX, rawY);
  if (length < 0.16) return { x: 0, y: 0 };
  const capped = Math.min(1, length);
  return {
    x: (rawX / length) * capped,
    y: (rawY / length) * capped,
  };
}

function JoystickPad({
  label,
  compassLabel,
  onPan,
  onResetNorth,
}: {
  label: string;
  compassLabel: string;
  onPan: (vector: SalesMapPanVector) => void;
  onResetNorth: () => void;
}) {
  const padRef = useRef<HTMLDivElement>(null);
  const vectorRef = useRef<SalesMapPanVector>({ x: 0, y: 0 });
  const frameRef = useRef<number | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const movedRef = useRef(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  useEffect(() => () => {
    if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
  }, []);

  const stopLoop = (): void => {
    if (frameRef.current != null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    vectorRef.current = { x: 0, y: 0 };
    setKnob({ x: 0, y: 0 });
    activePointerRef.current = null;
  };

  const startLoop = (): void => {
    if (frameRef.current != null) return;
    const tick = (): void => {
      const vector = vectorRef.current;
      if (Math.abs(vector.x) > 0.001 || Math.abs(vector.y) > 0.001) {
        onPan(vector);
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  const updateFromPointer = (clientX: number, clientY: number): void => {
    const pad = padRef.current;
    if (!pad) return;
    const vector = normalizeJoystickVector(clientX, clientY, pad.getBoundingClientRect());
    if (Math.abs(vector.x) > 0.001 || Math.abs(vector.y) > 0.001) {
      movedRef.current = true;
    }
    vectorRef.current = vector;
    setKnob({ x: vector.x * 22, y: vector.y * 22 });
  };

  return (
    <div
      ref={padRef}
      role="application"
      aria-label={label}
      className="relative flex h-[112px] w-[112px] touch-none items-center justify-center overflow-hidden rounded-md border border-slate-300/80 bg-white shadow-md dark:border-white/15 dark:bg-slate-900"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        event.preventDefault();
        movedRef.current = false;
        activePointerRef.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        updateFromPointer(event.clientX, event.clientY);
        startLoop();
      }}
      onPointerMove={(event) => {
        if (activePointerRef.current !== event.pointerId) return;
        event.stopPropagation();
        updateFromPointer(event.clientX, event.clientY);
      }}
      onPointerUp={(event) => {
        if (activePointerRef.current !== event.pointerId) return;
        event.stopPropagation();
        const wasCenterTap = !movedRef.current;
        stopLoop();
        if (wasCenterTap) onResetNorth();
      }}
      onPointerCancel={stopLoop}
      onLostPointerCapture={stopLoop}
    >
      <ChevronUp className="pointer-events-none absolute top-1.5 text-slate-400" size={14} strokeWidth={2.25} />
      <ChevronDown className="pointer-events-none absolute bottom-1.5 text-slate-400" size={14} strokeWidth={2.25} />
      <ChevronLeft className="pointer-events-none absolute left-1.5 text-slate-400" size={14} strokeWidth={2.25} />
      <ChevronRight className="pointer-events-none absolute right-1.5 text-slate-400" size={14} strokeWidth={2.25} />
      <div className="pointer-events-none absolute inset-3 rounded-full border border-dashed border-slate-200 dark:border-white/10" />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-white shadow-md ring-2 ring-white dark:bg-sky-300 dark:text-slate-900 dark:ring-slate-900"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        title={compassLabel}
      >
        {knob.x === 0 && knob.y === 0 ? <Compass size={14} strokeWidth={2.25} /> : null}
      </span>
    </div>
  );
}

const DIRECTION_VECTOR: Record<SalesMapPanDirection, SalesMapPanVector> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function DpadPad({
  onPan,
  onResetNorth,
  panUpLabel,
  panDownLabel,
  panLeftLabel,
  panRightLabel,
  compassLabel,
}: {
  onPan: (vector: SalesMapPanVector) => void;
  onResetNorth: () => void;
  panUpLabel: string;
  panDownLabel: string;
  panLeftLabel: string;
  panRightLabel: string;
  compassLabel: string;
}) {
  const holdRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (holdRef.current != null) window.clearInterval(holdRef.current);
  }, []);

  const startHold = (direction: SalesMapPanDirection): void => {
    const vector = DIRECTION_VECTOR[direction];
    onPan(vector);
    if (holdRef.current != null) window.clearInterval(holdRef.current);
    holdRef.current = window.setInterval(() => onPan(vector), 50);
  };

  const stopHold = (): void => {
    if (holdRef.current != null) {
      window.clearInterval(holdRef.current);
      holdRef.current = null;
    }
  };

  return (
    <div className="grid grid-cols-3 overflow-hidden rounded-md border border-slate-300/80 bg-white shadow-md dark:border-white/15 dark:bg-slate-900">
      <span className="h-9 w-9" />
      <NavButton
        label={panUpLabel}
        onHoldStart={() => startHold('up')}
        onHoldEnd={stopHold}
        className="border-b border-slate-200 dark:border-white/10"
      >
        <ChevronUp size={17} strokeWidth={2.25} />
      </NavButton>
      <span className="h-9 w-9" />
      <NavButton
        label={panLeftLabel}
        onHoldStart={() => startHold('left')}
        onHoldEnd={stopHold}
        className="border-r border-slate-200 dark:border-white/10"
      >
        <ChevronLeft size={17} strokeWidth={2.25} />
      </NavButton>
      <NavButton label={compassLabel} onClick={onResetNorth} className="border border-slate-200 dark:border-white/10">
        <Compass size={16} strokeWidth={2.25} />
      </NavButton>
      <NavButton
        label={panRightLabel}
        onHoldStart={() => startHold('right')}
        onHoldEnd={stopHold}
        className="border-l border-slate-200 dark:border-white/10"
      >
        <ChevronRight size={17} strokeWidth={2.25} />
      </NavButton>
      <span className="h-9 w-9" />
      <NavButton
        label={panDownLabel}
        onHoldStart={() => startHold('down')}
        onHoldEnd={stopHold}
        className="border-t border-slate-200 dark:border-white/10"
      >
        <ChevronDown size={17} strokeWidth={2.25} />
      </NavButton>
      <span className="h-9 w-9" />
    </div>
  );
}

export function SalesMapNavControls({
  variant = 'joystick',
  onZoomIn,
  onZoomOut,
  onPan,
  onResetNorth,
  zoomInLabel,
  zoomOutLabel,
  panLabel,
  panUpLabel,
  panDownLabel,
  panLeftLabel,
  panRightLabel,
  compassLabel,
  expandLabel,
  collapseLabel,
  className,
}: SalesMapNavControlsProps) {
  const [expanded, setExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !window.matchMedia('(max-width: 639px)').matches;
  });
  const zoomHoldRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (zoomHoldRef.current != null) window.clearInterval(zoomHoldRef.current);
  }, []);

  const startZoomHold = (action: () => void): void => {
    action();
    if (zoomHoldRef.current != null) window.clearInterval(zoomHoldRef.current);
    zoomHoldRef.current = window.setInterval(action, 110);
  };

  const stopZoomHold = (): void => {
    if (zoomHoldRef.current != null) {
      window.clearInterval(zoomHoldRef.current);
      zoomHoldRef.current = null;
    }
  };

  return (
    <div
      data-sales-map-nav="true"
      className={cn('pointer-events-auto absolute bottom-3 right-3 z-30 flex flex-col items-end gap-2 sm:bottom-4 sm:right-4', className)}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {!expanded ? (
        <button
          type="button"
          aria-label={expandLabel}
          onClick={() => setExpanded(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300/80 bg-white text-slate-700 shadow-md sm:h-10 sm:w-10 dark:border-white/15 dark:bg-slate-900 dark:text-slate-100"
        >
          <Navigation size={17} strokeWidth={2.25} />
        </button>
      ) : (
        <div className="flex origin-bottom-right scale-90 items-end gap-1.5 sm:scale-100 sm:gap-2">
          <div className="overflow-hidden rounded-md border border-slate-300/80 bg-white shadow-md dark:border-white/15 dark:bg-slate-900">
            <NavButton
              label={zoomInLabel}
              onHoldStart={() => startZoomHold(onZoomIn)}
              onHoldEnd={stopZoomHold}
            >
              <Plus size={17} strokeWidth={2.25} />
            </NavButton>
            <div className="h-px bg-slate-200 dark:bg-white/10" />
            <NavButton
              label={zoomOutLabel}
              onHoldStart={() => startZoomHold(onZoomOut)}
              onHoldEnd={stopZoomHold}
            >
              <Minus size={17} strokeWidth={2.25} />
            </NavButton>
          </div>
          <div className="relative">
            <button
              type="button"
              aria-label={collapseLabel}
              onClick={() => {
                stopZoomHold();
                setExpanded(false);
              }}
              className="absolute -right-1 -top-9 flex h-7 w-7 items-center justify-center rounded-md border border-slate-300/80 bg-white text-slate-600 shadow-md sm:-top-10 sm:h-8 sm:w-8 dark:border-white/15 dark:bg-slate-900 dark:text-slate-200"
            >
              <X size={14} strokeWidth={2.25} />
            </button>
            {variant === 'joystick' ? (
              <JoystickPad
                label={panLabel}
                compassLabel={compassLabel}
                onPan={onPan}
                onResetNorth={onResetNorth}
              />
            ) : (
              <DpadPad
                onPan={onPan}
                onResetNorth={onResetNorth}
                panUpLabel={panUpLabel}
                panDownLabel={panDownLabel}
                panLeftLabel={panLeftLabel}
                panRightLabel={panRightLabel}
                compassLabel={compassLabel}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
