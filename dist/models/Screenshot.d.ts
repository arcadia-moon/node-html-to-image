/// <reference types="node" />
import { ImageType, Encoding, Content, ScreenshotParams } from "../types";
export declare class Screenshot {
    output: string;
    content: Content;
    selector: string;
    html?: string;
    url?: string;
    quality?: number;
    captureBeyondViewport?: boolean;
    buffer?: Buffer | string;
    type?: ImageType;
    encoding?: Encoding;
    transparent?: boolean;
    constructor(params: ScreenshotParams);
    setHTML(html?: string | null): void;
    setURL(url: string): void;
    setBuffer(buffer: Buffer | string): void;
}
