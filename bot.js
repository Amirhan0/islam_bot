require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');

const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_ID = process.env.GROUP_ID || -1002281200730;

const bot = new Telegraf(BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 5000;

const getRandomAyat = () => {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'ayats.json'), 'utf-8');
        const ayats = JSON.parse(data);
        console.log('Ayats loaded:', ayats.length);
        return ayats[Math.floor(Math.random() * ayats.length)];
    } catch (error) {
        console.error('Ошибка при чтении ayats.json:', error.message);
        return { reference: 'Ошибка', text: 'Не удалось загрузить аят' };
    }
};

bot.start((ctx) => {
    ctx.reply(
        'Ассаламу алейкум ва рахматулахи ва баракатух! \n\n' +
        'Я Басир — ваш спутник на пути к духовному свету.\n' +
        'Каждый день в 12:00 и 18:00 я буду приносить вам аяты из Священного Корана.'
    );
});

bot.command('ayat', (ctx) => {
    const ayat = getRandomAyat();
    ctx.reply(`\ud83d\udcda *${ayat.reference}*\n\n_${ayat.text}_`, { parse_mode: 'Markdown' });
});

const sendDailyAyat = async () => {
    const ayat = getRandomAyat();
    const today = new Date().toLocaleDateString('ru-RU', { timeZone: 'Asia/Almaty' });
    const text = `\ud83d\udcc5 *${today}*\n\ud83d\udcda *${ayat.reference}*\n\n_${ayat.text}_`;

    try {
        await bot.telegram.sendMessage(GROUP_ID, text, { parse_mode: 'Markdown' });
        console.log(`Аят успешно отправлен в группу ${GROUP_ID}`);
    } catch (error) {
        console.error('Ошибка при отправке аята:', error.message);
    }
};

const scheduleAyatNotifications = () => {
    schedule.scheduleJob({ hour: 12, minute: 0, tz: 'Asia/Almaty' }, sendDailyAyat);
    schedule.scheduleJob({ hour: 18, minute: 0, tz: 'Asia/Almaty' }, sendDailyAyat);
    console.log('Ежедневные аяты запланированы на 12:00 и 18:00 (Алматы)');
};

app.get('/', (req, res) => {
    res.send('Бот работает!');
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});

bot.launch()
    .then(() => {
        console.log('Бот успешно запущен');
        scheduleAyatNotifications();
    })
    .catch((error) => {
        console.error('Ошибка при запуске бота:', error.message);
    });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
