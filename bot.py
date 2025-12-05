# ==============================
# Binance Futures AI Signal Bot
# 16 արժույթ | 5-րոպեանոց սիգնալներ | Մարժայի խորհուրդ
# ==============================

import telebot
import sqlite3
import threading
import time
import os
import pandas as pd
import requests
from datetime import datetime, timedelta, timezone
from flask import Flask
from ta.trend import EMAIndicator
from ta.momentum import RSIIndicator

# -------------------------------------------------
# ⚙️ ԿԱՐԳԱՎՈՐՈՒՄՆԵՐ
# -------------------------------------------------

BOT_TOKEN = "7877563467:AAEaH3bxikmdusqZ4y_Hh9XdpRb8xPV-kJo"
ADMIN_ID = 5398441328

bot = telebot.TeleBot(BOT_TOKEN)
DB_FILE = "signal_bot.db"

# -------------------------------------------------
# 📊 ԱՐԺՈՒՅԹՆԵՐ (16 հատ)
# -------------------------------------------------

SYMBOLS = {
    "BTCUSDT": "BTC/USDT",
    "ETHUSDT": "ETH/USDT",
    "SOLUSDT": "SOL/USDT",
    "XRPUSDT": "XRP/USDT",
    "ADAUSDT": "ADA/USDT",
    "DOGEUSDT": "DOGE/USDT",
    "LTCUSDT": "LTC/USDT",
    "AVAXUSDT": "AVAX/USDT",
    "MATICUSDT": "MATIC/USDT",
    "LINKUSDT": "LINK/USDT",
    "DOTUSDT": "DOT/USDT",
    "SHIBUSDT": "SHIB/USDT",
    "EURUSDT": "EUR/USDT",
    "GBPUSDT": "GBP/USDT",
    "XAUUSDT": "XAU/USDT (Ոսկի)",
    "OILUSDT": "OIL/USDT (Նավթ)"
}

# -------------------------------------------------
# 💾 ՏՎՅԱԼՆԵՐԻ ԲԱԶԱ
# -------------------------------------------------

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS verification_codes (
            code TEXT PRIMARY KEY
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS verified_users (
            user_id INTEGER PRIMARY KEY,
            expires_at TEXT,
            notified_24h INTEGER DEFAULT 0
        )
    """)
    conn.commit()
    conn.close()

def save_code(code):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("INSERT OR IGNORE INTO verification_codes (code) VALUES (?)", (code,))
    conn.commit()
    conn.close()

def delete_code(code):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("DELETE FROM verification_codes WHERE code = ?", (code,))
    conn.commit()
    conn.close()

def is_valid_code(code):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT 1 FROM verification_codes WHERE code = ?", (code,))
    return c.fetchone() is not None

def add_verified_user(user_id):
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("""
        INSERT OR REPLACE INTO verified_users (user_id, expires_at, notified_24h)
        VALUES (?, ?, 0)
    """, (user_id, expires_at.isoformat()))
    conn.commit()
    conn.close()

def get_active_verified_users():
    now = datetime.now(timezone.utc).isoformat()
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT user_id FROM verified_users WHERE expires_at > ?", (now,))
    users = [row[0] for row in c.fetchall()]
    conn.close()
    return users

def get_all_verified_users_with_expiry():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT user_id, expires_at, notified_24h FROM verified_users")
    return c.fetchall()

def mark_notified(user_id):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("UPDATE verified_users SET notified_24h = 1 WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()

def remove_expired_users():
    now = datetime.now(timezone.utc).isoformat()
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("DELETE FROM verified_users WHERE expires_at <= ?", (now,))
    conn.commit()
    conn.close()

# -------------------------------------------------
# 📈 ՏՐԵՅԴԻՆԳ ՎԵՐԼՈՒԾՈՒԹՅՈՒՆ
# -------------------------------------------------

def get_m1_klines(symbol, limit=150):
    url = "https://fapi.binance.com/fapi/v1/klines"
    params = {"symbol": symbol, "interval": "1m", "limit": limit}
    try:
        resp = requests.get(url, params=params, timeout=10)
        data = resp.json()
        df = pd.DataFrame(data, columns=[
            'open_time', 'open', 'high', 'low', 'close', 'volume',
            'close_time', 'quote_asset_volume', 'number_of_trades',
            'taker_buy_base', 'taker_buy_quote', 'ignore'
        ])
        df['close'] = df['close'].astype(float)
        return df[['open_time', 'close']]
    except:
        return pd.DataFrame()

def resample_to_m5(df_m1):
    df_m1['open_time'] = pd.to_datetime(df_m1['open_time'], unit='ms', utc=True)
    df_m1.set_index('open_time', inplace=True)
    df_m5 = df_m1['close'].resample('5T').ohlc()
    df_m5.columns = ['open', 'high', 'low', 'close']
    return df_m5.dropna()

def calculate_indicators(df_m5):
    df = df_m5.copy()
    df['ema9'] = EMAIndicator(close=df['close'], window=9).ema_indicator()
    df['ema21'] = EMAIndicator(close=df['close'], window=21).ema_indicator()
    df['rsi15'] = RSIIndicator(close=df['close'], window=15).rsi()
    return df

def recommend_leverage(probability):
    if probability >= 85:
        return "x30–x50"
    elif probability >= 80:
        return "x20–x30"
    elif probability >= 75:
        return "x10–x20"
    else:
        return "x5–x10"

def generate_signal_for_symbol(symbol):
    df_m1 = get_m1_klines(symbol, limit=150)
    if df_m1.empty or len(df_m1) < 50:
        return None

    df_m5 = resample_to_m5(df_m1)
    if len(df_m5) < 25:
        return None

    df_ind = calculate_indicators(df_m5)
    last = df_ind.iloc[-1]

    ema9 = last['ema9']
    ema21 = last['ema21']
    rsi = last['rsi15']

    signal = None
    probability = 0.0

    if ema9 > ema21 and 50 < rsi < 80:
        signal = "BUY"
        probability = 75.0 + min(10, (ema9 - ema21) / ema21 * 1000)
    elif ema9 < ema21 and 20 < rsi < 50:
        signal = "SELL"
        probability = 72.0 + min(8, (ema21 - ema9) / ema21 * 1000)

    probability = min(probability, 88.0)

    if signal and probability >= 70.0:
        return {
            "signal": signal,
            "probability": round(probability, 1),
            "rsi": round(rsi, 2),
            "ema9": round(ema9, 2),
            "ema21": round(ema21, 2)
        }
    return None

def should_check_now():
    now = datetime.now(timezone.utc)
    return now.minute % 5 == 4 and 30 <= now.second <= 45

# -------------------------------------------------
# 📤 ՍԻԳՆԱԼՆԵՐԻ ՈՒՂԱՐԿՈՒՄ
# -------------------------------------------------

def check_and_send_signals():
    if not should_check_now():
        return

    now = datetime.now(timezone.utc)
    next_min = ((now.minute // 5) + 1) * 5
    next_time = now.replace(minute=0, second=0, microsecond=0) + timedelta(minutes=next_min)
    opening_time = next_time.strftime("%H:%M UTC")

    for binance_sym, display_name in SYMBOLS.items():
        sig = generate_signal_for_symbol(binance_sym)
        if not sig:
            continue

        direction = "LONG 📈" if sig['signal'] == "BUY" else "SHORT 📉"
        leverage = recommend_leverage(sig['probability'])

        message = (
            f"🔔 *AI ՍԻԳՆԱԼ (Binance Futures)*\n\n"
            f"📊 Արժույթ: {display_name}\n"
            f"📌 Դիրք: {direction}\n"
            f"⏱️ Տևողություն: 5 րոպե\n"
            f"🕗 Բացում: {opening_time}\n"
            f"✅ Հավանականություն: {sig['probability']}%\n"
            f"⚖️ Խորհուրդ մարժա: {leverage}\n"
            f"📊 RSI(15): {sig['rsi']}\n"
            f"📈 EMA9/21: {sig['ema9']} / {sig['ema21']}\n\n"
            f"❗ Բացեք դիրքը {opening_time}-ին՝ օգտագործելով խորհուրդ տրված մարժան:"
        )

        # Ուղարկել վերիֆիկացվածներին + ադմինին (միշտ)
        users = set(get_active_verified_users())
        users.add(ADMIN_ID)

        for uid in users:
            try:
                bot.send_message(uid, message, parse_mode="Markdown")
            except:
                pass

# -------------------------------------------------
# 🕒 ՖՈՆԱՅԻՆ ՍՏՈՒԳՈՒՄՆԵՐ
# -------------------------------------------------

def background_tasks():
    while True:
        try:
            check_and_send_signals()
            # Վերիֆիկացիայի ստուգում
            now_utc = datetime.now(timezone.utc)
            for user_id, expires_at_str, notified in get_all_verified_users_with_expiry():
                expires_at = datetime.fromisoformat(expires_at_str)
                if now_utc > expires_at:
                    continue
                if not notified and (expires_at - now_utc) <= timedelta(hours=24):
                    try:
                        bot.send_message(user_id,
                            "⚠️ Ձեր վերիֆիկացիան կավարտվի 24 ժամից:\n"
                            "Բաժանորդագրությունը երկարաձգելու համար կապվեք ադմինի հետ:"
                        )
                        mark_notified(user_id)
                    except:
                        pass
            remove_expired_users()
        except Exception as e:
            print(f"Սխալ: {e}")
        time.sleep(20)

# -------------------------------------------------
# 🤖 ԲՈՏԻ ԿՈՄԱՆԴՆԵՐ
# -------------------------------------------------

@bot.message_handler(commands=['start'])
def start(m):
    bot.send_message(m.chat.id, "Ողջույն! Ուղարկեք ձեզ տրված վերիֆիկացիոն կոդը՝ սիգնալներ ստանալու համար:")

@bot.message_handler(func=lambda m: m.text and not m.text.startswith('/'))
def verify_code(m):
    uid = m.chat.id
    code = m.text.strip()
    if uid in get_active_verified_users():
        bot.send_message(uid, "Դուք արդեն վերիֆիկացված եք:")
        return
    if is_valid_code(code):
        add_verified_user(uid)
        bot.send_message(uid, "✅ Դուք վերիֆիկացվեցիք! Սիգնալները կուղարկվեն ձեզ:")
    else:
        bot.send_message(uid, "❌ Սխալ կոդ: Փորձեք նորից:")

@bot.message_handler(commands=['addcode'])
def addcode(m):
    if m.from_user.id != ADMIN_ID: return
    code = m.text.split()[1] if len(m.text.split()) > 1 else None
    if not code:
        bot.reply_to(m, "Օգտագործեք. /addcode <կոդ>")
        return
    save_code(code)
    bot.reply_to(m, f"✅ Կոդ ավելացված է. `{code}`", parse_mode="Markdown")

@bot.message_handler(commands=['delcode'])
def delcode(m):
    if m.from_user.id != ADMIN_ID: return
    code = m.text.split()[1] if len(m.text.split()) > 1 else None
    if not code:
        bot.reply_to(m, "Օգտագործեք. /delcode <կոդ>")
        return
    delete_code(code)
    bot.reply_to(m, f"🗑️ Կոդ ջնջված է. `{code}`", parse_mode="Markdown")

@bot.message_handler(
    content_types=['text', 'photo', 'document', 'video'],
    func=lambda m: m.from_user.id == ADMIN_ID and not m.text.startswith('/')
)
def admin_broadcast(m):
    users = set(get_active_verified_users())
    users.add(ADMIN_ID)
    for uid in users:
        try:
            if m.content_type == 'text':
                bot.send_message(uid, m.text)
            elif m.content_type == 'photo':
                bot.send_photo(uid, m.photo[-1].file_id, caption=m.caption)
            elif m.content_type == 'document':
                bot.send_document(uid, m.document.file_id, caption=m.caption)
            elif m.content_type == 'video':
                bot.send_video(uid, m.video.file_id, caption=m.caption)
        except:
            pass

# -------------------------------------------------
# 🌐 FLASK SERVER (Railway)
# -------------------------------------------------

app = Flask(__name__)

@app.route('/health')
def health():
    return "OK", 200

def run_flask():
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)

# -------------------------------------------------
# ▶️ ԳՈՐԾԱՐԿՈՒՄ
# -------------------------------------------------

if __name__ == '__main__':
    init_db()
    threading.Thread(target=background_tasks, daemon=True).start()
    threading.Thread(target=run_flask, daemon=True).start()
    print("✅ Binance Futures AI ՍիգնաԼ Բոտը գործարկված է")
    bot.polling(none_stop=True)
