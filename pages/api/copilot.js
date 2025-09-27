import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { prompt } = req.body

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' })
  }

  try {
    // Check if GitHub token is available
    const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN
    
    if (!token) {
      return res.status(401).json({ 
        error: 'GitHub token not found. Please set GH_TOKEN or GITHUB_TOKEN environment variable.' 
      })
    }

    // Set up environment variables for the copilot command
    const env = {
      ...process.env,
      GH_TOKEN: token,
      GITHUB_TOKEN: token
    }

    // Execute the copilot command
    // Note: In a real deployment, you might want to use a more secure method
    // or implement a proper API integration instead of executing CLI commands
    const command = `echo "${prompt}" | npx @github/copilot --no-banner`
    
    const { stdout, stderr } = await execAsync(command, { 
      env,
      timeout: 25000, // 25 second timeout
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    })

    if (stderr && !stderr.includes('warning')) {
      console.error('Copilot CLI stderr:', stderr)
    }

    // Return the output
    res.status(200).json({ 
      result: stdout || 'No output received',
      success: true 
    })

  } catch (error) {
    console.error('Error executing copilot command:', error)
    
    // Handle specific error cases
    if (error.code === 'ENOENT') {
      return res.status(500).json({ 
        error: 'GitHub Copilot CLI not found. Please ensure @github/copilot is installed.' 
      })
    }
    
    if (error.code === 'TIMEOUT') {
      return res.status(408).json({ 
        error: 'Request timeout. The operation took too long to complete.' 
      })
    }

    return res.status(500).json({ 
      error: `Failed to execute copilot command: ${error.message}` 
    })
  }
}