# Preference boundary task

Implement `decodePreference` in `preference-store.js`.

The input is either `null` or an untrusted serialized string. Return the exported version 2 default for missing, malformed, partial, unsupported, or future-version data. Accept only a complete version 2 value whose theme is `light`, `dark`, or `system` and whose compact field is boolean. Migrate a complete version 1 value with a boolean `darkMode` field to version 2. Return a fresh accepted or migrated object. Do not edit tests or package metadata.
