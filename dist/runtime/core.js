export const runtimeProfileNames = ["codex", "claude-code", "cursor"];
export const roleNames = [
    "planner",
    "planCritic",
    "implementer",
    "reviewer",
    "browserVerifier",
];
export const effortNames = ["medium", "high"];
const profile = ({ model, effort, complexOrMoneyEffort = effort, readOnly, }) => Object.freeze({ model, effort, complexOrMoneyEffort, readOnly, freshContext: true });
export const runtimeProfiles = Object.freeze({
    codex: Object.freeze({
        planner: profile({ model: "gpt-6-astra", effort: "high", readOnly: true }),
        planCritic: profile({ model: "gpt-6-astra", effort: "high", readOnly: true }),
        implementer: profile({
            model: "gpt-5.6-sol",
            effort: "medium",
            complexOrMoneyEffort: "high",
            readOnly: false,
        }),
        reviewer: profile({ model: "gpt-5.6-sol", effort: "high", readOnly: true }),
        browserVerifier: profile({ model: "gpt-5.6-sol", effort: "high", readOnly: true }),
    }),
    "claude-code": Object.freeze({
        planner: profile({ model: "claude-fable-5-1", effort: "high", readOnly: true }),
        planCritic: profile({ model: "claude-fable-5-1", effort: "high", readOnly: true }),
        implementer: profile({
            model: "claude-opus-5-5",
            effort: "medium",
            complexOrMoneyEffort: "high",
            readOnly: false,
        }),
        reviewer: profile({ model: "claude-opus-5-5", effort: "high", readOnly: true }),
        browserVerifier: profile({ model: "claude-opus-5-5", effort: "high", readOnly: true }),
    }),
    cursor: Object.freeze({
        planner: profile({ model: "gpt-5.6-sol", effort: "high", readOnly: true }),
        planCritic: profile({ model: "claude-fable-5-1", effort: "high", readOnly: true }),
        implementer: profile({
            model: "gpt-5.6-sol",
            effort: "medium",
            complexOrMoneyEffort: "high",
            readOnly: false,
        }),
        reviewer: profile({ model: "gpt-5.6-sol", effort: "high", readOnly: true }),
        browserVerifier: profile({ model: "gpt-5.6-sol", effort: "high", readOnly: true }),
    }),
});
export const selectRuntimeRole = ({ profile: runtimeProfile, role, complexOrMoney = false, }) => {
    const selected = runtimeProfiles[runtimeProfile][role];
    return Object.freeze({
        model: selected.model,
        effort: complexOrMoney ? selected.complexOrMoneyEffort : selected.effort,
        readOnly: selected.readOnly,
        freshContext: selected.freshContext,
    });
};
