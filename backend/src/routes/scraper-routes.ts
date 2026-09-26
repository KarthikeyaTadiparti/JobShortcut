import { Router } from "express";
import { handleScrapeRequest } from "../controllers/scraper-controller.js";
import { handleWhatsAppScrape, handleWhatsAppStatus } from "../controllers/whatsapp-scraper-controller.js";
import { ensureAuthentication } from "../middlewares/auth.js";
import { validateScraperUrls, validateWhatsAppScope } from "../middlewares/scraper-validation.js";

const router = Router();

// Route for batch scraping URLs
router.post("/", ensureAuthentication, validateScraperUrls, handleScrapeRequest);

// Routes for WhatsApp Web automated scraping
router.post("/whatsapp", ensureAuthentication, validateWhatsAppScope, handleWhatsAppScrape);
router.get("/whatsapp/status", ensureAuthentication, handleWhatsAppStatus);

export default router;

