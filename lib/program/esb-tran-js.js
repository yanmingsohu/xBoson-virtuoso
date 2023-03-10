/**
 *  Copyright 2023 Jing Yanming
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
var uuid    = require('uuid-zy-lib');
var checker = require('../checker.js');
var tool    = require('../program-tool.js');
var etype   = require('../type-event.js');

var __NAME  = 'esb-tran-js';
var _GLOBAL = {};


var pg_cnf = module.exports = {
  name          : "JavaScript",
  groupName     : "数据转换",
  programID     : "__" + __NAME + "__",
  configPage    : __NAME + '.htm',
  className     : 2,
  icon          : __NAME + '.png',
  disable       : 0,
  parent_max    : 1,
  child_max     : 1,

  checkConfig   : checkConfig,
  createConfig  : createConfig,
  run           : run
};


function createConfig(RCB) {
  var conf = {
    name   : 'JavaScript 脚本',
    js     : '',
    _type  : '',
    _parm_ : {},
  };
  RCB(null, conf);
}


function checkConfig(cf, RCB) {
  var ch = checker(cf);

  ch.mustStr('js');
  var err = ch.getResult();

  if (err != null) {
    return RCB(err);
  }

  var log = [];
  var js = null;

  function _log() {
    for (var i=0; i<arguments.length; ++i) {
      log.push(arguments[i]);
    }
  }

  if (cf._type == 'testjs') {
    try {
      js = tool.createJsbox(cf.js);
      var cols = 0;
      var flow = {};

      for (var n in cf._parm_) {
        flow[n] = cf._parm_[n];
        ++cols;
      }

      js.set('log'        , _log);
      js.set('flow'       , flow);
      js.set('manualOver' , msg_fn('设置为手动结束'));
      js.set('over'       , msg_fn('手动结束被调用'));
      js.set('Buffer'     , Buffer);
      js.set('Global'     , _GLOBAL);

      var code = js.compile();

      RCB(null, { retmessage: '完成,' + (code.run() || ''),
                  log: log.join(', ') || '脚本没有产生日志' } );

      function msg_fn(txt) {
        return function() {
          log.push(txt);
        };
      }

    } catch(err) {
      RCB({ retmessage: '错误, ' + err.message, log: log.join(', ') });
    } finally {
      js && js.free();
    }
    return;
  }

  RCB();
}


function run(interactive, limit) {
  var root    = interactive.getConfig();
  var conf    = root.run_config;
  var recv    = interactive.getData();
  var js      = tool.createJsbox(conf.js);
  var data    = recv.getData();
  var manual  = false;

  js.set('flow'       , data);
  js.set('log'        , _log);
  js.set('manualOver' , manualOver);
  js.set('over'       , _over);
  js.set('Buffer'     , Buffer);
  js.set('Global'     , _GLOBAL);


  try {

    var code = js.compile();
    code.run();

    if (!manual) {
      js.free();
      interactive.runOver(recv);
    }

  } catch(err) {
    interactive.sendError(err, data);
    js.free();
  }


  function manualOver() {
    manual = true;
    interactive.log('JS 脚本不会自动返回');
  }


  function _over() {
    if (manual) {
      js.free();
      interactive.runOver(recv);
    }
  }


  function _log() {
    var msg = [];
    for (var i=0; i<arguments.length; ++i) {
      msg.push(arguments[i]);
    }
    interactive.log('用户日志', msg.join(', '));
  }
}
