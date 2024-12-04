import type { Express } from 'express';
declare global {
    namespace Express {
        interface Request {
            reactState: StateManager;
            isAjax: boolean;
        }
    }
}
declare class StateManager {
    private state;
    private subscribers;
    getStates(): Map<string, any>;
    setState(key: string, value: any): void;
    getState(key: string): any;
    subscribe(callback: (key: string, value: any) => void): () => boolean;
    private notifySubscribers;
}
interface ReactExpressOptions {
    viewsDir?: string;
    hmr?: boolean;
}
export declare function reactExpress(options?: ReactExpressOptions): (app: Express) => void;
export {};
