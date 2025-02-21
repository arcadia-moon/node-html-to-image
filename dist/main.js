"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_cluster_1 = require("puppeteer-cluster");
const Screenshot_1 = require("./models/Screenshot");
const screenshot_1 = require("./screenshot");
const async_mutex_1 = require("async-mutex");
class nodeHtmlToImage {
    constructor(options = {}) {
        this.cluster = null;
        this.options = {};
        this.mutex = new async_mutex_1.Mutex();
        this.options = options;
        [`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach((eventType) => {
            process.on(eventType, () => {
                this.shutdown(true);
            });
        });
    }
    createInstance() {
        return __awaiter(this, void 0, void 0, function* () {
            const { clusterArgs = {}, puppeteerArgs = {}, maxConcurrency = 1, timeout = 30000, defaultMaxRetries = 0, concurrency = puppeteer_cluster_1.Cluster.CONCURRENCY_CONTEXT, puppeteer = undefined, } = this.options;
            this.cluster = yield puppeteer_cluster_1.Cluster.launch(Object.assign(Object.assign({}, clusterArgs), { concurrency,
                maxConcurrency,
                timeout, puppeteerOptions: Object.assign(Object.assign({}, puppeteerArgs), (typeof puppeteerArgs.headless !== 'undefined' ? { headless: puppeteerArgs.headless } : { headless: true })), puppeteer: puppeteer }));
            return this;
        });
    }
    render(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { html, url, encoding, transparent, content, output, selector, type, quality, maxRetries, blockedURLs = [], viewport, } = options;
            const shouldBatch = Array.isArray(content);
            const contents = shouldBatch ? content : [Object.assign(Object.assign({}, content), { output, selector })];
            if (!this.cluster) {
                yield this.mutex.acquire().then((release) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (!this.cluster) {
                            yield this.createInstance();
                        }
                    }
                    finally {
                        release();
                    }
                }));
            }
            return Promise.all(contents.map((content) => {
                var _a;
                const { output, selector: contentSelector } = content, pageContent = __rest(content, ["output", "selector"]);
                return this.cluster.execute({
                    url,
                    html,
                    encoding,
                    transparent,
                    output,
                    content: pageContent,
                    selector: contentSelector ? contentSelector : selector,
                    type,
                    quality,
                    maxRetries: (_a = maxRetries !== null && maxRetries !== void 0 ? maxRetries : this.options.defaultMaxRetries) !== null && _a !== void 0 ? _a : 3,
                    viewport,
                }, ({ page, data }) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (blockedURLs && Array.isArray(blockedURLs) && blockedURLs.length > 0) {
                            yield page.setRequestInterception(true);
                            const allowedRequest = (req) => !(blockedURLs.findIndex(x => req.url().toUpperCase().includes(x.toUpperCase())) > -1);
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
                        console.log(e);
                    }
                    const screenshot = yield (0, screenshot_1.makeScreenshot)(page, Object.assign(Object.assign({}, options), { screenshot: new Screenshot_1.Screenshot(data) }));
                    return screenshot;
                }));
            })).then((screenshots) => __awaiter(this, void 0, void 0, function* () {
                return shouldBatch
                    ? screenshots.map(({ buffer }) => buffer)
                    : screenshots[0].buffer;
            })).catch((err) => __awaiter(this, void 0, void 0, function* () {
                console.error(err);
                throw err;
            }));
        });
    }
    shutdown(isProcessExit = false) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.cluster) {
                    yield this.cluster.idle();
                    yield this.cluster.close();
                }
            }
            catch (err) {
                console.error(err);
            }
            if (isProcessExit) {
                process.exit();
            }
        });
    }
}
exports.default = nodeHtmlToImage;
