#!/usr/bin/env python3
"""
Stilya Fashion AI - Basit Test Scripti
Bu script sisteminizin çalışıp çalışmadığını test eder.
"""

import requests
import json
import time

def test_stilya_system(app_url):
    """Stilya sistemini test et."""
    
    print("🎯 Stilya Fashion AI Sistemi Test Ediliyor...")
    print("=" * 50)
    
    # Health check
    print("1. Sistem sağlığı kontrol ediliyor...")
    try:
        response = requests.get(f"{app_url}/health", timeout=30)
        if response.status_code == 200:
            print("✅ Sistem sağlıklı ve çalışıyor!")
        else:
            print(f"❌ Sistem sorunu: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Bağlantı hatası: {e}")
        return False
    
    # Test recommendation
    print("\n2. Fashion önerisi test ediliyor...")
    test_request = {
        "user_id": "test_user_001",
        "occasion": "iş toplantısı",
        "mood": "özgüvenli",
        "preferences": {
            "style": "profesyonel",
            "colors": ["lacivert", "gri", "beyaz"],
            "budget": "orta"
        },
        "style_preferences": ["formal", "klasik"],
        "budget_range": "$100-$300"
    }
    
    try:
        response = requests.post(
            f"{app_url}/recommend", 
            json=test_request,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Fashion önerisi başarılı!")
            print(f"   📊 Güven skoru: {result.get('confidence_score', 0):.2f}")
            print(f"   ⏱️  İşlem süresi: {result.get('processing_time', 0):.2f} saniye")
            print(f"   👗 Öneri sayısı: {len(result.get('recommendations', []))}")
            
            # İlk birkaç öneriyi göster
            recommendations = result.get('recommendations', [])[:3]
            for i, rec in enumerate(recommendations, 1):
                print(f"   {i}. {rec.get('type', 'Öneri')}: {rec.get('confidence', 0):.2f} güven")
                
        else:
            print(f"❌ Öneri sistemi sorunu: {response.status_code}")
            print(f"   Hata: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Öneri test hatası: {e}")
        return False
    
    # Test feedback
    print("\n3. Geri bildirim sistemi test ediliyor...")
    feedback_data = {
        "user_id": "test_user_001",
        "recommendation_id": "test_rec_001",
        "rating": 4.5,
        "feedback_type": "positive",
        "comments": "Harika öneriler! Profesyonel görünümü çok beğendim."
    }
    
    try:
        response = requests.post(
            f"{app_url}/feedback",
            json=feedback_data,
            timeout=30
        )
        
        if response.status_code == 200:
            print("✅ Geri bildirim sistemi çalışıyor!")
        else:
            print(f"⚠️  Geri bildirim uyarısı: {response.status_code}")
            
    except Exception as e:
        print(f"⚠️  Geri bildirim test hatası: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 Stilya Fashion AI sisteminiz başarıyla çalışıyor!")
    print(f"🌐 Sisteminize şu adresten erişebilirsiniz: {app_url}")
    print("💡 Artık fashion önerileri almaya başlayabilirsiniz!")
    
    return True

def main():
    print("🚀 Stilya Fashion AI Test Başlatılıyor")
    
    # Kullanıcıdan URL al
    app_url = input("Sisteminizin URL'sini girin (örn: https://stilya-fashion-ai-prod-app.kindground-12345678.eastus.azurecontainerapps.io): ")
    
    if not app_url.startswith('http'):
        app_url = 'https://' + app_url
    
    # Test et
    success = test_stilya_system(app_url)
    
    if success:
        print("\n🎯 Sonraki Adımlar:")
        print("1. Sisteminizi arkadaşlarınızla paylaşın")
        print("2. Farklı durum ve kıyafet kombinasyonları deneyin")
        print("3. Geri bildirim vererek sistemi geliştirin")
        print("4. Azure Portal'dan performans metriklerini izleyin")
    else:
        print("\n🔧 Sorun Giderme:")
        print("1. Azure Portal'dan Container App loglarını kontrol edin")
        print("2. Key Vault'taki secrets'ların doğru olduğundan emin olun")
        print("3. Deployment script'ini tekrar çalıştırın")

if __name__ == "__main__":
    main()