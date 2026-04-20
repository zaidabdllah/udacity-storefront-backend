import DBService from '../database/DBService';

export type ProductSeed = {
    name: string;
    price: number;
    category: string;
};

export const productsSeedData: ProductSeed[] = [
    { name: 'Wireless Bluetooth Earbuds', price: 49.99, category: 'electronics' },
    { name: 'Noise Cancelling Headphones', price: 129.99, category: 'electronics' },
    { name: 'Smart Watch Series X', price: 199.99, category: 'electronics' },
    { name: '27 Inch 4K Monitor', price: 329.99, category: 'electronics' },
    { name: 'Mechanical Gaming Keyboard', price: 89.99, category: 'electronics' },
    { name: 'Wireless Gaming Mouse', price: 59.99, category: 'electronics' },
    { name: 'USB-C Fast Charger 65W', price: 29.99, category: 'electronics' },
    { name: 'Portable Power Bank 20000mAh', price: 39.99, category: 'electronics' },
    { name: 'Full HD Webcam', price: 54.99, category: 'electronics' },
    { name: 'RGB USB Microphone', price: 79.99, category: 'electronics' },
    { name: 'External SSD 1TB', price: 109.99, category: 'electronics' },
    { name: 'Laptop Cooling Pad', price: 24.99, category: 'electronics' },
    { name: 'Bluetooth Speaker Mini', price: 34.99, category: 'electronics' },
    { name: 'Tablet 10 Inch', price: 249.99, category: 'electronics' },
    { name: 'Action Camera 4K', price: 179.99, category: 'electronics' },

    { name: 'Mens Cotton T-Shirt Black', price: 19.99, category: 'clothing' },
    { name: 'Mens Slim Fit Jeans Blue', price: 44.99, category: 'clothing' },
    { name: 'Mens Hoodie Charcoal', price: 39.99, category: 'clothing' },
    { name: 'Womens Casual Blouse White', price: 29.99, category: 'clothing' },
    { name: 'Womens Denim Jacket Blue', price: 59.99, category: 'clothing' },
    { name: 'Womens Running Leggings Black', price: 34.99, category: 'clothing' },
    { name: 'Unisex Sports Cap Navy', price: 14.99, category: 'clothing' },
    { name: 'Unisex Socks Pack of 5', price: 12.99, category: 'clothing' },
    { name: 'Winter Scarf Gray', price: 17.99, category: 'clothing' },
    { name: 'Leather Belt Brown', price: 24.99, category: 'clothing' },

    { name: 'Ceramic Coffee Mug White', price: 8.99, category: 'home' },
    { name: 'Electric Kettle 1.7L', price: 39.99, category: 'home' },
    { name: 'Non-Stick Frying Pan 28cm', price: 27.99, category: 'home' },
    { name: 'Wooden Cutting Board Large', price: 16.99, category: 'home' },
    { name: 'Stainless Steel Knife Set', price: 49.99, category: 'home' },
    { name: 'Air Fryer 5L', price: 89.99, category: 'home' },
    { name: 'LED Desk Lamp', price: 22.99, category: 'home' },
    { name: 'Storage Basket Set', price: 18.99, category: 'home' },
    { name: 'Memory Foam Pillow', price: 31.99, category: 'home' },
    { name: 'Wall Clock Minimal', price: 19.99, category: 'home' },

    { name: 'A5 Spiral Notebook', price: 4.99, category: 'stationery' },
    { name: 'Ballpoint Pen Pack 10', price: 3.99, category: 'stationery' },
    { name: 'Highlighter Set 6 Colors', price: 5.99, category: 'stationery' },
    { name: 'Permanent Marker Black', price: 1.99, category: 'stationery' },
    { name: 'Sticky Notes 12 Pack', price: 4.49, category: 'stationery' },
    { name: 'Office Stapler Metal', price: 7.99, category: 'stationery' },
    { name: 'Staple Pins Box', price: 1.99, category: 'stationery' },
    { name: 'Desk Organizer Mesh', price: 9.99, category: 'stationery' },
    { name: 'Printer Paper A4 500 Sheets', price: 6.99, category: 'stationery' },
    { name: 'Whiteboard Marker Set 4', price: 4.99, category: 'stationery' },

    { name: 'Basmati Rice 5kg', price: 14.99, category: 'food' },
    { name: 'Olive Oil Extra Virgin 1L', price: 11.99, category: 'food' },
    { name: 'Pasta Penne 500g', price: 2.49, category: 'food' },
    { name: 'Tomato Sauce Classic 700g', price: 2.99, category: 'food' },
    { name: 'Tuna Chunks in Water', price: 1.99, category: 'food' },
    { name: 'Peanut Butter Creamy 340g', price: 4.99, category: 'food' },
    { name: 'Corn Flakes Original 500g', price: 3.99, category: 'food' },
    { name: 'Green Tea Bags 100 Count', price: 5.99, category: 'food' },
    { name: 'Ground Coffee Premium 250g', price: 6.99, category: 'food' },
    { name: 'Honey Natural 500g', price: 8.99, category: 'food' },
    { name: 'Dark Chocolate Bar 100g', price: 2.49, category: 'food' },
    { name: 'Sea Salt Fine 750g', price: 1.49, category: 'food' },
    { name: 'Black Pepper Ground 100g', price: 2.99, category: 'food' },
    { name: 'Lentils Red 1kg', price: 3.49, category: 'food' },
    { name: 'Dates Premium 800g', price: 7.99, category: 'food' },

    { name: 'Shampoo Repair 400ml', price: 5.99, category: 'beauty' },
    { name: 'Conditioner Smooth 400ml', price: 5.99, category: 'beauty' },
    { name: 'Body Wash Fresh 500ml', price: 4.99, category: 'beauty' },
    { name: 'Face Cleanser Gentle 200ml', price: 6.99, category: 'beauty' },
    { name: 'Moisturizing Cream 250ml', price: 7.99, category: 'beauty' },
    { name: 'Sunscreen SPF 50', price: 9.99, category: 'beauty' },
    { name: 'Hair Serum Argan 100ml', price: 8.99, category: 'beauty' },
    { name: 'Deodorant Roll On 50ml', price: 3.99, category: 'beauty' },
    { name: 'Perfume Ocean Mist 100ml', price: 24.99, category: 'beauty' },
    { name: 'Lip Balm Shea Butter', price: 2.99, category: 'beauty' },

    { name: 'Yoga Mat Premium', price: 19.99, category: 'sports' },
    { name: 'Resistance Bands Set', price: 13.99, category: 'sports' },
    { name: 'Dumbbell 5kg Pair', price: 29.99, category: 'sports' },
    { name: 'Skipping Rope Adjustable', price: 8.99, category: 'sports' },
    { name: 'Football Training Ball', price: 18.99, category: 'sports' },
    { name: 'Basketball Indoor Outdoor', price: 21.99, category: 'sports' },
    { name: 'Water Bottle 1L Sports', price: 9.99, category: 'sports' },
    { name: 'Gym Towel Quick Dry', price: 7.99, category: 'sports' },
    { name: 'Fitness Gloves Black', price: 12.99, category: 'sports' },
    { name: 'Exercise Bench Foldable', price: 119.99, category: 'sports' },

    { name: 'Building Blocks 500 Pieces', price: 34.99, category: 'toys' },
    { name: 'Remote Control Car Red', price: 27.99, category: 'toys' },
    { name: 'Plush Teddy Bear Large', price: 16.99, category: 'toys' },
    { name: 'Puzzle 1000 Pieces', price: 11.99, category: 'toys' },
    { name: 'Doll House Mini Set', price: 39.99, category: 'toys' },
    { name: 'Toy Kitchen Play Set', price: 44.99, category: 'toys' },
    { name: 'Action Figure Hero Series', price: 14.99, category: 'toys' },
    { name: 'Wooden Train Set', price: 24.99, category: 'toys' },
    { name: 'Kids Art Kit Deluxe', price: 19.99, category: 'toys' },
    { name: 'Educational Flash Cards', price: 9.99, category: 'toys' },

    { name: 'Atomic Habits', price: 15.99, category: 'books' },
    { name: 'Deep Work', price: 14.99, category: 'books' },
    { name: 'Clean Code', price: 27.99, category: 'books' },
    { name: 'The Pragmatic Programmer', price: 29.99, category: 'books' },
    { name: 'Rich Dad Poor Dad', price: 13.99, category: 'books' },
    { name: 'Thinking Fast and Slow', price: 18.99, category: 'books' },
    { name: 'The Great Gatsby', price: 10.99, category: 'books' },
    { name: 'To Kill a Mockingbird', price: 12.99, category: 'books' },
    { name: '1984', price: 11.99, category: 'books' },
    { name: 'Sapiens', price: 19.99, category: 'books' }
];

export const seedProducts = async (): Promise<void> => {
    await DBService.query('TRUNCATE TABLE products RESTART IDENTITY CASCADE');

    const placeholders: string[] = [];
    const params: Array<string | number> = [];

    productsSeedData.forEach((product, index) => {
        const offset = index * 3;
        placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3})`);
        params.push(product.name, product.price, product.category);
    });

    const insertSql = `
        INSERT INTO products (name, price, category)
        VALUES ${placeholders.join(',\n')}
    `;

    await DBService.query(insertSql, params);
};

export const run = async (): Promise<void> => {
    try {
        await seedProducts();
        console.log(`Seed completed: inserted ${productsSeedData.length} products.`);
        process.exit(0);
    } catch (error) {
        console.error('Seed failed for products table.');
        console.error(error);
        process.exit(1);
    }
};

if (require.main === module) {
    run();
}
