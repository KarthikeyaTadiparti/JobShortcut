import { Router } from "express";
import { createJobHandler, getJobsHandler } from "../controllers/job-controller.js";
import { ensureAuthentication } from "../middlewares/auth.js";

const router = Router();

// Route for listing jobs (publicly accessible)
router.get("/", getJobsHandler);

// Route for creating a job (requires authentication)
router.post("/", ensureAuthentication, createJobHandler);

export default router;
