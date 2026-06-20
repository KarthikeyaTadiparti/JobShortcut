import type { Request, Response, NextFunction } from "express";

export default class ExpressError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

export const errorHandler = (
    error: ExpressError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const status = error.status || 500;
    const message = error.message || "Something went wrong!";
    res.status(status).json({ status: false, message });
};

export const handle404Error = (req: Request, res: Response) => {
    const status = 404;
    const message = 'Route not found';
    res.status(status).json({ status: false, message });
};