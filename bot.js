require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');

const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_ID = -123456789; // Укажите реальный ID группы

const bot = new Telegraf(BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 5000;

// Функция для получения случайного аята
const getRandomAyat = () => {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'ayats.json'), 'utf-8');
        const ayats = JSON.parse(data);
        return ayats[Math.floor(Math.random() * ayats.length)];
    } catch (error) {
        console.error('Ошибка при чтении ayats.json:', error);
        return { reference: 'Ошибка', text: 'Не удалось загрузить аят' };
    }
};

// Обработчик команды /start
bot.start((ctx) => {
    ctx.reply(
        'Ассаламу алейкум ва рахматулахи ва баракатух! \n\n' +
        'Я Басир — ваш спутник на пути к духовному свету.\n' +
        'Каждый день в 12:00 я буду приносить вам аяты из Священного Корана,\n' +
        'чтобы вдохновлять, напоминать о милости Аллаха и укреплять вашу веру.'
    );
});

// Обработчик команды /ayat
bot.command('ayat', (ctx) => {
    const ayat = getRandomAyat();
    ctx.reply(`📖 *${ayat.reference}*\n\n_${ayat.text}_`, { parse_mode: 'Markdown' });
});

// Функция для отправки ежедневного аята
const sendDailyAyat = async () => {
    const ayat = getRandomAyat();
    const text = `📖 *${ayat.reference}*\n\n_${ayat.text}_`;
    try {
        await bot.telegram.sendMessage(GROUP_ID, text, { parse_mode: 'Markdown' });
        console.log(`Аят успешно отправлен в группу ${GROUP_ID}`);
    } catch (error) {
        console.error('Ошибка при отправке аята:', error);
    }
};

// Планировщик заданий
schedule.scheduleJob('30 6 * * *', sendDailyAyat); // 06:30 утра
schedule.scheduleJob('00 12 * * *', sendDailyAyat); // 12:00 дня

// Веб-сервер для проверки работоспособности
app.get('/', (req, res) => {
    res.send('Бот работает!');
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});

// Запуск бота
bot.launch().then(() => console.log('Бот запущен')).catch(console.error);

// Грейсфул-шатдаун для корректного завершения работы бота
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));