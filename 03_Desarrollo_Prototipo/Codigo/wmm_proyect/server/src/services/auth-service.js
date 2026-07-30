const constants = require('../config/constants');

class AuthService {
    validateSecret(key) {
        return key === constants.AUTH.SECRET_KEY;
    }

    async login(name, key) {
        if (this.validateSecret(key)) {
            return { success: true };
        }
        return { success: false, message: 'Clave incorrecta' };
    }
}

module.exports = new AuthService();
