class Exception extends Error {
    errCode = 0;
    constructor(code, desc) {
        super(desc);
        this.errCode = code;
    }
}

module.exports = Exception;