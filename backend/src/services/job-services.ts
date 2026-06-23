import db from "../config/db.js";
import { jobs } from "../schema/jobs-schema.js";
import type { Job, NewJob } from "../schema/jobs-schema.js";
import { eq } from "drizzle-orm";

/**
 * Checks if the provided apply link already exists in the jobs table.
 * Returns true if it exists, false otherwise.
 */
export async function checkApplyLinkExists(applyLink: string): Promise<boolean> {
    if (!applyLink) {
        return false;
    }

    try {
        const existing = await db
            .select({ id: jobs.id })
            .from(jobs)
            .where(eq(jobs.applyLink, applyLink));
        
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
    const [newJob] = await db.insert(jobs).values(data).returning();
    if (!newJob) {
        throw new Error("Failed to create job");
    }
    return newJob;
}
