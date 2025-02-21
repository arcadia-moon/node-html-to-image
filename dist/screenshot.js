"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeScreenshot = void 0;
const handlebars_1 = __importStar(require("handlebars"));
function makeScreenshot(page, { screenshot, beforeScreenshot, waitUntil = "networkidle0", timeout, handlebarsHelpers, viewport, }) {
    return __awaiter(this, void 0, void 0, function* () {
        const defaultTimeout = timeout || 60000;
        let currentPage = page;
        const hasHelpers = handlebarsHelpers && typeof handlebarsHelpers === "object";
        if (hasHelpers) {
            if (Object.values(handlebarsHelpers).every((h) => typeof h === "function")) {
                handlebars_1.default.registerHelper(handlebarsHelpers);
            }
            else {
                throw Error("Some helper is not a valid function");
            }
        }
        // viewport 설정 적용 함수
        const applyViewport = (page) => __awaiter(this, void 0, void 0, function* () {
            if (viewport) {
                yield page.setViewport(Object.assign({}, viewport));
            }
            page.setDefaultTimeout(defaultTimeout);
        });
        // 새 페이지 생성 함수
        const createNewPage = () => __awaiter(this, void 0, void 0, function* () {
            const browser = currentPage.browser();
            if (currentPage !== page) {
                yield currentPage.close();
            }
            currentPage = yield browser.newPage();
            yield applyViewport(currentPage);
            return currentPage;
        });
        try {
            yield applyViewport(currentPage);
            if (screenshot.html) {
                if ((screenshot === null || screenshot === void 0 ? void 0 : screenshot.content) || hasHelpers) {
                    const template = (0, handlebars_1.compile)(screenshot.html);
                    screenshot.setHTML(template(screenshot.content));
                }
                try {
                    yield currentPage.setContent(screenshot.html, {
                        waitUntil,
                        timeout: defaultTimeout
                    });
                }
                catch (error) {
                    console.error('Error setting content, retrying with new page:', error);
                    currentPage = yield createNewPage();
                    yield currentPage.setContent(screenshot.html, {
                        waitUntil,
                        timeout: defaultTimeout
                    });
                }
            }
            else {
                const maxRetries = 3;
                let retryCount = 0;
                while (retryCount < maxRetries) {
                    try {
                        yield currentPage.goto(screenshot.url, {
                            waitUntil: ['networkidle0', 'domcontentloaded'],
                            timeout: defaultTimeout
                        });
                        break;
                    }
                    catch (error) {
                        retryCount++;
                        console.error(`Navigation attempt ${retryCount} failed:`, error);
                        if (retryCount < maxRetries) {
                            currentPage = yield createNewPage();
                        }
                        else {
                            console.error('Failed to navigate after', maxRetries, 'attempts:', error);
                            throw error;
                        }
                        yield new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }
            if (beforeScreenshot && typeof beforeScreenshot === "function") {
                yield beforeScreenshot(currentPage);
            }
            // 스크린샷 찍기 전 요소가 보이는지 확인
            yield currentPage.waitForSelector(screenshot.selector, {
                visible: true,
                timeout: defaultTimeout
            });
            const element = yield currentPage.$(screenshot.selector);
            if (!element) {
                throw Error("No element matches selector: " + screenshot.selector);
            }
            const result = yield element.screenshot({
                path: screenshot.output,
                type: screenshot.type,
                omitBackground: screenshot.transparent,
                encoding: screenshot.encoding,
                quality: screenshot.quality,
            });
            screenshot.setBuffer(Buffer.from(result));
            // 원래 페이지가 아닌 경우 정리
            if (currentPage !== page) {
                yield currentPage.close();
            }
            return screenshot;
        }
        catch (error) {
            if (currentPage !== page) {
                yield currentPage.close();
            }
            throw error;
        }
    });
}
exports.makeScreenshot = makeScreenshot;
function isFunction(f) {
    return f && typeof f === "function";
}
