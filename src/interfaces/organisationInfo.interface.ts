export interface IOrganisationInfo {
    organisationName: string;
    organisationAddress: string;
    organisationCity: string;
    postalCode: string;
    kvkNumber: string;
    btwNumber: string;
    addressAdditions: string;
    contactPhoneNumber?: string | null;
    sdkStatus?: boolean | null;
    contactEmail?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
    hashedPublicKey?: string | null;
    status?: boolean | null;
}