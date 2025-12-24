'use client'

import ChatInput from './ChatInput'
import MessageArea from './MessageArea'
import SkillSuggestions from './SkillSuggestions'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { DateTimeDisplay } from '@/components/DateTimeDisplay'

const ChatArea = () => {
  return (
    <main className="relative m-1.5 flex flex-grow flex-col rounded-xl bg-background">
      {/* Floating Header Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-3 rounded-xl border border-primary/10 bg-background/80 backdrop-blur-sm px-3 py-2">
        <DateTimeDisplay />
        <div className="h-6 w-px bg-primary/20" />
        <ThemeSwitcher />
      </div>
      <MessageArea />
      <div className="sticky bottom-0 ml-9 space-y-2 px-4 pb-2">
        <SkillSuggestions />
        <ChatInput />
      </div>
    </main>
  )
}

export default ChatArea
