// Pure-JS JPEG codec, vendored from https://github.com/jpeg-js/jpeg-js (BSD-3 / Apache-2.0).
// See decoder.cjs, encoder.cjs and LICENSE for copyright notices.
const encode=require("./encoder.cjs");
const decode=require("./decoder.cjs");
module.exports={encode,decode};
