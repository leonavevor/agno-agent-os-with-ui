'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from '@/components/ui/icon'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from '@/components/ui/collapsible'

interface SidebarSectionProps {
    title: string
    children: React.ReactNode
    defaultOpen?: boolean
    className?: string
}

export const SidebarSection = ({
    title,
    children,
    defaultOpen = false,
    className = ''
}: SidebarSectionProps) => {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className={`w-full ${className}`}
        >
            <CollapsibleTrigger className="flex w-full items-center justify-between text-xs font-medium uppercase text-primary hover:text-primary/80 transition-colors">
                <span>{title}</span>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <Icon type="chevron-down" size="xs" className="text-primary" />
                </motion.div>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden">
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="pt-2"
                        >
                            {children}
                        </motion.div>
                    )}
                </AnimatePresence>
            </CollapsibleContent>
        </Collapsible>
    )
}
