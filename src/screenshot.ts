import { Page } from "puppeteer";
import handlebars, { compile } from "handlebars";

import { MakeScreenshotParams } from "./types";

export async function makeScreenshot(
  page: Page,
  {
    screenshot,
    beforeScreenshot,
    waitUntil = "networkidle0",
    timeout,
    handlebarsHelpers,
    viewport,
  }: MakeScreenshotParams,
) {
  const defaultTimeout = timeout || 60000;
  let currentPage = page;

  const hasHelpers = handlebarsHelpers && typeof handlebarsHelpers === "object";
  if (hasHelpers) {
    if (
      Object.values(handlebarsHelpers).every((h) => typeof h === "function")
    ) {
      handlebars.registerHelper(handlebarsHelpers);
    } else {
      throw Error("Some helper is not a valid function");
    }
  }

  // viewport 설정 적용 함수
  const applyViewport = async (page: Page) => {
    if (viewport) {
      await page.setViewport({
        ...viewport
      });
    }
    page.setDefaultTimeout(defaultTimeout);
  };

  // 새 페이지 생성 함수
  const createNewPage = async () => {
    const browser = currentPage.browser();
    if (currentPage !== page) {
      await currentPage.close();
    }
    currentPage = await browser.newPage();
    await applyViewport(currentPage);
    return currentPage;
  };

  try {
    await applyViewport(currentPage);

    if (screenshot.html) {
      if (screenshot?.content || hasHelpers) {
        const template = compile(screenshot.html);
        screenshot.setHTML(template(screenshot.content));
      }

      try {
        await currentPage.setContent(screenshot.html, { 
          waitUntil,
          timeout: defaultTimeout 
        });
      } catch (error) {
        console.error('Error setting content, retrying with new page:', error);
        currentPage = await createNewPage();
        await currentPage.setContent(screenshot.html, { 
          waitUntil,
          timeout: defaultTimeout 
        });
      }
    } else {
      const maxRetries = 3;
      let retryCount = 0;
      
      while (retryCount < maxRetries) {
        try {
          await currentPage.goto(screenshot.url, { 
            waitUntil: ['networkidle0', 'domcontentloaded'],
            timeout: defaultTimeout
          });
          break;
        } catch (error) {
          retryCount++;
          console.error(`Navigation attempt ${retryCount} failed:`, error);

          if (retryCount < maxRetries) {
            currentPage = await createNewPage();
          } else {
            console.error('Failed to navigate after', maxRetries, 'attempts:', error);
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    if (beforeScreenshot && typeof beforeScreenshot === "function") {
      await beforeScreenshot(currentPage);
    }

    // 스크린샷 찍기 전 요소가 보이는지 확인
    await currentPage.waitForSelector(screenshot.selector, {
      visible: true,
      timeout: defaultTimeout
    });

    const element = await currentPage.$(screenshot.selector);
    if (!element) {
      throw Error("No element matches selector: " + screenshot.selector);
    }

    const result = await element.screenshot({
      path: screenshot.output,
      type: screenshot.type,
      omitBackground: screenshot.transparent,
      encoding: screenshot.encoding,
      quality: screenshot.quality,
    });

    screenshot.setBuffer(Buffer.from(result));

    // 원래 페이지가 아닌 경우 정리
    if (currentPage !== page) {
      await currentPage.close();
    }

    return screenshot;
  } catch (error) {
    if (currentPage !== page) {
      await currentPage.close();
    }
    throw error;
  }
}

function isFunction(f: any) {
  return f && typeof f === "function";
}
