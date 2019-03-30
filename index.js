#!/usr/bin/env node
'use strict';

require('dotenv').config();

let GSI = require("./lib/gsi_varta.js");

if(process.argv.length>2) {
  let instance = new GSI({zip:'69256'});
  let subquery = null;
  if(process.argv.length>3) subquery = process.argv[3];
  instance.meter(process.argv[2],subquery).then(function(meter) {
    console.log(meter);
  });
} else
if(typeof process.env.DEVICE_IP != "undefined") {
  let instance = new GSI({zip:'69256'});
  instance.meter(process.env.DEVICE_IP,null).then(function(meter) {
    console.log(meter);
  });
} else {
  let instance = new GSI({zip:'69256'});
  instance.meters().then(function(meters) {
    console.log(meters);
  });
}
