const fs = require('fs').promises;

async function createTestData() {
    const testData = {
        notifications: [
            {
                id: 1,
                title: "Добро пожаловать в систему!",
                content: "Это тестовое уведомление. Система работает корректно.",
                author: "admin",
                created_at: new Date().toISOString(),
                is_important: true,
                tags: ["приветствие", "информация"]
            },
            {
                id: 2,
                title: "Тестовое уведомление",
                content: "Если вы видите это сообщение, значит система загружает уведомления из JSON файла.",
                author: "admin", 
                created_at: new Date().toISOString(),
                is_important: false,
                tags: ["тест"]
            }
        ],
        next_id: 3
    };
    
    try {
        await fs.mkdir('./data', { recursive: true });
        await fs.writeFile('./data/notifications.json', JSON.stringify(testData, null, 2));
        console.log('✅ Тестовые уведомления созданы!');
    } catch (error) {
        console.error('❌ Ошибка:', error);
    }
}

createTestData();