const sequelize = require('./database/sequelize');
const { User, Product, Cart, CartItem } = require('./models/associations');

async function verifyCart() {
    try {
        await sequelize.sync({ force: false }); // Ensure tables exist

        // 1. Find or Create User
        const [user] = await User.findOrCreate({
            where: { email: 'test@example.com' },
            defaults: {
                name: 'Test User',
                password: 'password123',
                phone: '1234567890',
                role: 'customer'
            }
        });
        console.log('User:', user.id);

        // 2. Find or Create Product
        const [product] = await Product.findOrCreate({
            where: { name: 'Test Product' },
            defaults: {
                price: 29.99,
                category: 'Test',
                description: 'A test product',
                isActive: true
            }
        });
        console.log('Product:', product.id);

        // 3. Create Cart
        const cart = await Cart.create({
            userId: user.id,
            status: 'active'
        });
        console.log('Cart created:', cart.id);

        // 4. Add Item to Cart
        const cartItem = await CartItem.create({
            cartId: cart.id,
            productId: product.id,
            quantity: 2,
            price: product.price,
            size: 'M'
        });
        console.log('CartItem added:', cartItem.id);

        // 5. Fetch Cart with Items
        const fetchedCart = await Cart.findByPk(cart.id, {
            include: [{
                model: CartItem,
                as: 'items',
                include: [{
                    model: Product,
                    as: 'product'
                }]
            }]
        });

        console.log('Fetched Cart Items:', JSON.stringify(fetchedCart.items, null, 2));

        if (fetchedCart.items.length > 0 && fetchedCart.items[0].product.id === product.id) {
            console.log('VERIFICATION SUCCESSFUL');
        } else {
            console.error('VERIFICATION FAILED');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        // Cleanup (optional, maybe keep for inspection)
        // await sequelize.close(); 
    }
}

verifyCart();
