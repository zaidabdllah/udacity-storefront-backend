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
        await DBService.query('TRUNCATE TABLE products RESTART IDENTITY CASCADE');
        await DBService.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
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
});
