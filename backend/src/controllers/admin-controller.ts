import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import ExpressError from "../middlewares/errorhandler.js";
import wrapAsync from "../utils/wrap-async.js";
import { getAdmins, getAdminById, updateAdmin, deleteAdmin } from "../services/admin-services.js";

// Get all admins
export const getAdminsHandler = wrapAsync(async (req: Request, res: Response) => {
    const admins = await getAdmins();
    return res.status(200).json({
        status: true,
        data: admins,
    });
});

// Get admin by ID
export const getAdminByIdHandler = wrapAsync(async (req: Request, res: Response) => {
    const idParam = req.params.id;
    const id = typeof idParam === "string" ? parseInt(idParam, 10) : NaN;
    if (isNaN(id)) {
        throw new ExpressError(400, "Invalid admin ID");
    }

    const admin = await getAdminById(id);
    if (!admin) {
        throw new ExpressError(404, "Admin not found");
    }

    return res.status(200).json({
        status: true,
        data: admin,
    });
});

// Update admin
export const updateAdminHandler = wrapAsync(async (req: Request, res: Response) => {
    const idParam = req.params.id;
    const id = typeof idParam === "string" ? parseInt(idParam, 10) : NaN;
    if (isNaN(id)) {
        throw new ExpressError(400, "Invalid admin ID");
    }

    const { name, email, password } = req.body;

    const updateData: { name?: string; email?: string; password?: string } = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) {
        updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedAdmin = await updateAdmin(id, updateData);
    if (!updatedAdmin) {
        throw new ExpressError(404, "Admin not found or failed to update");
    }

    return res.status(200).json({
        status: true,
        data: updatedAdmin,
        message: "Admin updated successfully",
    });
});

// Delete admin
export const deleteAdminHandler = wrapAsync(async (req: Request, res: Response) => {
    const idParam = req.params.id;
    const id = typeof idParam === "string" ? parseInt(idParam, 10) : NaN;
    if (isNaN(id)) {
        throw new ExpressError(400, "Invalid admin ID");
    }

    const deleted = await deleteAdmin(id);
    if (!deleted) {
        throw new ExpressError(404, "Admin not found or failed to delete");
    }

    return res.status(200).json({
        status: true,
        message: "Admin deleted successfully",
    });
});
