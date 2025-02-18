import type { Page, PuppeteerLifeCycleEvent } from "puppeteer";
import type { LaunchOptions as PuppeteerNodeLaunchOptions } from "puppeteer";
import type { Screenshot } from "./models/Screenshot";
import type { Cluster } from "puppeteer-cluster";
export declare type Content = Array<{
    output: string;
    selector?: string;
}> | object;
export declare type Encoding = "base64" | "binary";
export declare type ImageType = "png" | "jpeg";
export interface ScreenshotParams {
    html?: string | null;
    url?: string;
    encoding?: Encoding;
    transparent?: boolean;
    type?: ImageType;
    quality?: number;
    selector?: string;
    content?: Content;
    output?: string;
}
export interface Options extends ScreenshotParams {
    waitUntil?: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[];
    beforeScreenshot?: (page: Page) => void;
    blockedURLs?: string[];
}
export interface constructorOptions {
    puppeteerArgs?: PuppeteerNodeLaunchOptions;
    puppeteer?: any;
    timeout?: number;
    concurrency?: typeof Cluster.CONCURRENCY_CONTEXT | typeof Cluster.CONCURRENCY_BROWSER | typeof Cluster.CONCURRENCY_PAGE | number;
    clusterArgs?: Record<string, any>;
}
export interface MakeScreenshotParams {
    screenshot: Screenshot;
    waitUntil?: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[];
    beforeScreenshot?: (page: Page) => void;
    handlebarsHelpers?: {
        [helpers: string]: (...args: any[]) => any;
    };
    timeout?: number;
}
