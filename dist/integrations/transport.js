import { DeliveryError } from "../domain.js";
const READ_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 10_000;
function responseError({ provider, status }) {
    return new DeliveryError(`${provider} request failed with HTTP ${status}`, "provider");
}
export async function request(input) {
    const attempts = input.read ? READ_ATTEMPTS : 1;
    let lastStatus = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            const response = await input.fetch(input.url, {
                ...input.init,
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            });
            if (response.ok || input.acceptedStatuses?.includes(response.status))
                return response;
            lastStatus = response.status;
            if (!input.read) {
                if (response.status === 408 || response.status === 429 || response.status >= 500)
                    throw new DeliveryError(`${input.provider} mutation failed; remote outcome is uncertain`, "uncertain");
                throw responseError({ provider: input.provider, status: response.status });
            }
            if (response.status !== 429 && response.status < 500)
                throw responseError({ provider: input.provider, status: response.status });
        }
        catch (error) {
            if (error instanceof DeliveryError)
                throw error;
            if (!input.read || attempt === attempts)
                throw new DeliveryError(`${input.provider} ${input.read ? "read" : "mutation"} failed; remote outcome ${input.read ? "is unavailable" : "is uncertain"}`, input.read ? "provider" : "uncertain");
        }
    }
    throw responseError({ provider: input.provider, status: lastStatus ?? 503 });
}
export async function parseJson(input) {
    try {
        return await input.response.json();
    }
    catch {
        throw new DeliveryError(`${input.provider} returned an invalid response`, "provider");
    }
}
