'use client'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { TextArea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store'
import useAIChatStreamHandler from '@/hooks/useAIStreamHandler'
import { useQueryState } from 'nuqs'
import Icon from '@/components/ui/icon'
import { routeSkillsAPI } from '@/api/os'

const ChatInput = () => {
  const { chatInputRef } = useStore()

  const { handleStreamResponse } = useAIChatStreamHandler()
  const [selectedAgent] = useQueryState('agent')
  const [teamId] = useQueryState('team')
  const [inputMessage, setInputMessage] = useState('')
  const isStreaming = useStore((state) => state.isStreaming)
  const isEndpointActive = useStore((state) => state.isEndpointActive)
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)
  const setRecommendedSkills = useStore((state) => state.setRecommendedSkills)
  const setIsRoutingSkills = useStore((state) => state.setIsRoutingSkills)
  const routeAbortController = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!isEndpointActive || !selectedEndpoint) {
      setRecommendedSkills([])
      return
    }

    const message = inputMessage.trim()
    if (!message) {
      routeAbortController.current?.abort()
      setIsRoutingSkills(false)
      setRecommendedSkills([])
      return
    }

    const debounceId = setTimeout(async () => {
      routeAbortController.current?.abort()
      const controller = new AbortController()
      routeAbortController.current = controller
      setIsRoutingSkills(true)
      try {
        const skills = await routeSkillsAPI(
          selectedEndpoint,
          message,
          authToken,
          controller.signal
        )
        setRecommendedSkills(skills)
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          toast.error(
            `Error routing skills: ${error instanceof Error ? error.message : String(error)
            }`
          )
          setRecommendedSkills([])
        }
      } finally {
        setIsRoutingSkills(false)
      }
    }, 400)

    return () => {
      clearTimeout(debounceId)
      routeAbortController.current?.abort()
    }
  }, [
    inputMessage,
    authToken,
    isEndpointActive,
    selectedEndpoint,
    setIsRoutingSkills,
    setRecommendedSkills
  ])
  const handleSubmit = async () => {
    if (!inputMessage.trim()) return

    const currentMessage = inputMessage
    setInputMessage('')

    try {
      await handleStreamResponse(currentMessage)
      setRecommendedSkills([])
      setIsRoutingSkills(false)
    } catch (error) {
      toast.error(
        `Error in handleSubmit: ${error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  return (
    <div className="relative mx-auto mb-1 flex w-full max-w-2xl items-end justify-center gap-x-2 font-geist">
      <TextArea
        placeholder={'Ask anything'}
        value={inputMessage}
        onChange={(e) => setInputMessage(e.target.value)}
        onKeyDown={(e) => {
          if (
            e.key === 'Enter' &&
            !e.nativeEvent.isComposing &&
            !e.shiftKey &&
            !isStreaming
          ) {
            e.preventDefault()
            handleSubmit()
          }
        }}
        className="w-full border border-accent bg-primaryAccent px-4 text-sm text-primary focus:border-accent"
        disabled={!(selectedAgent || teamId)}
        ref={chatInputRef}
      />
      <Button
        onClick={handleSubmit}
        disabled={
          !(selectedAgent || teamId) || !inputMessage.trim() || isStreaming
        }
        size="icon"
        className="rounded-xl bg-primary p-5 text-primaryAccent"
      >
        <Icon type="send" color="primaryAccent" />
      </Button>
    </div>
  )
}

export default ChatInput
