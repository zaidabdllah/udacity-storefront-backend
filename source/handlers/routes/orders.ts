import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { OrderModel, OrderProductPayload, CreateOrder } from '../../models/order';
import verifyAuthToken from '../../middlewares/verifyAuthToken';

dotenv.config();

const OrderRouter = express.Router();
const orderModel = new OrderModel();



OrderRouter.get('/current/:userId', verifyAuthToken, async (req: Request, res: Response) => {
    const userId = req.params.userId as unknown as number;
    try {
        if (userId === undefined || userId === null) {
            return res.status(400).json({
                ok: false,
                code: 'USER_ID_REQUIRED',
                error: 'User ID is required'
            });
        } else if (!Number.isInteger(Number(userId)) || userId <= 0) {
            return res.status(400).json({
                ok: false,
                code: 'USER_ID_INVALID',
                error: 'User ID must be a positive integer'
            });
        }
        const result = await orderModel.getOrCreateActiveOrder({ user_id: userId } as CreateOrder);
        res.json({ ok: true, code: 'ORDER_CREATED_OR_RETRIEVED', order: result });
    } catch (error) {
        if (error instanceof Error && error.message.includes('user not found')) {
            return res.status(404).json({ ok: false, code: 'USER_NOT_FOUND', error: 'User not found' });
        } else {
            return res.status(500).json({ ok: false, code: 'INTERNAL_SERVER_ERROR', error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` });
        }
    }
});

OrderRouter.post('/:orderId/product', verifyAuthToken, async (req: Request, res: Response) => {
    const orderId = req.params.orderId as unknown as number;
    const payload: OrderProductPayload = { ...req.body, order_id: orderId };
    try {
        if (payload.product_id === undefined || payload.product_id === null) {
            return res.status(400).json({
                ok: false,
                code: 'PRODUCT_ID_REQUIRED',
                error: 'Product ID is required'
            });
        } else if (!Number.isInteger(Number(payload.product_id)) || payload.product_id <= 0) {
            return res.status(400).json({
                ok: false,
                code: 'PRODUCT_ID_INVALID',
                error: 'Product ID must be a positive integer'
            });
        } else if (!Number.isInteger(Number(payload.order_id)) || payload.order_id <= 0) {
            return res.status(400).json({
                ok: false,
                code: 'ORDER_ID_INVALID',
                error: 'Order ID must be a positive integer'
            });
        } else if (payload.quantity !== undefined && (!Number.isInteger(Number(payload.quantity)) || payload.quantity <= 0)) {
            return res.status(400).json({
                ok: false,
                code: 'QUANTITY_INVALID',
                error: 'Quantity must be a positive integer if provided'
            });
        }

        const result = await orderModel.addProductToOrder(payload);
        res.json({ ok: true, code: 'PRODUCT_ADDED_TO_ORDER', productInOrder: result });
    } catch (error) {
        if (error instanceof Error && error.message.includes('order not found')) {
            return res.status(404).json({ ok: false, code: 'ORDER_NOT_FOUND', error: 'Order not found' });
        } else if (error instanceof Error && error.message.includes('order not active')) {
            return res.status(400).json({ ok: false, code: 'ORDER_NOT_ACTIVE', error: 'Order not active' });
        } else if (error instanceof Error && error.message.includes('foreign key constraint')) {
            return res.status(404).json({ ok: false, code: 'PRODUCT_NOT_FOUND', error: `Product not found with id ${payload.product_id}` });
        } else {
            return res.status(500).json({ ok: false, code: 'INTERNAL_SERVER_ERROR', error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` });
        }
    }
});

OrderRouter.patch('/:orderId/product', verifyAuthToken, async (req: Request, res: Response) => {
    const orderId = req.params.orderId as unknown as number;
    const payload: OrderProductPayload = { ...req.body, order_id: orderId };
    try {
        if (payload.product_id === undefined || payload.product_id === null) {
            return res.status(400).json({
                ok: false,
                code: 'PRODUCT_ID_REQUIRED',
                error: 'Product ID is required'
            });
        } else if (!Number.isInteger(Number(payload.product_id)) || payload.product_id <= 0) {
            return res.status(400).json({
                ok: false,
                code: 'PRODUCT_ID_INVALID',
                error: 'Product ID must be a positive integer'
            });
        } else if (!Number.isInteger(Number(payload.order_id)) || payload.order_id <= 0) {
            return res.status(400).json({
                ok: false,
                code: 'ORDER_ID_INVALID',
                error: 'Order ID must be a positive integer'
            });
        } else if (payload.quantity === undefined || payload.quantity === null) {
            return res.status(400).json({
                ok: false,
                code: 'QUANTITY_REQUIRED',
                error: 'Quantity is required'
            });
        } else if (payload.quantity !== undefined && (!Number.isInteger(Number(payload.quantity)) || payload.quantity <= 0)) {
            return res.status(400).json({
                ok: false,
                code: 'QUANTITY_INVALID',
                error: 'Quantity must be a positive integer if provided'
            });
        }
        const result = await orderModel.updateProductQuantityInOrder(payload);
        res.json({ ok: true, code: 'PRODUCT_QUANTITY_UPDATED', productInOrder: result });
    } catch (error) {
        if (error instanceof Error && error.message.includes('order not found')) {
            return res.status(404).json({ ok: false, code: 'ORDER_NOT_FOUND', error: 'Order not found' });
        } else if (error instanceof Error && error.message.includes('order not active')) {
            return res.status(400).json({ ok: false, code: 'ORDER_NOT_ACTIVE', error: 'Order not active' });
        } else if (error instanceof Error && error.message.includes('Product not found in the order')) {
            return res.status(404).json({ ok: false, code: 'PRODUCT_NOT_FOUND_IN_ORDER', error: `Product not found in the order with id ${payload.product_id}` });
        } else {
            return res.status(500).json({ ok: false, code: 'INTERNAL_SERVER_ERROR', error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` });
        }
    }
});

OrderRouter.delete('/:orderId/product', verifyAuthToken, async (req: Request, res: Response) => {
    const orderId = req.params.orderId as unknown as number;
    const payload: OrderProductPayload = { ...req.body, order_id: orderId };
    try {
        if (payload.product_id === undefined || payload.product_id === null) {
            return res.status(400).json({
                ok: false,
                code: 'PRODUCT_ID_REQUIRED',
                error: 'Product ID is required'
            });
        } else if (!Number.isInteger(Number(payload.product_id)) || payload.product_id <= 0) {
            return res.status(400).json({
                ok: false,
                code: 'PRODUCT_ID_INVALID',
                error: 'Product ID must be a positive integer'
            });
        } else if (!Number.isInteger(Number(payload.order_id)) || payload.order_id <= 0) {
            return res.status(400).json({
                ok: false,
                code: 'ORDER_ID_INVALID',
                error: 'Order ID must be a positive integer'
            });
        }
        const result = await orderModel.removeProductFromOrder(payload);
        res.json({ ok: true, code: 'PRODUCT_REMOVED_FROM_ORDER', productInOrder: result });
    } catch (error) {
        if (error instanceof Error && error.message.includes('order not found')) {
            return res.status(404).json({ ok: false, code: 'ORDER_NOT_FOUND', error: 'Order not found' });
        } else if (error instanceof Error && error.message.includes('order not active')) {
            return res.status(400).json({ ok: false, code: 'ORDER_NOT_ACTIVE', error: 'Order not active' });
        } else if (error instanceof Error && error.message.includes('Product not found in order')) {
            return res.status(404).json({ ok: false, code: 'PRODUCT_NOT_FOUND_IN_ORDER', error: `Product not found in order with id ${payload.product_id}` });
        } else {
            return res.status(500).json({ ok: false, code: 'INTERNAL_SERVER_ERROR', error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` });
        }
    }
});

OrderRouter.patch('/:orderId/checkout', verifyAuthToken, async (req: Request, res: Response) => {
    const orderId = req.params.orderId as unknown as number;
    try {
        if (!Number.isInteger(Number(orderId)) || orderId <= 0) {
            return res.status(400).json({
                ok: false,
                code: 'ORDER_ID_INVALID',
                error: 'Order ID must be a positive integer'
            });
        }
        const result = await orderModel.checkoutOrder(orderId);
        res.json({ ok: true, code: 'ORDER_CHECKED_OUT', order: result });
    } catch (error) {
        if (error instanceof Error && error.message.includes('order not found')) {
            return res.status(404).json({ ok: false, code: 'ORDER_NOT_FOUND', error: 'Order not found' });
        } else if (error instanceof Error && error.message.includes('order not active')) {
            return res.status(400).json({ ok: false, code: 'ORDER_NOT_ACTIVE', error: 'Order not active' });
        } else {
            return res.status(500).json({ ok: false, code: 'INTERNAL_SERVER_ERROR', error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` });
        }
    }
});

OrderRouter.get('/completed/:userId', verifyAuthToken, async (req: Request, res: Response) => {
    const userId = req.params.userId as unknown as number;
    try {
        if (!Number.isInteger(Number(userId)) || userId <= 0) {
            return res.status(400).json({
                ok: false,
                code: 'USER_ID_INVALID',
                error: 'User ID must be a positive integer'
            });
        }
        const result = await orderModel.getCompletedOrdersByUserId(userId);
        res.json({ ok: true, code: 'COMPLETED_ORDERS_RETRIEVED', orders: result });
    } catch (error) {
        if (error instanceof Error && error.message.includes('user not found')) {
            return res.status(404).json({ ok: false, code: 'USER_NOT_FOUND', error: 'User not found' });
        } else {
            return res.status(500).json({ ok: false, code: 'INTERNAL_SERVER_ERROR', error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` });
        }
    }
});

export default OrderRouter;