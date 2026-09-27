export const defaultPreference = Object.freeze({
  schemaVersion: 2,
  theme: "system",
  compact: false,
});

export function decodePreference(serialized) {
  if (serialized === null) {
    return defaultPreference;
  }

  return JSON.parse(serialized);
}
