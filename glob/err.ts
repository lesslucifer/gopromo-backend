export const ERR = {
    // Common error (-1 -> -99)
    UNKNOWN: -1,
    UNAUTHORIZED: -2,
    INVALID_ROLE: -3,
    OBJECT_NOT_FOUND: -4,
    INVALID_FORMAT: -5,
    INVALID_VERSION: -6,
    
    // Login (-101 -> -199)
    INVALID_USERNAME_OR_PASSWORD: -101,
    REFRESH_TOKEN_NOT_FOUND: -102,
    REFRESH_TOKEN_IS_EXPIRED: -103,

    // User profile: (-201 -> -299)
    OLD_PASSWORD_WRONG: -201,
    INVALID_PASSWORD_FORMAT: -202,
};

export default ERR;