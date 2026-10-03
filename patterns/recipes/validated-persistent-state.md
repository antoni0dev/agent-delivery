# Validated persistent external state

Treat persistence as an external store and a versioned trust boundary. Persist the smallest durable shape, validate it on read, and define behavior for missing, corrupt, future, and inaccessible data.

Related cards: `storage-versioned-boundary`, `react-external-store-snapshots`, `lifecycle-readiness-and-user-feedback`.

## Storage contract

```ts
export type StorageAdapter<Key extends string> = {
  get<Value>(key: Key, codec: PersistentCodec<Value>): Value | undefined
  set<Value>(key: Key, value: Value, codec: PersistentCodec<Value>): void
  subscribe(key: Key, listener: () => void): () => void
}

export type PersistentCodec<Value> = {
  parse(input: unknown): Value
  serialize(value: Value): unknown
}
```

The adapter owns platform events, serialization transport, and snapshot caching. Repeated `get` calls for unchanged storage must return the same object identity. The codec owns runtime validation and migration into the current domain shape.

## Hook factory

```ts
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'

type PersistentStateInput<Key extends string, Value> = {
  key: Key
  initialValue: () => Value
  codec: PersistentCodec<Value>
}

export function createPersistentStateHook<Key extends string>(
  storage: StorageAdapter<Key>
) {
  return function usePersistentState<Value>({
    key,
    initialValue,
    codec,
  }: PersistentStateInput<Key, Value>) {
    const initialValues = useRef(new Map<Key, { value: Value }>())
    let initialEntry = initialValues.current.get(key)

    if (initialEntry === undefined) {
      initialEntry = { value: initialValue() }
      initialValues.current.set(key, initialEntry)
    }

    const initial = initialEntry.value
    const subscribe = useCallback(
      (listener: () => void) => storage.subscribe(key, listener),
      [key, storage]
    )
    const read = useCallback(() => {
      const stored = storage.get(key, codec)
      return stored === undefined ? initial : stored
    }, [codec, initial, key, storage])

    const value = useSyncExternalStore(
      subscribe,
      read,
      () => initial
    )

    useEffect(() => {
      if (storage.get(key, codec) === undefined) {
        storage.set(key, initial, codec)
      }
    }, [codec, initial, key, storage])

    const setValue = (next: Value) => {
      storage.set(key, next, codec)
    }

    const updateValue = (update: (current: Value) => Value) => {
      storage.set(key, update(read()), codec)
    }

    return { value, setValue, updateValue }
  }
}
```

Separate `setValue` and `updateValue` so a stored function can never be mistaken for an updater. Stabilize `subscribe` and snapshot functions only when the chosen React version or adapter lifecycle requires stable identities.

Defaults are stored per key so an account or scope change cannot seed a new key
with the previous key's value. Only `undefined` means absent; `null` remains a
valid persisted value when the codec permits it.

## Versioned value

```ts
type StoredPreference = {
  version: 2
  density: 'compact' | 'comfortable'
}
```

The codec should migrate supported older versions, reject future versions, and apply only an approved fallback. Do not silently erase drafts or security-sensitive state.

## Adoption checks

- Missing, valid, old, future, corrupt, and inaccessible storage all reach an explicit outcome.
- Same-document writes and cross-document storage events notify subscribers.
- Snapshot identity is stable when the underlying value has not changed.
- Subscription cleanup removes exactly the listener that was added.
- Server rendering has a deterministic server snapshot.
- Tests cover functional updates, validation correction, migration, and multi-subscriber updates.
- Tests cover a mounted key change and a codec whose valid value includes `null`.
