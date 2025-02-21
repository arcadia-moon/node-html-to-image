import { Page } from "puppeteer";
import { MakeScreenshotParams } from "./types";
export declare function makeScreenshot(page: Page, { screenshot, beforeScreenshot, waitUntil, timeout, handlebarsHelpers, viewport, }: MakeScreenshotParams): Promise<import("./models/Screenshot").Screenshot>;
