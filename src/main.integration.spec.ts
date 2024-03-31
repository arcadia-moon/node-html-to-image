import { existsSync, mkdirSync, readdirSync } from "fs";
import puppeteer from "puppeteer";
import puppeteerCore from "puppeteer-core";
import rimraf from "rimraf";
import { createWorker } from "tesseract.js";

import nodeHtmlToImage from "./main";

describe("node-html-to-image", () => {
  let mockExit;
  let mockConsoleErr;
  const originalConsoleError = console.error;
  beforeEach(() => {
    rimraf.sync("./generated");
    mkdirSync("./generated");
    mockExit = jest.spyOn(process, "exit").mockImplementation((number) => {
      throw new Error("process.exit: " + number);
    });
    mockConsoleErr = jest
      .spyOn(console, "error")
      .mockImplementation((value) => originalConsoleError(value));
  });

  afterEach(() => {
    mockExit.mockRestore();
    mockConsoleErr.mockRestore();
  });

  afterAll(() => {
    rimraf.sync("./generated");
  });
  describe("error", () => {
    it("should stop the program properly", async () => {
      /* eslint-disable @typescript-eslint/ban-ts-comment */
      await expect(async () => {
        const instance = await new nodeHtmlToImage().createInstance();
        await instance.render({
          html: "<html></html>",
          type: "jpeg",
          // @ts-ignore
          quality: "wrong value",
        }).catch(() => {
          return instance.shutdown(true)
        });
      }).rejects.toThrow();

      expect(mockExit).toHaveBeenCalledWith(1);
      /* eslint-enable @typescript-eslint/ban-ts-comment */
    });
  });

  describe("single image", () => {
    it("should generate output file", async () => {
      const instance = await new nodeHtmlToImage().createInstance()
      await instance.render({
        output: "./generated/image.png",
        html: "<html></html>",
      });
      await instance.shutdown();

      expect(existsSync("./generated/image.png")).toBe(true);
    });

    it("should return a buffer", async () => {
      const instance = await new nodeHtmlToImage().createInstance()
      const result = await instance.render({
        html: "<html></html>",
      });
      await instance.shutdown();
      expect(result).toBeInstanceOf(Buffer);
    });

    it("should throw an error if html is not provided", async () => {
      await expect(async () => {
        const instance = await new nodeHtmlToImage().createInstance()
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await instance.render({
          output: "./generated/image.png",
        });
        await instance.shutdown();
      }).rejects.toThrow();
      expect(mockConsoleErr).toHaveBeenCalledWith(
        new Error("You must provide an html property.")
      );
    });

    it("should throw timeout error", async () => {
      await expect(async () => {
        const instance = await new nodeHtmlToImage({
          timeout: 500
        }).createInstance()
        await instance.render({
          html: "<html></html>"
        });
        await instance.shutdown();
      }).rejects.toThrow();
      expect(mockConsoleErr).toHaveBeenCalledWith(
        new Error("Timeout hit: 500")
      );
    });

    it("should generate an jpeg image", async () => {
      const instance = await new nodeHtmlToImage().createInstance();
      await instance.render({
        output: "./generated/image.jpg",
        html: "<html></html>",
        type: "jpeg",
      });
      await instance.shutdown();
      expect(existsSync("./generated/image.jpg")).toBe(true);
    });

    it("should put html in output file", async () => {
      const instance = await new nodeHtmlToImage().createInstance();
      await instance.render({
        output: "./generated/image.png",
        html: "<html><body>Hello world!</body></html>",
      });
      await instance.shutdown();
      const text = await getTextFromImage("./generated/image.png");
      expect(text.trim()).toBe("Hello world!");
    });

    it("should use handlebars to customize content", async () => {
      const instance = await new nodeHtmlToImage().createInstance();
      await instance.render({
        output: "./generated/image.png",
        html: "<html><body>Hello {{name}}!</body></html>",
        content: { name: "Yvonnick" },
      });
      await instance.shutdown();
      const text = await getTextFromImage("./generated/image.png");
      expect(text.trim()).toBe("Hello Yvonnick!");
    });

    it("should create selected element image", async () => {
      const instance = await new nodeHtmlToImage().createInstance();
      await instance.render({
        output: "./generated/image.png",
        html: '<html><body>Hello <div id="section">{{name}}!</div></body></html>',
        content: { name: "Sangwoo" },
        selector: "div#section",
      });
      await instance.shutdown();
      const text = await getTextFromImage("./generated/image.png");
      expect(text.trim()).toBe("Sangwoo!");
    });
  });

  describe("batch", () => {
    it("should create two images", async () => {
      const instance = await new nodeHtmlToImage().createInstance();
      await instance.render({
        type: "png",
        quality: 300,
        html: "<html><body>Hello {{name}}!</body></html>",
        content: [
          { name: "Yvonnick", output: "./generated/image1.png" },
          { name: "World", output: "./generated/image2.png" },
        ],
      });
      await instance.shutdown();
      const text1 = await getTextFromImage("./generated/image1.png");
      expect(text1.trim()).toBe("Hello Yvonnick!");

      const text2 = await getTextFromImage("./generated/image2.png");
      expect(text2.trim()).toBe("Hello World!");
    });

    it("should return two buffers", async () => {
      const instance = await new nodeHtmlToImage().createInstance();
      const result = await instance.render({
        type: "png",
        quality: 300,
        html: "<html><body>Hello {{name}}!</body></html>",
        content: [{ name: "Yvonnick" }, { name: "World" }],
      });
      await instance.shutdown();
      expect(result?.[0]).toBeInstanceOf(Buffer);
      expect(result?.[1]).toBeInstanceOf(Buffer);
    });

    it("should create selected elements images", async () => {
      const instance = await new nodeHtmlToImage().createInstance();
      await instance.render({
        html: '<html><body>Hello <div id="section1">{{name}}!</div><div id="section2">World!</div></body></html>',
        content: [
          {
            name: "Sangwoo",
            output: "./generated/image1.png",
            selector: "div#section1",
          },
          { output: "./generated/image2.png", selector: "div#section2" },
        ],
      });
      await instance.shutdown();
      const text1 = await getTextFromImage("./generated/image1.png");
      expect(text1.trim()).toBe("Sangwoo!");
      const text2 = await getTextFromImage("./generated/image2.png");
      expect(text2.trim()).toBe("World!");
    });

    it.skip("should handle mass volume well", async () => {
      jest.setTimeout(60000 * 60);
      expect.hasAssertions();
      const NUMBER_OF_IMAGES = 2000;
      const content = Array.from(Array(NUMBER_OF_IMAGES), (_, i) => ({
        name: i,
        output: `./generated/${i}.jpg`,
      }));

      const instance = await new nodeHtmlToImage().createInstance();
      await instance.render({
        type: "png",
        quality: 300,
        html: "<html><body>Hello {{name}}!</body></html>",
        content,
      });
      await instance.shutdown();
      expect(readdirSync("./generated")).toHaveLength(NUMBER_OF_IMAGES);
    });
  });
  describe("different instance", () => {
    it("should pass puppeteer instance and generate image", async () => {
      const executablePath = puppeteer.executablePath();

      const instance = await new nodeHtmlToImage({
        puppeteerArgs: { executablePath },
        puppeteer: puppeteerCore,
      }).createInstance();
      await instance.render({
        output: "./generated/image.png",
        html: "<html></html>",
      });
      await instance.shutdown();
      expect(existsSync("./generated/image.png")).toBe(true);
    });

    it("should throw an error if executablePath is not provided", async () => {
      await expect(async () => {
        const instance = await new nodeHtmlToImage({
          puppeteer: puppeteerCore,
        }).createInstance();
        await instance.render({
          output: "./generated/image.png",
          html: "<html></html>"
        });
        await instance.shutdown();
      }).rejects.toThrow();
    });
  });
});

async function getTextFromImage(path) {
  const worker = await createWorker();
  await worker.loadLanguage("eng");
  await worker.initialize("eng");

  const {
    data: { text },
  } = await worker.recognize(path);
  await worker.terminate();

  return text;
}
