import * as mysql from 'mysql';
import * as bb from 'bluebird';

import _ from './_';

export type IMySqlResultRow = any;
export interface IMySqlUpdateResult {
    fieldCount: number;
    affectedRows: number;
    insertId: number;
    serverStatus: number;
    warningCount: number;
    message: string;
    protocol41: boolean;
    changedRows: number;
}

export const EmptyMySqlResult = <IMySqlUpdateResult> {
    fieldCount: 0,
    affectedRows: 0,
    insertId: -1,
    serverStatus: 0,
    warningCount: 0,
    message: '',
    protocol41: false,
    changedRows: 0
}

export type IQueryResult = IMySqlResultRow[] | IMySqlUpdateResult;

export interface IMysqlQuery {
    query<T>(sql: string): Promise<T[]>;
    query<T>(sql: string, values: Array<any>): Promise<T[]>;
    query<T>(options: mysql.IQueryOptions): Promise<T[]>;
    query<T>(options: mysql.IQueryOptions, values: Array<any>): Promise<T[]>;

    exec(sql: string): Promise<IMySqlUpdateResult>;
    exec(sql: string, values: Array<any>): Promise<IMySqlUpdateResult>;
    exec(options: mysql.IQueryOptions): Promise<IMySqlUpdateResult>;
    exec(options: mysql.IQueryOptions, values: Array<any>): Promise<IMySqlUpdateResult>;
}

export interface IMysqlTransaction<T> {
    (sql: IMysqlQuery): Promise<T>;
}

export interface IConnMySql extends IMysqlQuery {
    doTransaction<T>(f: IMysqlTransaction<T>): Promise<T>;
}

class ConnMySqlQueryFunction implements IMysqlQuery {
    queryAsync: any
    constructor(conn: mysql.IConnection) {
        this.queryAsync = bb.promisify(conn.query, {context: conn});
    }

    query<T>(sql: string): Promise<T[]>;
    query<T>(sql: string, values: Array<any>): Promise<T[]>;
    query<T>(options: mysql.IQueryOptions): Promise<T[]>;
    query<T>(options: mysql.IQueryOptions, values: Array<any>): Promise<T[]>;
    async query<T>(sqlOrOptions: string | mysql.IQueryOptions, values?: Array<any>): Promise<T[]> {
        return <T[]> this.queryAsync(sqlOrOptions, values);
    }

    exec(sql: string): Promise<IMySqlUpdateResult>;
    exec(sql: string, values: Array<any>): Promise<IMySqlUpdateResult>;
    exec(options: mysql.IQueryOptions): Promise<IMySqlUpdateResult>;
    exec(options: mysql.IQueryOptions, values: Array<any>): Promise<IMySqlUpdateResult>;
    async exec(sqlOrOptions: string | mysql.IQueryOptions, values?: Array<any>): Promise<IMySqlUpdateResult> {
        return <IMySqlUpdateResult> this.queryAsync(sqlOrOptions, values);
    }
}

class ConnMySql implements IConnMySql {
    private sqlPool: mysql.IPool;
    private queryAsync: any;

    constructor(sqlPool: mysql.IPool) {
        this.sqlPool = sqlPool;
        this.queryAsync = bb.promisify(sqlPool.query, {context: sqlPool});
    }

    query<T>(sql: string): Promise<T[]>;
    query<T>(sql: string, values: Array<any>): Promise<T[]>;
    query<T>(options: mysql.IQueryOptions): Promise<T[]>;
    query<T>(options: mysql.IQueryOptions, values: Array<any>): Promise<T[]>;
    async query<T>(sqlOrOptions: string | mysql.IQueryOptions, values?: Array<any>): Promise<T[]> {
        return <T[]> this.queryAsync(sqlOrOptions, values);
    }

    exec(sql: string): Promise<IMySqlUpdateResult>;
    exec(sql: string, values: Array<any>): Promise<IMySqlUpdateResult>;
    exec(options: mysql.IQueryOptions): Promise<IMySqlUpdateResult>;
    exec(options: mysql.IQueryOptions, values: Array<any>): Promise<IMySqlUpdateResult>;
    async exec(sqlOrOptions: string | mysql.IQueryOptions, values?: Array<any>): Promise<IMySqlUpdateResult> {
        return <IMySqlUpdateResult> this.queryAsync(sqlOrOptions, values);
    }

    private async getSQL() {
        return new Promise<mysql.IConnection>((resolve, reject) => {
            this.sqlPool.getConnection((err, conn) => {
                if (_.isEmpty(err)) {
                    resolve(conn);
                }
                else {
                    reject(err);
                }
            });
        });
    }

    async doTransaction<T>(f: IMysqlTransaction<T>): Promise<T> {
        const sql = await this.getSQL();
        const beginTransactionAsync = bb.promisify(sql.beginTransaction, {context: sql});
        const commitAsync = bb.promisify(sql.commit, {context: sql});
        const rollbackAsync = bb.promisify(sql.rollback, {context: sql});
        try {
            await beginTransactionAsync();
            const ret = await f(new ConnMySqlQueryFunction(sql));
            await commitAsync();
            return ret;
        }
        catch (ex) {
            await rollbackAsync();
            throw ex;
        }
        finally {
            sql.release();
        }
    }
};

export function createConnMySql(sqlPool: mysql.IPool): IConnMySql {
    return new ConnMySql(sqlPool);
}

export default createConnMySql;