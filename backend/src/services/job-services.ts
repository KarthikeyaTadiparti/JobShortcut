import db from "../config/db.js";
import { jobs } from "../schema/jobs-schema.js";
import type { Job, NewJob } from "../schema/jobs-schema.js";
import { eq, ilike, or, and, not, desc, isNull } from "drizzle-orm";
import { normalizeJobUrl } from "../utils/normalize-url.js";


/**
 * Checks if the provided apply link already exists in the jobs table.
 * Returns true if it exists, false otherwise.
 */
export async function checkApplyLinkExists(applyLink: string): Promise<boolean> {
    if (!applyLink) {
        return false;
    }

    try {
        const normalized = normalizeJobUrl(applyLink);
        const existing = await db
            .select({ id: jobs.id })
            .from(jobs)
            .where(eq(jobs.applyLink, normalized));
        
        return existing.length > 0;
    } catch (error) {
        console.error("Error checking apply link existence in db:", error);
        return false;
    }
}

/**
 * Inserts a new job record into the jobs table.
 */
export async function createJob(data: NewJob): Promise<Job> {
    const normalizedData = {
        ...data,
        applyLink: normalizeJobUrl(data.applyLink),
    };
    const [newJob] = await db.insert(jobs).values(normalizedData).returning();
    if (!newJob) {
        throw new Error("Failed to create job");
    }
    return newJob;
}

/**
 * Retrieves a list of jobs from the database based on optional filters:
 * - search: search term in jobRole or company
 * - location: location search term
 * - filterType: "freshers", "experienced", or "remote"
 */
export async function getJobsList(filters: { search?: string | undefined; location?: string | undefined; filterType?: string | undefined }): Promise<Job[]> {
    const query = db.select().from(jobs);
    const conditions = [];

    if (filters.search) {
        conditions.push(
            or(
                ilike(jobs.jobRole, `%${filters.search}%`),
                ilike(jobs.company, `%${filters.search}%`)
            )
        );
    }

    if (filters.location) {
        conditions.push(ilike(jobs.location, `%${filters.location}%`));
    }

    if (filters.filterType === "freshers") {
        conditions.push(
            or(
                ilike(jobs.experience, "%fresher%"),
                ilike(jobs.experience, "%entry%"),
                ilike(jobs.experience, "%0-%"),
                ilike(jobs.experience, "% 0 %"),
                ilike(jobs.experience, "%0 year%"),
                ilike(jobs.jobRole, "%intern%")
            )
        );
    } else if (filters.filterType === "experienced") {
        conditions.push(
            and(
                or(
                    isNull(jobs.experience),
                    or(
                        ilike(jobs.experience, "%experienced%"),
                        ilike(jobs.experience, "%0-2%"),
                        ilike(jobs.experience, "%0-3%"),
                        ilike(jobs.experience, "%0-4%"),
                        ilike(jobs.experience, "%0-5%"),
                        ilike(jobs.experience, "%0-6%")
                    ),
                    and(
                        not(ilike(jobs.experience, "%fresher%")),
                        not(ilike(jobs.experience, "%0-%")),
                        not(ilike(jobs.experience, "% 0 %")),
                        not(ilike(jobs.experience, "%0 year%"))
                    )
                ),
                or(
                    isNull(jobs.jobRole),
                    not(ilike(jobs.jobRole, "%intern%"))
                )
            )
        );
    } else if (filters.filterType === "remote") {
        conditions.push(
            or(
                ilike(jobs.location, "%remote%"),
                ilike(jobs.location, "%wfh%"),
                ilike(jobs.location, "%work from home%")
            )
        );
    }

    if (conditions.length > 0) {
        // @ts-ignore
        return query.where(and(...conditions)).orderBy(desc(jobs.createdAt));
    }

    return query.orderBy(desc(jobs.createdAt));
}

