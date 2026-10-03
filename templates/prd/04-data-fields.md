# Data fields

Every displayed or submitted value appears here, grouped by category.

## <Category>

| Field | Type | Units and precision | Source or formula | Freshness | Owner |
|---|---|---|---|---|---|
| `amount_out` | decimal string | Token base units; decimals from the token registry; rounds down | Quote response `amountOut` | Realtime, stale after the quote expiry | Quote service |

## Column guide

| Column | Meaning |
|---|---|
| Type | string, decimal string, integer, boolean, enum (list the values), array, timestamp (unit and zone) or object |
| Units and precision | Currency or token, base versus display units, decimals and where they come from, rounding direction |
| Source or formula | API field, contract call, indexer entity or a formula over other fields in this file |
| Freshness | Static, realtime stream, periodic (interval) or on demand, plus the staleness the UI tolerates |
| Owner | The service, contract or team authoritative for the value |

A field without a source is an open question. Never derive a money value from a display value.
