const bcrypt = require('bcryptjs');

async function createUsers() {
    const hashedAdmin = await bcrypt.hash('admin', 10);
    const hashedStudent = await bcrypt.hash('student', 10);
    
    console.log('Хеш для admin:', hashedAdmin);
    console.log('Хеш для student:', hashedStudent);
}

createUsers();