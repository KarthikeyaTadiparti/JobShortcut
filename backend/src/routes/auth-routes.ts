import { Router } from "express";
import { handleAdminSignup, handleAdminLogin, handleAdminLogout } from "../controllers/auth-controller.js";
import { loginValidation, signupValidation } from "../middlewares/auth.js";

const router = Router();

router.post("/signup", signupValidation, handleAdminSignup);
router.post("/login", loginValidation, handleAdminLogin);
router.get("/logout", handleAdminLogout);

export default router;