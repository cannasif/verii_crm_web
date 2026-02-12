import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "@/components/theme-provider"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  variant?: 'default' | 'icon';
}

export function ThemeToggle({ variant = 'default' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation()
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const updateIsDark = () => {
      if (theme === "dark") {
        setIsDark(true)
      } else if (theme === "light") {
        setIsDark(false)
      } else {
        setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches)
      }
    }

    updateIsDark()

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      const handleChange = () => updateIsDark()
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }
  }, [theme])

  const handleToggle = (checked: boolean) => {
    setTheme(checked ? "dark" : "light")
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={cn(
          "w-12 h-12 rounded-full border border-white/20 bg-zinc-900/80 backdrop-blur-xl shadow-lg shadow-black/40",
          "flex items-center justify-center transition-all duration-300",
          "hover:scale-110 active:scale-95 group",
          "hover:border-orange-500/30 hover:bg-zinc-800",
          "hover:shadow-[0_0_15px_rgba(249,115,22,0.3)]"
        )}
        aria-label={t('theme.toggle')}
      >
        {isDark ? (
          <Sun className="h-5 w-5 text-slate-200 group-hover:text-orange-400 transition-colors" />
        ) : (
          <Moon className="h-5 w-5 text-slate-200 group-hover:text-blue-400 transition-colors" />
        )}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Sun className="h-4 w-4 text-muted-foreground" />
      <Switch
        checked={isDark}
        onCheckedChange={handleToggle}
        aria-label={t('theme.toggle')}
      />
      <Moon className="h-4 w-4 text-muted-foreground" />
    </div>
  )
}