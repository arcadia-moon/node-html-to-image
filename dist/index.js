"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const main_1 = __importDefault(require("./main"));
/*
 * The following code is for interop between CommonJS and ESModule
 */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore
main_1.default.default = main_1.default;
// @ts-ignore
main_1.default.__esModule = true;
module.exports = main_1.default;
