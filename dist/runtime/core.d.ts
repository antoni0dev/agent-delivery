export declare const runtimeProfileNames: readonly ["codex", "claude-code", "cursor"];
export type RuntimeProfile = (typeof runtimeProfileNames)[number];
export declare const roleNames: readonly ["planner", "planCritic", "implementer", "reviewer", "browserVerifier"];
export type Role = (typeof roleNames)[number];
export declare const effortNames: readonly ["medium", "high"];
export type RuntimeEffort = (typeof effortNames)[number];
export type RuntimeRoleProfile = Readonly<{
    model: string;
    effort: RuntimeEffort;
    complexOrMoneyEffort: RuntimeEffort;
    readOnly: boolean;
    freshContext: true;
}>;
export declare const runtimeProfiles: Readonly<{
    codex: Readonly<{
        planner: Readonly<{
            model: string;
            effort: RuntimeEffort;
            complexOrMoneyEffort: RuntimeEffort;
            readOnly: boolean;
            freshContext: true;
        }>;
        planCritic: Readonly<{
            model: string;
            effort: RuntimeEffort;
            complexOrMoneyEffort: RuntimeEffort;
            readOnly: boolean;
            freshContext: true;
        }>;
        implementer: Readonly<{
            model: string;
            effort: RuntimeEffort;
            complexOrMoneyEffort: RuntimeEffort;
            readOnly: boolean;
            freshContext: true;
        }>;
        reviewer: Readonly<{
            model: string;
            effort: RuntimeEffort;
            complexOrMoneyEffort: RuntimeEffort;
            readOnly: boolean;
            freshContext: true;
        }>;
        browserVerifier: Readonly<{
            model: string;
            effort: RuntimeEffort;
            complexOrMoneyEffort: RuntimeEffort;
            readOnly: boolean;
            freshContext: true;
        }>;
    }>;
    "claude-code": Readonly<{
        planner: Readonly<{
            model: string;
            effort: RuntimeEffort;
            complexOrMoneyEffort: RuntimeEffort;
            readOnly: boolean;
            freshContext: true;
        }>;
        planCritic: Readonly<{
            model: string;
            effort: RuntimeEffort;
            complexOrMoneyEffort: RuntimeEffort;
            readOnly: boolean;
            freshContext: true;
        }>;
        implementer: Readonly<{
            model: string;
            effort: RuntimeEffort;
            complexOrMoneyEffort: RuntimeEffort;
            readOnly: boolean;
            freshContext: true;
        }>;
        reviewer: Readonly<{
            model: string;
            effort: RuntimeEffort;
            complexOrMoneyEffort: RuntimeEffort;
            readOnly: boolean;
            freshContext: true;
        }>;
        browserVerifier: Readonly<{
            model: string;
            effort: RuntimeEffort;
            complexOrMoneyEffort: RuntimeEffort;
            readOnly: boolean;
            freshContext: true;
        }>;
    }>;
    cursor: Readonly<{
        planner: Readonly<{
            model: string;
            effort: RuntimeEffort;
            complexOrMoneyEffort: RuntimeEffort;
            readOnly: boolean;
            freshContext: true;
        }>;
        planCritic: Readonly<{
            model: string;
            effort: RuntimeEffort;
            complexOrMoneyEffort: RuntimeEffort;
            readOnly: boolean;
            freshContext: true;
        }>;
        implementer: Readonly<{
            model: string;
            effort: RuntimeEffort;
            complexOrMoneyEffort: RuntimeEffort;
            readOnly: boolean;
            freshContext: true;
        }>;
        reviewer: Readonly<{
            model: string;
            effort: RuntimeEffort;
            complexOrMoneyEffort: RuntimeEffort;
            readOnly: boolean;
            freshContext: true;
        }>;
        browserVerifier: Readonly<{
            model: string;
            effort: RuntimeEffort;
            complexOrMoneyEffort: RuntimeEffort;
            readOnly: boolean;
            freshContext: true;
        }>;
    }>;
}>;
export declare const selectRuntimeRole: ({ profile: runtimeProfile, role, complexOrMoney, }: {
    profile: RuntimeProfile;
    role: Role;
    complexOrMoney?: boolean;
}) => Readonly<{
    model: string;
    effort: RuntimeEffort;
    readOnly: boolean;
    freshContext: true;
}>;
