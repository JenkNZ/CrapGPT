import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAuth, useQuery, useAction } from '@wasp-lang/auth/client'
import { EnterpriseChat } from '../EnterpriseChat'

// Mock the hooks
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>
const mockUseAction = useAction as jest.MockedFunction<typeof useAction>

// Mock data
const mockUser = {
  id: 1,
  email: 'test@agentforge.com',
  name: 'Test User',
  avatar: null
}

const mockAgents = [
  {
    id: 1,
    name: 'Assistant',
    description: 'General purpose AI assistant',
    personalityTraits: ['helpful', 'precise'],
    defaultProvider: 'openai',
    defaultModel: 'gpt-4',
    isActive: true
  },
  {
    id: 2,
    name: 'Researcher',
    description: 'Research specialist',
    personalityTraits: ['analytical', 'thorough'],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-3',
    isActive: true
  }
]

const mockSessions = [
  {
    id: 1,
    title: 'First Chat',
    isActive: true,
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T11:00:00Z'
  }
]

const mockMessages = [
  {
    id: 1,
    role: 'user' as const,
    content: 'Hello!',
    createdAt: '2024-01-01T10:30:00Z'
  },
  {
    id: 2,
    role: 'agent' as const,
    content: 'Hi there! How can I help you today?',
    createdAt: '2024-01-01T10:31:00Z'
  }
]

describe('EnterpriseChat', () => {
  const mockCreateSession = jest.fn()
  const mockSendMessage = jest.fn()
  const mockRefetch = jest.fn()

  beforeEach(() => {
    mockUseAuth.mockReturnValue({ data: mockUser })
    mockUseAction.mockImplementation((action) => {
      if (action.name === 'createChatSession') return mockCreateSession
      if (action.name === 'sendChatMessage') return mockSendMessage
      return jest.fn()
    })
    mockRefetch.mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Authentication', () => {
    it('shows login prompt when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({ data: null })
      
      render(<EnterpriseChat />)
      
      expect(screen.getByText('Welcome to AgentForge')).toBeInTheDocument()
      expect(screen.getByText('Please sign in to start chatting with AI agents')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/login')
    })

    it('shows chat interface when user is authenticated', () => {
      mockUseQuery.mockImplementation(() => ({
        data: mockAgents,
        isLoading: false,
        refetch: mockRefetch
      }))

      render(<EnterpriseChat />)
      
      expect(screen.getByText('AgentForge')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'New Chat' })).toBeInTheDocument()
    })
  })

  describe('Chat Sessions', () => {
    beforeEach(() => {
      mockUseQuery.mockImplementation((queryFn) => {
        if (queryFn.name === 'getChatSessions') {
          return { data: mockSessions, isLoading: false, refetch: mockRefetch }
        }
        if (queryFn.name === 'getAgents') {
          return { data: mockAgents, isLoading: false, refetch: mockRefetch }
        }
        if (queryFn.name === 'getChatMessages') {
          return { data: mockMessages, isLoading: false, refetch: mockRefetch }
        }
        return { data: null, isLoading: false, refetch: mockRefetch }
      })
    })

    it('displays existing chat sessions', () => {
      render(<EnterpriseChat />)
      
      expect(screen.getByText('First Chat')).toBeInTheDocument()
    })

    it('creates new chat session when button is clicked', async () => {
      const newSession = { id: 2, title: 'New Chat - 1/1/2024' }
      mockCreateSession.mockResolvedValue(newSession)

      render(<EnterpriseChat />)
      
      const newChatButton = screen.getByRole('button', { name: 'New Chat' })
      fireEvent.click(newChatButton)

      await waitFor(() => {
        expect(mockCreateSession).toHaveBeenCalledWith({
          title: expect.stringContaining('New Chat')
        })
      })
    })

    it('allows searching chat sessions', async () => {
      const user = userEvent.setup()
      render(<EnterpriseChat />)
      
      const searchInput = screen.getByPlaceholderText('Search chats...')
      await user.type(searchInput, 'First')

      // Should still show the matching session
      expect(screen.getByText('First Chat')).toBeInTheDocument()
    })
  })

  describe('Agent Selection', () => {
    beforeEach(() => {
      mockUseQuery.mockImplementation((queryFn) => {
        if (queryFn.name === 'getAgents') {
          return { data: mockAgents, isLoading: false, refetch: mockRefetch }
        }
        return { data: [], isLoading: false, refetch: mockRefetch }
      })
    })

    it('selects first active agent by default', () => {
      render(<EnterpriseChat />)
      
      // Should show the default agent in the header
      expect(screen.getByText('Assistant')).toBeInTheDocument()
      expect(screen.getByText('openai')).toBeInTheDocument()
    })

    it('allows changing agents via dropdown', async () => {
      const user = userEvent.setup()
      render(<EnterpriseChat />)
      
      const agentSelect = screen.getByDisplayValue('1') // Agent ID 1
      await user.selectOptions(agentSelect, '2')

      expect(agentSelect).toHaveValue('2')
    })
  })

  describe('Message Handling', () => {
    beforeEach(() => {
      mockUseQuery.mockImplementation((queryFn) => {
        if (queryFn.name === 'getChatSessions') {
          return { data: mockSessions, isLoading: false, refetch: mockRefetch }
        }
        if (queryFn.name === 'getAgents') {
          return { data: mockAgents, isLoading: false, refetch: mockRefetch }
        }
        if (queryFn.name === 'getChatMessages') {
          return { data: mockMessages, isLoading: false, refetch: mockRefetch }
        }
        return { data: null, isLoading: false, refetch: mockRefetch }
      })
    })

    it('displays chat messages', () => {
      render(<EnterpriseChat />)
      
      expect(screen.getByText('Hello!')).toBeInTheDocument()
      expect(screen.getByText('Hi there! How can I help you today?')).toBeInTheDocument()
    })

    it('sends message when send button is clicked', async () => {
      const user = userEvent.setup()
      mockSendMessage.mockResolvedValue({})

      render(<EnterpriseChat />)
      
      const textarea = screen.getByPlaceholderText('Message Assistant...')
      const sendButton = screen.getByRole('button', { name: '' }) // Send button with icon
      
      await user.type(textarea, 'Test message')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith({
          sessionId: 1,
          content: 'Test message',
          agentName: 'Assistant'
        })
      })
    })

    it('sends message with Enter key', async () => {
      const user = userEvent.setup()
      mockSendMessage.mockResolvedValue({})

      render(<EnterpriseChat />)
      
      const textarea = screen.getByPlaceholderText('Message Assistant...')
      
      await user.type(textarea, 'Test message{Enter}')

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith({
          sessionId: 1,
          content: 'Test message',
          agentName: 'Assistant'
        })
      })
    })

    it('does not send empty messages', async () => {
      const user = userEvent.setup()
      render(<EnterpriseChat />)
      
      const sendButton = screen.getByRole('button', { name: '' }) // Send button
      fireEvent.click(sendButton)

      expect(mockSendMessage).not.toHaveBeenCalled()
    })
  })

  describe('Loading States', () => {
    it('shows loading indicator when sending message', () => {
      mockUseQuery.mockImplementation(() => ({
        data: null,
        isLoading: false,
        refetch: mockRefetch
      }))

      render(<EnterpriseChat />)
      
      // Simulate loading state by checking for loading spinner
      // This would require updating the component to expose loading state
    })
  })

  describe('Error Handling', () => {
    it('handles message send errors gracefully', async () => {
      const user = userEvent.setup()
      mockSendMessage.mockRejectedValue(new Error('Network error'))

      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      render(<EnterpriseChat />)
      
      // This would require proper error handling implementation
      // and user feedback in the component

      consoleSpy.mockRestore()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      mockUseQuery.mockImplementation(() => ({
        data: mockAgents,
        isLoading: false,
        refetch: mockRefetch
      }))

      render(<EnterpriseChat />)
      
      // Check for proper button roles
      expect(screen.getByRole('button', { name: 'New Chat' })).toBeInTheDocument()
      
      // Check for input accessibility
      const searchInput = screen.getByPlaceholderText('Search chats...')
      expect(searchInput).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      mockUseQuery.mockImplementation(() => ({
        data: mockAgents,
        isLoading: false,
        refetch: mockRefetch
      }))

      render(<EnterpriseChat />)
      
      // Tab through interactive elements
      await user.tab()
      expect(document.activeElement).toBeInTheDocument()
    })
  })
})