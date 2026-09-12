import jwt from "jsonwebtoken";
import type { Response } from "express";

const JWT_SECRET: string = process.env.JWT_SECRET!;
export default function genJwt(res: Response, id: any) {
    const token = jwt.sign({ id }, JWT_SECRET, { expiresIn: "30d" });
    const expiresDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("jwt", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        expires: expiresDate,
        path: "/",
    });
}