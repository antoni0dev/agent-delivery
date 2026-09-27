import { DeliveryError } from "./domain.js";
import type { Store } from "./store.js";

export async function reconcileOperation<T>({
  store,
  key,
  payload,
  lookup,
  create,
  remoteId,
  dispatch,
}: {
  store: Store;
  key: string;
  payload: unknown;
  lookup: () => Promise<T | null>;
  create: () => Promise<T>;
  remoteId: (value: T) => string;
  dispatch?: () => void;
}): Promise<T> {
  const operation = store.beginOperation({ key, payload });
  const existing = await lookup();
  if (existing !== null) {
    store.confirmOperation({ key, remoteId: remoteId(existing) });
    return existing;
  }
  if (operation.status !== "pending")
    throw new DeliveryError(
      "Previous external mutation cannot be reconciled; manual resolution is required",
      "ambiguous",
    );
  if (dispatch === undefined) store.dispatchOperation(key);
  else dispatch();
  try {
    const created = await create();
    store.confirmOperation({ key, remoteId: remoteId(created) });
    return created;
  } catch (error) {
    store.uncertainOperation(key);
    throw error;
  }
}
