import { Cluster } from "puppeteer-cluster";

import { Screenshot } from "./models/Screenshot";
import { makeScreenshot } from "./screenshot";
import { Options, ScreenshotParams, constructorOptions } from "./types";

export default class nodeHtmlToImage {
  public cluster: Cluster<ScreenshotParams> = null;
  public options: constructorOptions = {};
  constructor(options: constructorOptions = {}) {
    this.options = options;
  }

  public async createInstance() {
    const {
      puppeteerArgs = {},
      timeout = 30000,
      puppeteer = undefined,
    } = this.options;
    this.cluster = await Cluster.launch({
      concurrency: Cluster.CONCURRENCY_CONTEXT,
      maxConcurrency: 2,
      timeout,
      puppeteerOptions: { ...puppeteerArgs, headless: true },
      puppeteer: puppeteer,
    })
    return this;
  }

  public async render(options: Options) {
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
    if(!this.cluster) {
      await this.createInstance();
    }
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
    ).then(async (screenshots: Array<Screenshot>) => {
      await this.cluster.idle()
      return shouldBatch
        ? screenshots.map(({ buffer }) => buffer)
        : screenshots[0].buffer;
    }).catch(async (err) => {
      console.error(err);
      await this.cluster.close();
      delete this.cluster;
      throw err;
    });
  }

  public async shutdown(isProcessExit = false) {
    try {
      if (this.cluster) {
        await this.cluster.close();
      }
    }
    catch (err) {
      console.error(err)
    }
    if (isProcessExit) {
      process.exit(1);
    }
  }
}