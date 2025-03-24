require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const fs = require('fs').promises; // Используем промисы для асинхронного чтения
const path = require('path');
const schedule = require('node-schedule');

const BOT_TOKEN = process.env.BOT_TOKEN || throwError('BOT_TOKEN не указан в .env');
const GROUP_ID = process.env.GROUP_ID || '-1002281200730';
const PORT = process.env.PORT || 5000;
const TIMEZONE = 'Asia/Almaty';

// Константы для сообщений
const WELCOME_MESSAGE = `
Ассаламу алейкум ва рахматулахи ва баракатух! 

Я Басир — ваш спутник на пути к духовному свету.
Каждый день в 12:00 и 18:00 я буду приносить вам аяты из Священного Корана.
`;

const bot = new Telegraf(BOT_TOKEN);
const app = express();

// У Ascинхронная функция для получения случайного аята
async function getRandomAyat() {
    try {
        const data = await fs.readFile(path.join(__dirname, 'ayats.json'), 'utf-8');
        const ayats = JSON.parse(data);
        return ayats[Math.floor(Math.random() * ayats.length)];
    } catch (error) {
        console.error('Ошибка при чтении ayats.json:', error.message);
        return { reference: 'Ошибка', text: 'Не удалось загрузить аят' };
    }
}

// Форматирование сообщения с аятом
function formatAyatMessage(ayat) {
    const today = new Date().toLocaleDateString('ru-RU', { timeZone: TIMEZONE });
    return `📅 *${today}*\n📖 *${ayat.reference}*\n\n_${ayat.text}_`;
}

// Команда /start
bot.start((ctx) => ctx.reply(WELCOME_MESSAGE.trim()));

// Команда /ayat
bot.command('ayat', async (ctx) => {
    const ayat = await getRandomAyat();
    await ctx.reply(formatAyatMessage(ayat), { parse_mode: 'Markdown' });
});

// Отправка ежедневного аята
async function sendDailyAyat() {
    const ayat = await getRandomAyat();
    try {
        await bot.telegram.sendMessage(GROUP_ID, formatAyatMessage(ayat), { parse_mode: 'Markdown' });
        console.log(`Аят отправлен в группу ${GROUP_ID}`);
    } catch (error) {
        console.error('Ошибка при отправке аята:', error.message);
    }
}

// Планирование задач
function scheduleAyatNotifications() {
    const times = [
        { hour: 12, minute: 0 },
        { hour: 18, minute: 0 },
    ];

    times.forEach(({ hour, minute }) => {
        schedule.scheduleJob({ hour, minute, tz: TIMEZONE }, sendDailyAyat);
        console.log(`Запланирована отправка аята на ${hour}:${minute} (${TIMEZONE})`);
    });
}

// Express сервер
app.get('/', (req, res) => res.send('Бот работает!'));

// Запуск
async function start() {
    try {
        app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
        await bot.launch();
        console.log('Бот успешно запущен');
        scheduleAyatNotifications();
    } catch (error) {
        console.error('Ошибка при запуске:', error.message);
    }
}

// Graceful shutdown
function shutdown(signal) {
    console.log(`${signal} получен, завершаем работу...`);
    schedule.gracefulShutdown()
        .then(() => bot.stop(signal))
        .then(() => process.exit(0));
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

start();

// Вспомогательная функция для проверки переменных окружения
function throwError(message) {
    throw new Error(message);
}