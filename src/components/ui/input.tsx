import * as React from "react"

import { cn } from "@/lib/utils"

const DECIMAL_INPUT_STEP = "0.000001"

function getDecimalPrecision(raw: string): number {
  const normalized = raw.replace(",", ".")
  const decimalPart = normalized.split(".")[1]
  return decimalPart ? decimalPart.length : 0
}

function clampNumber(value: number, min?: string | number, max?: string | number): number {
  let nextValue = value

  if (min !== undefined && min !== "") {
    const minValue = typeof min === "number" ? min : Number(min)
    if (!Number.isNaN(minValue)) {
      nextValue = Math.max(nextValue, minValue)
    }
  }

  if (max !== undefined && max !== "") {
    const maxValue = typeof max === "number" ? max : Number(max)
    if (!Number.isNaN(maxValue)) {
      nextValue = Math.min(nextValue, maxValue)
    }
  }

  return nextValue
}

function normalizeArrowStepValue(
  raw: string,
  delta: 1 | -1,
  min?: string | number,
  max?: string | number,
  step?: string | number
): string {
  const stepStr = step !== undefined && step !== "" ? String(step).replace(",", ".") : ""
  const stepNum = stepStr === "" ? Number.NaN : Number(stepStr)
  /** `step="1"` (adet vb.): oklar her zaman ±1 tam sayı; taslaktaki ondalık gösterimi yok sayılır. */
  const integerStepArrows = Number.isFinite(stepNum) && stepNum === 1

  if (integerStepArrows) {
    const normalizedRaw = raw.replace(",", ".").trim()
    const currentValue =
      normalizedRaw === "" || normalizedRaw === "." || normalizedRaw === "-" ? 0 : Number(normalizedRaw)
    const safeCurrentValue = Number.isNaN(currentValue) ? 0 : currentValue
    const intBase = Math.round(safeCurrentValue)
    const nextValue = clampNumber(intBase + delta, min, max)
    return String(Math.trunc(nextValue))
  }

  const normalizedRaw = raw.replace(",", ".").trim()
  const currentValue = normalizedRaw === "" || normalizedRaw === "." || normalizedRaw === "-" ? 0 : Number(normalizedRaw)
  const safeCurrentValue = Number.isNaN(currentValue) ? 0 : currentValue
  const precision = getDecimalPrecision(normalizedRaw)
  const nextValue = clampNumber(safeCurrentValue + delta, min, max)
  const roundedValue = Number(nextValue.toFixed(Math.min(Math.max(precision, 0), 10)))

  if (precision === 0) {
    return String(Math.trunc(roundedValue))
  }

  return roundedValue.toFixed(precision).replace(/\.?0+$/, (match) => {
    if (!match.includes(".")) return match
    return ""
  })
}

function Input({ className, type, step, inputMode, onKeyDown, min, max, ...props }: React.ComponentProps<"input">) {
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event)

    if (event.defaultPrevented || type !== "number" || event.currentTarget.readOnly || event.currentTarget.disabled) {
      return
    }

    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return
    }

    event.preventDefault()

    const input = event.currentTarget
    const delta = event.key === "ArrowUp" ? 1 : -1
    const nextValue = normalizeArrowStepValue(input.value, delta, min, max, step)
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set

    valueSetter?.call(input, nextValue)
    input.dispatchEvent(new Event("input", { bubbles: true }))
  }, [max, min, onKeyDown, step, type])

  return (
    <input
      type={type}
      step={type === "number" ? (step ?? DECIMAL_INPUT_STEP) : step}
      inputMode={type === "number" ? (inputMode ?? "decimal") : inputMode}
      min={min}
      max={max}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input h-9 w-full min-w-0 rounded-md border bg-background px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      onKeyDown={handleKeyDown}
      {...props}
    />
  )
}

export { Input }
