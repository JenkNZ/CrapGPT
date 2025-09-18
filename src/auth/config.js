// Google OAuth configuration
export const getGoogleAuthConfig = () => {
  return {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    scope: ['profile', 'email'],
  }
}

export const getGoogleUserFields = (context, args) => {
  const profile = args.profile
  return {
    email: profile.emails[0].value,
    name: profile.displayName,
    avatar: profile.photos[0]?.value,
    googleId: profile.id,
    isEmailVerified: profile.emails[0].verified || false,
    preferences: JSON.stringify({
      defaultAgent: 'Assistant',
      defaultProvider: 'openrouter',
      theme: 'light',
      language: 'en'
    })
  }
}

// GitHub OAuth configuration  
export const getGitHubAuthConfig = () => {
  return {
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    scope: ['user:email']
  }
}

export const getGitHubUserFields = (context, args) => {
  const profile = args.profile
  return {
    email: profile.emails?.[0]?.value || profile._json.email,
    name: profile.displayName || profile._json.name || profile.username,
    avatar: profile.photos?.[0]?.value || profile._json.avatar_url,
    githubId: profile.id,
    isEmailVerified: true, // GitHub emails are typically verified
    preferences: JSON.stringify({
      defaultAgent: 'Assistant', 
      defaultProvider: 'openrouter',
      theme: 'light',
      language: 'en'
    })
  }
}