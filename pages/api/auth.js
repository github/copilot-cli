export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action } = req.body

  if (action === 'login') {
    try {
      // Check if GitHub token is available
      const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN
      
      if (!token) {
        return res.status(401).json({ 
          error: 'GitHub token not found. Please set GH_TOKEN or GITHUB_TOKEN environment variable in your Vercel deployment settings.' 
        })
      }

      // Validate the token by making a simple GitHub API call
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })

      if (!response.ok) {
        return res.status(401).json({ 
          error: 'Invalid GitHub token. Please check your token permissions.' 
        })
      }

      const userData = await response.json()
      
      return res.status(200).json({ 
        success: true,
        user: {
          login: userData.login,
          name: userData.name,
          avatar_url: userData.avatar_url
        },
        message: 'Successfully authenticated with GitHub!'
      })

    } catch (error) {
      console.error('Authentication error:', error)
      return res.status(500).json({ 
        error: `Authentication failed: ${error.message}` 
      })
    }
  }

  if (action === 'logout') {
    // In a real implementation, you might want to invalidate sessions
    return res.status(200).json({ 
      success: true,
      message: 'Logged out successfully' 
    })
  }

  return res.status(400).json({ 
    error: 'Invalid action. Supported actions: login, logout' 
  })
}