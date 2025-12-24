'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import Icon from '@/components/ui/icon'
import { useStore } from '@/store'

type Theme = 'light' | 'dark-gray' | 'dark'

export function ThemeSwitcher() {
    const theme = useStore((state) => state.theme)
    const setTheme = useStore((state) => state.setTheme)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!mounted) return

        const root = document.documentElement
        root.classList.remove('theme-light', 'theme-dark-gray', 'theme-dark')
        root.classList.add(`theme-${theme}`)

        // Update CSS variables based on theme
        if (theme === 'light') {
            root.style.setProperty('--background', '#FFFFFF')
            root.style.setProperty('--background-secondary', '#F5F5F5')
            root.style.setProperty('--accent', '#E5E5E5')
            root.style.setProperty('--foreground', '#111113')
            root.style.setProperty('--muted', '#52525B')
            root.style.setProperty('--primary', '#111113')
        } else if (theme === 'dark-gray') {
            root.style.setProperty('--background', '#18181B')
            root.style.setProperty('--background-secondary', '#3F3F46')
            root.style.setProperty('--accent', '#3F3F46')
            root.style.setProperty('--foreground', '#FAFAFA')
            root.style.setProperty('--muted', '#A1A1AA')
            root.style.setProperty('--primary', '#FAFAFA')
        } else {
            root.style.setProperty('--background', '#111113')
            root.style.setProperty('--background-secondary', '#27272A')
            root.style.setProperty('--accent', '#27272A')
            root.style.setProperty('--foreground', '#FAFAFA')
            root.style.setProperty('--muted', '#A1A1AA')
            root.style.setProperty('--primary', '#FAFAFA')
        }
    }, [theme, mounted])

    if (!mounted) return null

    const cycleTheme = () => {
        const themeOrder: Theme[] = ['light', 'dark-gray', 'dark']
        const currentIndex = themeOrder.indexOf(theme)
        const nextIndex = (currentIndex + 1) % themeOrder.length
        setTheme(themeOrder[nextIndex])
    }

    const getIcon = () => {
        if (theme === 'light') return 'sun'
        if (theme === 'dark-gray') return 'moon'
        return 'moon'
    }

    const getTitle = () => {
        if (theme === 'light') return 'Switch to Dark Gray'
        if (theme === 'dark-gray') return 'Switch to Dark'
        return 'Switch to Light'
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={cycleTheme}
            className="h-8 w-8 rounded-xl"
            title={getTitle()}
        >
            <Icon
                type={getIcon()}
                size="xs"
                className="text-muted-foreground hover:text-foreground transition-colors"
            />
        </Button>
    )
}
