import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import ExpressError from "../middlewares/errorhandler.js";
import genJwt from "../utils/gen-jwt.js";
import wrapAsync from "../utils/wrap-async.js";
import { createAdmin, getAdmins, getAdminByEmail } from "../services/admin-services.js";

// Signup
export const handleAdminSignup = wrapAsync(async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    const existingAdmin = await getAdminByEmail(email);
    if (existingAdmin) {
        throw new ExpressError(409, "Admin already exists!");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await createAdmin({
        name,
        email,
        password: hashedPassword,
    });

    if (!newAdmin?.id) {
        throw new ExpressError(500, "Failed to create admin");
    }

    genJwt(res, newAdmin.id);

    return res.status(201).json({
        status: true,
        admin: {
            id: newAdmin.id,
            name: newAdmin.name,
            email: newAdmin.email,
        },
        message: "Admin registered successfully!",
    });
});

// Login
export const handleAdminLogin = wrapAsync(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const admin = await getAdminByEmail(email);
    if (!admin) {
        throw new ExpressError(401, "Admin does not exist!");
    }

    const isPasswordCorrect = await bcrypt.compare(password, admin.password);
    if (!isPasswordCorrect) {
        throw new ExpressError(401, "Invalid email or password!");
    }

    genJwt(res, admin.id);

    return res.status(200).json({
        status: true,
        admin: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
        },
        message: "Admin logged in successfully!"
    });
});

// Logout
export const handleAdminLogout = wrapAsync(async (req: Request, res: Response) => {
    const cookies = req.cookies || {};
    if (cookies.jwt) {
        res.clearCookie("jwt", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        });
        return res.status(200).json({ status: true, message: "Admin logged out successfully!" });
    }

    return res.status(200).json({ status: true, message: "No session found, but logged out anyway." });
});


