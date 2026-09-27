# Cache key review context

`accountResourceKey` identifies remote records. The same resource identifier may return different content for different signed-in accounts, and entries remain cached during an account change.

`localLabelKey` identifies a static, application-owned label. The label depends only on the resource identifier and has no account-specific or remote value.
