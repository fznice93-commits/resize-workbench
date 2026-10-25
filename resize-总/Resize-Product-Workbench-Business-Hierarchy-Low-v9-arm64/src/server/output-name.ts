import type{TargetProfile}from"../shared/contracts.js";
export function outputName(profile:TargetProfile,width:number,height:number){const safe=profile==="ip-msg"&&width===1280&&height===720?"-safe50":width===720&&height===1600?"-safe220":"";return`${profile}-${width}x${height}${safe}.png`}
