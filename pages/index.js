import { useState } from 'react'
import Head from 'next/head'
import styles from '../styles/Home.module.css'

export default function Home() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: input }),
      })

      const data = await response.json()
      
      if (data.error) {
        setOutput(`Error: ${data.error}`)
      } else {
        setOutput(data.result)
      }
    } catch (error) {
      setOutput(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'login' }),
      })

      const data = await response.json()
      
      if (data.success) {
        setIsAuthenticated(true)
        setOutput('Successfully authenticated with GitHub!')
      } else {
        setOutput(`Authentication failed: ${data.error}`)
      }
    } catch (error) {
      setOutput(`Authentication error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>GitHub Copilot CLI Web Interface</title>
        <meta name="description" content="Web interface for GitHub Copilot CLI" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          GitHub Copilot CLI
        </h1>
        
        <p className={styles.description}>
          Web interface for GitHub Copilot CLI - Deployable on Vercel
        </p>

        {!isAuthenticated ? (
          <div className={styles.authSection}>
            <h2>Authentication Required</h2>
            <p>You need to authenticate with GitHub to use Copilot CLI.</p>
            <button 
              onClick={handleLogin}
              disabled={loading}
              className={styles.authButton}
            >
              {loading ? 'Authenticating...' : 'Login with GitHub'}
            </button>
          </div>
        ) : (
          <div className={styles.chatSection}>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.inputGroup}>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter your prompt for GitHub Copilot CLI..."
                  className={styles.textarea}
                  rows={4}
                />
                <button 
                  type="submit" 
                  disabled={loading || !input.trim()}
                  className={styles.submitButton}
                >
                  {loading ? 'Processing...' : 'Send'}
                </button>
              </div>
            </form>

            {output && (
              <div className={styles.outputSection}>
                <h3>Response:</h3>
                <pre className={styles.output}>{output}</pre>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>
          Powered by{' '}
          <a href="https://github.com/github/copilot-cli" target="_blank" rel="noopener noreferrer">
            GitHub Copilot CLI
          </a>
        </p>
      </footer>
    </div>
  )
}