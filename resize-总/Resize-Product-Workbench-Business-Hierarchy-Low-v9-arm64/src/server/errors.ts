export class AppError extends Error { constructor(public code: string, message=code, public httpStatus=400){super(message)} }
export const safeDetail=(value:unknown)=> value instanceof AppError ? value.code : "INTERNAL_ERROR";
