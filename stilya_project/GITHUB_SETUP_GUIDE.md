# 🚀 GitHub Repository Kurulum Rehberi - Stilya Fashion AI

## Adım 1: GitHub Repository Oluştur

1. **GitHub.com'a git**: https://github.com
2. **New Repository** butonuna tıkla
3. **Repository ayarları**:
   ```
   Repository name: stilya-fashion-ai
   Description: AI-Powered Personal Fashion Assistant with Multi-Agent Architecture
   ✅ Private (Önemli!)
   ✅ Add a README file
   ✅ Add .gitignore (Python)
   ✅ Choose a license (MIT License öneriyorum)
   ```

## Adım 2: GitHub Copilot Workspace Aktifleştir

1. **Repository Settings'e git**
2. **Codespaces** sekmesine tıkla
3. **New codespace** oluştur
4. **VS Code açılınca**:
   - GitHub Copilot extension otomatik yüklenir
   - Copilot Chat aktif olur
   - Workspace persist olur (unutmaz!)

## Adım 3: Repository Permissions (TAM YETKİ)

Repository Settings > General:
```bash
✅ Allow merge commits
✅ Allow squash merging  
✅ Allow rebase merging
✅ Always suggest updating pull request branches
✅ Allow auto-merge
✅ Automatically delete head branches
```

Repository Settings > Actions:
```bash
✅ Allow all actions and reusable workflows
✅ Allow actions created by GitHub
✅ Allow actions by Marketplace verified creators
```

## Adım 4: Copilot Workspace Configuration

VS Code'da şu extensions'ları aktifleştir:
- ✅ GitHub Copilot
- ✅ GitHub Copilot Chat  
- ✅ Python
- ✅ Docker
- ✅ Azure Tools

## Komutlar:

```bash
# 1. Repository clone
git clone https://github.com/[KULLANICI_ADINIZ]/stilya-fashion-ai.git
cd stilya-fashion-ai

# 2. Kodlarımızı kopyala
cp -r ../copilot-cli/stilya_project/* .

# 3. GitHub'a yükle
git add .
git commit -m "🚀 Initial Stilya Fashion AI System Implementation"
git push origin main
```

## Sonraki Adım:
Kalıcı hafıza için proje context dosyalarını oluşturacağız.