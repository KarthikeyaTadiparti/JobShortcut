import jwt from "jsonwebtoken";
import type { Response } from "express";

const JWT_SECRET: string = process.env.JWT_SECRET!;
export default function genJwt(res: Response, id: any) {
    const token = jwt.sign({ id }, JWT_SECRET, { expiresIn: "30d" });

    res.cookie("jwt", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });
}