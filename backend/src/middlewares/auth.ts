import { z } from "zod";
import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import ExpressError from "./errorhandler.js";

// signup validation schema
const signupSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    email: z.string().email({ message: "Invalid email format" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
});

export function signupValidation(req: Request, res: Response, next: NextFunction) {
    const body = req.body;
    const result = signupSchema.safeParse(body);

    if (!result.success) {
        const message = result.error.issues[0]?.message || "Validation failed";
        throw new ExpressError(400, message);
    }    
    next();
}

// login validation schema
const loginSchema = z.object({
    email: z.string().email({ message: "Invalid email format" }),
    password: z.string().min(1, { message: "Password is required" }),
});

export function loginValidation(req: Request, res: Response, next: NextFunction) {
    const body = req.body;
    const result = loginSchema.safeParse(body);

    if (!result.success) {
        const message = result.error.issues[0]?.message || "Validation failed";
        throw new ExpressError(400, message);
    }
    
    next();
}

// Define custom payload type for the JWT
interface JwtPayload {
    id: number;
    email: string;
}

// Extend Express Request to include `user`
declare module "express-serve-static-core" {
    interface Request {
        user?: JwtPayload;
    }
}

export function ensureAuthentication(req: Request, res: Response, next: NextFunction) {
    const jwtToken = req.cookies?.jwt;

    if (!jwtToken)
        throw new ExpressError(401, "Admin must be logged in");

    try {
        const user = jwt.verify(jwtToken, process.env.JWT_SECRET!) as JwtPayload;
        req.user = user;
        next();
    } catch (error) {
        throw new ExpressError(401, "Invalid token");
    }
}
