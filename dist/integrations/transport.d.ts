export declare function request(input: {
    provider: string;
    fetch: typeof fetch;
    url: string;
    init: RequestInit;
    read: boolean;
    acceptedStatuses?: readonly number[];
}): Promise<Response>;
export declare function parseJson(input: {
    provider: string;
    response: Response;
}): Promise<unknown>;
