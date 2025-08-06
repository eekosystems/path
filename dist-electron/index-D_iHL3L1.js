"use strict";
const main = require("./main-C1PQLiAF.js");
const require$$0 = require("net");
const require$$1$1 = require("tls");
const require$$2 = require("assert");
const http$1 = require("http");
const require$$1 = require("https");
const Url = require("url");
var dist$1 = {};
var dist = {};
var helpers = {};
var __createBinding$1 = main.commonjsGlobal && main.commonjsGlobal.__createBinding || (Object.create ? function(o, m, k, k2) {
  if (k2 === void 0) k2 = k;
  var desc = Object.getOwnPropertyDescriptor(m, k);
  if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
    desc = { enumerable: true, get: function() {
      return m[k];
    } };
  }
  Object.defineProperty(o, k2, desc);
} : function(o, m, k, k2) {
  if (k2 === void 0) k2 = k;
  o[k2] = m[k];
});
var __setModuleDefault$1 = main.commonjsGlobal && main.commonjsGlobal.__setModuleDefault || (Object.create ? function(o, v) {
  Object.defineProperty(o, "default", { enumerable: true, value: v });
} : function(o, v) {
  o["default"] = v;
});
var __importStar$1 = main.commonjsGlobal && main.commonjsGlobal.__importStar || function(mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) {
    for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding$1(result, mod, k);
  }
  __setModuleDefault$1(result, mod);
  return result;
};
Object.defineProperty(helpers, "__esModule", { value: true });
helpers.req = helpers.json = helpers.toBuffer = void 0;
const http = __importStar$1(http$1);
const https = __importStar$1(require$$1);
async function toBuffer(stream) {
  let length = 0;
  const chunks = [];
  for await (const chunk of stream) {
    length += chunk.length;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, length);
}
helpers.toBuffer = toBuffer;
async function json(stream) {
  const buf = await toBuffer(stream);
  const str = buf.toString("utf8");
  try {
    return JSON.parse(str);
  } catch (_err) {
    const err = _err;
    err.message += ` (input: ${str})`;
    throw err;
  }
}
helpers.json = json;
function req(url, opts = {}) {
  const href = typeof url === "string" ? url : url.href;
  const req2 = (href.startsWith("https:") ? https : http).request(url, opts);
  const promise = new Promise((resolve, reject) => {
    req2.once("response", resolve).once("error", reject).end();
  });
  req2.then = promise.then.bind(promise);
  return req2;
}
helpers.req = req;
(function(exports2) {
  var __createBinding2 = main.commonjsGlobal && main.commonjsGlobal.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === void 0) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === void 0) k2 = k;
    o[k2] = m[k];
  });
  var __setModuleDefault2 = main.commonjsGlobal && main.commonjsGlobal.__setModuleDefault || (Object.create ? function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
  } : function(o, v) {
    o["default"] = v;
  });
  var __importStar2 = main.commonjsGlobal && main.commonjsGlobal.__importStar || function(mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) {
      for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding2(result, mod, k);
    }
    __setModuleDefault2(result, mod);
    return result;
  };
  var __exportStar = main.commonjsGlobal && main.commonjsGlobal.__exportStar || function(m, exports3) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding2(exports3, m, p);
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.Agent = void 0;
  const net2 = __importStar2(require$$0);
  const http2 = __importStar2(http$1);
  const https_1 = require$$1;
  __exportStar(helpers, exports2);
  const INTERNAL = Symbol("AgentBaseInternalState");
  class Agent extends http2.Agent {
    constructor(opts) {
      super(opts);
      this[INTERNAL] = {};
    }
    /**
     * Determine whether this is an `http` or `https` request.
     */
    isSecureEndpoint(options) {
      if (options) {
        if (typeof options.secureEndpoint === "boolean") {
          return options.secureEndpoint;
        }
        if (typeof options.protocol === "string") {
          return options.protocol === "https:";
        }
      }
      const { stack } = new Error();
      if (typeof stack !== "string")
        return false;
      return stack.split("\n").some((l) => l.indexOf("(https.js:") !== -1 || l.indexOf("node:https:") !== -1);
    }
    // In order to support async signatures in `connect()` and Node's native
    // connection pooling in `http.Agent`, the array of sockets for each origin
    // has to be updated synchronously. This is so the length of the array is
    // accurate when `addRequest()` is next called. We achieve this by creating a
    // fake socket and adding it to `sockets[origin]` and incrementing
    // `totalSocketCount`.
    incrementSockets(name) {
      if (this.maxSockets === Infinity && this.maxTotalSockets === Infinity) {
        return null;
      }
      if (!this.sockets[name]) {
        this.sockets[name] = [];
      }
      const fakeSocket = new net2.Socket({ writable: false });
      this.sockets[name].push(fakeSocket);
      this.totalSocketCount++;
      return fakeSocket;
    }
    decrementSockets(name, socket) {
      if (!this.sockets[name] || socket === null) {
        return;
      }
      const sockets = this.sockets[name];
      const index2 = sockets.indexOf(socket);
      if (index2 !== -1) {
        sockets.splice(index2, 1);
        this.totalSocketCount--;
        if (sockets.length === 0) {
          delete this.sockets[name];
        }
      }
    }
    // In order to properly update the socket pool, we need to call `getName()` on
    // the core `https.Agent` if it is a secureEndpoint.
    getName(options) {
      const secureEndpoint = this.isSecureEndpoint(options);
      if (secureEndpoint) {
        return https_1.Agent.prototype.getName.call(this, options);
      }
      return super.getName(options);
    }
    createSocket(req2, options, cb) {
      const connectOpts = {
        ...options,
        secureEndpoint: this.isSecureEndpoint(options)
      };
      const name = this.getName(connectOpts);
      const fakeSocket = this.incrementSockets(name);
      Promise.resolve().then(() => this.connect(req2, connectOpts)).then((socket) => {
        this.decrementSockets(name, fakeSocket);
        if (socket instanceof http2.Agent) {
          try {
            return socket.addRequest(req2, connectOpts);
          } catch (err) {
            return cb(err);
          }
        }
        this[INTERNAL].currentSocket = socket;
        super.createSocket(req2, options, cb);
      }, (err) => {
        this.decrementSockets(name, fakeSocket);
        cb(err);
      });
    }
    createConnection() {
      const socket = this[INTERNAL].currentSocket;
      this[INTERNAL].currentSocket = void 0;
      if (!socket) {
        throw new Error("No socket was returned in the `connect()` function");
      }
      return socket;
    }
    get defaultPort() {
      return this[INTERNAL].defaultPort ?? (this.protocol === "https:" ? 443 : 80);
    }
    set defaultPort(v) {
      if (this[INTERNAL]) {
        this[INTERNAL].defaultPort = v;
      }
    }
    get protocol() {
      return this[INTERNAL].protocol ?? (this.isSecureEndpoint() ? "https:" : "http:");
    }
    set protocol(v) {
      if (this[INTERNAL]) {
        this[INTERNAL].protocol = v;
      }
    }
  }
  exports2.Agent = Agent;
})(dist);
var parseProxyResponse$1 = {};
var __importDefault$1 = main.commonjsGlobal && main.commonjsGlobal.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(parseProxyResponse$1, "__esModule", { value: true });
parseProxyResponse$1.parseProxyResponse = void 0;
const debug_1$1 = __importDefault$1(main.srcExports);
const debug$1 = (0, debug_1$1.default)("https-proxy-agent:parse-proxy-response");
function parseProxyResponse(socket) {
  return new Promise((resolve, reject) => {
    let buffersLength = 0;
    const buffers = [];
    function read() {
      const b = socket.read();
      if (b)
        ondata(b);
      else
        socket.once("readable", read);
    }
    function cleanup() {
      socket.removeListener("end", onend);
      socket.removeListener("error", onerror);
      socket.removeListener("readable", read);
    }
    function onend() {
      cleanup();
      debug$1("onend");
      reject(new Error("Proxy connection ended before receiving CONNECT response"));
    }
    function onerror(err) {
      cleanup();
      debug$1("onerror %o", err);
      reject(err);
    }
    function ondata(b) {
      buffers.push(b);
      buffersLength += b.length;
      const buffered = Buffer.concat(buffers, buffersLength);
      const endOfHeaders = buffered.indexOf("\r\n\r\n");
      if (endOfHeaders === -1) {
        debug$1("have not received end of HTTP headers yet...");
        read();
        return;
      }
      const headerParts = buffered.slice(0, endOfHeaders).toString("ascii").split("\r\n");
      const firstLine = headerParts.shift();
      if (!firstLine) {
        socket.destroy();
        return reject(new Error("No header received from proxy CONNECT response"));
      }
      const firstLineParts = firstLine.split(" ");
      const statusCode = +firstLineParts[1];
      const statusText = firstLineParts.slice(2).join(" ");
      const headers = {};
      for (const header of headerParts) {
        if (!header)
          continue;
        const firstColon = header.indexOf(":");
        if (firstColon === -1) {
          socket.destroy();
          return reject(new Error(`Invalid header from proxy CONNECT response: "${header}"`));
        }
        const key = header.slice(0, firstColon).toLowerCase();
        const value = header.slice(firstColon + 1).trimStart();
        const current = headers[key];
        if (typeof current === "string") {
          headers[key] = [current, value];
        } else if (Array.isArray(current)) {
          current.push(value);
        } else {
          headers[key] = value;
        }
      }
      debug$1("got proxy server response: %o %o", firstLine, headers);
      cleanup();
      resolve({
        connect: {
          statusCode,
          statusText,
          headers
        },
        buffered
      });
    }
    socket.on("error", onerror);
    socket.on("end", onend);
    read();
  });
}
parseProxyResponse$1.parseProxyResponse = parseProxyResponse;
var __createBinding = main.commonjsGlobal && main.commonjsGlobal.__createBinding || (Object.create ? function(o, m, k, k2) {
  if (k2 === void 0) k2 = k;
  var desc = Object.getOwnPropertyDescriptor(m, k);
  if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
    desc = { enumerable: true, get: function() {
      return m[k];
    } };
  }
  Object.defineProperty(o, k2, desc);
} : function(o, m, k, k2) {
  if (k2 === void 0) k2 = k;
  o[k2] = m[k];
});
var __setModuleDefault = main.commonjsGlobal && main.commonjsGlobal.__setModuleDefault || (Object.create ? function(o, v) {
  Object.defineProperty(o, "default", { enumerable: true, value: v });
} : function(o, v) {
  o["default"] = v;
});
var __importStar = main.commonjsGlobal && main.commonjsGlobal.__importStar || function(mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) {
    for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
  }
  __setModuleDefault(result, mod);
  return result;
};
var __importDefault = main.commonjsGlobal && main.commonjsGlobal.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(dist$1, "__esModule", { value: true });
var HttpsProxyAgent_1 = dist$1.HttpsProxyAgent = void 0;
const net = __importStar(require$$0);
const tls = __importStar(require$$1$1);
const assert_1 = __importDefault(require$$2);
const debug_1 = __importDefault(main.srcExports);
const agent_base_1 = dist;
const url_1 = Url;
const parse_proxy_response_1 = parseProxyResponse$1;
const debug = (0, debug_1.default)("https-proxy-agent");
const setServernameFromNonIpHost = (options) => {
  if (options.servername === void 0 && options.host && !net.isIP(options.host)) {
    return {
      ...options,
      servername: options.host
    };
  }
  return options;
};
class HttpsProxyAgent extends agent_base_1.Agent {
  constructor(proxy, opts) {
    super(opts);
    this.options = { path: void 0 };
    this.proxy = typeof proxy === "string" ? new url_1.URL(proxy) : proxy;
    this.proxyHeaders = (opts == null ? void 0 : opts.headers) ?? {};
    debug("Creating new HttpsProxyAgent instance: %o", this.proxy.href);
    const host = (this.proxy.hostname || this.proxy.host).replace(/^\[|\]$/g, "");
    const port = this.proxy.port ? parseInt(this.proxy.port, 10) : this.proxy.protocol === "https:" ? 443 : 80;
    this.connectOpts = {
      // Attempt to negotiate http/1.1 for proxy servers that support http/2
      ALPNProtocols: ["http/1.1"],
      ...opts ? omit(opts, "headers") : null,
      host,
      port
    };
  }
  /**
   * Called when the node-core HTTP client library is creating a
   * new HTTP request.
   */
  async connect(req2, opts) {
    const { proxy } = this;
    if (!opts.host) {
      throw new TypeError('No "host" provided');
    }
    let socket;
    if (proxy.protocol === "https:") {
      debug("Creating `tls.Socket`: %o", this.connectOpts);
      socket = tls.connect(setServernameFromNonIpHost(this.connectOpts));
    } else {
      debug("Creating `net.Socket`: %o", this.connectOpts);
      socket = net.connect(this.connectOpts);
    }
    const headers = typeof this.proxyHeaders === "function" ? this.proxyHeaders() : { ...this.proxyHeaders };
    const host = net.isIPv6(opts.host) ? `[${opts.host}]` : opts.host;
    let payload = `CONNECT ${host}:${opts.port} HTTP/1.1\r
`;
    if (proxy.username || proxy.password) {
      const auth = `${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`;
      headers["Proxy-Authorization"] = `Basic ${Buffer.from(auth).toString("base64")}`;
    }
    headers.Host = `${host}:${opts.port}`;
    if (!headers["Proxy-Connection"]) {
      headers["Proxy-Connection"] = this.keepAlive ? "Keep-Alive" : "close";
    }
    for (const name of Object.keys(headers)) {
      payload += `${name}: ${headers[name]}\r
`;
    }
    const proxyResponsePromise = (0, parse_proxy_response_1.parseProxyResponse)(socket);
    socket.write(`${payload}\r
`);
    const { connect, buffered } = await proxyResponsePromise;
    req2.emit("proxyConnect", connect);
    this.emit("proxyConnect", connect, req2);
    if (connect.statusCode === 200) {
      req2.once("socket", resume);
      if (opts.secureEndpoint) {
        debug("Upgrading socket connection to TLS");
        return tls.connect({
          ...omit(setServernameFromNonIpHost(opts), "host", "path", "port"),
          socket
        });
      }
      return socket;
    }
    socket.destroy();
    const fakeSocket = new net.Socket({ writable: false });
    fakeSocket.readable = true;
    req2.once("socket", (s) => {
      debug("Replaying proxy buffer for failed request");
      (0, assert_1.default)(s.listenerCount("data") > 0);
      s.push(buffered);
      s.push(null);
    });
    return fakeSocket;
  }
}
HttpsProxyAgent.protocols = ["http", "https"];
HttpsProxyAgent_1 = dist$1.HttpsProxyAgent = HttpsProxyAgent;
function resume(socket) {
  socket.resume();
}
function omit(obj, ...keys) {
  const ret = {};
  let key;
  for (key in obj) {
    if (!keys.includes(key)) {
      ret[key] = obj[key];
    }
  }
  return ret;
}
const index = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get HttpsProxyAgent() {
    return HttpsProxyAgent_1;
  },
  default: dist$1
}, Symbol.toStringTag, { value: "Module" }));
exports.index = index;
