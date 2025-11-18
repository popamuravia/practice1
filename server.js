const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your-secret-key';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(express.static('public', {
    setHeaders: (res, path) => {
        // Отключаем кеширование для всех файлов
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
}));

// 📁 ПРОСТЫЕ ФУНКЦИИ ДЛЯ РАБОТЫ С ФАЙЛАМИ

// Чтение уведомлений
async function readNotifications() {
    try {
        const data = await fs.readFile('./data/notifications.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Если файла нет, создаем базовую структуру
        console.log('📝 Создаю новый файл уведомлений...');
        const defaultData = { notifications: [], next_id: 1 };
        await fs.mkdir('./data', { recursive: true });
        await fs.writeFile('./data/notifications.json', JSON.stringify(defaultData, null, 2));
        return defaultData;
    }
}

// Функция для создания тестовых уведомлений
async function createTestNotifications() {
    try {
        const data = await readNotifications();
        
        if (data.notifications.length === 0) {
            console.log('📝 Создаю тестовые уведомления...');
            
            const testNotifications = [
                {
                    id: 1,
                    title: "Добро пожаловать в систему!",
                    content: "Это тестовое уведомление для демонстрации работы системы.",
                    author: "admin",
                    created_at: new Date().toISOString(),
                    is_important: true,
                    tags: ["приветствие", "важно"]
                },
                {
                    id: 2,
                    title: "Расписание занятий",
                    content: "Занятия проходят по расписанию. Не опаздывайте!",
                    author: "admin",
                    created_at: new Date().toISOString(),
                    is_important: false,
                    tags: ["расписание"]
                },
                {
                    id: 3,
                    title: "Технические работы",
                    content: "Завтра с 10:00 до 11:00 будут проводиться технические работы.",
                    author: "admin", 
                    created_at: new Date().toISOString(),
                    is_important: true,
                    tags: ["техработы", "важно"]
                }
            ];
            
            data.notifications = testNotifications;
            data.next_id = 4;
            await writeNotifications(data);
            
            console.log('✅ Тестовые уведомления созданы');
        }
    } catch (error) {
        console.error('❌ Ошибка создания тестовых уведомлений:', error);
    }
}

// Запись уведомлений
async function writeNotifications(data) {
    await fs.writeFile('./data/notifications.json', JSON.stringify(data, null, 2));
}

// Чтение пользователей
async function readUsers() {
    try {
        const data = await fs.readFile('./data/users.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log('Создаю новый файл пользователей...');
        const defaultData = { users: [] };
        await fs.mkdir('./data', { recursive: true });
        await fs.writeFile('./data/users.json', JSON.stringify(defaultData, null, 2));
        return defaultData;
    }
}

// 🔐 АУТЕНТИФИКАЦИЯ

app.post('/api/login', async (req, res) => {
    try {
        const { login, password } = req.body;
        console.log('Попытка входа:', login);

        // ПРОСТАЯ ПРОВЕРКА ДЛЯ ТЕСТА
        if (login === 'admin' && password === 'admin') {
            const token = jwt.sign(
                { id: 1, login: 'admin', role: 'admin'},
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            return res.json({
                token,
                user: {
                    id: 1,
                    login: 'admin',
                    role: 'admin',
                    name: 'Администратор'
                }
            });
        }
        
        if (login === 'student' && password === 'student') {
            const token = jwt.sign(
                { id: 2, login: 'student', role: 'student'},
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            return res.json({
                token,
                user: {
                    id: 2,
                    login: 'student', 
                    role: 'student',
                    name: 'Михаил Новиков',
                    group: 'ИС-23'
                }
            });
        }

        res.status(401).json({ error: 'Неверный логин или пароль' });
        
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// 📢 УВЕДОМЛЕНИЯ

// Получить все уведомления
app.get('/api/notifications', async (req, res) => {
    try {
        console.log('📥 Запрос на получение уведомлений');
        
        const data = await readNotifications();
        console.log('📋 Найдено уведомлений:', data.notifications.length);
        
        // Сортируем по дате (новые сначала)
        const sortedNotifications = data.notifications.sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );
        
        res.json(sortedNotifications);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки уведомлений:', error);
        res.status(500).json({ error: 'Не удалось загрузить уведомления' });
    }
});

// Создать уведомление
app.post('/api/notifications', async (req, res) => {
    try {
        console.log('📝 Попытка создания уведомления');
        
        // Проверяем авторизацию
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Требуются права администратора' });
        }
        
        const { title, content, is_important = false, tags = [] } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: 'Заголовок и содержание обязательны' });
        }
        
        // Читаем текущие уведомления
        const data = await readNotifications();
        console.log('📊 Текущий next_id:', data.next_id);
        
        // Создаем новое уведомление
        const newNotification = {
            id: data.next_id++,
            title,
            content,
            author: decoded.login,
            created_at: new Date().toISOString(),
            is_important,
            tags
        };
        
        console.log('🆕 Создано уведомление:', newNotification);
        
        // Добавляем и сохраняем
        data.notifications.push(newNotification);
        await writeNotifications(data);
        
        res.json(newNotification);
        
    } catch (error) {
        console.error('❌ Ошибка создания уведомления:', error);
        res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
    }
});
// Удалить уведомление
app.delete('/api/notifications/:id', async (req, res) => {
    try {
        console.log('🗑️ Попытка удаления уведомления ID:', req.params.id);
        
        // Проверяем авторизацию
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Требуются права администратора' });
        }
        
        const notificationId = parseInt(req.params.id);
        
        // Читаем текущие уведомления
        const data = await readNotifications();
        
        // Находим индекс уведомления для удаления
        const notificationIndex = data.notifications.findIndex(n => n.id === notificationId);
        
        if (notificationIndex === -1) {
            return res.status(404).json({ error: 'Уведомление не найдено' });
        }
        
        // Удаляем уведомление
        const deletedNotification = data.notifications.splice(notificationIndex, 1)[0];
        console.log('✅ Удалено уведомление:', deletedNotification);
        
        // Сохраняем изменения
        await writeNotifications(data);
        
        res.json({ 
            success: true, 
            message: 'Уведомление удалено',
            deleted: deletedNotification 
        });
        
    } catch (error) {
        console.error('❌ Ошибка удаления уведомления:', error);
        res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
    }
});

// 🏠 ГЛАВНАЯ СТРАНИЦА

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 🚀 ЗАПУСК СЕРВЕРА

app.listen(PORT, async () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    await createTestNotifications(); // ← Добавьте эту строку
});