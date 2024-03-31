import { Cluster } from "puppeteer-cluster";

import { Screenshot } from "./models/Screenshot";
import { makeScreenshot } from "./screenshot";
import { Options, ScreenshotParams, constructorOptions } from "./types";

export default class nodeHtmlToImage {
  public cluster: Cluster<ScreenshotParams> = null;
  public options: constructorOptions = null;
  constructor(options?: constructorOptions) {
    this.options = options;
  }

  public createInstance() {
    const {
      puppeteerArgs = {},
      timeout = 30000,
      puppeteer = undefined,
    } = this.options;
    return Cluster.launch({
      concurrency: Cluster.CONCURRENCY_CONTEXT,
      maxConcurrency: 2,
      timeout,
      puppeteerOptions: { ...puppeteerArgs, headless: 'new' },
      puppeteer: puppeteer,
    }).then((cluster: Cluster<ScreenshotParams>) => {
      this.cluster = cluster;
    }).then(() => {
      return true;
    }).catch(() => {
      return false;
    });
  }

  public render(options: Options) {
    const {
      html,
      encoding,
      transparent,
      content,
      output,
      selector,
      type,
      quality,
    } = options;
    const shouldBatch = Array.isArray(content);
    const contents = shouldBatch ? content : [{ ...content, output, selector }];

    return Promise.all(
      contents.map((content) => {
        const { output, selector: contentSelector, ...pageContent } = content;
        return this.cluster.execute(
          {
            html,
            encoding,
            transparent,
            output,
            content: pageContent,
            selector: contentSelector ? contentSelector : selector,
            type,
            quality,
          },
          async ({ page, data }) => {
            const screenshot = await makeScreenshot(page, {
              ...options,
              screenshot: new Screenshot(data),
            });
            return screenshot;
          }
        );
      })
    ).then((screenshots: Array<Screenshot>) => {
      return this.cluster.idle().then(() => {
        return shouldBatch
          ? screenshots.map(({ buffer }) => buffer)
          : screenshots[0].buffer;
      })
    }).catch(async (err) => {
      console.error(err);
      await this.cluster.close();
      delete this.cluster;
      return await this.createInstance();
    });
  }

  public shutdown() {
    return this.cluster.close();
  }
}