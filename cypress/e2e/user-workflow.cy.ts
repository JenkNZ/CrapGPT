describe('AgentForge User Workflow', () => {
  beforeEach(() => {
    // Visit the application
    cy.visit('/')
  })

  describe('Landing Page', () => {
    it('should display the professional landing page', () => {
      cy.contains('Enterprise AI')
      cy.contains('Orchestration Platform')
      cy.contains('Start Free Trial')
      cy.contains('View Demo')
    })

    it('should show feature cards', () => {
      cy.contains('Multi-Agent Delegation')
      cy.contains('Enterprise Security')
      cy.contains('Seamless Integrations')
      cy.contains('Advanced Analytics')
    })

    it('should navigate to login page', () => {
      cy.get('a[href="/login"]').first().click()
      cy.url().should('include', '/login')
    })
  })

  describe('Authentication Flow', () => {
    beforeEach(() => {
      cy.visit('/login')
    })

    it('should display professional login page', () => {
      cy.contains('Welcome back')
      cy.contains('Sign in to your AgentForge account')
      cy.contains('Continue with Google')
      cy.contains('Continue with GitHub')
    })

    it('should show enterprise branding features', () => {
      cy.contains('Enterprise Ready')
      cy.contains('Secure by Design')
      cy.contains('Lightning Fast')
    })

    it('should handle OAuth flow initiation', () => {
      // Test Google OAuth
      cy.get('a[href="/auth/google"]').should('exist')
      
      // Test GitHub OAuth
      cy.get('a[href="/auth/github"]').should('exist')
    })

    it('should navigate to demo mode', () => {
      cy.get('a[href="/?demo=true"]').click()
      cy.url().should('include', '/?demo=true')
    })
  })

  describe('Chat Interface (Authenticated)', () => {
    beforeEach(() => {
      // Mock authenticated state
      cy.window().then((win) => {
        win.localStorage.setItem('auth-token', 'mock-token')
      })
      cy.visit('/')
    })

    it('should display enterprise chat interface', () => {
      cy.contains('AgentForge')
      cy.contains('New Chat')
      cy.get('[placeholder="Search chats..."]').should('exist')
    })

    it('should create new chat session', () => {
      cy.get('button').contains('New Chat').click()
      
      // Should show new chat in sidebar
      cy.contains('New Chat').should('be.visible')
    })

    it('should send and receive messages', () => {
      // Create a new chat first
      cy.get('button').contains('New Chat').click()
      
      // Type and send message
      cy.get('textarea[placeholder*="Message"]').type('Hello, how can you help me?')
      cy.get('button[type="submit"]').click()
      
      // Should see user message
      cy.contains('Hello, how can you help me?').should('be.visible')
    })

    it('should switch between agents', () => {
      cy.get('select').select('Researcher')
      cy.contains('Researcher').should('be.visible')
    })

    it('should search chat sessions', () => {
      cy.get('[placeholder="Search chats..."]').type('test')
      // Should filter sessions based on search
    })
  })

  describe('Settings Page', () => {
    beforeEach(() => {
      // Mock authenticated state
      cy.window().then((win) => {
        win.localStorage.setItem('auth-token', 'mock-token')
      })
      cy.visit('/settings')
    })

    it('should display enterprise settings page', () => {
      cy.contains('Settings')
      cy.contains('Manage your account and preferences')
      cy.contains('Enterprise')
    })

    it('should navigate between settings tabs', () => {
      cy.contains('Profile').click()
      cy.contains('Profile Information').should('be.visible')
      
      cy.contains('Security').click()
      cy.contains('Security Settings').should('be.visible')
      
      cy.contains('Notifications').click()
      cy.contains('Notification Preferences').should('be.visible')
    })

    it('should update profile information', () => {
      cy.contains('Profile').click()
      
      cy.get('#name').clear().type('Updated Test User')
      cy.get('button').contains('Save Changes').click()
      
      // Should show success feedback
      cy.contains('Updated Test User').should('be.visible')
    })

    it('should toggle security settings', () => {
      cy.contains('Security').click()
      
      // Toggle 2FA
      cy.get('[role="switch"]').first().click()
      
      // Should update the setting
    })

    it('should manage notification preferences', () => {
      cy.contains('Notifications').click()
      
      // Toggle email notifications
      cy.get('[role="switch"]').first().click()
      
      cy.get('button').contains('Save Preferences').click()
    })
  })

  describe('Connections Management', () => {
    beforeEach(() => {
      // Mock authenticated state
      cy.window().then((win) => {
        win.localStorage.setItem('auth-token', 'mock-token')
      })
      cy.visit('/connections')
    })

    it('should display connections page', () => {
      cy.contains('Connection Wizard').should('be.visible')
      cy.contains('Connection Manager').should('be.visible')
    })

    it('should create new connection', () => {
      // This would test the connection wizard flow
      cy.get('select').select('OpenOps')
      cy.get('[placeholder*="API Key"]').type('test-api-key')
      cy.get('button').contains('Create Connection').click()
    })

    it('should test existing connections', () => {
      // Test connection functionality
      cy.get('button').contains('Test Connection').click()
      cy.contains('Connection successful').should('be.visible')
    })

    it('should test agent execution', () => {
      // Test the OpenOps agent test component
      cy.get('select').select('My OpenOps Connection')
      cy.get('[placeholder*="Flow ID"]').type('test-flow-123')
      cy.get('[placeholder*="Parameters"]').type('{"input": "test"}')
      cy.get('button').contains('Execute Flow').click()
      
      // Should show execution results
      cy.contains('Execution Results').should('be.visible')
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      // Simulate network failure
      cy.intercept('GET', '/api/**', { forceNetworkError: true })
      
      cy.visit('/')
      
      // Should show appropriate error message
      cy.contains('Connection error').should('be.visible')
    })

    it('should handle authentication errors', () => {
      // Mock expired token
      cy.intercept('GET', '/api/user/profile', { statusCode: 401 })
      
      cy.visit('/')
      
      // Should redirect to login
      cy.url().should('include', '/login')
    })

    it('should handle validation errors', () => {
      cy.visit('/settings')
      
      // Try to save invalid profile data
      cy.get('#email').clear().type('invalid-email')
      cy.get('button').contains('Save Changes').click()
      
      // Should show validation error
      cy.contains('Please enter a valid email').should('be.visible')
    })
  })

  describe('Accessibility', () => {
    it('should be keyboard navigable', () => {
      cy.visit('/')
      
      // Tab through interactive elements
      cy.get('body').tab()
      cy.focused().should('be.visible')
      
      cy.focused().tab()
      cy.focused().should('be.visible')
    })

    it('should have proper ARIA labels', () => {
      cy.visit('/')
      
      cy.get('[aria-label]').should('have.length.greaterThan', 0)
      cy.get('[role="button"]').should('exist')
    })

    it('should support screen readers', () => {
      cy.visit('/')
      
      // Check for proper heading hierarchy
      cy.get('h1').should('exist')
      cy.get('h2').should('exist')
      
      // Check for alt text on images
      cy.get('img').should('have.attr', 'alt')
    })
  })

  describe('Performance', () => {
    it('should load quickly', () => {
      const start = Date.now()
      
      cy.visit('/')
      
      cy.then(() => {
        const loadTime = Date.now() - start
        expect(loadTime).to.be.lessThan(3000) // Should load within 3 seconds
      })
    })

    it('should handle large datasets efficiently', () => {
      // Mock large dataset
      cy.intercept('GET', '/api/chat/sessions', { 
        fixture: 'large-sessions-list.json' 
      })
      
      cy.visit('/')
      
      // Should render without performance issues
      cy.get('[data-testid="chat-sessions"]').should('be.visible')
    })
  })

  describe('Mobile Responsiveness', () => {
    it('should work on mobile devices', () => {
      cy.viewport('iphone-x')
      cy.visit('/')
      
      // Should show mobile-optimized layout
      cy.get('[data-testid="mobile-menu"]').should('be.visible')
    })

    it('should handle touch interactions', () => {
      cy.viewport('iphone-x')
      cy.visit('/')
      
      // Touch interactions should work
      cy.get('button').first().trigger('touchstart')
    })
  })
})