import { Router } from "express";
import { getAdminsHandler, getAdminByIdHandler, updateAdminHandler, deleteAdminHandler } from "../controllers/admin-controller.js";
import { ensureAuthentication } from "../middlewares/auth.js";

const router = Router();

// Apply auth middleware to protect all admin CRUD routes
router.use(ensureAuthentication);

router.get("/", getAdminsHandler);
router.get("/:id", getAdminByIdHandler);
router.put("/:id", updateAdminHandler);
router.delete("/:id", deleteAdminHandler);

export default router;
