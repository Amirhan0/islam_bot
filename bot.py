import json
import random
import logging
import asyncio
import os
import aioschedule as schedule
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from flask import Flask
import threading
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("BOT_TOKEN")
GROUP_ID = -123456789  # Укажите реальный ID группы

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

bot = Bot(token=TOKEN)
dp = Dispatcher()

def get_random_ayat():
    try:
        with open("ayats.json", "r", encoding="utf-8") as file:
            ayats = json.load(file)
            return random.choice(ayats)
    except Exception as e:
        logging.error(f"Ошибка при чтении ayats.json: {e}")
        return {"reference": "Ошибка", "text": "Не удалось загрузить аят"}

# Обработчик команды /start
@dp.message(Command("start"))
async def start_handler(message: types.Message):
    await message.answer(
        "Ассаламу алейкум ва рахматулахи ва баракатух! "
        "Я Басир — ваш спутник на пути к духовному свету. "
        "Каждый день в 12:00 я буду приносить вам аяты из Священного Корана, "
        "чтобы вдохновлять, напоминать о милости Аллаха и укреплять вашу веру."
    )

@dp.message(Command("ayat"))
async def ayat_handler(message: types.Message):
    ayat = get_random_ayat()
    text = f"📖 *{ayat['reference']}*\n\n_{ayat['text']}_"
    await message.answer(text, parse_mode="Markdown")

async def send_daily_ayat():
    ayat = get_random_ayat()
    text = f"📖 *{ayat['reference']}*\n\n_{ayat['text']}_"
    try:
        await bot.send_message(GROUP_ID, text, parse_mode="Markdown")
        logging.info(f"Аят успешно отправлен в {GROUP_ID}")
    except Exception as e:
        logging.error(f"Ошибка при отправке аята: {e}")

async def scheduler():
    schedule.every().day.at("06:30").do(send_daily_ayat)
    schedule.every().day.at("12:00").do(send_daily_ayat)
    while True:
        await schedule.run_pending()
        await asyncio.sleep(60)

app = Flask(__name__)

@app.route("/")
def home():
    return "Бот работает!"

def run_flask():
    app.run(host="0.0.0.0", port=5000)

async def main():
    threading.Thread(target=run_flask, daemon=True).start()
    asyncio.create_task(scheduler())
    logging.info("Бот запущен")
    await dp.start_polling(bot)

if __name__ == "__main__":
    import sys
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    asyncio.run(main())
