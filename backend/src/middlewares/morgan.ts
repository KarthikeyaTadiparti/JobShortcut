import morgan from "morgan";
import chalk from "chalk";

// --- Custom Tokens ---

// IST Time
morgan.token("ist-time", () => {
  return new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });
});

// Colored status code
morgan.token("colored-status", (req, res) => {
  const status = res.statusCode;
  if (status >= 500) return chalk.red(status);
  if (status >= 400) return chalk.yellow(status);
  if (status >= 300) return chalk.cyan(status);
  return chalk.green(status);
});

// Colored HTTP method
morgan.token("colored-method", (req) => {
  switch (req.method) {
    case "GET":
      return chalk.blue(req.method);
    case "POST":
      return chalk.green(req.method);
    case "DELETE":
      return chalk.red(req.method);
    case "PUT":
      return chalk.yellow(req.method);
    default:
      return chalk.magenta(req.method);
  }
});

// --- Custom Format ---
const customFormat: morgan.FormatFn = (tokens, req, res) => {
  return [
    tokens["colored-method"]!(req, res),           // non-null assertion
    chalk.white(tokens.url!(req, res)),
    tokens["colored-status"]!(req, res),           // non-null assertion
    chalk.white(`${tokens["response-time"]!(req, res)} ms`),
    chalk.gray(tokens["ist-time"]!(req, res)),
  ].join("\t");
};

// --- Morgan Middleware ---
const morganMiddleware = morgan(customFormat, {
  skip: (req) => req.method === "OPTIONS", // optional: skip OPTIONS requests
});

export default morganMiddleware;
