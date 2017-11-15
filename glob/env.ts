export interface ENV_DB_CONFIG {
    REDIS: any;
    MONGO: {
        CONNECTION_STRING: string;
        OPTIONS: any;
    }
}

export interface ENV_CONFIG {
    NAME: string;
    HTTP_PORT: number;
    DB: ENV_DB_CONFIG
}