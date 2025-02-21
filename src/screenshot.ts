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
  }: MakeScreenshotParams,
) {
  page.setDefaultTimeout(timeout || 60000); // 기본 타임아웃 값 증가
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
  if (screenshot.html) {
    if (screenshot?.content || hasHelpers) {
      const template = compile(screenshot.html);
      screenshot.setHTML(template(screenshot.content));
    }

    try {
      await page.setContent(screenshot.html, { 
        waitUntil,
        timeout: timeout || 60000 
      });
    } catch (error) {
      console.error('Error setting content:', error);
      throw error;
    }
  }
  else {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        await page.goto(screenshot.url, { 
          waitUntil: ['networkidle0', 'domcontentloaded'],
          timeout: timeout || 60000
        });
        break;
      } catch (error) {
        retryCount++;
        if (retryCount === maxRetries) {
          console.error('Failed to navigate after', maxRetries, 'attempts:', error);
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // 재시도 전 1초 대기
      }
    }
  }
  const element = await page.$(screenshot.selector);
  if (!element) {
    throw Error("No element matches selector: " + screenshot.selector);
  }

  if (isFunction(beforeScreenshot)) {
    await beforeScreenshot(page);
  }

  let result;
  try {
    // 스크린샷 찍기 전 요소가 보이는지 확인
    await page.waitForSelector(screenshot.selector, {
      visible: true,
      timeout: timeout || 60000
    });
    
    result = await element.screenshot({
      path: screenshot.output,
      type: screenshot.type,
      omitBackground: screenshot.transparent,
      encoding: screenshot.encoding,
      quality: screenshot.quality,
    });

  } catch (error) {
    console.error('Error taking screenshot:', error);
    throw error;
  }
  screenshot.setBuffer(Buffer.from(result));

  return screenshot;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isFunction(f: any) {
  return f && typeof f === "function";
}
