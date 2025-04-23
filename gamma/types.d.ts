declare global {
    namespace NodeJS {
        interface ProcessEnv {
            PROXY_URL: string;
            PORTS: string;
            PASSWORDS: string;
            ANTI_DELETE_ON: string;
            AES_KEY: string;
            AES_IV: string;
            CW_INTERVAL: string;
            ACC_INTERVAL: string;
        }
    }
}

export type DatabaseAccount = {
    email: string;
    password: string;
    eggs: number;
    items: {
        [key: string]: number;
    }
    canPlayAgain: number;
    isBroken?: boolean;
    isAntiDelete: boolean;
}

export type Stats = {
    numAccounts: number;
    eggs: number;
    items: {
        [key: string]: number;
    }
    bigEggAccounts: {
        [key: string]: number;
    }
}