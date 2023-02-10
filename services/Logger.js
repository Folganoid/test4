import fs from "fs";
import AppConfig from "../AppConfig.js";

export default class Logger {
  saveLog(req, res, next) {
    try {
      const { rawHeaders, method, socket, url } = req;
      const { remoteAddress, remoteFamily } = socket;
      const { statusCode, statusMessage } = res;
      const headers = res.getHeaders();
      const startTime = new Date();
      const oldWrite = res.write;
      const oldEnd = res.end;
      const chunks = [];
      const appcfg = new AppConfig();
      const cfg = appcfg.getConfig();

      res.write = function (chunk) {
        chunks.push(chunk);
        return oldWrite.apply(res, arguments);
      };

      res.end = function (chunk) {
        if (chunk) chunks.push(chunk);
        const bodyRes = Buffer.concat(chunks).toString("utf8");

        const reqLog = JSON.stringify({
          method,
          url,
          benchmark: (new Date() - startTime) / 1000 + " sec",
          rawHeaders,
          body: req.body,
          remoteAddress,
          remoteFamily,
          response: {
            statusCode,
            statusMessage,
            headers,
            body: bodyRes,
          },
        });

        const logStr = startTime.toString() + ": " + reqLog + "\n";
        fs.appendFile(cfg.httpLogFile, logStr, function (err) {
          if (err) throw err;
        });
        oldEnd.apply(res, arguments);
      };
      next();
    } catch (e) {
      console.log(e);
      next();
    }
  }
}
