import '@testing-library/jest-dom'

// Mock Wasp auth
jest.mock('@wasp-lang/auth/client', () => ({
  useAuth: jest.fn(),
  useQuery: jest.fn(),
  useAction: jest.fn()
}))

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  })
}))

// Mock environment variables
process.env.NODE_ENV = 'test'

// Global test utilities
global.console = {
  ...console,
  // Uncomment to ignore specific console methods in tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn()
}

// Setup DOM cleanup
afterEach(() => {
  jest.clearAllMocks()
})