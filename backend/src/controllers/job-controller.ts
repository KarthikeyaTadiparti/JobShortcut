import type { Request, Response } from "express";
import wrapAsync from "../utils/wrap-async.js";
import { createJob, checkApplyLinkExists, getJobsList } from "../services/job-services.js";
import ExpressError from "../middlewares/errorhandler.js";
import { normalizeJobUrl } from "../utils/normalize-url.js";

const JOBS_PER_PAGE = 12;

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

    const formattedApplyLink = normalizeJobUrl(applyLink);

    // Check if the apply link already exists in the database
    const exists = await checkApplyLinkExists(formattedApplyLink);
    if (exists) {
        throw new ExpressError(409, "Job already exists in the database");
    }

    const newJob = await createJob({
        company: company || null,
        jobRole: jobRole || null,
        experience: experience || null,
        location: location || null,
        applyLink: formattedApplyLink,
        addedBy,
    });

    return res.status(201).json({
        status: true,
        data: newJob,
        message: "Job approved and saved successfully",
    });
});

// export const getJobsHandler = wrapAsync(async (req: Request, res: Response) => {
//     const { search, location, filterType } = req.query;

//     const data = await getJobsList({
//         search: typeof search === "string" ? search : undefined,
//         location: typeof location === "string" ? location : undefined,
//         filterType: typeof filterType === "string" ? filterType : undefined,
//     });

//     return res.status(200).json({
//         status: true,
//         data,
//     });
// });

export const getJobsHandler = wrapAsync(async (req: Request, res: Response) => {
    const { page = "1", search, location, filterType } = req.query;

    const { jobs, totalCount } = await getJobsList(
        typeof page === "string" ? Number(page) : 1,
        JOBS_PER_PAGE,
        {
            search: typeof search === "string" ? search : undefined,
            location: typeof location === "string" ? location : undefined,
            filterType: typeof filterType === "string" ? filterType : undefined,
        });

    return res.status(200).json({
        status: true,
        data: {
            jobs,
            currentPage: typeof page === "string" ? Number(page) : 1,
            jobsPerPage: JOBS_PER_PAGE,
            totalPages: Math.ceil(totalCount / JOBS_PER_PAGE),
            totalCount,
        }
    });
});

