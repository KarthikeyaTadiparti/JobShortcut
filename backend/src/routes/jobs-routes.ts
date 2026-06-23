import { Router } from "express";
import { createJobHandler } from "../controllers/job-controller.js";
import { ensureAuthentication } from "../middlewares/auth.js";

const router = Router();

// Route for creating a job (requires authentication)
router.post("/", ensureAuthentication, createJobHandler);

export default router;
