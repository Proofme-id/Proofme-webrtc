export function getSubDomain(url: string): string {
    // Replace http, https and remove the port
    return url?.replace("http://", "").replace("https://", "").split(":")[0];
}