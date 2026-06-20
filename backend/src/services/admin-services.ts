import db from "../config/db.js";
import { admins } from "../schema/admins-schema.js";
import type { Admin, NewAdmin } from "../schema/admins-schema.js";
import { eq } from "drizzle-orm";

export async function createAdmin(data: NewAdmin): Promise<Admin> {
    const [newAdmin] = await db.insert(admins).values(data).returning();
    if (!newAdmin) {
        throw new Error("Failed to create admin");
    }
    return newAdmin;
}

export async function getAdmins(): Promise<Omit<Admin, "password">[]> {
    return await db.select({
        id: admins.id,
        name: admins.name,
        email: admins.email,
        createdAt: admins.createdAt,
        updatedAt: admins.updatedAt,
    }).from(admins);
}

export async function getAdminById(id: number): Promise<Omit<Admin, "password"> | null> {
    const [admin] = await db.select({
        id: admins.id,
        name: admins.name,
        email: admins.email,
        createdAt: admins.createdAt,
        updatedAt: admins.updatedAt,
    }).from(admins).where(eq(admins.id, id));
    return admin || null;
}

export async function getAdminByEmail(email: string): Promise<Admin | null> {
    const [admin] = await db.select().from(admins).where(eq(admins.email, email));
    return admin || null;
}

export async function updateAdmin(id: number, data: Partial<Omit<Admin, "id" | "createdAt" | "updatedAt">>): Promise<Omit<Admin, "password"> | null> {
    const [updatedAdmin] = await db.update(admins)
        .set(data)
        .where(eq(admins.id, id))
        .returning({
            id: admins.id,
            name: admins.name,
            email: admins.email,
            createdAt: admins.createdAt,
            updatedAt: admins.updatedAt,
        });
    return updatedAdmin || null;
}

export async function deleteAdmin(id: number): Promise<boolean> {
    const result = await db.delete(admins).where(eq(admins.id, id)).returning({ id: admins.id });
    return result.length > 0;
}
