import{readFile}from"node:fs/promises";import{verify}from"./prompt-lib.js";
const asset=JSON.parse(await readFile("src/server/assets/prompts.json","utf8"))as{version?:string;sourceSha256?:string;manifestSha256?:string;bodies:Record<string,string>};
if(asset.version!=="FROZEN_v1.1"||asset.sourceSha256!=="b6dc8f0b7f1bbba388cb0a2ae2eba3e32866b39fb16a4a775c61c2b1b6269c4a"||asset.manifestSha256!=="0559e79494567b288039d9668f30972232e512f86f7d5770b9069f6ec9f1111d")throw new Error("PROMPT_GATE_FAILED:IDENTITY");
verify(asset.bodies);console.log("prompt gate PASS (internal preview package)");
