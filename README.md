# GitHub Copilot CLI (Public Preview)

The power of GitHub Copilot, now in your terminal.

GitHub Copilot CLI brings AI-powered coding assistance directly to your command line, enabling you to build, debug, and understand code through natural language conversations. Powered by the same agentic harness as GitHub's Copilot coding agent, it provides intelligent assistance while staying deeply integrated with your GitHub workflow.

See [our official documentation](https://docs.github.com/copilot/concepts/agents/about-copilot-cli) for more information.

![Image of the splash screen for the Copilot CLI](https://github.com/user-attachments/assets/51ac25d2-c074-467a-9c88-38a8d76690e3)

## 🚀 Introduction and Overview

We're bringing the power of GitHub Copilot coding agent directly to your terminal. With GitHub Copilot CLI, you can work locally and synchronously with an AI agent that understands your code and GitHub context.

- **Terminal-native development:** Work with Copilot coding agent directly in your command line — no context switching required.
- **GitHub integration out of the box:** Access your repositories, issues, and pull requests using natural language, all authenticated with your existing GitHub account.
- **Agentic capabilities:** Build, edit, debug, and refactor code with an AI collaborator that can plan and execute complex tasks.
- **MCP-powered extensibility:** Take advantage of the fact that the coding agent ships with GitHub's MCP server by default and supports custom MCP servers to extend capabilities.
- **Full control:** Preview every action before execution — nothing happens without your explicit approval.

We're still early in our journey, but with your feedback, we're rapidly iterating to make the GitHub Copilot CLI the best possible companion in your terminal.

## 📦 Getting Started

### Supported Platforms

- **Linux**
- **macOS**
- **Windows**

### Prerequisites

- **Node.js** v22 or higher
- **npm** v10 or higher
- (On Windows) **PowerShell** v6 or higher
- An **active Copilot subscription**. See [Copilot plans](https://github.com/features/copilot/plans?ref_cta=Copilot+plans+signup&ref_loc=install-copilot-cli&ref_page=docs).

If you have access to GitHub Copilot via your organization or enterprise, you cannot use GitHub Copilot CLI if your organization owner or enterprise administrator has disabled it in the organization or enterprise settings. See [Managing policies and features for GitHub Copilot in your organization](http://docs.github.com/copilot/managing-copilot/managing-github-copilot-in-your-organization/managing-github-copilot-features-in-your-organization/managing-policies-for-copilot-in-your-organization) for more information.

### Installation

Install globally with npm:
```bash
npm install -g @github/copilot
```

### Launching the CLI

```bash
copilot
```

On first launch, you'll be greeted with our adorable animated banner! If you'd like to see this banner again, launch `copilot` with the `--banner` flag. 

If you're not currently logged in to GitHub, you'll be prompted to use the `/login` slash command. Enter this command and follow the on-screen instructions to authenticate.

#### Authenticate with a Personal Access Token (PAT)

You can also authenticate using a fine-grained PAT with the "Copilot Requests" permission enabled.

1. Visit https://github.com/settings/personal-access-tokens/new
2. Under "Permissions," click "add permissions" and select "Copilot Requests"
3. Generate your token
4. Add the token to your environment via the environment variable `GH_TOKEN` or `GITHUB_TOKEN` (in order of precedence)

### Using the CLI

Launch `copilot` in a folder that contains code you want to work with. 

By default, `copilot` utilizes Claude Sonnet 4.5. Run the `/model` slash command to choose from other available models, including Claude Sonnet 4 and GPT-5.

Each time you submit a prompt to GitHub Copilot CLI, your monthly quota of premium requests is reduced by one. For information about premium requests, see [About premium requests](https://docs.github.com/copilot/managing-copilot/monitoring-usage-and-entitlements/about-premium-requests).

For more information about how to use the GitHub Copilot CLI, see [our official documentation](https://docs.github.com/copilot/concepts/agents/about-copilot-cli).


## 📢 Feedback and Participation

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI App Builder Pro</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        :root{--primary:#6366f1;--secondary:#10b981;--danger:#ef4444;--warning:#f59e0b;--dark:#1e1e2e;--darker:#181825;--light:#cdd6f4;--surface:#313244;--surface-light:#45475a}
        body{font-family:'Segoe UI',system-ui,sans-serif;background:var(--darker);color:var(--light);min-height:100vh}
        
        .connection-bar{position:fixed;top:0;left:0;right:0;padding:10px 20px;display:flex;align-items:center;justify-content:center;gap:10px;font-size:0.85rem;font-weight:600;z-index:9999;transition:all 0.3s}
        .connection-bar.online{background:linear-gradient(135deg,var(--secondary),#059669);color:#fff}
        .connection-bar.offline{background:linear-gradient(135deg,var(--danger),#dc2626);color:#fff}
        .connection-bar .dismiss{position:absolute;right:15px;background:rgba(255,255,255,0.2);border:none;color:#fff;width:24px;height:24px;border-radius:50%;cursor:pointer}
        
        .notification-container{position:fixed;top:60px;right:20px;z-index:9998;display:flex;flex-direction:column;gap:10px;max-width:350px}
        .notification{background:var(--dark);border-radius:12px;padding:15px;box-shadow:0 10px 40px rgba(0,0,0,0.4);display:flex;gap:12px;animation:slideIn 0.3s ease;border-left:4px solid var(--primary)}
        .notification.success{border-left-color:var(--secondary)}
        .notification.error{border-left-color:var(--danger)}
        .notification.warning{border-left-color:var(--warning)}
        .notification-icon{font-size:1.5rem}
        .notification-content{flex:1}
        .notification-title{font-weight:700;margin-bottom:4px}
        .notification-message{font-size:0.85rem;opacity:0.8}
        .notification-close{background:none;border:none;color:var(--light);cursor:pointer;opacity:0.5;font-size:1.2rem}
        @keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
        
        .offline-banner{display:none;position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--warning);color:#000;padding:12px 25px;border-radius:50px;font-weight:600;z-index:9997}
        .offline-banner.show{display:flex;align-items:center;gap:10px}
        
        .header{background:linear-gradient(135deg,var(--dark),var(--surface));padding:15px 25px;display:flex;justify-content:space-between;align-items:center;margin-top:45px;flex-wrap:wrap;gap:15px;border-bottom:1px solid var(--surface-light)}
        .logo{display:flex;align-items:center;gap:10px;font-size:1.3rem;font-weight:bold;background:linear-gradient(135deg,var(--primary),var(--secondary));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .logo-icon{width:40px;height:40px;background:linear-gradient(135deg,var(--primary),var(--secondary));border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;-webkit-text-fill-color:#fff}
        .header-actions{display:flex;gap:8px;flex-wrap:wrap}
        
        .btn{padding:10px 18px;border:none;border-radius:8px;cursor:pointer;font-size:0.85rem;font-weight:600;transition:all 0.3s;display:flex;align-items:center;gap:6px}
        .btn:hover{transform:translateY(-2px);box-shadow:0 5px 15px rgba(0,0,0,0.3)}
        .btn-primary{background:linear-gradient(135deg,var(--primary),#4f46e5);color:#fff}
        .btn-secondary{background:var(--surface);color:var(--light);border:1px solid var(--surface-light)}
        .btn-success{background:linear-gradient(135deg,var(--secondary),#059669);color:#fff}
        .btn-danger{background:var(--danger);color:#fff}
        
        .main-container{display:grid;grid-template-columns:260px 1fr 280px;height:calc(100vh - 120px)}
        
        .sidebar{background:var(--dark);border-right:1px solid var(--surface-light);overflow-y:auto;padding:15px}
        .sidebar-section{margin-bottom:20px}
        .sidebar-title{font-size:0.75rem;text-transform:uppercase;color:var(--surface-light);margin-bottom:12px;letter-spacing:1px}
        
        .component-list{display:flex;flex-direction:column;gap:6px}
        .component-item{background:var(--surface);border-radius:8px;padding:10px;cursor:pointer;transition:all 0.3s;display:flex;align-items:center;gap:10px}
        .component-item:hover{background:var(--surface-light);transform:translateX(5px)}
        .component-icon{width:32px;height:32px;background:linear-gradient(135deg,var(--primary),var(--secondary));border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:0.9rem}
        .component-name{font-size:0.85rem;font-weight:600}
        .component-desc{font-size:0.7rem;color:var(--surface-light)}
        
        .template-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .template-card{background:var(--surface);border-radius:8px;overflow:hidden;cursor:pointer;transition:all 0.3s}
        .template-card:hover{transform:scale(1.03)}
        .template-preview{height:50px;background:linear-gradient(135deg,var(--primary),var(--secondary));display:flex;align-items:center;justify-content:center;font-size:1.3rem}
        .template-name{padding:8px;font-size:0.8rem;font-weight:600;text-align:center}
        
        .canvas-container{background:#252536;display:flex;flex-direction:column}
        .canvas-toolbar{background:var(--dark);padding:10px 15px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--surface-light);flex-wrap:wrap;gap:10px}
        .device-switcher{display:flex;gap:5px}
        .device-btn{padding:8px 14px;background:var(--surface);border:none;border-radius:6px;color:var(--light);cursor:pointer;font-size:0.8rem}
        .device-btn.active{background:var(--primary)}
        
        .canvas-wrapper{flex:1;overflow:auto;padding:25px;display:flex;justify-content:center}
        .canvas{background:#fff;border-radius:12px;box-shadow:0 15px 50px rgba(0,0,0,0.4);min-height:600px;transition:all 0.3s;overflow:hidden}
        .canvas.desktop{width:100%;max-width:1100px}
        .canvas.tablet{width:768px}
        .canvas.mobile{width:375px}
        .canvas-content{min-height:600px;color:#333}
        
        .drop-zone{min-height:200px;border:3px dashed #d1d5db;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#9ca3af;margin:25px;text-align:center;padding:30px;gap:10px}
        .drop-zone-icon{font-size:2.5rem}
        
        .built-element{position:relative}
        .built-element:hover{outline:2px dashed var(--primary)}
        .element-actions{position:absolute;top:8px;right:8px;display:none;gap:5px;background:var(--dark);padding:6px;border-radius:6px;z-index:100}
        .built-element:hover .element-actions{display:flex}
        .element-btn{padding:5px 8px;background:var(--surface);border:none;border-radius:4px;color:#fff;cursor:pointer;font-size:0.75rem}
        .element-btn:hover{background:var(--primary)}
        
        .properties-panel{background:var(--dark);border-left:1px solid var(--surface-light);overflow-y:auto;padding:15px}
        
        .ai-section{background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(16,185,129,0.15));border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:15px;margin-bottom:15px}
        .ai-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
        .ai-title{display:flex;align-items:center;gap:8px;font-weight:700;font-size:0.95rem}
        .ai-status{font-size:0.7rem;padding:3px 8px;border-radius:20px;background:var(--surface)}
        .ai-status.online{background:rgba(16,185,129,0.2);color:var(--secondary)}
        .ai-status.offline{background:rgba(245,158,11,0.2);color:var(--warning)}
        .ai-input{width:100%;padding:12px;background:var(--surface);border:1px solid var(--surface-light);border-radius:10px;color:var(--light);font-size:0.85rem;resize:none;min-height:90px;font-family:inherit}
        .ai-input:focus{outline:none;border-color:var(--primary)}
        .ai-btn{width:100%;margin-top:10px;padding:12px;background:linear-gradient(135deg,var(--primary),var(--secondary));border:none;border-radius:10px;color:#fff;font-weight:700;cursor:pointer;font-size:0.9rem}
        .ai-btn:hover{transform:translateY(-2px);box-shadow:0 5px 20px rgba(99,102,241,0.4)}
        
        .quick-settings{background:var(--surface);border-radius:12px;padding:15px;margin-bottom:15px}
        .quick-settings-title{font-weight:700;margin-bottom:12px;font-size:0.9rem}
        .property-group{margin-bottom:12px}
        .property-label{display:block;font-size:0.8rem;color:var(--surface-light);margin-bottom:6px}
        .property-input{width:100%;padding:10px;background:var(--darker);border:1px solid var(--surface-light);border-radius:8px;color:var(--light);font-size:0.85rem}
        .property-input:focus{outline:none;border-color:var(--primary)}
        .color-row{display:flex;gap:8px;align-items:center}
        .color-picker{width:45px;height:38px;border:none;border-radius:8px;cursor:pointer;padding:0}
        
        .modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);display:none;align-items:center;justify-content:center;z-index:10000}
        .modal-overlay.active{display:flex}
        .modal{background:var(--dark);border-radius:16px;padding:25px;width:90%;max-width:800px;max-height:90vh;overflow-y:auto}
        .modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
        .modal-title{font-size:1.3rem;font-weight:700}
        .modal-close{width:40px;height:40px;background:var(--surface);border:none;border-radius:50%;color:var(--light);font-size:1.3rem;cursor:pointer}
        .modal-close:hover{background:var(--danger)}
        
        .export-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin-bottom:20px}
        .export-option{background:var(--surface);border:2px solid transparent;border-radius:12px;padding:20px 12px;text-align:center;cursor:pointer;transition:all 0.3s}
        .export-option:hover{border-color:var(--primary);transform:translateY(-3px)}
        .export-option.selected{border-color:var(--secondary);background:rgba(16,185,129,0.15)}
        .export-icon{font-size:2rem;margin-bottom:8px}
        .export-name{font-weight:700;font-size:0.85rem}
        .export-desc{font-size:0.7rem;color:var(--surface-light);margin-top:4px}
        
        .progress-container{margin:20px 0;display:none}
        .progress-container.active{display:block}
        .progress-bar{height:8px;background:var(--surface);border-radius:4px;overflow:hidden}
        .progress-fill{height:100%;background:linear-gradient(135deg,var(--primary),var(--secondary));width:0%;transition:width 0.3s}
        .progress-text{text-align:center;margin-top:10px;font-size:0.85rem}
        
        .settings-btn{position:fixed;bottom:20px;left:20px;width:50px;height:50px;background:var(--surface);border:none;border-radius:50%;color:var(--light);font-size:1.3rem;cursor:pointer;z-index:9000;box-shadow:0 5px 20px rgba(0,0,0,0.3)}
        .settings-btn:hover{background:var(--primary)}
        
        .settings-panel{position:fixed;bottom:80px;left:20px;width:320px;background:var(--dark);border-radius:16px;padding:20px;z-index:9000;display:none;box-shadow:0 10px 40px rgba(0,0,0,0.5);max-height:70vh;overflow-y:auto}
        .settings-panel.active{display:block}
        .settings-panel h3{margin-bottom:15px;font-size:1rem}
        .settings-panel .toggle-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--surface)}
        .settings-panel .toggle-row:last-child{border-bottom:none}
        .settings-panel .toggle-label{font-size:0.85rem}
        .settings-panel .toggle-desc{font-size:0.7rem;color:var(--surface-light)}
        .toggle-switch{width:44px;height:24px;background:var(--surface-light);border-radius:12px;position:relative;cursor:pointer;transition:all 0.3s}
        .toggle-switch.active{background:var(--secondary)}
        .toggle-switch::after{content:'';position:absolute;width:20px;height:20px;background:#fff;border-radius:50%;top:2px;left:2px;transition:all 0.3s}
        .toggle-switch.active::after{left:22px}
        
        @media(max-width:1000px){.main-container{grid-template-columns:1fr}.sidebar,.properties-panel{display:none}}
        @media(max-width:600px){.header{padding:10px}.header-actions{width:100%;justify-content:center}.btn{padding:8px 12px;font-size:0.75rem}}
    </style>
</head>
<body>
    <!-- Connection Bar -->
    <div class="connection-bar online" id="connectionBar">
        <span id="connectionIcon">📶</span>
        <span id="connectionText">Connected</span>
        <span id="connectionSpeed" style="background:rgba(255,255,255,0.2);padding:2px 10px;border-radius:20px;font-size:0.75rem">-- Mbps</span>
        <button class="dismiss" onclick="this.parentElement.style.display='none'">×</button>
    </div>

    <!-- Notifications -->
    <div class="notification-container" id="notifications"></div>

    <!-- Offline Banner -->
    <div class="offline-banner" id="offlineBanner">⚡ Offline Mode - Changes saved locally</div>

    <!-- Header -->
    <header class="header">
        <div class="logo">
            <div class="logo-icon">⚡</div>
            AI App Builder
        </div>
        <div class="header-actions">
            <button class="btn btn-secondary" onclick="saveProject()">💾 Save</button>
            <button class="btn btn-secondary" onclick="loadProject()">📂 Load</button>
            <button class="btn btn-secondary" onclick="previewApp()">👁️ Preview</button>
            <button class="btn btn-success" onclick="openExport()">📦 Export</button>
        </div>
    </header>

    <!-- Main -->
    <div class="main-container">
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="sidebar-section">
                <h3 class="sidebar-title">📦 Components</h3>
                <div class="component-list">
                    <div class="component-item" onclick="addComponent('header')"><div class="component-icon">📌</div><div><div class="component-name">Header</div><div class="component-desc">Navigation</div></div></div>
                    <div class="component-item" onclick="addComponent('hero')"><div class="component-icon">🎯</div><div><div class="component-name">Hero</div><div class="component-desc">Landing section</div></div></div>
                    <div class="component-item" onclick="addComponent('features')"><div class="component-icon">⭐</div><div><div class="component-name">Features</div><div class="component-desc">Feature cards</div></div></div>
                    <div class="component-item" onclick="addComponent('about')"><div class="component-icon">📝</div><div><div class="component-name">About</div><div class="component-desc">About section</div></div></div>
                    <div class="component-item" onclick="addComponent('services')"><div class="component-icon">🛠️</div><div><div class="component-name">Services</div><div class="component-desc">Services grid</div></div></div>
                    <div class="component-item" onclick="addComponent('gallery')"><div class="component-icon">🖼️</div><div><div class="component-name">Gallery</div><div class="component-desc">Image gallery</div></div></div>
                    <div class="component-item" onclick="addComponent('testimonials')"><div class="component-icon">💬</div><div><div class="component-name">Testimonials</div><div class="component-desc">Reviews</div></div></div>
                    <div class="component-item" onclick="addComponent('pricing')"><div class="component-icon">💰</div><div><div class="component-name">Pricing</div><div class="component-desc">Pricing tables</div></div></div>
                    <div class="component-item" onclick="addComponent('team')"><div class="component-icon">👥</div><div><div class="component-name">Team</div><div class="component-desc">Team members</div></div></div>
                    <div class="component-item" onclick="addComponent('faq')"><div class="component-icon">❓</div><div><div class="component-name">FAQ</div><div class="component-desc">Questions</div></div></div>
                    <div class="component-item" onclick="addComponent('contact')"><div class="component-icon">📧</div><div><div class="component-name">Contact</div><div class="component-desc">Contact form</div></div></div>
                    <div class="component-item" onclick="addComponent('cta')"><div class="component-icon">🚀</div><div><div class="component-name">CTA</div><div class="component-desc">Call to action</div></div></div>
                    <div class="component-item" onclick="addComponent('stats')"><div class="component-icon">📊</div><div><div class="component-name">Stats</div><div class="component-desc">Statistics</div></div></div>
                    <div class="component-item" onclick="addComponent('footer')"><div class="component-icon">📎</div><div><div class="component-name">Footer</div><div class="component-desc">Page footer</div></div></div>
                </div>
            </div>
            <div class="sidebar-section">
                <h3 class="sidebar-title">🎨 Templates</h3>
                <div class="template-grid">
                    <div class="template-card" onclick="loadTemplate('startup')"><div class="template-preview">🚀</div><div class="template-name">Startup</div></div>
                    <div class="template-card" onclick="loadTemplate('portfolio')"><div class="template-preview">💼</div><div class="template-name">Portfolio</div></div>
                    <div class="template-card" onclick="loadTemplate('business')"><div class="template-preview">🏢</div><div class="template-name">Business</div></div>
                    <div class="template-card" onclick="loadTemplate('ecommerce')"><div class="template-preview">🛒</div><div class="template-name">Shop</div></div>
                    <div class="template-card" onclick="loadTemplate('restaurant')"><div class="template-preview">🍽️</div><div class="template-name">Restaurant</div></div>
                    <div class="template-card" onclick="loadTemplate('agency')"><div class="template-preview">🎯</div><div class="template-name">Agency</div></div>
                </div>
            </div>
        </aside>

        <!-- Canvas -->
        <main class="canvas-container">
            <div class="canvas-toolbar">
                <div class="device-switcher">
                    <button class="device-btn active" onclick="switchDevice('desktop',this)">🖥️</button>
                    <button class="device-btn" onclick="switchDevice('tablet',this)">📱</button>
                    <button class="device-btn" onclick="switchDevice('mobile',this)">📲</button>
                </div>
                <div style="display:flex;gap:8px">
                    <button class="btn btn-secondary" onclick="undo()">↩️</button>
                    <button class="btn btn-secondary" onclick="redo()">↪️</button>
                    <button class="btn btn-danger" onclick="clearCanvas()">🗑️</button>
                </div>
            </div>
            <div class="canvas-wrapper">
                <div class="canvas desktop" id="canvas">
                    <div class="canvas-content" id="canvasContent">
                        <div class="drop-zone">
                            <div class="drop-zone-icon">🎨</div>
                            <div><b>Start Building</b></div>
                            <div>Click components or use AI</div>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <!-- Right Panel -->
        <aside class="properties-panel">
      
