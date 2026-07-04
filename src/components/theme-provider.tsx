import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import {
  APPEARANCE_BEFORE_BRAND_LIST_STORAGE_KEY,
  BRAND_THEME_CLASS_PREFIX,
  BRAND_THEME_LIST_ENABLED_STORAGE_KEY,
  BRAND_THEME_LIST_SELECTION_STORAGE_KEY,
  BRAND_THEME_STORAGE_KEY,
  type BrandTheme,
  brandThemes,
  getBrandThemeClass,
  isBrandTheme,
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
  setTheme: (theme: Theme) => void
  setBrandTheme: (theme: BrandTheme) => void
  setBrandThemeListEnabled: (enabled: boolean) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  brandTheme: "v3rii",
  isBrandThemeListEnabled: false,
  setTheme: () => null,
  setBrandTheme: () => null,
  setBrandThemeListEnabled: () => null,
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

  const [theme, setTheme] = useState<Theme>(() => {
    const appearance = readStoredAppearance(storageKey, defaultTheme)
    if (localStorage.getItem(BRAND_THEME_LIST_ENABLED_STORAGE_KEY) === "true") {
      return "light"
    }
    return appearance
  })

  const [brandTheme, setBrandTheme] = useState<BrandTheme>(() => {
    if (localStorage.getItem(BRAND_THEME_LIST_ENABLED_STORAGE_KEY) === "true") {
      return readStoredBrandThemeListSelection()
    }
    return DEFAULT_V3RII_THEME
  })

  useEffect(() => {
    const root = window.document.documentElement

    const applyTheme = () => {
      root.classList.remove("light", "dark")

      if (theme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        root.classList.add(systemTheme)
        return
      }

      root.classList.add(theme)
    }

    applyTheme()

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      const handleChange = () => applyTheme()
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }
  }, [theme])

  useEffect(() => {
    const root = window.document.documentElement
    const themeClasses = brandThemes.map((item) => item.className)
    root.classList.remove(...themeClasses)
    root.classList.add(getBrandThemeClass(brandTheme))
    root.dataset.brandTheme = brandTheme
  }, [brandTheme])

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
    setBrandTheme(newTheme)
  }, [brandThemeStorageKey, isBrandThemeListEnabled])

  const setBrandThemeListEnabledAndStore = useCallback((enabled: boolean) => {
    localStorage.setItem(BRAND_THEME_LIST_ENABLED_STORAGE_KEY, enabled ? "true" : "false")
    setBrandThemeListEnabled(enabled)

    if (enabled) {
      const currentAppearance = readStoredAppearance(storageKey, defaultTheme)
      localStorage.setItem(APPEARANCE_BEFORE_BRAND_LIST_STORAGE_KEY, currentAppearance)
      const listSelection = readStoredBrandThemeListSelection()
      localStorage.setItem(brandThemeStorageKey, listSelection)
      setBrandTheme(listSelection)
      setTheme("light")
      return
    }

    const restoredAppearance = localStorage.getItem(APPEARANCE_BEFORE_BRAND_LIST_STORAGE_KEY) as Theme | null
    const nextAppearance: Theme =
      restoredAppearance === "dark" || restoredAppearance === "light" || restoredAppearance === "system"
        ? restoredAppearance
        : readStoredAppearance(storageKey, defaultTheme)

    localStorage.setItem(storageKey, nextAppearance)
    localStorage.setItem(brandThemeStorageKey, DEFAULT_V3RII_THEME)
    setTheme(nextAppearance)
    setBrandTheme(DEFAULT_V3RII_THEME)
  }, [brandThemeStorageKey, defaultTheme, storageKey])

  useEffect(() => {
    if (!isBrandThemeListEnabled) {
      return
    }
    if (theme !== "light") {
      setTheme("light")
    }
  }, [isBrandThemeListEnabled, theme])

  const value = useMemo(() => ({
    theme,
    brandTheme,
    isBrandThemeListEnabled,
    setTheme: setThemeAndStore,
    setBrandTheme: setBrandThemeAndStore,
    setBrandThemeListEnabled: setBrandThemeListEnabledAndStore,
  }), [theme, brandTheme, isBrandThemeListEnabled, setThemeAndStore, setBrandThemeAndStore, setBrandThemeListEnabledAndStore])

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
