import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatPageClient } from '@/app/(auth)/chat/chat-page-client'
import type { UIMessage } from 'ai'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class extends Error {
    code: string
    status: number
    constructor(code: string, message: string, status: number) {
      super(message)
      this.code = code
      this.status = status
      this.name = 'ApiError'
    }
  },
}))

const mockSendMessage = vi.fn()
const mockSetMessages = vi.fn()

vi.mock('@ai-sdk/react', () => ({
  useChat: (opts: { messages: UIMessage[] }) => ({
    messages: opts.messages ?? [],
    sendMessage: mockSendMessage,
    status: 'ready',
    setMessages: mockSetMessages,
  }),
}))

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <span>{children}</span>,
}))

// jsdom doesn't implement scrollTo
Element.prototype.scrollTo = vi.fn()

function makeMessage(overrides: Partial<UIMessage> = {}): UIMessage {
  return {
    id: 'msg-1',
    role: 'user',
    parts: [{ type: 'text', text: 'Hello' }],
    createdAt: new Date(),
    ...overrides,
  } as UIMessage
}

describe('ChatPageClient', () => {
  it('renders the page title', () => {
    render(<ChatPageClient initialMessages={[]} />)
    expect(screen.getByText('Chat')).toBeInTheDocument()
  })

  it('shows empty state when no messages', () => {
    render(<ChatPageClient initialMessages={[]} />)
    expect(screen.getByText('Ask me anything about your finances')).toBeInTheDocument()
  })

  it('renders message input', () => {
    render(<ChatPageClient initialMessages={[]} />)
    expect(screen.getByPlaceholderText('Ask about your finances...')).toBeInTheDocument()
  })

  it('does not show Clear History when no messages', () => {
    render(<ChatPageClient initialMessages={[]} />)
    expect(screen.queryByText('Clear History')).not.toBeInTheDocument()
  })

  it('renders user messages', () => {
    const messages = [
      makeMessage({ role: 'user', parts: [{ type: 'text', text: 'What is my balance?' }] }),
    ]
    render(<ChatPageClient initialMessages={messages} />)
    expect(screen.getByText('What is my balance?')).toBeInTheDocument()
  })

  it('renders assistant messages', () => {
    const messages = [
      makeMessage({ id: 'msg-2', role: 'assistant', parts: [{ type: 'text', text: 'Your balance is R15,000.' }] }),
    ]
    render(<ChatPageClient initialMessages={messages} />)
    expect(screen.getByText('Your balance is R15,000.')).toBeInTheDocument()
  })

  it('shows Clear History button when messages exist', () => {
    const messages = [makeMessage()]
    render(<ChatPageClient initialMessages={messages} />)
    expect(screen.getByText('Clear History')).toBeInTheDocument()
  })
})
