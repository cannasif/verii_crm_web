import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import {
  APPEARANCE_BEFORE_BRAND_LIST_STORAGE_KEY,
  BRAND_THEME_CLASS_PREFIX,
  BRAND_THEME_LIST_ENABLED_STORAGE_KEY,
  BRAND_THEME_LIST_SELECTION_STORAGE_KEY,
  BRAND_THEME_STORAGE_KEY,
  type BrandTheme,
  brandThemes,
  getBrandThemeAppearance,
  getBrandThemeClass,
  isBrandTheme,
  toggleV3riiAppearanceOverride,
} from "@/lib/brand-themes"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
  brandThemeStorageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  brandTheme: BrandTheme
  isBrandThemeListEnabled: boolean
  v3riiAppearanceRevision: number
  setTheme: (theme: Theme) => void
  setBrandTheme: (theme: BrandTheme) => void
  setBrandThemeListEnabled: (enabled: boolean) => void
  toggleV3riiAppearanceOverride: () => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  brandTheme: "v3rii",
  isBrandThemeListEnabled: false,
  v3riiAppearanceRevision: 0,
  setTheme: () => null,
  setBrandTheme: () => null,
  setBrandThemeListEnabled: () => null,
  toggleV3riiAppearanceOverride: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

const DEFAULT_V3RII_THEME: BrandTheme = "v3rii"

function readStoredBrandThemeListSelection(): BrandTheme {
  const stored = localStorage.getItem(BRAND_THEME_LIST_SELECTION_STORAGE_KEY)
  return isBrandTheme(stored) ? stored : DEFAULT_V3RII_THEME
}

function readStoredAppearance(storageKey: string, defaultTheme: Theme): Theme {
  const stored = localStorage.getItem(storageKey) as Theme | null
  if (stored === "dark" || stored === "light" || stored === "system") {
    return stored
  }
  return defaultTheme
}

function clearBrandThemeClasses(root: HTMLElement): void {
  const themeClasses = brandThemes.map((item) => item.className)
  root.classList.remove(...themeClasses)
}

function applyAppearanceClass(root: HTMLElement, appearance: Theme): void {
  root.classList.remove("light", "dark")

  if (appearance === "system") {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
    root.classList.add(systemTheme)
    return
  }

  root.classList.add(appearance)
}

function applyBrandThemeState(root: HTMLElement, theme: BrandTheme): void {
  clearBrandThemeClasses(root)
  root.classList.remove("light", "dark")
  const appearance = getBrandThemeAppearance(theme)
  root.classList.add(appearance)
  root.classList.add(getBrandThemeClass(theme))
  root.dataset.brandTheme = theme
  root.dataset.brandThemeAppearance = appearance
}

function clearBrandThemeState(root: HTMLElement): void {
  clearBrandThemeClasses(root)
  root.removeAttribute("data-brand-theme")
  root.removeAttribute("data-brand-theme-appearance")
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  brandThemeStorageKey = BRAND_THEME_STORAGE_KEY,
  ...props
}: ThemeProviderProps) {
  const [isBrandThemeListEnabled, setBrandThemeListEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem(BRAND_THEME_LIST_ENABLED_STORAGE_KEY)
    return stored === "true"
  })

  const [theme, setTheme] = useState<Theme>(() => readStoredAppearance(storageKey, defaultTheme))

  const [brandTheme, setBrandTheme] = useState<BrandTheme>(() => {
    if (localStorage.getItem(BRAND_THEME_LIST_ENABLED_STORAGE_KEY) === "true") {
      return readStoredBrandThemeListSelection()
    }
    return DEFAULT_V3RII_THEME
  })

  const [v3riiAppearanceRevision, setV3riiAppearanceRevision] = useState<number>(0)

  useEffect(() => {
    const root = window.document.documentElement

    if (isBrandThemeListEnabled) {
      return
    }

    const applyTheme = () => applyAppearanceClass(root, theme)

    applyTheme()

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      const handleChange = () => applyTheme()
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }
  }, [theme, isBrandThemeListEnabled])

  useEffect(() => {
    const root = window.document.documentElement

    if (isBrandThemeListEnabled) {
      applyBrandThemeState(root, brandTheme)
      return
    }

    clearBrandThemeState(root)
  }, [brandTheme, isBrandThemeListEnabled, v3riiAppearanceRevision])

  const handleToggleV3riiAppearanceOverride = useCallback(() => {
    toggleV3riiAppearanceOverride()
    setV3riiAppearanceRevision((current) => current + 1)
    if (!isBrandThemeListEnabled) {
      return
    }
    const root = window.document.documentElement
    if (brandTheme === "v3rii") {
      applyBrandThemeState(root, "v3rii")
    }
  }, [brandTheme, isBrandThemeListEnabled])

  const setThemeAndStore = useCallback((newTheme: Theme) => {
    if (isBrandThemeListEnabled) {
      return
    }
    localStorage.setItem(storageKey, newTheme)
    setTheme(newTheme)
  }, [isBrandThemeListEnabled, storageKey])

  const setBrandThemeAndStore = useCallback((newTheme: BrandTheme) => {
    if (!isBrandThemeListEnabled) {
      return
    }
    const root = window.document.documentElement
    root.classList.forEach((className) => {
      if (className.startsWith(BRAND_THEME_CLASS_PREFIX)) {
        root.classList.remove(className)
      }
    })
    localStorage.setItem(BRAND_THEME_LIST_SELECTION_STORAGE_KEY, newTheme)
    localStorage.setItem(brandThemeStorageKey, newTheme)
    applyBrandThemeState(root, newTheme)
    setBrandTheme(newTheme)
  }, [brandThemeStorageKey, isBrandThemeListEnabled])

  const setBrandThemeListEnabledAndStore = useCallback((enabled: boolean) => {
    const root = window.document.documentElement
    localStorage.setItem(BRAND_THEME_LIST_ENABLED_STORAGE_KEY, enabled ? "true" : "false")
    setBrandThemeListEnabled(enabled)

    if (enabled) {
      const currentAppearance = readStoredAppearance(storageKey, defaultTheme)
      localStorage.setItem(APPEARANCE_BEFORE_BRAND_LIST_STORAGE_KEY, currentAppearance)
      const listSelection = readStoredBrandThemeListSelection()
      localStorage.setItem(brandThemeStorageKey, listSelection)
      applyBrandThemeState(root, listSelection)
      setBrandTheme(listSelection)
      return
    }

    const restoredAppearance = localStorage.getItem(APPEARANCE_BEFORE_BRAND_LIST_STORAGE_KEY) as Theme | null
    const nextAppearance: Theme =
      restoredAppearance === "dark" || restoredAppearance === "light" || restoredAppearance === "system"
        ? restoredAppearance
        : readStoredAppearance(storageKey, defaultTheme)

    localStorage.setItem(storageKey, nextAppearance)
    localStorage.setItem(brandThemeStorageKey, DEFAULT_V3RII_THEME)
    clearBrandThemeState(root)
    applyAppearanceClass(root, nextAppearance)
    setTheme(nextAppearance)
    setBrandTheme(DEFAULT_V3RII_THEME)
  }, [brandThemeStorageKey, defaultTheme, storageKey])

  const value = useMemo(() => ({
    theme,
    brandTheme,
    isBrandThemeListEnabled,
    v3riiAppearanceRevision,
    setTheme: setThemeAndStore,
    setBrandTheme: setBrandThemeAndStore,
    setBrandThemeListEnabled: setBrandThemeListEnabledAndStore,
    toggleV3riiAppearanceOverride: handleToggleV3riiAppearanceOverride,
  }), [theme, brandTheme, isBrandThemeListEnabled, v3riiAppearanceRevision, setThemeAndStore, setBrandThemeAndStore, setBrandThemeListEnabledAndStore, handleToggleV3riiAppearanceOverride])

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
