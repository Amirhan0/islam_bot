require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const fs = require('fs').promises; // Используем промисы для асинхронного чтения
const path = require('path');
const schedule = require('node-schedule');
const axios = require('axios'); // Для внешних API

const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_ID = process.env.GROUP_ID || -123456789; // Лучше брать из .env
const ADMIN_ID = process.env.ADMIN_ID; // ID админа для уведомлений об ошибках

const bot = new Telegraf(BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 5000;

// Хранилище использованных аятов для избежания повторов
let usedAyats = new Set();

// Загрузка аятов
async function loadAyats() {
    try {
        const data = await fs.readFile(path.join(__dirname, 'ayats.json'), 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Ошибка загрузки аятов:', error);
        if (ADMIN_ID) {
            bot.telegram.sendMessage(ADMIN_ID, `Ошибка загрузки аятов: ${error.message}`);
        }
        return [];
    }
}

// Получение случайного аята
async function getRandomAyat() {
    const ayats = await loadAyats();
    if (ayats.length === 0) {
        return { reference: 'Ошибка', text: 'Не удалось загрузить аяты' };
    }
    
    // Очистка использованных аятов, если все были показаны
    if (usedAyats.size >= ayats.length) {
        usedAyats.clear();
    }
    
    let ayat;
    do {
        ayat = ayats[Math.floor(Math.random() * ayats.length)];
    } while (usedAyats.has(ayat.reference));
    
    usedAyats.add(ayat.reference);
    return ayat;
}

// Получение аята из внешнего API (резервный вариант)
async function getExternalAyat() {
    try {
        const response = await axios.get('https://api.alquran.cloud/v1/ayah/random');
        return {
            reference: response.data.data.surah.englishName + ' ' + response.data.data.numberInSurah,
            text: response.data.data.text
        };
    } catch (error) {
        console.error('Ошибка API:', error);
        return null;
    }
}

// Приветственное сообщение
bot.start((ctx) => {
    const welcomeMessage = `
    Ассаламу алейкум ва рахматулахи ва баракатух!  
    Я Басир — ваш спутник на пути к духовному свету.  
    Мои возможности:  
    /ayat - получить случайный аят  
    /dua - получить дуа на день  
    Ежедневно в 06:30 и 12:00 я отправляю аяты в группу.
    `;
    ctx.reply(welcomeMessage.trim(), { parse_mode: 'Markdown' });
});

// Команда /ayat
bot.command('ayat', async (ctx) => {
    const ayat = await getRandomAyat();
    const message = `📖 *${ayat.reference}*\n\n_${ayat.text}_`;
    ctx.reply(message, { parse_mode: 'Markdown' });
});

// Команда /dua (пример)
bot.command('dua', async (ctx) => {
    const duas = [
        { text: 'Аллахумма инни асъалюка аль-‘афийя фи д-дунья ва-ль-ахира', translation: 'О Аллах, я прошу у Тебя благополучия в этом мире и в будущем' },
        // Добавьте больше дуа
    ];
    const dua = duas[Math.floor(Math.random() * duas.length)];
    const message = `🤲 *Дуа дня*\n\n_${dua.text}_\n\nПеревод: ${dua.translation}`;
    ctx.reply(message, { parse_mode: 'Markdown' });
});

// Отправка ежедневного аята
async function sendDailyAyat() {
    const ayat = await getRandomAyat();
    const message = `📖 *${ayat.reference}*\n\n_${ayat.text}_`;
    try {
        await bot.telegram.sendMessage(GROUP_ID, message, { parse_mode: 'Markdown' });
        console.log(`Аят отправлен в ${new Date().toLocaleString()}`);
    } catch (error) {
        console.error('Ошибка отправки:', error);
        if (ADMIN_ID) {
            bot.telegram.sendMessage(ADMIN_ID, `Ошибка отправки аята: ${error.message}`);
        }
    }
}

// Расписание по времени Алматы (UTC+6)
schedule.scheduleJob('55 13 * * *', sendDailyAyat);  // 06:00 UTC = 12:00 Алматы
schedule.scheduleJob('0 12 * * *', sendDailyAyat); // 12:00 UTC = 18:00 Алматы

// Веб-сервер
app.get('/', (req, res) => {
    res.json({ status: 'Бот работает', uptime: process.uptime() });
});

// Обработка ошибок бота
bot.catch((err, ctx) => {
    console.error(`Ошибка для ${ctx.updateType}:`, err);
    if (ADMIN_ID) {
        bot.telegram.sendMessage(ADMIN_ID, `Ошибка бота: ${err.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});

bot.launch().then(() => console.log('Бот запущен'));

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));