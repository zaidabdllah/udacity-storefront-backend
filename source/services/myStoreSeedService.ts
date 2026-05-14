import DBService from '../database/DBService';
import { ProductSeed } from './productSeedService';

const myStoreProductsSeedData: ProductSeed[] = [
    {
        name: 'Book',
        price: 9.99,
        category: 'books',
        thumbnail:
            'https://images.unsplash.com/photo-1544947950-fa07a98d237f?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        description:
            'A compact everyday book for reading at home, during study breaks, or while traveling. It is a simple pick for anyone who wants something useful, portable, and easy to enjoy.'
    },
    {
        name: 'Headphones',
        price: 249.99,
        category: 'electronics',
        thumbnail:
            'https://images.unsplash.com/photo-1583394838336-acd977736f90?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        description:
            'Premium headphones made for focused listening, calls, music, and daily entertainment. The comfortable design makes them suitable for long sessions at work, study, or travel.'
    },
    {
        name: 'Backpack',
        price: 79.99,
        category: 'bags',
        thumbnail:
            'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        description:
            'A practical backpack for carrying books, devices, clothes, and daily essentials around town. It works well for school, commuting, weekend plans, and light travel.'
    },
    {
        name: 'Glasses',
        price: 129.99,
        category: 'accessories',
        thumbnail:
            'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        description:
            'Stylish glasses that combine a clean look with everyday usefulness. They are a good fit for daily wear, desk work, reading, and finishing an outfit with a sharp detail.'
    },
    {
        name: 'Cup',
        price: 4.99,
        category: 'home',
        thumbnail:
            'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        description:
            'A simple cup for coffee, tea, water, juice, or any everyday drink. It is useful in the kitchen, office, dorm room, or anywhere you need a reliable drinkware item.'
    },
    {
        name: 'Shirt',
        price: 29.99,
        category: 'clothing',
        thumbnail:
            'https://images.unsplash.com/photo-1581655353564-df123a1eb820?ixlib=rb-1.2.1&ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&auto=format&fit=crop&w=800&q=80',
        description:
            'A comfortable shirt with a clean casual style for everyday outfits. It can be worn on its own or layered, making it a flexible piece for work, school, or weekends.'
    }
];

const seedMyStoreProducts = async (): Promise<void> => {
    await DBService.query('TRUNCATE TABLE products RESTART IDENTITY CASCADE');

    const placeholders: string[] = [];
    const params: Array<string | number> = [];

    myStoreProductsSeedData.forEach((product, index) => {
        const offset = index * 5;
        placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`);
        params.push(product.name, product.price, product.category, product.thumbnail ?? '', product.description ?? '');
    });

    const insertSql = `
        INSERT INTO products (name, price, category, thumbnail, description)
        VALUES ${placeholders.join(',\n')}
    `;

    await DBService.query(insertSql, params);
};

const run = async (): Promise<void> => {
    try {
        await seedMyStoreProducts();
        console.log(`My store seed completed: inserted ${myStoreProductsSeedData.length} products.`);
        process.exit(0);
    } catch (error) {
        console.error('My store seed failed.');
        console.error(error);
        process.exit(1);
    }
};

if (require.main === module) {
    run();
}
