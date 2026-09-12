import { Router } from "express";
import { createJobHandler, updateJobHandler, getJobsHandler } from "../controllers/job-controller.js";
import { ensureAuthentication } from "../middlewares/auth.js";

const router = Router();

// Route for listing jobs (publicly accessible)
router.get("/", getJobsHandler);

// Route for creating a job (requires authentication)
router.post("/", ensureAuthentication, createJobHandler);

// Route for updating a job (requires authentication)
router.put("/:id", ensureAuthentication, updateJobHandler);

export default router;
