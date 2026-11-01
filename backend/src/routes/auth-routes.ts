import { Router } from "express";
import { handleAdminSignup, handleAdminLogin, handleAdminLogout } from "@/controllers/auth-controller.js";
import { loginValidation, signupValidation } from "@/middlewares/auth.js";
import { authLimiter } from "@/middlewares/rate-limiter.js";

const router = Router();

router.post("/signup", authLimiter, signupValidation, handleAdminSignup);
router.post("/login", authLimiter, loginValidation, handleAdminLogin);
router.get("/logout", handleAdminLogout);

export default router;
