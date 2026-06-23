import type { Request, Response } from "express";
import wrapAsync from "../utils/wrap-async.js";
import { createJob, checkApplyLinkExists } from "../services/job-services.js";
import ExpressError from "../middlewares/errorhandler.js";

export const createJobHandler = wrapAsync(async (req: Request, res: Response) => {
    const { company, jobRole, experience, location, applyLink, applyLinks } = req.body;

    if (applyLinks || Array.isArray(applyLink)) {
        throw new ExpressError(400, "Only a single apply link is allowed. Multiple apply links are not supported.");
    }

    if (!applyLink || typeof applyLink !== "string") {
        throw new ExpressError(400, "Exactly one apply link is required as a string.");
    }


    const addedBy = req.user?.id;
    if (!addedBy) {
        throw new ExpressError(401, "Admin must be logged in to approve jobs");
    }

    // Check if the apply link already exists in the database
    const exists = await checkApplyLinkExists(applyLink);
    if (exists) {
        throw new ExpressError(409, "Job already exists in the database");
    }

    const newJob = await createJob({
        company: company || null,
        jobRole: jobRole || null,
        experience: experience || null,
        location: location || null,
        applyLink,
        addedBy,
    });

    return res.status(201).json({
        status: true,
        data: newJob,
        message: "Job approved and saved successfully",
    });
});
