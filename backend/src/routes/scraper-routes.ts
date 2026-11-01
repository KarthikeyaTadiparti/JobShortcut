import { Router } from "express";
import { handleScrapeRequest } from "@/controllers/scraper-controller.js";
import { ensureAuthentication } from "@/middlewares/auth.js";
import { validateScraperUrls } from "@/middlewares/scraper-validation.js";
import { scraperLimiter } from "@/middlewares/rate-limiter.js";

const router = Router();

// Route for batch scraping URLs
router.post("/", ensureAuthentication, scraperLimiter, validateScraperUrls, handleScrapeRequest);

export default router;
