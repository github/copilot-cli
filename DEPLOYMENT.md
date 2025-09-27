# GitHub Copilot CLI Web Interface - Vercel Deployment Guide

This guide will help you deploy the GitHub Copilot CLI web interface to Vercel without modifying the core application functionality.

## Prerequisites

1. **GitHub Account** with active Copilot subscription
2. **Vercel Account** (free tier available)
3. **GitHub Personal Access Token** with Copilot permissions

## Step 1: Create GitHub Personal Access Token

1. Go to [GitHub Settings > Personal Access Tokens](https://github.com/settings/personal-access-tokens/new)
2. Click "Generate new token (classic)"
3. Give it a descriptive name like "Copilot CLI Web Interface"
4. Under "Permissions", click "add permissions" and select:
   - ✅ **Copilot Requests** (required)
   - ✅ **repo** (if you want to access private repositories)
5. Click "Generate token"
6. **Copy the token immediately** - you won't be able to see it again

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. **Fork this repository** to your GitHub account
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "New Project"
4. Import your forked repository
5. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (default)

### Option B: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy the project:
   ```bash
   vercel
   ```

## Step 3: Configure Environment Variables

In your Vercel project dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add the following variables:

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `GH_TOKEN` | `your_github_token_here` | Your GitHub Personal Access Token |
| `NODE_ENV` | `production` | Environment setting |

**Important**: Make sure to set these for all environments (Production, Preview, Development).

## Step 4: Redeploy

After setting the environment variables:

1. Go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Select **"Redeploy"**

## Step 5: Test Your Deployment

1. Visit your Vercel URL (e.g., `https://your-project.vercel.app`)
2. Click "Login with GitHub"
3. If authentication succeeds, you should see the chat interface
4. Try sending a prompt like "Help me write a Python function to calculate fibonacci numbers"

## Troubleshooting

### Common Issues

**1. "GitHub token not found" error**
- Ensure `GH_TOKEN` is set in Vercel environment variables
- Check that the token has "Copilot Requests" permission
- Redeploy after adding environment variables

**2. "GitHub Copilot CLI not found" error**
- The `@github/copilot` package should be automatically installed during build
- Check the build logs in Vercel dashboard for any installation errors

**3. "Authentication failed" error**
- Verify your GitHub token is valid and not expired
- Ensure the token has the correct permissions
- Check that your GitHub account has an active Copilot subscription

**4. "Request timeout" error**
- Vercel has a 30-second timeout for API routes
- Try breaking down complex requests into smaller parts
- Check if your prompt is too long or complex

### Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GH_TOKEN` | Yes | GitHub Personal Access Token | `ghp_xxxxxxxxxxxx` |
| `GITHUB_TOKEN` | No | Alternative token variable | `ghp_xxxxxxxxxxxx` |
| `COPILOT_MODEL` | No | AI model to use | `claude-sonnet-4` or `gpt-5` |
| `NODE_ENV` | Yes | Environment setting | `production` |

## Security Considerations

1. **Never commit your GitHub token** to the repository
2. **Use environment variables** for all sensitive data
3. **Regularly rotate your tokens** for security
4. **Monitor usage** in your GitHub settings
5. **Consider using fine-grained tokens** for better security

## Customization

### Changing the UI
- Modify `pages/index.js` for the main interface
- Update `styles/Home.module.css` for styling
- Add new components in the `components/` directory

### Adding Features
- Create new API routes in `pages/api/`
- Extend the existing API routes for additional functionality
- Add new environment variables as needed

### Performance Optimization
- The app uses Vercel's serverless functions
- Consider implementing caching for frequently used responses
- Monitor function execution time in Vercel dashboard

## Support

- **GitHub Issues**: Report bugs or request features
- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **GitHub Copilot CLI**: [github.com/github/copilot-cli](https://github.com/github/copilot-cli)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.