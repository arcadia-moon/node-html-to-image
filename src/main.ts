import { Cluster } from "puppeteer-cluster";
import { Screenshot } from "./models/Screenshot";
import { makeScreenshot } from "./screenshot";
import { Options, ScreenshotParams, constructorOptions } from "./types";
import { Mutex } from 'async-mutex';

export default class nodeHtmlToImage {
  public cluster: Cluster<ScreenshotParams> = null;
  public options: constructorOptions = {};
  private mutex = new Mutex();
  constructor(options: constructorOptions = {}) {
    this.options = options;
    [`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach((eventType) => {
      process.on(eventType, () => {
        this.shutdown(true);
      });
    })
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
      blockedURLs = [],
    } = options;
    const shouldBatch = Array.isArray(content);
    const contents = shouldBatch ? content : [{ ...content, output, selector }];
    if (!this.cluster) {
      await this.mutex.acquire().then(async (release: () => void) => {
        try {
          if (!this.cluster) {
            await this.createInstance();
          }
        } finally {
          release();
        }
      })
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
            try {
              if (blockedURLs && Array.isArray(blockedURLs) && blockedURLs.length > 0) {
                await page.setRequestInterception(true);
                const allowedRequest = (req: any) => !(blockedURLs.findIndex(x => req.url().toUpperCase().includes(x.toUpperCase())) > -1);
                page.on("request", req => {
                  if (allowedRequest(req)) {
                    req.continue();
                  }
                  else {
                    req.abort();
                  }
                });
              }
            }
            catch (e) {
              console.log(e)
            }
            const screenshot = await makeScreenshot(page, {
              ...options,
              screenshot: new Screenshot(data),
            });
            return screenshot;
          },
        );
      })
    ).then(async (screenshots: Array<Screenshot>) => {
      return shouldBatch
        ? screenshots.map(({ buffer }) => buffer)
        : screenshots[0].buffer;
    }).catch(async (err) => {
      console.error(err);
      throw err;
    });
  }

  
  public async shutdown(isProcessExit = false) {
    try {
      if (this.cluster) {
        await this.cluster.idle()
        await this.cluster.close();
      }
    }
    catch (err) {
      console.error(err)
    }
    if (isProcessExit) {
      process.exit();
    }
  }
}