import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { ProductModel, Product } from '../../models/product';
import jwt from 'jsonwebtoken';
import verifyAuthToken from '../../middlewares/verifyAuthToken';

dotenv.config();

const ProductRouter = express.Router();
const productmodel = new ProductModel();

const hasOwnField = (obj: object, field: string): boolean => Object.prototype.hasOwnProperty.call(obj, field);

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

        if (productData.thumbnail !== undefined && productData.thumbnail !== null && typeof productData.thumbnail !== 'string') {
            return res.status(400).json({
                ok: false,
                code: 'PRODUCT_THUMBNAIL_MUST_BE_STRING',
                error: 'Product thumbnail must be a string'
            });
        }

        if (typeof productData.thumbnail === 'string' && productData.thumbnail.trim().length > 500) {
            return res.status(400).json({
                ok: false,
                code: 'PRODUCT_THUMBNAIL_TOO_LONG',
                error: 'Product thumbnail must not exceed 500 characters'
            });
        }

        if (productData.description !== undefined && productData.description !== null && typeof productData.description !== 'string') {
            return res.status(400).json({
                ok: false,
                code: 'PRODUCT_DESCRIPTION_MUST_BE_STRING',
                error: 'Product description must be a string'
            });
        }

        if (typeof productData.description === 'string' && productData.description.trim().length > 1000) {
            return res.status(400).json({
                ok: false,
                code: 'PRODUCT_DESCRIPTION_TOO_LONG',
                error: 'Product description must not exceed 1000 characters'
            });
        }

        productData.name = productData.name.trim();
        productData.price = Number(productData.price);
        if (productData.category !== undefined) productData.category = productData.category.trim();
        if (typeof productData.thumbnail === 'string') productData.thumbnail = productData.thumbnail.trim();
        if (typeof productData.description === 'string') productData.description = productData.description.trim();

        const newProduct = await productmodel.create(productData);
        res.status(201).json({ ok: true, code: 'PRODUCT_CREATED', product: newProduct });
    } catch (error) {
        res.status(500).json({ ok: false, code: 'INTERNAL_SERVER_ERROR', error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` });
    }
});

ProductRouter.patch('/:id', verifyAuthToken, async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const payload = req.body as Partial<Product>;
    try {
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                ok: false,
                code: 'PRODUCT_ID_INVALID',
                error: 'Product id must be a positive integer'
            });
        }

        const hasName = hasOwnField(payload, 'name');
        const hasPrice = hasOwnField(payload, 'price');
        const hasCategory = hasOwnField(payload, 'category');
        const hasThumbnail = hasOwnField(payload, 'thumbnail');
        const hasDescription = hasOwnField(payload, 'description');

        if (!hasName && !hasPrice && !hasCategory && !hasThumbnail && !hasDescription) {
            return res.status(400).json({
                ok: false,
                code: 'PRODUCT_UPDATE_FIELDS_REQUIRED',
                error: 'At least one field is required: name, price, category, thumbnail, description'
            });
        }

        if (hasName) {
            if (typeof payload.name !== 'string' || payload.name.trim().length === 0) {
                return res.status(400).json({
                    ok: false,
                    code: 'PRODUCT_NAME_EMPTY',
                    error: 'Product name cannot be empty'
                });
            }

            if (payload.name.trim().length > 150) {
                return res.status(400).json({
                    ok: false,
                    code: 'PRODUCT_NAME_TOO_LONG',
                    error: 'Product name must not exceed 150 characters'
                });
            }
        }

        if (hasThumbnail) {
            if (payload.thumbnail !== null && typeof payload.thumbnail !== 'string') {
                return res.status(400).json({
                    ok: false,
                    code: 'PRODUCT_THUMBNAIL_MUST_BE_STRING',
                    error: 'Product thumbnail must be a string'
                });
            }

            if (typeof payload.thumbnail === 'string' && payload.thumbnail.trim().length > 500) {
                return res.status(400).json({
                    ok: false,
                    code: 'PRODUCT_THUMBNAIL_TOO_LONG',
                    error: 'Product thumbnail must not exceed 500 characters'
                });
            }
        }

        if (hasDescription) {
            if (payload.description !== null && typeof payload.description !== 'string') {
                return res.status(400).json({
                    ok: false,
                    code: 'PRODUCT_DESCRIPTION_MUST_BE_STRING',
                    error: 'Product description must be a string'
                });
            }

            if (typeof payload.description === 'string' && payload.description.trim().length > 1000) {
                return res.status(400).json({
                    ok: false,
                    code: 'PRODUCT_DESCRIPTION_TOO_LONG',
                    error: 'Product description must not exceed 1000 characters'
                });
            }
        }

        if (hasPrice) {
            if (payload.price === undefined || payload.price === null || payload.price === '') {
                return res.status(400).json({
                    ok: false,
                    code: 'PRODUCT_PRICE_REQUIRED',
                    error: 'Product price is required'
                });
            }

            if (isNaN(Number(payload.price))) {
                return res.status(400).json({
                    ok: false,
                    code: 'PRODUCT_PRICE_MUST_BE_NUMBER',
                    error: 'Product price must be a valid number'
                });
            }

            if (Number(payload.price) < 0) {
                return res.status(400).json({
                    ok: false,
                    code: 'PRODUCT_PRICE_NEGATIVE',
                    error: 'Product price cannot be negative'
                });
            }

            if (Number(payload.price) > 1000000) {
                return res.status(400).json({
                    ok: false,
                    code: 'PRODUCT_PRICE_NOT_LOGICAL',
                    error: 'Product price is not logical'
                });
            }
        }

        if (hasCategory) {
            if (typeof payload.category !== 'string' || payload.category.trim().length === 0) {
                return res.status(400).json({
                    ok: false,
                    code: 'PRODUCT_CATEGORY_EMPTY',
                    error: 'Product category cannot be empty'
                });
            }

            if (payload.category.trim().length > 100) {
                return res.status(400).json({
                    ok: false,
                    code: 'PRODUCT_CATEGORY_TOO_LONG',
                    error: 'Product category must not exceed 100 characters'
                });
            }
        }

        const updateData: Partial<Product> = {};

        if (hasName) updateData.name = (payload.name as string).trim();
        if (hasPrice) updateData.price = Number(payload.price);
        if (hasCategory) updateData.category = (payload.category as string).trim();
        if (hasThumbnail) updateData.thumbnail = typeof payload.thumbnail === 'string' ? payload.thumbnail.trim() : null;
        if (hasDescription) updateData.description = typeof payload.description === 'string' ? payload.description.trim() : null;

        const updatedProduct = await productmodel.update(id, updateData);

        if (!updatedProduct) {
            return res.status(404).json({
                ok: false,
                code: 'PRODUCT_NOT_FOUND',
                error: 'Product not found'
            });
        }

        res.status(200).json({ ok: true, code: 'PRODUCT_UPDATED', product: updatedProduct });
    } catch (error) {
        res.status(500).json({
            ok: false,
            code: 'INTERNAL_SERVER_ERROR',
            error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`
        });
    }
});

ProductRouter.delete('/:id', verifyAuthToken, async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    try {
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                ok: false,
                code: 'PRODUCT_ID_INVALID',
                error: 'Product id must be a positive integer'
            });
        }

        const deletedProduct = await productmodel.delete(id);

        if (!deletedProduct) {
            return res.status(404).json({
                ok: false,
                code: 'PRODUCT_NOT_FOUND',
                error: 'Product not found'
            });
        }

        res.status(200).json({ ok: true, code: 'PRODUCT_DELETED', product: deletedProduct });
    } catch (error) {
        res.status(500).json({
            ok: false,
            code: 'INTERNAL_SERVER_ERROR',
            error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`
        });
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
    const limitRaw = req.params.limit;
    const limit = Number(limitRaw);
    try {
        if (!Number.isInteger(limit) || limit <= 0) {
            return res.status(400).json({
                ok: false,
                code: 'INVALID_LIMIT',
                error: 'Limit must be a positive integer'
            });
        }
        const products = await productmodel.GetpopularProducts(limit);
        res.json({ ok: true, code: 'POPULAR_PRODUCTS_RETRIEVED', products });
    }
    catch (error) {
        res.status(500).json({ ok: false, code: 'INTERNAL_SERVER_ERROR', error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` });
    }
});

export default ProductRouter;
