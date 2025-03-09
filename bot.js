require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const axios = require('axios');

const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_ID = -123456789; 

const bot = new Telegraf(BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 5000;

// Получение времени намаза через API для Алматы
const getPrayerTimes = async () => {
    try {
        const response = await axios.get('http://api.aladhan.com/v1/timingsByCity', {
            params: {
                city: 'Almaty',
                country: 'Kazakhstan',
                method: 2 // Метод расчета
            }
        });
        return response.data.data.timings;
    } catch (error) {
        console.error('Ошибка при получении времени намаза:', error);
        return {
            Fajr: "05:30",
            Dhuhr: "12:30",
            Asr: "15:45",
            Maghrib: "18:15",
            Isha: "19:45"
        };
    }
};

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
        'и буду уведомлять о наступлении времени каждого намаза по Алматы.'
    );
});

// Обработчик команды /ayat
bot.command('ayat', (ctx) => {
    const ayat = getRandomAyat();
    ctx.reply(`📖 *${ayat.reference}*\n\n_${ayat.text}_`, { parse_mode: 'Markdown' });
});

// Обработчик команды /prayer для получения времени намаза
bot.command('prayer', async (ctx) => {
    const times = await getPrayerTimes();
    const today = new Date().toLocaleDateString('ru-RU', { timeZone: 'Asia/Almaty' });

    const message = `📅 *${today}* \n\n🕌 Время намаза в Алматы:\n\n` +
                   `Фаджр: ${times.Fajr}\n` +
                   `Зухр: ${times.Dhuhr}\n` +
                   `Аср: ${times.Asr}\n` +
                   `Магриб: ${times.Maghrib}\n` +
                   `Иша: ${times.Isha}`;
    
    ctx.reply(message, { parse_mode: 'Markdown' });
});

// Отправка ежедневного аята
const sendDailyAyat = async () => {
    const ayat = getRandomAyat();
    const today = new Date().toLocaleDateString('ru-RU', { timeZone: 'Asia/Almaty' });
    const text = `📅 *${today}*\n📖 *${ayat.reference}*\n\n_${ayat.text}_`;

    try {
        await bot.telegram.sendMessage(GROUP_ID, text, { parse_mode: 'Markdown' });
        console.log(`Аят успешно отправлен в группу ${GROUP_ID}`);
    } catch (error) {
        console.error('Ошибка при отправке аята:', error);
    }
};

// Отправка уведомления о намазе
const sendPrayerNotification = async (prayerName, time) => {
    const today = new Date().toLocaleDateString('ru-RU', { timeZone: 'Asia/Almaty' });
    const message = `📅 *${today}* \n\n🕌 Наступило время намаза *${prayerName}* в Алматы: ${time}`;

    try {
        await bot.telegram.sendMessage(GROUP_ID, message, { parse_mode: 'Markdown' });
        console.log(`Уведомление о ${prayerName} отправлено в группу ${GROUP_ID}`);
    } catch (error) {
        console.error(`Ошибка при отправке уведомления о ${prayerName}:`, error);
    }
};

// Планирование уведомлений о намазе
const schedulePrayerNotifications = async () => {
    const times = await getPrayerTimes();

    // Названия намазов на русском
    const prayerNames = {
        Fajr: 'Фаджр',
        Dhuhr: 'Зухр',
        Asr: 'Аср',
        Maghrib: 'Магриб',
        Isha: 'Иша'
    };

    // Очистка предыдущих заданий
    schedule.gracefulShutdown().then(() => {
        Object.entries(times).forEach(([prayer, time]) => {
            const [hours, minutes] = time.split(':');
            const utcHours = (parseInt(hours) - 5 + 24) % 24; // Алматы UTC+5
            
            const rule = new schedule.RecurrenceRule();
            rule.hour = utcHours;
            rule.minute = parseInt(minutes);
            rule.tz = 'UTC';

            schedule.scheduleJob(rule, () => {
                sendPrayerNotification(prayerNames[prayer], time);
            });

            console.log(`Запланировано уведомление для ${prayerNames[prayer]} на ${time} (UTC ${utcHours}:${minutes})`);
        });

        // Запланировать отправку ежедневного аята в 12:00 по Алматы (07:00 UTC)
        schedule.scheduleJob('00 07 * * *', sendDailyAyat);
    });
};

// Обновление расписания каждый день в 00:00 по Алматы (19:00 UTC предыдущего дня)
schedule.scheduleJob('00 19 * * *', () => {
    console.log('Обновление расписания намазов');
    schedulePrayerNotifications();
});

// Запуск сервера Express
app.get('/', (req, res) => {
    res.send('Бот работает!');
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});

// Запуск бота и первоначальное планирование
bot.launch()
    .then(() => {
        console.log('Бот запущен');
        schedulePrayerNotifications(); // Первоначальное планирование
    })
    .catch(console.error);

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
