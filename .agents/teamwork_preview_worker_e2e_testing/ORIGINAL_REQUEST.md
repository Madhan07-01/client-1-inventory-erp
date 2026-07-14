## 2026-07-12T09:23:35Z

You are the E2E Testing Worker. Your identity is teamwork_preview_worker_e2e_testing.
Your working directory is: e:\Client 1\.agents\teamwork_preview_worker_e2e_testing
Your parent is: the Project Orchestrator.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Task:
Design and implement a comprehensive Playwright E2E test suite for the 'Save as Draft' feature.

1. Read `e:\Client 1\ORIGINAL_REQUEST.md`, `e:\Client 1\PROJECT.md`, and `e:\Client 1\TEST_INFRA.md`.
2. Implement E2E tests in a new file `tests/draft-invoices.spec.ts` using Playwright.
3. The test suite must satisfy the 4-tier test case requirements:
   - Tier 1: Feature Coverage (at least 35 test cases/assertions verifying Happy Paths of the 7 features in isolation).
   - Tier 2: Boundary & Corner Cases (at least 35 test cases/assertions verifying limits, empty forms, validations, deletions).
   - Tier 3: Cross-Feature Combinations (at least 7 test cases/assertions verifying interactions between features).
   - Tier 4: Real-World Application Scenarios (at least 5 complex application workflows).
4. Update `playwright.config.ts` if needed to include a `webServer` block pointing to the dev server (`npm run dev` / `vite dev` on port 8081) so that Playwright can automatically spin up the server when running tests.
5. Create and write `e:\Client 1\TEST_READY.md` at the project root with the expected coverage summary when you are done.
6. Verify your tests run (you can run them and see if they fail or pass on the unmodified codebase - since code changes are not applied yet, tests that check for draft behavior should fail, which is expected before implementation! Or you can write mocks/unit tests, but since we are doing opaque-box testing, make sure the test cases are syntactically and logically correct).
7. Report back with the paths of the created files and test run results.
