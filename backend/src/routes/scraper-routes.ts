import { Router } from "express";
import { handleScrapeRequest } from "../controllers/scraper-controller.js";
import { ensureAuthentication } from "../middlewares/auth.js";
import { validateScraperUrls } from "../middlewares/scraper-validation.js";

const router = Router();

// Route for batch scraping URLs
router.post("/", ensureAuthentication, validateScraperUrls, handleScrapeRequest);

export default router;
