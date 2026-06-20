import express from "express";
import cookieParser from "cookie-parser";
import "dotenv/config";
import authRouter from "./routes/auth-routes.js";
import adminRouter from "./routes/admin-routes.js";
import { errorHandler, handle404Error } from "./middlewares/errorhandler.js";

const app = express();

// Standard middlewares
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
