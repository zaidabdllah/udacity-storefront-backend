import DBService from '../../database/DBService';
import { OrderModel } from '../order';

describe('OrderModel', () => {
    const model = new OrderModel();

    const createUser = async (username: string): Promise<number> => {
        const result = await DBService.query<{ id: number }>(
            `INSERT INTO users (username, first_name, last_name, password_digest)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [username, 'Order', 'User', 'hashed-password']
        );
        return result.rows[0].id;
    };

    const createProduct = async (name: string): Promise<number> => {
        const result = await DBService.query<{ id: number }>(
            `INSERT INTO products (name, price, category)
             VALUES ($1, $2, $3) RETURNING id`,
            [name, 10.5, 'tools']
        );
        return result.rows[0].id;
    };

    beforeAll(async () => {
        const result = await DBService.query<{ current_database: string }>('SELECT current_database()');
        expect(result.rows[0].current_database).toBe(process.env.POSTGRES_TEST_DB as string);
    });

    beforeEach(async () => {
        await DBService.query('TRUNCATE TABLE order_products, orders, products, users RESTART IDENTITY CASCADE');
    });

    afterAll(async () => {
        await DBService.query('TRUNCATE TABLE order_products, orders, products, users RESTART IDENTITY CASCADE');
    });

    it('has the expected public methods', () => {
        expect(model.getOrCreateActiveOrder).toBeDefined();
        expect(model.addProductToOrder).toBeDefined();
        expect(model.updateProductQuantityInOrder).toBeDefined();
        expect(model.removeProductFromOrder).toBeDefined();
        expect(model.checkoutOrder).toBeDefined();
        expect(model.getCompletedOrdersByUserId).toBeDefined();
    });

    it('creates an active order and returns the same active order on repeated calls', async () => {
        const userId = await createUser('orderowner');

        const first = await model.getOrCreateActiveOrder({ user_id: userId });
        const second = await model.getOrCreateActiveOrder({ user_id: userId });

        expect(first.id).toBe(1);
        expect(first.status).toBe('active');
        expect(first.items?.length).toBe(0);

        expect(second.id).toBe(first.id);
        expect(second.user_id).toBe(userId);
        expect(second.status).toBe('active');
    });

    it('adds a product to an active order and increments quantity for the same product', async () => {
        const userId = await createUser('qtyowner');
        const productId = await createProduct('Hammer');
        const order = await model.getOrCreateActiveOrder({ user_id: userId });

        const firstAdd = await model.addProductToOrder({
            order_id: order.id,
            product_id: productId,
            quantity: 2
        });
        const secondAdd = await model.addProductToOrder({
            order_id: order.id,
            product_id: productId,
            quantity: 3
        });

        expect(firstAdd.quantity).toBe(2);
        expect(secondAdd.quantity).toBe(5);

        const rows = await DBService.query<{ quantity: number }>(
            'SELECT quantity FROM order_products WHERE order_id = $1 AND product_id = $2',
            [order.id, productId]
        );
        expect(rows.rows.length).toBe(1);
        expect(rows.rows[0].quantity).toBe(5);
    });

    it('updates product quantity in an order', async () => {
        const userId = await createUser('updateowner');
        const productId = await createProduct('Screwdriver');
        const order = await model.getOrCreateActiveOrder({ user_id: userId });

        await model.addProductToOrder({
            order_id: order.id,
            product_id: productId,
            quantity: 1
        });

        const updated = await model.updateProductQuantityInOrder({
            order_id: order.id,
            product_id: productId,
            quantity: 7
        });

        expect(updated.order_id).toBe(order.id);
        expect(updated.product_id).toBe(productId);
        expect(updated.quantity).toBe(7);
    });

    it('removes a product from an order', async () => {
        const userId = await createUser('removeowner');
        const productId = await createProduct('Wrench');
        const order = await model.getOrCreateActiveOrder({ user_id: userId });

        await model.addProductToOrder({
            order_id: order.id,
            product_id: productId,
            quantity: 1
        });

        const removed = await model.removeProductFromOrder({
            order_id: order.id,
            product_id: productId
        });

        expect(removed.order_id).toBe(order.id);
        expect(removed.product_id).toBe(productId);

        const rows = await DBService.query(
            'SELECT * FROM order_products WHERE order_id = $1 AND product_id = $2',
            [order.id, productId]
        );
        expect(rows.rows.length).toBe(0);
    });

    it('checks out an order and returns completed orders by user id', async () => {
        const userId = await createUser('checkoutowner');
        const productId = await createProduct('Drill');
        const order = await model.getOrCreateActiveOrder({ user_id: userId });

        await model.addProductToOrder({
            order_id: order.id,
            product_id: productId,
            quantity: 2
        });

        const checkedOut = await model.checkoutOrder(order.id);
        const completed = await model.getCompletedOrdersByUserId(userId);

        expect(checkedOut.status).toBe('complete');
        expect(checkedOut.items?.length).toBe(1);
        expect(checkedOut.items?.[0].product_id).toBe(productId);
        expect(checkedOut.items?.[0].quantity).toBe(2);

        expect(completed.length).toBe(1);
        expect(completed[0].id).toBe(order.id);
        expect(completed[0].status).toBe('complete');
    });
});
