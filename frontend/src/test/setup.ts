import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Set up environment variables for tests
vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-client-id");
