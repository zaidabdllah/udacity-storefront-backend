import request from 'supertest';
import DBService from '../../../database/DBService';
import app from '../../../index';

describe('Products routes', () => {
    const createAuthToken = async (): Promise<string> => {
        const registerResponse = await request(app).post('/users/register').send({
            username: 'producttester',
            first_name: 'Product',
            last_name: 'Tester',
            password: 'secret123'
        });

        return registerResponse.body.jwtToken as string;
    };

    beforeAll(async () => {
        const result = await DBService.query<{ current_database: string }>('SELECT current_database()');
        expect(result.rows[0].current_database).toBe(process.env.POSTGRES_TEST_DB as string);
    });

    beforeEach(async () => {
        await DBService.query('TRUNCATE TABLE order_products, orders, products, users RESTART IDENTITY CASCADE');
    });

    it('GET /products returns products list', async () => {
        const response = await request(app).get('/products');

        expect(response.status).toBe(200);
        expect(response.body.ok).toBeTrue();
        expect(response.body.code).toBe('PRODUCTS_RETRIEVED');
        expect(Array.isArray(response.body.products)).toBeTrue();
        expect(response.body.products.length).toBe(0);
    });

    it('POST /products requires a token', async () => {
        const response = await request(app).post('/products').send({
            name: 'Without Token',
            price: 10
        });

        expect(response.status).toBe(401);
        expect(response.body.code).toBe('MISSING_TOKEN');
    });

    it('POST /products creates a product with a valid token', async () => {
        const token = await createAuthToken();
        const response = await request(app).post('/products').set('Authorization', `Bearer ${token}`).send({
            name: 'Wireless Mouse',
            price: 25.99,
            category: 'Accessories'
        });

        expect(response.status).toBe(201);
        expect(response.body.ok).toBeTrue();
        expect(response.body.code).toBe('PRODUCT_CREATED');
        expect(response.body.product.name).toBe('Wireless Mouse');
        expect(Number(response.body.product.price)).toBeCloseTo(25.99, 2);
        expect(response.body.product.category).toBe('accessories');
    });

    it('POST /products validates price format', async () => {
        const token = await createAuthToken();
        const response = await request(app).post('/products').set('Authorization', `Bearer ${token}`).send({
            name: 'Broken Price',
            price: 'not-a-number',
            category: 'misc'
        });

        expect(response.status).toBe(400);
        expect(response.body.code).toBe('PRODUCT_PRICE_MUST_BE_NUMBER');
    });

    it('GET /products/:id returns product and 404 for missing product', async () => {
        const token = await createAuthToken();
        await request(app).post('/products').set('Authorization', `Bearer ${token}`).send({
            name: 'Mechanical Keyboard',
            price: 99.95,
            category: 'Accessories'
        });

        const foundResponse = await request(app).get('/products/1');
        const missingResponse = await request(app).get('/products/9999');

        expect(foundResponse.status).toBe(200);
        expect(foundResponse.body.code).toBe('PRODUCT_RETRIEVED');
        expect(foundResponse.body.product.name).toBe('Mechanical Keyboard');

        expect(missingResponse.status).toBe(404);
        expect(missingResponse.body.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('GET /products/category/:category returns only products in that category', async () => {
        const token = await createAuthToken();
        await request(app).post('/products').set('Authorization', `Bearer ${token}`).send({
            name: 'USB-C Cable',
            price: 7.5,
            category: 'Accessories'
        });
        await request(app).post('/products').set('Authorization', `Bearer ${token}`).send({
            name: 'Monitor',
            price: 180,
            category: 'Electronics'
        });
        await request(app).post('/products').set('Authorization', `Bearer ${token}`).send({
            name: 'Mouse Pad',
            price: 6,
            category: 'accessories'
        });

        const response = await request(app).get('/products/category/ACCESSORIES');

        expect(response.status).toBe(200);
        expect(response.body.code).toBe('PRODUCTS_BY_CATEGORY_RETRIEVED');
        expect(response.body.products.length).toBe(2);
        expect(response.body.products[0].name).toBe('USB-C Cable');
        expect(response.body.products[1].name).toBe('Mouse Pad');
    });

    it('GET /products/popular/:limit returns top popular products from completed orders', async () => {
        const userResult = await DBService.query<{ id: number }>(
            `INSERT INTO users (username, first_name, last_name, password_digest)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            ['popularroute', 'Pop', 'Route', 'hashed-password']
        );
        const userId = userResult.rows[0].id;

        const hammer = await DBService.query<{ id: number }>(
            `INSERT INTO products (name, price, category) VALUES ($1, $2, $3) RETURNING id`,
            ['Route Hammer', 12, 'tools']
        );
        const drill = await DBService.query<{ id: number }>(
            `INSERT INTO products (name, price, category) VALUES ($1, $2, $3) RETURNING id`,
            ['Route Drill', 45, 'tools']
        );
        const saw = await DBService.query<{ id: number }>(
            `INSERT INTO products (name, price, category) VALUES ($1, $2, $3) RETURNING id`,
            ['Route Saw', 18, 'tools']
        );

        const completeOrder1 = await DBService.query<{ id: number }>(
            `INSERT INTO orders (user_id, status) VALUES ($1, 'complete') RETURNING id`,
            [userId]
        );
        const completeOrder2 = await DBService.query<{ id: number }>(
            `INSERT INTO orders (user_id, status) VALUES ($1, 'complete') RETURNING id`,
            [userId]
        );
        const activeOrder = await DBService.query<{ id: number }>(
            `INSERT INTO orders (user_id, status) VALUES ($1, 'active') RETURNING id`,
            [userId]
        );

        await DBService.query(
            `INSERT INTO order_products (order_id, product_id, quantity)
             VALUES ($1, $2, $3), ($1, $4, $5), ($6, $2, $7), ($6, $8, $9), ($10, $8, $11)`,
            [
                completeOrder1.rows[0].id, hammer.rows[0].id, 2, drill.rows[0].id, 5,
                completeOrder2.rows[0].id, 4, saw.rows[0].id, 1,
                activeOrder.rows[0].id, 100
            ]
        );

        const response = await request(app).get('/products/popular/2');

        expect(response.status).toBe(200);
        expect(response.body.code).toBe('POPULAR_PRODUCTS_RETRIEVED');
        expect(response.body.products.length).toBe(2);
        expect(response.body.products[0].name).toBe('Route Hammer');
        expect(response.body.products[1].name).toBe('Route Drill');
        expect(Number(response.body.products[0].total_sold)).toBe(6);
        expect(Number(response.body.products[1].total_sold)).toBe(5);
    });

    it('GET /products/popular/:limit validates limit as positive integer', async () => {
        const nonNumericResponse = await request(app).get('/products/popular/not-a-number');
        const zeroResponse = await request(app).get('/products/popular/0');
        const decimalResponse = await request(app).get('/products/popular/2.5');

        expect(nonNumericResponse.status).toBe(400);
        expect(nonNumericResponse.body.code).toBe('INVALID_LIMIT');

        expect(zeroResponse.status).toBe(400);
        expect(zeroResponse.body.code).toBe('INVALID_LIMIT');

        expect(decimalResponse.status).toBe(400);
        expect(decimalResponse.body.code).toBe('INVALID_LIMIT');
    });
});
