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
    }
    createInstance() {
        return __awaiter(this, void 0, void 0, function* () {
            const { puppeteerArgs = {}, timeout = 30000, puppeteer = undefined, } = this.options;
            this.cluster = yield puppeteer_cluster_1.Cluster.launch({
                concurrency: puppeteer_cluster_1.Cluster.CONCURRENCY_CONTEXT,
                maxConcurrency: 2,
                timeout,
                puppeteerOptions: Object.assign(Object.assign({}, puppeteerArgs), { headless: true }),
                puppeteer: puppeteer,
            });
            return this;
        });
    }
    render(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { html, encoding, transparent, content, output, selector, type, quality, } = options;
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
                const { output, selector: contentSelector } = content, pageContent = __rest(content, ["output", "selector"]);
                return this.cluster.execute({
                    html,
                    encoding,
                    transparent,
                    output,
                    content: pageContent,
                    selector: contentSelector ? contentSelector : selector,
                    type,
                    quality,
                }, ({ page, data }) => __awaiter(this, void 0, void 0, function* () {
                    const screenshot = yield (0, screenshot_1.makeScreenshot)(page, Object.assign(Object.assign({}, options), { screenshot: new Screenshot_1.Screenshot(data) }));
                    return screenshot;
                }));
            })).then((screenshots) => __awaiter(this, void 0, void 0, function* () {
                return shouldBatch
                    ? screenshots.map(({ buffer }) => buffer)
                    : screenshots[0].buffer;
            })).catch((err) => __awaiter(this, void 0, void 0, function* () {
                console.error(err);
                yield this.cluster.idle();
                yield this.cluster.close();
                delete this.cluster;
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
                process.exit(1);
            }
        });
    }
}
exports.default = nodeHtmlToImage;
