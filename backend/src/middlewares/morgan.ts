import morgan from "morgan";
import chalk from "chalk";
import type { Request, Response, NextFunction } from "express";

/**
 * Extracts client IP prioritizing Cloudflare's 'cf-connecting-ip' header,
 * followed by 'x-forwarded-for', and standard Express req.ip.
 */
export function getClientIp(req: Request): string {
  const cfIp = req.headers["cf-connecting-ip"];
  if (typeof cfIp === "string" && cfIp.trim()) {
    return cfIp.trim();
  }
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}

/**
 * Returns colorized HTTP method string.
 */
export function getColoredMethod(method: string = "UNKNOWN"): string {
  switch (method.toUpperCase()) {
    case "GET":
      return chalk.blue(method);
    case "POST":
      return chalk.green(method);
    case "DELETE":
      return chalk.red(method);
    case "PUT":
      return chalk.yellow(method);
    default:
      return chalk.magenta(method);
  }
}

/**
 * Middleware that logs immediately when a new request arrives at the server.
 * Displays timestamp, method, target route, and client IP.
 */
export function incomingRequestLogger(req: Request, _res: Response, next: NextFunction): void {
  // Skip CORS preflights and test environments to keep logs clean
  if (req.method === "OPTIONS" || process.env.NODE_ENV === "test") {
    next();
    return;
  }

  const time = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });
  const ip = getClientIp(req);
  const url = req.originalUrl || req.url;

  console.log(
    `${chalk.gray(`[${time}]`)} ${chalk.blue("-->")} ${getColoredMethod(req.method)} ${chalk.white(url)} - IP: ${chalk.cyan(ip)}`
  );
  next();
}

// --- Custom Morgan Tokens for Response Logging ---

// IST Time
morgan.token("ist-time", () => {
  return new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });
});

// Client IP (resolves real client IP)
morgan.token("client-ip", (req) => {
  return getClientIp(req as Request);
});

// Colored status code
morgan.token("colored-status", (_req, res) => {
  const status = res.statusCode;
  if (status >= 500) return chalk.red(status);
  if (status >= 400) return chalk.yellow(status);
  if (status >= 300) return chalk.cyan(status);
  return chalk.green(status);
});

// Colored HTTP method
morgan.token("colored-method", (req) => {
  return getColoredMethod(req.method || "UNKNOWN");
});

// --- Custom Response Format ---
const customFormat: morgan.FormatFn = (tokens, req, res) => {
  return [
    chalk.gray(`[${tokens["ist-time"]!(req, res)}]`),
    chalk.green("<--"),
    tokens["colored-method"]!(req, res),
    chalk.white(tokens.url!(req, res)),
    tokens["colored-status"]!(req, res),
    chalk.white(`${tokens["response-time"]!(req, res)} ms`),
    chalk.gray("- IP:"),
    chalk.cyan(tokens["client-ip"]!(req, res)),
  ].join(" ");
};

// --- Morgan Middleware ---
export const morganMiddleware = morgan(customFormat, {
  skip: (req) => req.method === "OPTIONS" || process.env.NODE_ENV === "test",
});

export default morganMiddleware;
