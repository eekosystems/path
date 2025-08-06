"use strict";
const main = require("./main-CQB3AAsi.js");
/*! node-domexception. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> */
if (!globalThis.DOMException) {
  try {
    const { MessageChannel } = require("worker_threads"), port = new MessageChannel().port1, ab = new ArrayBuffer();
    port.postMessage(ab, [ab, ab]);
  } catch (err) {
    err.constructor.name === "DOMException" && (globalThis.DOMException = err.constructor);
  }
}
var nodeDomexception = globalThis.DOMException;
const DOMException = /* @__PURE__ */ main.getDefaultExportFromCjs(nodeDomexception);
exports.DOMException = DOMException;
