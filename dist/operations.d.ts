import type { Store } from "./store.js";
export declare function reconcileOperation<T>({ store, key, payload, lookup, create, remoteId, dispatch, }: {
    store: Store;
    key: string;
    payload: unknown;
    lookup: () => Promise<T | null>;
    create: () => Promise<T>;
    remoteId: (value: T) => string;
    dispatch?: () => void;
}): Promise<T>;
