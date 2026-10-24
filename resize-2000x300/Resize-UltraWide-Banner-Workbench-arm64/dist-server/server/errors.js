export class AppError extends Error {
    code;
    httpStatus;
    constructor(code, message = code, httpStatus = 400) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
    }
}
export const safeDetail = (value) => value instanceof AppError ? value.code : "INTERNAL_ERROR";
