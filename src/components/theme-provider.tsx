"use client"

import * as React from "react"

type Theme = "light" | "dark" | "system"

type ThemeProviderState = {
  theme: string
  setTheme: (theme: string) => void
  resolvedTheme: string
  systemTheme?: string
  themes: string[]
}

const ThemeContext = React.createContext<ThemeProviderState | undefined>(undefined)

const STORAGE_KEY = "theme"
const DEFAULT_THEME = "dark"
const THEMES = ["light", "dark"] as const

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyTheme(theme: string, attribute: string = "class", enableColorScheme = true) {
  const root = document.documentElement
  const resolved = theme === "system" ? getSystemTheme() : theme

  if (attribute === "class") {
    root.classList.remove("light", "dark")
    if (resolved === "light" || resolved === "dark") {
      root.classList.add(resolved)
    }
  } else {
    root.setAttribute(attribute, resolved)
  }

  if (enableColorScheme) {
    const colorScheme = THEMES.includes(resolved as typeof THEMES[number]) ? resolved : null
    root.style.colorScheme = colorScheme ?? ""
  }

  return resolved
}

export function ThemeProvider({
  children,
  defaultTheme = DEFAULT_THEME,
  storageKey = STORAGE_KEY,
  attribute = "class",
  enableSystem = false,
  enableColorScheme = true,
  disableTransitionOnChange = false,
  ...props
}: {
  children: React.ReactNode
  defaultTheme?: string
  storageKey?: string
  attribute?: string
  enableSystem?: boolean
  enableColorScheme?: boolean
  disableTransitionOnChange?: boolean
  forcedTheme?: string
  themes?: string[]
  value?: Record<string, string>
  nonce?: string
  scriptProps?: React.ScriptHTMLAttributes<HTMLScriptElement>
}) {
  // Initialize with defaultTheme on both server and client to avoid hydration mismatch.
  // Actual stored value is synced in useEffect after hydration.
  const [theme, setThemeState] = React.useState<string>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = React.useState<string>(
    defaultTheme === "system" ? "light" : defaultTheme
  )

  const setTheme = React.useCallback(
    (newTheme: string) => {
      try {
        localStorage.setItem(storageKey, newTheme)
      } catch {}
      setThemeState(newTheme)
      const resolved = applyTheme(newTheme, attribute, enableColorScheme)
      setResolvedTheme(resolved)
    },
    [storageKey, attribute, enableColorScheme]
  )

  React.useEffect(() => {
    const stored = (() => {
      try {
        return localStorage.getItem(storageKey) || defaultTheme
      } catch {
        return defaultTheme
      }
    })()
    setThemeState(stored)
    const resolved = applyTheme(stored, attribute, enableColorScheme)
    setResolvedTheme(resolved)

    if (!enableSystem) return

    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => {
      if (theme === "system" || stored === "system") {
        const sys = getSystemTheme()
        setResolvedTheme(sys)
        applyTheme("system", attribute, enableColorScheme)
      }
    }
    mql.addEventListener("change", handleChange)
    return () => mql.removeEventListener("change", handleChange)
  }, []) // only on mount

  // Update when theme changes
  React.useEffect(() => {
    const resolved = applyTheme(theme, attribute, enableColorScheme)
    setResolvedTheme(resolved)
  }, [theme, attribute, enableColorScheme])

  const value: ThemeProviderState = React.useMemo(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      systemTheme: enableSystem ? getSystemTheme() : undefined,
      themes: enableSystem ? [...THEMES, "system"] : [...THEMES],
    }),
    [theme, resolvedTheme, enableSystem, setTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (context === undefined) {
    // Fallback to match next-themes behavior when used outside provider
    return {
      theme: "light",
      setTheme: () => {},
      resolvedTheme: "light",
      systemTheme: "light",
      themes: ["light", "dark"],
      forcedTheme: undefined,
    } as ThemeProviderState & { forcedTheme?: string }
  }
  return context
}
