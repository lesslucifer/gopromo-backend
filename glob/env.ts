export enum ENV_NAME {
    PRODUCTION,
    STAGING,
    DEVELOPMENT
}

export let name: ENV_NAME
export let port: number

export function configure(env: string) {
    this.port = 1234;
    env = env.toLowerCase();
    if (env == 'prod' || env == 'production') {
        this.name = ENV_NAME.PRODUCTION;
    }
    else if (env == 'stag' || env == 'staging') {
        this.name = ENV_NAME.STAGING;
    }
    else {
        this.name = ENV_NAME.DEVELOPMENT;
    }
}