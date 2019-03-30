#!/usr/bin/env node
'use strict';

require('dotenv').config();

let GSI = require("./lib/gsi_varta.js");
let zip = '69256';

let argbase=0;
if(typeof process.env.ZIP != "undefined") {
  zip = process.env.ZIP;
  argbase=-1;
}
if(process.argv.length>2+argbase) {
    zip = process.argv[2+argbase];
}
if(process.argv.length>3) {
  let instance = new GSI({zip:zip});
  let subquery = null;
  if(process.argv.length>4+argbase) subquery = process.argv[4+argbase];
  instance.meter(process.argv[3+argbase],subquery).then(function(meter) {
    console.log(meter);
  });
} else
if(typeof process.env.DEVICE_IP != "undefined") {
  let instance = new GSI({zip:zip});
  instance.meter(process.env.DEVICE_IP,null).then(function(meter) {
    console.log(meter);
  });
} else {
  let instance = new GSI({zip:zip});
  instance.meters().then(function(meters) {
    console.log(meters);
  });
}
