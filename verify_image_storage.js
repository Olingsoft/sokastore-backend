const mongoose = require('mongoose');
const ProductImage = require('./models/ProductImage');
require('dotenv').config();

const verifyStorage = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.log('Skipping test: MONGO_URI not found in environment');
            // Try fallback
            await mongoose.connect('mongodb://localhost:27017/sokastore');
        } else {
            console.log('Connecting to MongoDB...');
            await mongoose.connect(process.env.MONGO_URI);
        }
        console.log('Connected');

        const testBuffer = Buffer.from('fake image data');
        const testMime = 'image/png';

        console.log('Creating test image...');
        // We need a dummy productId, let's create a ObjectId
        const dummyId = new mongoose.Types.ObjectId();

        const image = await ProductImage.create({
            productId: dummyId,
            url: 'placeholder',
            data: testBuffer,
            contentType: testMime,
            isPrimary: true
        });

        console.log('Image created with ID:', image._id);

        if (!image.data) {
            throw new Error('Image data not saved!');
        }
        console.log('Image data saved successfully (buffer length):', image.data.length);

        console.log('Updating URL...');
        image.url = `/api/products/image/${image._id}`;
        await image.save();
        console.log('URL updated:', image.url);

        console.log('Cleaning up...');
        await ProductImage.findByIdAndDelete(image._id);
        console.log('Test image deleted');

        console.log('Verification SUCCESS');
    } catch (error) {
        console.error('Verification FAILED:', error);
    } finally {
        await mongoose.disconnect();
    }
};

verifyStorage();
