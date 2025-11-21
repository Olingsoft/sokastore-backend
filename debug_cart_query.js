const sequelize = require('./database/sequelize');
const { Cart, CartItem, Product, ProductImage, User } = require('./models/associations');

async function testCartQuery() {
    try {
        await sequelize.authenticate();
        console.log('DB Connected');

        // Find a user
        const user = await User.findOne();
        if (!user) {
            console.log('No users found. Creating a test user.');
            // Create a test user if needed, or just fail
            return;
        }
        console.log('Testing with user ID:', user.id);

        // Run the query
        const cart = await Cart.findOne({
            where: {
                userId: user.id,
                status: 'active'
            },
            include: [{
                model: CartItem,
                as: 'items',
                include: [{
                    model: Product,
                    as: 'product',
                    include: [{
                        model: ProductImage,
                        as: 'images',
                        required: false
                    }]
                }]
            }]
        });

        console.log('Query successful!');
        console.log('Cart:', cart ? JSON.stringify(cart.toJSON(), null, 2) : 'None');

    } catch (error) {
        console.error('Query failed:', error);
    } finally {
        await sequelize.close();
    }
}

testCartQuery();
