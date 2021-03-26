export interface IRequestedCredentialKey {
    key: string;
    provider: string | string[];
    name?: string;
    required: boolean;
    expectedValue?: string | boolean | number;
}