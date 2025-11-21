const sequelize = require('./database/sequelize');

async function inspect() {
    try {
        await sequelize.authenticate();
        console.log('Connected.');
        const table = await sequelize.getQueryInterface().describeTable('cart_items');
        Object.keys(table).forEach(key => console.log(key));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

inspect();
