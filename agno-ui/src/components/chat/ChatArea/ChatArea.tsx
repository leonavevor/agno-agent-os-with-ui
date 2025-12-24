'use client'

import ChatInput from './ChatInput'
import MessageArea from './MessageArea'
import SkillSuggestions from './SkillSuggestions'
const ChatArea = () => {
  return (
    <main className="relative m-1.5 flex flex-grow flex-col rounded-xl bg-background">
      <MessageArea />
      <div className="sticky bottom-0 ml-9 space-y-2 px-4 pb-2">
        <SkillSuggestions />
        <ChatInput />
      </div>
    </main>
  )
}

export default ChatArea
