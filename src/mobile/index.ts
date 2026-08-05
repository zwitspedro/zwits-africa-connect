/**
 * Zwits shared mobile core.
 *
 * One core, three Android apps (Customer, Provider, Driver). Every module is
 * web-safe: native plugins load lazily behind a platform check, so the same
 * code runs in the browser build and inside the Capacitor shell.
 */
export * from "./platform";
export * from "./storage";
export * from "./auth";
export * from "./api";
export * from "./state";
export * from "./maps";
export * from "./notifications";
export * from "./chat";
export * from "./profile";
export * from "./offline";
export * from "./media";
export * from "./settings";
export * from "./theme";
