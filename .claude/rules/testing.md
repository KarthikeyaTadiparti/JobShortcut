# Testing Standards & Guidelines

## Console Output Standards in Tests
- **No Console Logs in Test Files**: Do not add `console.log`, `console.warn`, `console.info`, or `console.error` inside test files (`*.spec.ts`, `*.test.ts`). Tests must rely strictly on test framework assertions (`expect(...)`).
- **No Emojis**: Do not use emojis in console logs, error messages, or diagnostic reports across test suites. Use clean text tags like `[INFO]`, `[SUCCESS]`, `[WARNING]`, `[ERROR]`, `[AUTHENTICATED]`, `[TIMEOUT]`.

## Playwright Test Structure & Traceability
- **Group Actions into `test.step`**: Wrap actions and logical test phases inside descriptive `test.step("...", async () => { ... })` blocks so that Playwright Traces and HTML reports are structured, grouped, and easily traceable.
- **Visual Element Highlighting**: Use `highlightElement(locator)` to spotlight target elements (e.g. search boxes, chat rows, conversation headers) before actions or assertions, ensuring high-contrast visibility in Playwright traces, screenshots, and video recordings.

## Transparent Assertion Reporting & Test Attachments
- **Descriptive Assertion Step Titles with Dynamic Live Values**: Every validation step title must clearly state the expected contract and interpolate the actual received values:
  ```typescript
  await test.step(
    `Validate outcome -> Expected: { status: 'not_found', unreadCount: 0 } | Received: { status: '${result?.status}', unreadCount: ${result?.unreadCount} }`,
    async () => { ... }
  );
  ```
- **Custom Expect Messages**: Always provide an explanation string as the second argument to `expect(actual, "Descriptive failure reason")` explaining the business logic and current outcome.
- **Test Result Attachments**: Attach structured outputs (e.g., search results, extracted link objects) via `test.info().attach("search-and-open-result", { body: JSON.stringify(result, null, 2), contentType: "application/json" })` for transparent inspection in Playwright HTML reports and Trace Viewer attachments.
