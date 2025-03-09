import json
import random
import logging
import schedule
import asyncio
from dotenv import load_dotenv
import os
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from flask import Flask
import threading
load_dotenv()
# Токен бота
TOKEN = os.getenv("BOT_TOKEN")
GROUP_ID = -123456789  # Укажите реальный ID группы

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("bot.log"), logging.StreamHandler()],
)

# Инициализация бота и диспетчера
bot = Bot(token=TOKEN)
dp = Dispatcher()

# Функция для получения случайного аята
def get_random_ayat():
    try:
        with open("ayats.json", "r", encoding="utf-8") as file:
            ayats = json.load(file)
            if not ayats:
                raise ValueError("Файл ayats.json пуст")
            return random.choice(ayats)
    except FileNotFoundError:
        logging.error("Файл ayats.json не найден")
        return {"reference": "Ошибка", "text": "Файл с аятами не найден"}
    except json.JSONDecodeError:
        logging.error("Ошибка декодирования JSON в файле ayats.json")
        return {"reference": "Ошибка", "text": "Ошибка в формате файла"}
    except Exception as e:
        logging.error(f"Неизвестная ошибка при чтении ayats.json: {e}")
        return {"reference": "Ошибка", "text": "Неизвестная ошибка"}

# Обработчик команды /start
@dp.message(Command("start"))
async def start_handler(message: types.Message):
    await message.answer(
        "Ассаламу алейкум ва рахматулахи ва баракатух! "
        "Я Басир — ваш спутник на пути к духовному свету. "
        "Каждый день в 12:00 я буду приносить вам аяты из Священного Корана, "
        "чтобы вдохновлять, напоминать о милости Аллаха и укреплять вашу веру."
    )

# Обработчик для получения ID чата
@dp.message(Command("get_chat_id"))
async def get_chat_id(message: types.Message):
    await message.answer(f"ID этого чата: {message.chat.id}")

@dp.message(Command("test"))
async def test_ayat_handler(message: types.Message):
    ayat = get_random_ayat()
    text = f"📖 *{ayat['reference']}*\n\n_{ayat['text']}_"
    await message.answer(text, parse_mode="Markdown")
    logging.info("Тестовый аят отправлен")

@dp.message(Command("ayat"))
async def ayat_handler(message: types.Message):
    ayat = get_random_ayat()
    text = f"📖 *{ayat['reference']}*\n\n_{ayat['text']}_"
    await message.answer(text, parse_mode="Markdown")
    logging.info("Аят отправлен по команде /ayat")

# Функция отправки ежедневного аята
async def send_daily_ayat():
    ayat = get_random_ayat()
    text = f"📖 *{ayat['reference']}*\n\n_{ayat['text']}_"
    try:
        await bot.send_message(GROUP_ID, text, parse_mode="Markdown")
        logging.info(f"Аят успешно отправлен в группу {GROUP_ID}")
    except Exception as e:
        logging.error(f"Ошибка при отправке аята: {e}")

# Планировщик задач
def run_scheduler():
    schedule.every().day.at("06:30").do(lambda: asyncio.create_task(send_daily_ayat()))  # 12:30 по Казахстану
    schedule.every().day.at("12:00").do(lambda: asyncio.create_task(send_daily_ayat()))  # 18:00 по Казахстану


# Асинхронная функция для работы планировщика
async def scheduler():
    run_scheduler()
    while True:
        schedule.run_pending()
        await asyncio.sleep(60)

# Flask-приложение для Render
app = Flask(__name__)

@app.route("/")
def home():
    return "Бот работает!"

def run_flask():
    app.run(host="0.0.0.0", port=5000)

# Главная функция
async def main():
    # Запуск Flask в отдельном потоке
    threading.Thread(target=run_flask, daemon=True).start()
    # Запуск планировщика в фоне
    asyncio.create_task(scheduler())
    # Запуск бота
    logging.info("Бот запущен")
    await dp.start_polling(bot)

# Запуск программы
if __name__ == "__main__":
    asyncio.run(main())
