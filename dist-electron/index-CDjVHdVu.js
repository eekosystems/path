"use strict";
const main = require("./main-D49sZiMT.js");
const require$$0 = require("fs");
function _mergeNamespaces(n, m) {
  for (var i = 0; i < m.length; i++) {
    const e = m[i];
    if (typeof e !== "string" && !Array.isArray(e)) {
      for (const k in e) {
        if (k !== "default" && !(k in n)) {
          const d = Object.getOwnPropertyDescriptor(e, k);
          if (d) {
            Object.defineProperty(n, k, d.get ? d : {
              enumerable: true,
              get: () => e[k]
            });
          }
        }
      }
    }
  }
  return Object.freeze(Object.defineProperty(n, Symbol.toStringTag, { value: "Module" }));
}
var pdfParse$1 = { exports: {} };
var PDFJS = null;
function render_page(pageData) {
  let render_options = {
    //replaces all occurrences of whitespace with standard spaces (0x20). The default value is `false`.
    normalizeWhitespace: false,
    //do not attempt to combine same line TextItem's. The default value is `false`.
    disableCombineTextItems: false
  };
  return pageData.getTextContent(render_options).then(function(textContent) {
    let lastY, text = "";
    for (let item of textContent.items) {
      if (lastY == item.transform[5] || !lastY) {
        text += item.str;
      } else {
        text += "\n" + item.str;
      }
      lastY = item.transform[5];
    }
    return text;
  });
}
const DEFAULT_OPTIONS = {
  pagerender: render_page,
  max: 0,
  //check https://mozilla.github.io/pdf.js/getting_started/
  version: "v1.10.100"
};
async function PDF(dataBuffer, options) {
  let ret = {
    numpages: 0,
    numrender: 0,
    info: null,
    metadata: null,
    text: "",
    version: null
  };
  if (typeof options == "undefined") options = DEFAULT_OPTIONS;
  if (typeof options.pagerender != "function") options.pagerender = DEFAULT_OPTIONS.pagerender;
  if (typeof options.max != "number") options.max = DEFAULT_OPTIONS.max;
  if (typeof options.version != "string") options.version = DEFAULT_OPTIONS.version;
  if (options.version == "default") options.version = DEFAULT_OPTIONS.version;
  PDFJS = PDFJS ? PDFJS : main.commonjsRequire(`./pdf.js/${options.version}/build/pdf.js`);
  ret.version = PDFJS.version;
  PDFJS.disableWorker = true;
  let doc = await PDFJS.getDocument(dataBuffer);
  ret.numpages = doc.numPages;
  let metaData = await doc.getMetadata().catch(function(err) {
    return null;
  });
  ret.info = metaData ? metaData.info : null;
  ret.metadata = metaData ? metaData.metadata : null;
  let counter = options.max <= 0 ? doc.numPages : options.max;
  counter = counter > doc.numPages ? doc.numPages : counter;
  ret.text = "";
  for (var i = 1; i <= counter; i++) {
    let pageText = await doc.getPage(i).then((pageData) => options.pagerender(pageData)).catch((err) => {
      debugger;
      return "";
    });
    ret.text = `${ret.text}

${pageText}`;
  }
  ret.numrender = counter;
  doc.destroy();
  return ret;
}
var pdfParse = PDF;
(function(module2) {
  const Fs = require$$0;
  const Pdf = pdfParse;
  module2.exports = Pdf;
  let isDebugMode = !module2.parent;
  if (isDebugMode) {
    let PDF_FILE = "./test/data/05-versions-space.pdf";
    let dataBuffer = Fs.readFileSync(PDF_FILE);
    Pdf(dataBuffer).then(function(data) {
      Fs.writeFileSync(`${PDF_FILE}.txt`, data.text, {
        encoding: "utf8",
        flag: "w"
      });
      debugger;
    }).catch(function(err) {
      debugger;
    });
  }
})(pdfParse$1);
var pdfParseExports = pdfParse$1.exports;
const index = /* @__PURE__ */ main.getDefaultExportFromCjs(pdfParseExports);
const index$1 = /* @__PURE__ */ _mergeNamespaces({
  __proto__: null,
  default: index
}, [pdfParseExports]);
exports.index = index$1;
