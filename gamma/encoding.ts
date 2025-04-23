import crypto from 'node:crypto';

export function encrypt(text: string) {
    const cipher = crypto.createCipheriv('aes-128-ctr', process.env.AES_KEY, process.env.AES_IV);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

export function decrypt(encryptedText: string) {
    const decipher = crypto.createDecipheriv('aes-128-ctr', process.env.AES_KEY, process.env.AES_IV);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}