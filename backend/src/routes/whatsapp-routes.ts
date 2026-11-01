import { Router } from "express";
import { handleWhatsAppScrape, handleWhatsAppStatus } from "@/controllers/whatsapp-scraper-controller.js";
import { ensureAuthentication } from "@/middlewares/auth.js";
import { validateWhatsAppScope } from "@/middlewares/scraper-validation.js";
import { scraperLimiter } from "@/middlewares/rate-limiter.js";

const router = Router();

// Route for initiating WhatsApp Web automated scraping (SSE stream)
router.post("/", ensureAuthentication, scraperLimiter, validateWhatsAppScope, handleWhatsAppScrape);

// Route for checking WhatsApp Web session authentication status
router.get("/status", ensureAuthentication, handleWhatsAppStatus);

export default router;

