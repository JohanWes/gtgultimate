export async function generateSignature(score: number, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${score}-${secret}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}
