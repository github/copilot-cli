# GitHub Copilot CLI - Vercel Web Interface

🌐 **Web interface for GitHub Copilot CLI that works on Vercel without modifying the core application**

This project provides a web-based interface for the GitHub Copilot CLI, making it accessible through a browser and deployable on Vercel. The original CLI functionality remains unchanged - this is just a web wrapper.

## ✨ Features

- 🚀 **One-click deployment** to Vercel
- 🔐 **GitHub authentication** integration
- 💬 **Interactive chat interface** for Copilot CLI
- 📱 **Responsive design** for all devices
- ⚡ **Real-time responses** from GitHub Copilot
- 🔒 **Secure token handling** via environment variables

## 🚀 Quick Start

### 1. Get GitHub Token
1. Go to [GitHub Settings > Personal Access Tokens](https://github.com/settings/personal-access-tokens/new)
2. Create a token with **"Copilot Requests"** permission
3. Copy the token

### 2. Deploy to Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/github-copilot-cli-web)

### 3. Configure Environment
In Vercel dashboard, add:
- `GH_TOKEN` = your GitHub token
- `NODE_ENV` = production

### 4. Use the Interface
Visit your Vercel URL and start chatting with GitHub Copilot!

## 📋 Requirements

- GitHub account with active Copilot subscription
- Vercel account (free tier works)
- GitHub Personal Access Token

## 🛠️ Local Development

```bash
# Clone the repository
git clone https://github.com/your-username/github-copilot-cli-web.git
cd github-copilot-cli-web

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your GitHub token

# Run development server
npm run dev
```

## 📁 Project Structure

```
├── pages/
│   ├── api/
│   │   ├── auth.js          # GitHub authentication
│   │   └── copilot.js       # Copilot CLI integration
│   └── index.js             # Main web interface
├── styles/
│   └── Home.module.css      # Styling
├── vercel.json              # Vercel configuration
├── next.config.js           # Next.js configuration
└── package.json             # Dependencies
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GH_TOKEN` | Yes | GitHub Personal Access Token |
| `GITHUB_TOKEN` | No | Alternative token variable |
| `COPILOT_MODEL` | No | AI model (claude-sonnet-4, gpt-5) |
| `NODE_ENV` | Yes | Environment setting |

### Vercel Settings

- **Framework**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Node.js Version**: 18.x or higher

## 🚨 Important Notes

1. **No Code Changes**: The original GitHub Copilot CLI is not modified
2. **Token Security**: Never commit your GitHub token to the repository
3. **Rate Limits**: Subject to GitHub API and Copilot usage limits
4. **Timeout**: Vercel functions have a 30-second timeout limit

## 🔍 Troubleshooting

### Common Issues

**Authentication Failed**
- Check if your GitHub token is valid
- Ensure token has "Copilot Requests" permission
- Verify your GitHub account has active Copilot subscription

**Build Errors**
- Check Node.js version (requires 18+)
- Verify all dependencies are installed
- Check Vercel build logs for specific errors

**Timeout Errors**
- Break down complex requests into smaller parts
- Check Vercel function timeout settings
- Monitor function execution time

## 📚 Documentation

- [Full Deployment Guide](DEPLOYMENT.md)
- [GitHub Copilot CLI Documentation](https://docs.github.com/copilot/concepts/agents/about-copilot-cli)
- [Vercel Documentation](https://vercel.com/docs)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE.md](LICENSE.md) for details.

## 🙏 Acknowledgments

- [GitHub Copilot CLI](https://github.com/github/copilot-cli) - The original CLI tool
- [Vercel](https://vercel.com) - Hosting platform
- [Next.js](https://nextjs.org) - React framework

---

**Ready to deploy?** Follow the [Deployment Guide](DEPLOYMENT.md) for step-by-step instructions!