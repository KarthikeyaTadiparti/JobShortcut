import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import authRouter from "./routes/auth-routes.js";
import adminRouter from "./routes/admin-routes.js";
import { errorHandler, handle404Error } from "./middlewares/errorhandler.js";
import morganMiddleware from "./middlewares/morgan.js";

const app = express();

// Standard middlewares
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(morganMiddleware);
app.use(express.json());
app.use(cookieParser());


// Home endpoint
app.get("/", (_req, res) => {
    res.send("Welcome to the Job Tracker API!");
});

// Route mountings
app.use("/api/auth", authRouter);
app.use("/api/admins", adminRouter);

// 404 Error handler
app.use(handle404Error);

// Global Error handler
app.use(errorHandler);

export default app;
