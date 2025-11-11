# Stilya Fashion AI - Proje Dokümantasyonu ve Copilot Context

## 🎯 Proje Vizyonu
Stilya, AI destekli kişisel moda asistanıdır. Multi-agent mimarisi ile insan seviyesinde yaratıcı, empatik ve kültürel açıdan duyarlı moda deneyimleri sunar.

## 👤 Proje Sahibi Profili
- **Kim**: Kod bilgisi olmayan, vizyon sahibi girişimci
- **Süreç**: 7 ay planlama + 1 yıl AI destekli geliştirme deneyimi
- **Hedef**: Tam otomatik, kalıcı kod ortağı sistemi
- **İhtiyaç**: Her seferinde baştan anlatmak zorunda kalmamak

## 🏗️ Sistem Mimarisi

### Multi-Agent Yapısı:
```
Orchestration Manager (Ana Koordinatör)
├── Digital Wardrobe Agent (FAISS, <10ms arama)
├── Visual Intelligence Agent (CLIP + OpenCV)
├── Creativity Agent (AURORA modülü, %84+ yaratıcılık)
├── Empathy & Cultural Agent (%90+ empati seviyesi)
├── Learning & Feedback Agent (A/B test, kişiselleştirme)  
└── Knowledge Integration Agent (%95+ doğruluk kategorize)
```

### Teknoloji Stack:
- **Backend**: FastAPI + Pydantic + asyncio
- **AI/ML**: OpenAI GPT + CLIP + FAISS + sentence-transformers
- **Azure**: Container Apps, Key Vault, PostgreSQL, Redis, App Insights
- **Deployment**: Docker + ARM templates + otomatik CI/CD

## 📊 Performans Hedefleri
- ✅ 99.99% Doğruluk
- ✅ <10ms Arama Hızı  
- ✅ %84+ Yaratıcılık Skoru
- ✅ %90+ Empati Seviyesi
- ✅ %95+ Bilgi Kategorileme Doğruluğu

## 💰 İş Modeli
- Freemium model
- Premium AI features
- Fashion brand partnerships
- Affiliate marketing

## 🔄 Geliştirme Süreci
1. **MVP**: Temel agent'lar + API (✅ Tamamlandı)
2. **Beta**: UI/UX + kullanıcı testleri
3. **Production**: Scaling + monetization
4. **Growth**: Advanced features + partnerships

## 🤖 Copilot İçin Kritik Bilgiler

### Kod Stili:
- Azure best practices MUTLAKA takip et
- Type hints her yerde kullan
- Async/await pattern'ını sürdür
- Comprehensive error handling
- Structured logging (structlog)

### Proje Değerleri:
- Kullanıcı deneyimi > teknik karmaşıklık
- Ölçeklenebilirlik > hızlı fix
- Güvenlik > kolaylık
- Performans metrikleri > subjektif değerlendirme

### Yasaklı Şeyler:
- Sync kod (async kullan)
- Hard-coded secrets (Azure Key Vault kullan)
- Manual deployment (otomatik olmalı)
- Agent'ları bypass etme (orchestration manager kullan)

## 📁 Dosya Yapısı Referansı
```
stilya_project/
├── src/stilya/
│   ├── agents/ (6 specialized agent)
│   ├── communication/ (FastAPI + models)
│   ├── config/ (Azure settings)
│   └── orchestration/ (main manager)
├── deploy/azure/ (ARM templates + scripts)
├── requirements.txt (40+ dependencies)
└── test_stilya.py (comprehensive tests)
```

## 🚨 Copilot'a Özel Talimatlar:

1. **HER ZAMAN** bu dosyayı oku ve context'i hatırla
2. **Değişiklik yaparken** mevcut pattern'ı koru
3. **Yeni özellik eklerken** agent mimarisini kullan
4. **Deploy edilecek kod** mutlaka Azure-optimized olsun
5. **Kullanıcı soru sorduğunda** bu dokümana referans ver

## 🔮 Sonraki Adımlar
- [ ] GitHub Copilot Workspace kurulumu
- [ ] Kalıcı context sistemi
- [ ] Azure otomasyonu
- [ ] Production deployment

---
**Bu dosya Copilot'ın kalıcı hafızasıdır. Güncel tut!**