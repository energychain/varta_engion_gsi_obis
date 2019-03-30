'use strict';

module.exports = function(config) {
  const http_request = require("request");

  this.config = config;

  const _getReading = function(DEVICE_IP) {
    return new Promise( async function (resolve, reject)  {
      http_request({url:"http://"+DEVICE_IP+"/cgi/energy.js",timeout:1000},function(e,r,b) {
        let meters = [];
        if(typeof b != "undefined") {
            if(b.indexOf("EGrid_AC_DC")>-1) {
              let EGrid_AC_DC = -1;
              let EGrid_DC_AC = -1;
              let EWr_AC_DC = -1;
              let EWr_DC_AC = -1;
              let Chrg_LoadCycles = -1;
              eval(b);
              http_request({url:"http://"+DEVICE_IP+"/cgi/ems_data.js",timeout:1000},function(e,r,b) {
                let Zeit = 0;
                let WR_Data = 0;
                let Charger_Data = 0;
                eval(b);
                setTimeout(function() {
                http_request({url:"http://"+DEVICE_IP+"/cgi/info.js",timeout:1000},function(e,r,b) {
                    b = b.substr(0,b.indexOf("Display_Serial"));
                    let Device_Serial = "";
                    let Device_Description = "";
                    eval(b);
                    meters.push({
                      timeStamp:new Date().getTime(),
                      meterId:Device_Serial+"_EGrid_AC_DC",
                      externalAccount:Device_Description+"_"+Device_Serial+"_EGrid_AC_DC",
                      DEVICE_IP:DEVICE_IP,
                      "1.8.0":EGrid_AC_DC,
                      zip:config.zip
                    });
                    meters.push({
                      timeStamp:new Date().getTime(),
                      meterId:Device_Serial+"_EGrid_DC_AC",
                      externalAccount:Device_Description+"_"+Device_Serial+"_EGrid_DC_AC",
                      DEVICE_IP:DEVICE_IP,
                      "1.8.0":EGrid_DC_AC,
                      zip:config.zip
                    });
                    meters.push({
                      timeStamp:new Date().getTime(),
                      meterId:Device_Serial+"_EWr_DC_AC",
                      externalAccount:Device_Description+"_"+Device_Serial+"EWr_DC_AC",
                      DEVICE_IP:DEVICE_IP,
                      "1.8.0":EGrid_DC_AC,
                      zip:config.zip
                    });
                    meters.push({
                      timeStamp:new Date().getTime(),
                      meterId:Device_Serial+"_EWr_DC_AC",
                      externalAccount:Device_Description+"_"+Device_Serial+"_EWr_DC_AC",
                      DEVICE_IP:DEVICE_IP,
                      "1.8.0":EWr_DC_AC,
                      zip:config.zip
                    });
                    resolve(meters);
                });
                },200);
              });
            }
        } else {
          resolve(meters);
        }
      });
  });
  }

  let meters2 = [];

  const _probeNETWORK = function(DEVICE_IP) {
    return new Promise( async function (resolve, reject)  {
      let network_parts = DEVICE_IP.split('.');
      let network = network_parts[0]+"."+network_parts[1]+"."+network_parts[2]+".";

      let resolves = [];
      for(let i=0; i < 254; i++) {
        const readings = async function() {
          return new Promise( async function (resolve2, reject)  {
            try {
          _getReading(network+""+i).then(async function(meter) {
            try {
             if(meter.length>0) {
                for(let j = 0; j < meter.length; j++) {
                  meter[j] = await _getGSI(meter[j]);
                  meters2.push(meter[j]);
                }
             }
             resolve2(meters2);
           } catch(e) {
             resolve2(meters2);
           }
           });
         } catch(e) {
              resolve2(meters2);
         }
         });
        }
        resolves.push(readings());
      }
      let resolved = 0;
      for(let i=0;i<resolves.length;i++) {
        resolves[i].then(function(x) {
            resolved++;
        });
      }
      let timeout=5;
      const doWait = function() {        
        timeout--;
        if((resolved<resolves.length-1)&&(timeout>0)) {
          setTimeout(doWait,1000);
        } else {
            resolve(meters2);
        }
      }
      doWait();

    });
  }

  const  _getGSI = function(meter) {
    return new Promise( async function (resolve, reject)  {
      let gsidata = {};
      gsidata.zip = meter.zip;
      gsidata.externalAccount = meter.externalAccount;
      gsidata.energy = meter["1.8.0"];
      gsidata.secret = meter.meterId;
      gsidata.timeStamp = meter.timeStamp;
      http_request.post("https://api.corrently.io/core/reading",{form:gsidata},function(e,r,b) {
        let _gsi = JSON.parse(b);
        if(typeof _gsi["account"] != "undefined") meter.account = _gsi["account"];
        if(typeof _gsi["1.8.1"] != "undefined") meter["1.8.1"] = _gsi["1.8.1"]*1;
        if(typeof _gsi["1.8.2"] != "undefined") meter["1.8.2"] = _gsi["1.8.2"]*1;
        resolve(meter);
      })
    });
  }

  this.meters = async function() {
    let parent = this;
    return new Promise( async function (resolve, reject)  {
      var os = require('os');
      var ifaces = os.networkInterfaces();

      Object.keys(ifaces).forEach(async function (ifname) {
        var alias = 0;

        ifaces[ifname].forEach(async function (iface) {
          if ('IPv4' !== iface.family || iface.internal !== false) {
            // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
            return;
          }
          await _probeNETWORK(iface.address).then(function(DEVICE_IP) {
              process.env.DEVICE_IP=DEVICE_IP;
              if(meters2.length > 0 ) {
                resolve(meters2);
              }
          });

          ++alias;
        });
      });
      //resolve(meters2);
    });
  }

  this.meter = async function(query,subquery) {
    let parent = this;
    return new Promise( async function (resolve, reject)  {
      _getReading(query).then(async function(meter) {
         if(meter.length>0) {
           if(subquery != null) {
            for(let j = 0; j < meter.length; j++) {
                if(meter[j].meterId.indexOf(subquery)>-1) {
                  meter[j] = await _getGSI(meter[j]);
                  resolve(meter[j]);
                }
            }
         } else {
           meter[0] = await _getGSI(meter[0]);
           resolve(meter[0]);
         }
       }
     });
    });
  }

  this.REQUIREDCONFIGS = ["zip"];
}
