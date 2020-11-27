export interface IRTCConnectionConfig {
    stunEnabled: boolean;
    stunUrl: string;

    turnEnabled: boolean;
    turnUrl: string;
    turnSecret: string;
    turnExpiration: number;
}