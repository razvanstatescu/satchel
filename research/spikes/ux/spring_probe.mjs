import * as M from "motion";
console.log("has spring:", typeof M.spring);
const keys = Object.keys(M).filter(k => /spring|reduc|MotionConfig|animate$/i.test(k));
console.log(keys.join(", "));
