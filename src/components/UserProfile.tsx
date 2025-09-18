import React, { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card'
import { Separator } from './ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Switch } from './ui/switch'
import { User, Mail, Settings, LogOut, Upload } from 'lucide-react'
import { useQuery } from '@wasp-lang/react'
import { getUserProfile } from '../queries'
import { updateUserProfile, updateUserPreferences } from '../actions'
import { AgentAvatar } from './AgentAvatar'

export function UserProfile() {
  const { data: user, isLoading, error } = useQuery(getUserProfile)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const [profileData, setProfileData] = useState({
    name: '',
    avatar: ''
  })

  const [preferences, setPreferences] = useState({
    defaultAgent: 'Assistant',
    defaultProvider: 'openrouter',
    theme: 'light',
    language: 'en'
  })

  React.useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        avatar: user.avatar || ''
      })
      
      if (user.preferences) {
        try {
          const parsedPrefs = JSON.parse(user.preferences)
          setPreferences({
            defaultAgent: parsedPrefs.defaultAgent || 'Assistant',
            defaultProvider: parsedPrefs.defaultProvider || 'openrouter',
            theme: parsedPrefs.theme || 'light',
            language: parsedPrefs.language || 'en'
          })
        } catch (e) {
          console.warn('Failed to parse user preferences:', e)
        }
      }
    }
  }, [user])

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      await updateUserProfile(profileData)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update profile:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSavePreferences = async (newPrefs: typeof preferences) => {
    try {
      await updateUserPreferences({ preferences: newPrefs })
      setPreferences(newPrefs)
    } catch (error) {
      console.error('Failed to update preferences:', error)
    }
  }

  const handleLogout = () => {
    window.location.href = '/logout'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading profile...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-destructive">Failed to load profile</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Settings className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
            <p className="text-muted-foreground">
              Manage your profile and preferences
            </p>
          </div>
        </div>

        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Profile Information</span>
            </CardTitle>
            <CardDescription>
              Update your personal information and avatar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-4">
              <AgentAvatar
                name={user?.name || user?.email || 'User'}
                imageUrl={profileData.avatar}
                size="lg"
              />
              <div className="space-y-2">
                <Label htmlFor="avatar">Profile Picture URL</Label>
                <div className="flex space-x-2">
                  <Input
                    id="avatar"
                    placeholder="https://example.com/avatar.jpg"
                    value={profileData.avatar}
                    onChange={(e) => setProfileData({ ...profileData, avatar: e.target.value })}
                    disabled={!isEditing}
                  />
                  <Button variant="outline" size="sm" disabled>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    value={user?.email || ''}
                    disabled
                  />
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="flex space-x-2">
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </CardFooter>
        </Card>

        {/* Preferences Section */}
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>
              Customize your chat experience and default settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defaultAgent">Default Agent</Label>
                <Select
                  value={preferences.defaultAgent}
                  onValueChange={(value) => {
                    const newPrefs = { ...preferences, defaultAgent: value }
                    setPreferences(newPrefs)
                    handleSavePreferences(newPrefs)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Assistant">Assistant</SelectItem>
                    <SelectItem value="Creative Writer">Creative Writer</SelectItem>
                    <SelectItem value="Code Helper">Code Helper</SelectItem>
                    <SelectItem value="Research Assistant">Research Assistant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultProvider">Default AI Provider</Label>
                <Select
                  value={preferences.defaultProvider}
                  onValueChange={(value) => {
                    const newPrefs = { ...preferences, defaultProvider: value }
                    setPreferences(newPrefs)
                    handleSavePreferences(newPrefs)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                    <SelectItem value="fal">FAL AI</SelectItem>
                    <SelectItem value="modelslab">ModelsLab</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={preferences.theme}
                  onValueChange={(value) => {
                    const newPrefs = { ...preferences, theme: value }
                    setPreferences(newPrefs)
                    handleSavePreferences(newPrefs)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={preferences.language}
                  onValueChange={(value) => {
                    const newPrefs = { ...preferences, language: value }
                    setPreferences(newPrefs)
                    handleSavePreferences(newPrefs)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Account management and security options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Email Verification</div>
                <div className="text-sm text-muted-foreground">
                  {user?.isEmailVerified ? 'Your email is verified' : 'Email not verified'}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch checked={user?.isEmailVerified} disabled />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Account Created</div>
                <div className="text-sm text-muted-foreground">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}