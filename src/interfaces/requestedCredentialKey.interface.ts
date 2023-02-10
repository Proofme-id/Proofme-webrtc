import { IAdditionalInfo } from "./additional-info.interface";

export interface IRequestedCredentialKey {
    key: string | IAdditionalInfo[];
    provider: string | string[];
    name?: string;
    required: boolean;
    expectedValue?: string | boolean | number;
    verified?: boolean;
}