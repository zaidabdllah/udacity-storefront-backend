import bcrypt from 'bcrypt';
import DBService from '../database/DBService';
import { ProductSeed, productsSeedData } from './productSeedService';

type SeedUser = {
    username: string;
    first_name: string;
    last_name: string;
    password: string;
};

type SeededUser = {
    id: number;
    username: string;
};

type SeedStats = {
    usersCount: number;
    productsCount: number;
    completedOrdersCount: number;
    activeOrdersCount: number;
    orderItemsCount: number;
};

const USERS_COUNT = 10;
const COMPLETED_ORDERS_PER_USER = 10;
const ACTIVE_ORDERS_PER_USER = 1;
const MIN_PRODUCTS_PER_COMPLETED_ORDER = 13;
const MAX_PRODUCTS_PER_COMPLETED_ORDER = 24;
const MIN_PRODUCTS_PER_ACTIVE_ORDER = 15;
const MAX_PRODUCTS_PER_ACTIVE_ORDER = 30;
const MIN_ITEM_QUANTITY = 1;
const MAX_ITEM_QUANTITY = 6;

const randomInt = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const shuffle = <T>(input: T[]): T[] => {
    const copy = [...input];

    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
};

const pickRandomUniqueProductIds = (productIds: number[], minCount: number, maxCount: number): number[] => {
    if (productIds.length < minCount) {
        throw new Error(`Not enough products to satisfy minimum count (${minCount}). Current: ${productIds.length}`);
    }

    const normalizedMax = Math.min(maxCount, productIds.length);
    const count = randomInt(minCount, normalizedMax);

    return shuffle(productIds).slice(0, count);
};

const buildUsersSeedData = (): SeedUser[] => {
    return Array.from({ length: USERS_COUNT }, (_, index) => {
        const userNumber = index + 1;
        const userNumberPadded = String(userNumber).padStart(2, '0');

        return {
            username: `seed_user_${userNumberPadded}`,
            first_name: `SeedF${userNumber}`,
            last_name: `SeedL${userNumber}`,
            password: 'seedpass123'
        };
    });
};

const buildBulkInsertSql = (
    tableName: string,
    columns: string[],
    rowsCount: number,
    valuesPerRow: number,
    returning = ''
): string => {
    const placeholders: string[] = [];

    for (let rowIndex = 0; rowIndex < rowsCount; rowIndex += 1) {
        const currentRowPlaceholders: string[] = [];

        for (let valueIndex = 0; valueIndex < valuesPerRow; valueIndex += 1) {
            const placeholderIndex = rowIndex * valuesPerRow + valueIndex + 1;
            currentRowPlaceholders.push(`$${placeholderIndex}`);
        }

        placeholders.push(`(${currentRowPlaceholders.join(', ')})`);
    }

    const returnClause = returning ? ` RETURNING ${returning}` : '';

    return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders.join(', ')}${returnClause};`;
};

const seedProducts = async (products: ProductSeed[]): Promise<number[]> => {
    const params: Array<string | number> = [];

    products.forEach((product) => {
        params.push(product.name, product.price, product.category);
    });

    const insertProductsSql = buildBulkInsertSql('products', ['name', 'price', 'category'], products.length, 3, 'id');

    const result = await DBService.query<{ id: number }>(insertProductsSql, params);

    return result.rows.map((row) => row.id);
};

const getBcryptConfig = (): { pepper: string; saltRounds: number } => {
    const pepper = process.env.BCRYPT_PEPPER;
    const saltRoundsRaw = process.env.BCRYPT_SALT_ROUNDS;

    if (!pepper) {
        throw new Error('Missing required environment variable: BCRYPT_PEPPER');
    }

    if (!saltRoundsRaw) {
        throw new Error('Missing required environment variable: BCRYPT_SALT_ROUNDS');
    }

    const saltRounds = Number(saltRoundsRaw);

    if (!Number.isInteger(saltRounds) || saltRounds <= 0) {
        throw new Error('BCRYPT_SALT_ROUNDS must be a positive integer');
    }

    return { pepper, saltRounds };
};

const seedUsers = async (users: SeedUser[]): Promise<SeededUser[]> => {
    const { pepper, saltRounds } = getBcryptConfig();

    const params: string[] = [];

    users.forEach((user) => {
        const passwordDigest = bcrypt.hashSync(user.password + pepper, saltRounds);
        params.push(user.username, user.first_name, user.last_name, passwordDigest);
    });

    const insertUsersSql = buildBulkInsertSql(
        'users',
        ['username', 'first_name', 'last_name', 'password_digest'],
        users.length,
        4,
        'id, username'
    );

    const result = await DBService.query<SeededUser>(insertUsersSql, params);

    return result.rows;
};

const createOrder = async (userId: number, status: 'active' | 'complete'): Promise<number> => {
    const result = await DBService.query<{ id: number }>(
        'INSERT INTO orders (user_id, status) VALUES ($1, $2) RETURNING id;',
        [userId, status]
    );

    return result.rows[0].id;
};

const addProductsToOrder = async (
    orderId: number,
    productIds: number[],
    minProducts: number,
    maxProducts: number
): Promise<number> => {
    const pickedProductIds = pickRandomUniqueProductIds(productIds, minProducts, maxProducts);
    const params: number[] = [];

    pickedProductIds.forEach((productId) => {
        params.push(orderId, productId, randomInt(MIN_ITEM_QUANTITY, MAX_ITEM_QUANTITY));
    });

    const insertOrderProductsSql = buildBulkInsertSql(
        'order_products',
        ['order_id', 'product_id', 'quantity'],
        pickedProductIds.length,
        3
    );

    await DBService.query(insertOrderProductsSql, params);

    return pickedProductIds.length;
};

const seedOrdersForUsers = async (users: SeededUser[], productIds: number[]): Promise<SeedStats> => {
    let completedOrdersCount = 0;
    let activeOrdersCount = 0;
    let orderItemsCount = 0;

    for (const user of users) {
        for (let index = 0; index < COMPLETED_ORDERS_PER_USER; index += 1) {
            const orderId = await createOrder(user.id, 'complete');
            completedOrdersCount += 1;
            orderItemsCount += await addProductsToOrder(
                orderId,
                productIds,
                MIN_PRODUCTS_PER_COMPLETED_ORDER,
                MAX_PRODUCTS_PER_COMPLETED_ORDER
            );
        }

        for (let index = 0; index < ACTIVE_ORDERS_PER_USER; index += 1) {
            const orderId = await createOrder(user.id, 'active');
            activeOrdersCount += 1;
            orderItemsCount += await addProductsToOrder(
                orderId,
                productIds,
                MIN_PRODUCTS_PER_ACTIVE_ORDER,
                MAX_PRODUCTS_PER_ACTIVE_ORDER
            );
        }
    }

    return {
        usersCount: users.length,
        productsCount: productIds.length,
        completedOrdersCount,
        activeOrdersCount,
        orderItemsCount
    };
};

const run = async (): Promise<void> => {
    try {
        await DBService.query('TRUNCATE TABLE order_products, orders, users, products RESTART IDENTITY CASCADE;');

        const productIds = await seedProducts(productsSeedData);
        const users = await seedUsers(buildUsersSeedData());
        const stats = await seedOrdersForUsers(users, productIds);

        console.log('Database dump seed completed successfully.');
        console.log(`Users: ${stats.usersCount}`);
        console.log(`Products: ${stats.productsCount}`);
        console.log(`Completed orders: ${stats.completedOrdersCount}`);
        console.log(`Active orders: ${stats.activeOrdersCount}`);
        console.log(`Order items: ${stats.orderItemsCount}`);
        console.log('Login password for all seeded users: seedpass123');
        process.exit(0);
    } catch (error) {
        console.error('Database dump seed failed.');
        console.error(error);
        process.exit(1);
    }
};

run();
