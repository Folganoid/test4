import fs from "fs";
import AppConfig from "../AppConfig.js";

export default class Logger {
  newFile(httpLogFile) {
    fs.writeFile(
      httpLogFile,
      `Time\tMethod\tURL\tBenchmark\tResponse code\tResponse message\tHeaders\tBody\tResponse Headers\tRespoonse Boby\n`,
      function (err) {
        if (err) throw err;
        console.log(`HTTP request-respone logfile "${httpLogFile}" created...`);
      }
    );
  }

  saveLog(req, res, next) {
    try {
      if (!req || !res) next();
      const { rawHeaders, method, url } = req;
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
        try {
          const bodyRes = Buffer.concat(chunks).toString("utf8");

          // const reqLog = {
          //   method,
          //   url,
          //   benchmark: (new Date() - startTime) / 1000 + " sec",
          //   rawHeaders,
          //   body: req.body,
          //   response: {
          //     statusCode,
          //     statusMessage,
          //     headers,
          //     body: bodyRes,
          //   },
          // };

          let logStr = `${startTime.toISOString()}\t`;
          logStr += `${method}\t`;
          logStr += `${url}\t`;
          logStr += (new Date() - startTime) / 1000 + " sec\t";
          logStr += `${statusCode}\t`;
          logStr += `${statusMessage || ""}\t`;
          logStr += `${JSON.stringify(rawHeaders)}\t`;
          logStr += `${JSON.stringify(req.body)}\t`;
          logStr += `${JSON.stringify(headers)}\t`;
          logStr += `${bodyRes}\n`;

          fs.appendFile(cfg.httpLogFile, logStr, function (err) {
            if (err) throw err;
          });
        } catch (e) {
          //pass saving
        }
        oldEnd.apply(res, arguments);
      };
      next();
    } catch (e) {
      console.log(e);
      next();
    }
  }
}
