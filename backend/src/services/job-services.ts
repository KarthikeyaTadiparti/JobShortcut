import db from "../config/db.js";
import { jobs } from "../schema/jobs-schema.js";
import { inArray } from "drizzle-orm";

/**
 * Checks if any of the provided apply links already exist in the jobs table.
 * Returns true if at least one exists, false otherwise.
 */
export async function checkApplyLinksExist(applyLinks: string[]): Promise<boolean> {
    if (!applyLinks || applyLinks.length === 0) {
        return false;
    }

    try {
        const existing = await db
            .select({ id: jobs.id })
            .from(jobs)
            .where(inArray(jobs.applyLink, applyLinks));
        
        return existing.length > 0;
    } catch (error) {
        console.error("Error checking apply links existence in db:", error);
        return false;
    }
}
