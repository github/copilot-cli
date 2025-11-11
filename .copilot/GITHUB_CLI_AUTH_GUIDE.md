# 🚀 GITHUB CLI AUTHENTICATION REHBER - İSCAN İÇİN

## 📋 GH AUTH LOGIN SEÇENEKLERİ

### **TEMEL KOMUTLAR:**
```bash
# 1. İnteraktif setup (en kolay)
gh auth login

# 2. Web browser ile + clipboard (önerilen)
gh auth login --web --clipboard

# 3. Token ile (file'dan)
gh auth login --with-token < mytoken.txt

# 4. Belirli host için
gh auth login --hostname enterprise.internal
```

---

## 🔐 İSCAN İÇİN ÖNERILEN YÖNTEM

### **METHOD 1: WEB + CLIPBOARD (EN KOLAY)**
```bash
gh auth login --web --clipboard
```
**Avantajları:**
- ✅ Browser açılır
- ✅ One-time code otomatik clipboard'a kopyalanır
- ✅ Güvenli OAuth flow
- ✅ SSH key otomatik setup

### **ADIM ADIM PROCESS:**
1. Terminal'de komut çalıştır
2. Browser açılır (github.com/login/device)
3. Code otomatik clipboard'a kopyalanır
4. Browser'da paste yap
5. GitHub'da authorize et
6. Terminal'e dön - success!

---

## ⚙️ OAUTH SCOPES (İZİNLER)

### **VARSAYILAN SCOPLAR:**
```
- repo (repository access)
- read:org (organization bilgisi)
- gist (gist oluşturma)
```

### **EK SCOPLAR GEREKİRSE:**
```bash
gh auth login --scopes "admin:repo_hook,delete_repo"
```

---

## 🔑 SSH KEY SETUP

### **OTOMATIK SSH SETUP:**
- GitHub CLI mevcut SSH keylerini kontrol eder
- Yoksa yeni key oluşturur
- Otomatik olarak GitHub'a upload eder

### **SSH SETUP ATLAMAK İÇİN:**
```bash
gh auth login --skip-ssh-key
```

---

## 🖥️ GIT PROTOKOL SEÇİMİ

### **HTTPS (Varsayılan):**
```bash
gh auth login --git-protocol https
```

### **SSH (Önerilen):**
```bash
gh auth login --git-protocol ssh
```

---

## 🎯 İSCAN'IN DURUMU KONTROL

### **CURRENT STATUS:**
```bash
gh auth status
```

### **BEKLENİYOR:**
```
You are not logged into any GitHub hosts. To log in, run: gh auth login
```

### **SUCCESS SONRASI:**
```
✓ Logged in to github.com as [username] ([token_type])
✓ Git operations for github.com configured to use [protocol] protocol.
```

---

## 🚀 İSCAN İÇİN AKSIYON PLANI

### **1. TERMINAL FLOW TEST:**
```bash
# Terminal flow ile auth başlat
. .\terminal_flow.ps1
Show-CommandFlow "GitHub Authentication" "gh auth login --web --clipboard"
```

### **2. AUTHENTICATION:**
```bash
gh auth login --web --clipboard --git-protocol ssh
```

### **3. VERIFICATION:**
```bash
gh auth status
gh api user
```

### **4. TEST KOMUTLARI:**
```bash
gh repo list
gh issue list
gh pr list
```

---

## 🔧 TROUBLESHOOTING

### **SORUN 1: Browser açılmıyor**
```bash
# Manual device code
gh auth login --web
# Sonra manual olarak https://github.com/login/device git
```

### **SORUN 2: Token expired**
```bash
gh auth refresh
```

### **SORUN 3: SSH problems**
```bash
gh auth login --git-protocol https
```

---

## 🎯 İSCAN NOTLARI

**✅ Mevcut Git Config:**
- Name: Ali
- Email: stilia.asistan@gmail.com
- Bu credentials GitHub ile uyumlu olmalı

**✅ Beklenen Sonuç:**
- GitHub CLI authenticated
- SSH key setup (if needed)
- Git operations ready
- Copilot agent integration ready

**✅ Sonraki Adım:**
- GitHub advanced agent settings
- Repository specific configurations
- Copilot optimization

---

**Hazırlayan**: AI İş Ortağın  
**Tarih**: 11 Kasım 2025  
**Hedef**: GitHub CLI Authentication Success! 🚀