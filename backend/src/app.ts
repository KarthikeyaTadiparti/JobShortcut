import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import morganMiddleware, { incomingRequestLogger } from "./middlewares/morgan.js";
import { errorHandler, handle404Error } from "./middlewares/errorhandler.js";
import { apiLimiter } from "./middlewares/rate-limiter.js";

// Route imports
import authRouter from "./routes/auth-routes.js";
import adminRouter from "./routes/admin-routes.js";
import scraperRouter from "./routes/scraper-routes.js";
import whatsappRouter from "./routes/whatsapp-routes.js";
import jobsRouter from "./routes/jobs-routes.js";

const app = express();

// Trust reverse proxy hops (Cloudflare edge proxy + Render router = 2 hops)
const trustProxySetting = process.env.TRUST_PROXY
  ? !isNaN(Number(process.env.TRUST_PROXY))
    ? Number(process.env.TRUST_PROXY)
    : process.env.TRUST_PROXY
  : 2;
app.set("trust proxy", trustProxySetting);

// Standard middlewares
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(incomingRequestLogger);
app.use(morganMiddleware);
app.use(express.json());
app.use(cookieParser());

// Rate limiting (IP-based) for API routes
app.use("/api", apiLimiter);

// Home endpoint
app.get("/", (_req, res) => {
    res.send("Welcome to the Job Tracker API!");
});

// Route mountings
app.use("/api/auth", authRouter);
app.use("/api/admins", adminRouter);
app.use("/api/scraper", scraperRouter);
app.use("/api/whatsapp", whatsappRouter);
app.use("/api/jobs", jobsRouter);

// 404 Error handler
app.use(handle404Error);

// Global Error handler
app.use(errorHandler);

export default app;
