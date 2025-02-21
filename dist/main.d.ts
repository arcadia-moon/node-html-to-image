/// <reference types="node" />
import { Cluster } from "puppeteer-cluster";
import { Options, ScreenshotParams, constructorOptions } from "./types";
export default class nodeHtmlToImage {
    cluster: Cluster<ScreenshotParams>;
    options: constructorOptions;
    private mutex;
    constructor(options?: constructorOptions);
    createInstance(): Promise<this>;
    render(options: Options): Promise<string | Buffer | (string | Buffer)[]>;
    shutdown(isProcessExit?: boolean): Promise<void>;
}
