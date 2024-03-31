/// <reference types="node" />
import { Cluster } from "puppeteer-cluster";
import { Options, ScreenshotParams, constructorOptions } from "./types";
export default class nodeHtmlToImage {
    cluster: Cluster<ScreenshotParams>;
    options: constructorOptions;
    constructor(options?: constructorOptions);
    createInstance(): Promise<this>;
    render(options: Options): Promise<string | Buffer | (string | Buffer)[] | this>;
    shutdown(): Promise<void>;
}
