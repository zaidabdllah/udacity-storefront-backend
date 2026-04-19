import DBService from '../database/DBService';

export type Order = {
    id: number;
    user_id: number;
    status: 'active' | 'complete';
    items?: OrderProductPayload[];
};

export type CreateOrder = {
    user_id: number;
};

export type OrderProductPayload = {
    id?: number;
    order_id: number;
    product_id: number;
    quantity?: number;
};

export class OrderModel {
    async getOrCreateActiveOrder(data: CreateOrder): Promise<Order> {
        try {
            const USER_CHECK_SQL = 'SELECT id FROM users WHERE id = $1';
            const userCheckResult = await DBService.query<{ id: number }>(USER_CHECK_SQL, [data.user_id]);
            if (userCheckResult.rows.length === 0) {
                throw new Error(`user not found with id ${data.user_id}`);
            }
            const existingOrderSQL = 'SELECT * FROM orders WHERE user_id = $1 AND status = $2';
            const existingOrderResult = await DBService.query<Order>(existingOrderSQL, [data.user_id, 'active']);
            if (existingOrderResult.rows.length > 0) {
                existingOrderResult.rows[0].items = await this.getProductsInOrder(existingOrderResult.rows[0].id);
                return existingOrderResult.rows[0] as Order;
            }
            const sql = 'INSERT INTO orders (user_id, status) VALUES ($1, $2) RETURNING *';
            const result = await DBService.query<Order>(sql, [data.user_id, 'active']);
            result.rows[0].items = [];
            return result.rows[0] as Order;
        } catch (err) {
            throw new Error(`failed to create order, ${err}`);
        }
    }
    async addProductToOrder(addProduct: OrderProductPayload): Promise<OrderProductPayload> {
        try {
            const OrderCheckSQL = 'SELECT * FROM orders WHERE id = $1';
            const orderCheckResult = await DBService.query<Order>(OrderCheckSQL, [addProduct.order_id]);
            if (orderCheckResult.rows.length === 0) {
                throw new Error(`order not found with id ${addProduct.order_id}`);
            } else if (orderCheckResult.rows[0].status !== 'active') {
                throw new Error(`order not active with id ${addProduct.order_id}`);
            }

            const quantityToAdd = Number(addProduct.quantity) ?? 1;
            if (quantityToAdd <= 0 || !Number.isInteger(quantityToAdd)) {
                throw new Error(`quantity must be a positive integer`);
            }
            const sql = `INSERT INTO order_products (order_id, product_id, quantity)
            VALUES ($1, $2, $3)
            ON CONFLICT (order_id, product_id)
            DO UPDATE
            SET quantity = order_products.quantity + EXCLUDED.quantity
            RETURNING *;`;

            const result = await DBService.query(sql, [addProduct.order_id, addProduct.product_id, quantityToAdd]);

            return result.rows[0] as OrderProductPayload;
        } catch (err) {
            throw new Error(
                `failed to add product ${addProduct.product_id} to order with id ${addProduct.order_id}, ${err}`
            );
        }
    }
    async updateProductQuantityInOrder(UpdateProduct: OrderProductPayload): Promise<OrderProductPayload> {
        try {
            const OrderCheckSQL = 'SELECT * FROM orders WHERE id = $1';
            const orderCheckResult = await DBService.query<Order>(OrderCheckSQL, [UpdateProduct.order_id]);
            if (orderCheckResult.rows.length === 0) {
                throw new Error(`order not found with id ${UpdateProduct.order_id}`);
            } else if (orderCheckResult.rows[0].status !== 'active') {
                throw new Error(`order not active with id ${UpdateProduct.order_id}`);
            }

            const quantityToEdit = Number(UpdateProduct.quantity);
            if (quantityToEdit === undefined || quantityToEdit === null || isNaN(quantityToEdit)) {
                throw new Error(`quantity is required`);
            } else if (quantityToEdit <= 0 || !Number.isInteger(quantityToEdit)) {
                throw new Error(`quantity must be a positive integer`);
            }
            const sql = `UPDATE order_products
            SET quantity = $3
            WHERE order_id = $1 AND product_id = $2
            RETURNING *;`;

            const result = await DBService.query(sql, [UpdateProduct.order_id, UpdateProduct.product_id, quantityToEdit]);

            if (result.rows.length === 0) {
                throw new Error('Product not found in the order');
            }
            return result.rows[0] as OrderProductPayload;
        } catch (err) {
            throw new Error(
                `failed to update product quantity, ${err}`
            );
        }
    }
    async removeProductFromOrder(removeProduct: OrderProductPayload): Promise<OrderProductPayload> {
        try {
            const OrderCheckSQL = 'SELECT * FROM orders WHERE id = $1';
            const orderCheckResult = await DBService.query<Order>(OrderCheckSQL, [removeProduct.order_id]);
            if (orderCheckResult.rows.length === 0) {
                throw new Error(`order not found with id ${removeProduct.order_id}`);
            } else if (orderCheckResult.rows[0].status !== 'active') {
                throw new Error(`order not active with id ${removeProduct.order_id}`);
            }
            const sql = `DELETE FROM order_products
            WHERE order_id = $1 AND product_id = $2 RETURNING *;`;
            const result = await DBService.query(sql, [removeProduct.order_id, removeProduct.product_id]);
            if (result.rowCount === 0) {
                throw new Error('Product not found in order');
            }
            return result.rows[0] as OrderProductPayload;
        } catch (err) {
            throw new Error(
                `failed to remove product ${removeProduct.product_id} from order ${removeProduct.order_id}, ${err}`
            );
        }
    }
    async checkoutOrder(orderId: number): Promise<Order> {
        try {
            const OrderCheckSQL = 'SELECT * FROM orders WHERE id = $1';
            const orderCheckResult = await DBService.query<Order>(OrderCheckSQL, [orderId]);
            if (orderCheckResult.rows.length === 0) {
                throw new Error(`order not found with id ${orderId}`);
            } else if (orderCheckResult.rows[0].status !== 'active') {
                throw new Error(`order not active with id ${orderId}`);
            }
            const sql = `UPDATE orders
            SET status = 'complete'
            WHERE id = $1
            RETURNING *;`;
            const result = await DBService.query(sql, [orderId]);
            result.rows[0].items = await this.getProductsInOrder(result.rows[0].id);
            return result.rows[0] as Order;
        } catch (err) {
            throw new Error(`failed to checkout order with id ${orderId}, ${err}`);
        }
    }
    async getCompletedOrdersByUserId(userId: number): Promise<Order[]> {
        try {
            const sql = `SELECT * FROM orders WHERE user_id = $1 AND status = 'complete' ORDER BY id ASC;`;
            const result = await DBService.query<Order>(sql, [userId]);
            const orders = result.rows as Order[];
            return orders;
        } catch (err) {
            throw new Error(`failed to get complete orders for user with id ${userId}, ${err}`);
        }
    }
    private async getProductsInOrder(orderId: number): Promise<OrderProductPayload[]> {
        try {
            const sql = `
            SELECT
                p.id AS product_id,
                p.name,
                p.price,
                op.quantity
            FROM order_products op
            LEFT JOIN products p ON p.id = op.product_id
            WHERE op.order_id = $1;
        `;
            const result = await DBService.query<OrderProductPayload>(sql, [orderId]);
            return result.rows as OrderProductPayload[];
        } catch (err) {
            throw new Error(`failed to get products in order with id ${orderId}, ${err}`);
        }
    }
}