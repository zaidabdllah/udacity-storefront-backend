import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { ProductModel, Product } from '../../models/product';
import jwt from 'jsonwebtoken';
import verifyAuthToken from '../../middlewares/verifyAuthToken';

dotenv.config();

const ProductRouter = express.Router();
const productmodel = new ProductModel();

ProductRouter.get('/', async (req: Request, res: Response) => {
    try {
        const products = await productmodel.index();
        res.json({ ok: true, code: 'PRODUCTS_RETRIEVED', products });
    } catch (error) {
        res.status(500).json({ ok: false, code: 'INTERNAL_SERVER_ERROR', error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` });
    }
});

ProductRouter.get('/:id', async (req: Request, res: Response) => {
    const id = req.params.id as unknown as number;
    try {
        const product = await productmodel.show(id);
        if (product) {
            res.json({ ok: true, code: 'PRODUCT_RETRIEVED', product });
        } else {
            res.status(404).json({ ok: false, code: 'PRODUCT_NOT_FOUND', error: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ ok: false, code: 'INTERNAL_SERVER_ERROR', error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` });
    }
});

ProductRouter.post('/', verifyAuthToken, async (req: Request, res: Response) => {
    const productData = req.body as Product;
    try {
        if (productData.name === undefined || productData.name === null) {
            return res.status(400).json({
                ok: false,
                code: 'PRODUCT_NAME_REQUIRED',
                error: 'Product name is required'
            });
        }

        if (typeof productData.name !== 'string' || productData.name.trim().length === 0) {
            return res.status(400).json({
                ok: false,
                code: 'PRODUCT_NAME_EMPTY',
                error: 'Product name cannot be empty'
            });
        }

        if (productData.name.trim().length > 150) {
            return res.status(400).json({
                ok: false,
                code: 'PRODUCT_NAME_TOO_LONG',
                error: 'Product name must not exceed 150 characters'
            });
        }

        if (productData.price === undefined || productData.price === null || productData.price === '') {
            return res.status(400).json({
                ok: false,
                code: 'PRODUCT_PRICE_REQUIRED',
                error: 'Product price is required'
            });
        }

        if (isNaN(Number(productData.price))) {
            return res.status(400).json({
                ok: false,
                code: 'PRODUCT_PRICE_MUST_BE_NUMBER',
                error: 'Product price must be a valid number'
            });
        }

        if (Number(productData.price) < 0) {
            return res.status(400).json({
                ok: false,
                code: 'PRODUCT_PRICE_NEGATIVE',
                error: 'Product price cannot be negative'
            });
        }

        // price not logical حسب منطق الداتا
        if (Number(productData.price) > 1000000) {
            return res.status(400).json({
                ok: false,
                code: 'PRODUCT_PRICE_NOT_LOGICAL',
                error: 'Product price is not logical'
            });
        }

        const newProduct = await productmodel.create(productData);
        res.status(201).json({ ok: true, code: 'PRODUCT_CREATED', product: newProduct });
    } catch (error) {
        res.status(500).json({ ok: false, code: 'INTERNAL_SERVER_ERROR', error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` });
    }
});

ProductRouter.get('/category/:category', async (req: Request, res: Response) => {
    const category = req.params.category as unknown as string;
    try {
        const products = await productmodel.showByCategory(category);
        res.json({ ok: true, code: 'PRODUCTS_BY_CATEGORY_RETRIEVED', products });
    }
    catch (error) {
        res.status(500).json({ ok: false, code: 'INTERNAL_SERVER_ERROR', error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` });
    }
});

ProductRouter.get('/popular/:limit', async (req: Request, res: Response) => {
    res.status(501).json({ ok: false, code: 'NOT_IMPLEMENTED', error: 'This endpoint is not implemented yet' });//back work on it later
});

export default ProductRouter;