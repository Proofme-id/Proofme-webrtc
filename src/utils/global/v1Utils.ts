export function getSubDomain(url: string): string {
    if (!url) {
        return url
    }

    // Replace http, https and remove the port
    return url.replace("http://", "").replace("https://", "").split(":")[0];
}