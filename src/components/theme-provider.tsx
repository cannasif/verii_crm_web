import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import {
  BRAND_THEME_CLASS_PREFIX,
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
  setTheme: (theme: Theme) => void
  setBrandTheme: (theme: BrandTheme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  brandTheme: "v3rii",
  setTheme: () => null,
  setBrandTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  brandThemeStorageKey = BRAND_THEME_STORAGE_KEY,
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )
  const [brandTheme, setBrandTheme] = useState<BrandTheme>(() => {
    const stored = localStorage.getItem(brandThemeStorageKey)
    return isBrandTheme(stored) ? stored : "v3rii"
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
    localStorage.setItem(storageKey, newTheme)
    setTheme(newTheme)
  }, [storageKey])

  const setBrandThemeAndStore = useCallback((newTheme: BrandTheme) => {
    const root = window.document.documentElement
    root.classList.forEach((className) => {
      if (className.startsWith(BRAND_THEME_CLASS_PREFIX)) {
        root.classList.remove(className)
      }
    })
    localStorage.setItem(brandThemeStorageKey, newTheme)
    setBrandTheme(newTheme)
  }, [brandThemeStorageKey])

  const value = useMemo(() => ({
    theme,
    brandTheme,
    setTheme: setThemeAndStore,
    setBrandTheme: setBrandThemeAndStore,
  }), [theme, brandTheme, setThemeAndStore, setBrandThemeAndStore])

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
