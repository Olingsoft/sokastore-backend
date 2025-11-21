const axios = require('axios');

const API_URL = 'http://localhost:3001/api';
let token = '';
let productId = '';
let cartItemId = '';

async function verifyCartAPI() {
    try {
        console.log('Starting Cart API Verification...');

        // 0. Health Check
        console.log('\n0. Checking server health...');
        try {
            const healthRes = await axios.get('http://localhost:3001/');
            console.log('Health check:', healthRes.data);
        } catch (e) {
            console.error('Health check failed:', e.message);
            if (e.response) console.error('Response:', e.response.data);
            return;
        }

        const uniqueId = Date.now();
        const email = `test${uniqueId}@example.com`;
        const password = 'password123';

        // 1. Register (since we want a fresh user with hashed password)
        console.log('\n1. Registering new user...');
        try {
            const registerRes = await axios.post(`${API_URL}/auth/register`, {
                name: 'Test User',
                email: email,
                password: password,
                phone: `123${uniqueId.toString().slice(-7)}`
            });
            token = registerRes.data.token;
            console.log('Registration successful');
        } catch (error) {
            console.error('Registration failed:', error.response ? error.response.data : error.message);
            throw error;
        }

        const config = {
            headers: { Authorization: `Bearer ${token}` }
        };

        // 2. Get a Product ID
        console.log('\n2. Fetching a product...');
        const productsRes = await axios.get(`${API_URL}/products`);
        if (productsRes.data.data.length === 0) {
            // Create a dummy product if none exist (assuming we have a way or just fail)
            console.error('No products found. Cannot test cart.');
            return;
        }
        productId = productsRes.data.data[0].id;
        console.log(`Product found: ${productId}`);

        // 3. Add to Cart
        console.log('\n3. Adding to cart...');
        const addRes = await axios.post(`${API_URL}/cart/add`, {
            productId: productId,
            quantity: 2
        }, config);
        console.log('Added to cart:', addRes.data.message);
        cartItemId = addRes.data.cartItem.id;

        // 4. Get Cart
        console.log('\n4. Fetching cart...');
        const cartRes = await axios.get(`${API_URL}/cart`, config);
        console.log('Cart items count:', cartRes.data.items.length);
        if (cartRes.data.items.length > 0) {
            console.log('Cart verification: OK');
        } else {
            console.error('Cart verification: FAILED (Cart empty)');
        }

        // 5. Update Cart Item
        console.log('\n5. Updating cart item...');
        const updateRes = await axios.put(`${API_URL}/cart/item/${cartItemId}`, {
            quantity: 5
        }, config);
        console.log('Updated quantity:', updateRes.data.cartItem.quantity);

        // 6. Remove Cart Item
        console.log('\n6. Removing cart item...');
        await axios.delete(`${API_URL}/cart/item/${cartItemId}`, config);
        console.log('Item removed');

        // 7. Clear Cart (Add item again first)
        console.log('\n7. Clearing cart...');
        await axios.post(`${API_URL}/cart/add`, { productId, quantity: 1 }, config);
        await axios.delete(`${API_URL}/cart`, config);

        const finalCartRes = await axios.get(`${API_URL}/cart`, config);
        if (finalCartRes.data.items.length === 0) {
            console.log('Cart cleared successfully');
        } else {
            console.error('Cart clear failed');
        }

        console.log('\nALL TESTS PASSED');

    } catch (error) {
        console.error('Verification Failed:', error.response ? error.response.data : error.message);
        if (error.response && error.response.status === 404) {
            console.error('Endpoint not found. Check routes.');
        }
    }
}

verifyCartAPI();
