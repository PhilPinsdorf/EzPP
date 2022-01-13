const crypto = require('crypto');
const key = 'RKN6pcEUVE';
const algorithm = 'aes-256-ctr';

module.exports = {
    encrypt(text) {
        var cipher = crypto.createCipher(algorithm, key);
        return cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
    },

    decrypt(text) {
        var decipher = crypto.createDecipher(algorithm, key);
        return decipher.update(text, "hex", "utf-8") + decipher.final("utf8");
    }
}