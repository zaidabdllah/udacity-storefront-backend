import dotenv from 'dotenv';
import { Pool, QueryResult, QueryResultRow, PoolClient } from 'pg';

dotenv.config();

interface DBConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
}

class DBService {
    private static readonly pool = new Pool(DBService.buildConfig());

    private static getEnvValue(key: string): string {
        const value = process.env[key];

        if (!value) {
            throw new Error(`Missing required environment variable: ${key}`);
        }

        return value;
    }

    private static buildConfig(): DBConfig {
        const port = Number(DBService.getEnvValue('POSTGRES_PORT'));

        if (Number.isNaN(port)) {
            throw new Error('POSTGRES_PORT must be a valid number');
        }

        const environment = (process.env.ENV || 'dev').toLowerCase();
        const database = environment === 'test' ? DBService.getEnvValue('POSTGRES_TEST_DB') : DBService.getEnvValue('POSTGRES_DB');

        return {
            host: DBService.getEnvValue('POSTGRES_HOST'),
            port,
            user: DBService.getEnvValue('POSTGRES_USER'),
            password: DBService.getEnvValue('POSTGRES_PASSWORD'),
            database
        };
    }

    static async testConnection(): Promise<void> {
        let client: PoolClient | undefined;

        try {
            client = await DBService.pool.connect();
            await client.query('SELECT 1');
            console.log('Database connection verified successfully.');
        } catch (error) {
            console.error('Database connection failed. Aborting process.');
            console.error(error);
            process.exit(1);
        } finally {
            client?.release();
        }
    }

}

export default DBService;
