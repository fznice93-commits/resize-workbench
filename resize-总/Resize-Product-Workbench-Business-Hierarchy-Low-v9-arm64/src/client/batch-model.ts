import type{TargetProfile}from"../shared/contracts.js";
export type SizeChoice={id:string;profile:TargetProfile;label:string;width:number;height:number;note?:string;experimental?:boolean;custom?:boolean};
export type SizeSection={title?:string;choices:readonly SizeChoice[]};
export type SizeGroup={id:TargetProfile;title:string;description?:string;sections:readonly SizeSection[]};
const choice=(profile:TargetProfile,width:number,height:number,options:Partial<Pick<SizeChoice,"label"|"note"|"experimental">>={}):SizeChoice=>({id:`${profile}-${width}x${height}`,profile,label:options.label??`${width}×${height}`,width,height,note:options.note,experimental:options.experimental});
export const SIZE_GROUPS:readonly SizeGroup[]=Object.freeze([
 {id:"aha",title:"AHA",sections:[{choices:[choice("aha",720,1600,{note:"上下各 220 px 安全区"}),choice("aha",720,1280),choice("aha",900,900),choice("aha",1280,720),choice("aha",2000,300,{note:"实验尺寸 · 生成后需重点检查",experimental:true})]}]},
 {id:"ps-opening",title:"PS",sections:[{title:"PS 开屏",choices:[choice("ps-opening",720,1010),choice("ps-opening",720,1376),choice("ps-opening",720,1456),choice("ps-opening",1080,2115)]},{title:"PS Banner",choices:[choice("ps-banner",985,403),choice("ps-banner",780,470),choice("ps-banner",800,450)]}]},
 {id:"mb",title:"MB",sections:[{choices:[choice("mb",1280,720),choice("mb",720,1280),choice("mb",720,1600,{note:"上下各 220 px 安全区"})]}]},
 {id:"ip-msg",title:"IP-MSG",description:"独立安全区规则",sections:[{choices:[choice("ip-msg",1280,720,{note:"上下各 50 px 安全区"})]}]},
 {id:"other",title:"其他尺寸",sections:[{choices:[choice("other",1024,1024,{label:"1:1"}),choice("other",1200,800,{label:"3:2"}),choice("other",300,400),choice("other",730,300)]}]}
]);
export const SIZE_PRESETS:readonly SizeChoice[]=Object.freeze(SIZE_GROUPS.flatMap(group=>group.sections.flatMap(section=>section.choices)));
export const sizeKey=(size:Pick<SizeChoice,"profile"|"width"|"height">)=>`${size.profile}:${size.width}x${size.height}`;
export function toggleChoice(selected:SizeChoice[],choice:SizeChoice){const key=sizeKey(choice),index=selected.findIndex(item=>sizeKey(item)===key);return index<0?[...selected,choice]:selected.filter((_,itemIndex)=>itemIndex!==index)}
export const PROFILE_ZH:Record<TargetProfile,string>={aha:"AHA",mb:"MB","ps-opening":"PS 开屏","ps-banner":"PS Banner","ip-msg":"IP-MSG",other:"其他尺寸"};
export const JOB_STATUS_ZH:Record<string,string>={WAITING:"等待",READY_FOR_CONFIRMATION:"等待",GENERATING:"生成中",POST_PROCESSING:"后处理中",COMPLETE:"完成",FAILED:"失败",STOPPED:"已停止",INTERRUPTED:"已中断",SKIPPED:"已跳过",DELETED:"已删除"};
export const BATCH_STATUS_ZH:Record<string,string>={READY_FOR_CONFIRMATION:"待确认",RUNNING:"运行中",PAUSED_FAILED:"失败后暂停",PAUSED_STOPPED:"停止后暂停",COMPLETE:"全部完成",PARTIAL_COMPLETE:"部分完成",DELETED:"已删除"};
export const ERROR_ZH:Record<string,string>={AUTHENTICATION_FAILED:"HiModels Key无效或未配置",INVALID_PROVIDER_REQUEST:"Provider拒绝了请求",SAFETY_REJECTED:"内容被安全策略拒绝",NETWORK_FAILED:"网络请求失败",TIMED_OUT:"生成超时",STOPPED:"已由用户停止",UNKNOWN_RESPONSE:"Provider响应无法识别",DOWNLOAD_TOO_LARGE:"Provider结果过大",SSRF_BLOCKED:"结果地址被安全策略拦截",IMAGE_DECODE_FAILED:"返回图片无法解码",POST_PROCESSING_FAILED:"图片后处理失败",UNVERIFIED_TARGET_SIZE:"该尺寸尚未通过Provider验证",DUPLICATE_TARGET_SIZE:"该业务下的尺寸已在选择中",IDEMPOTENCY_CONFLICT:"准备请求已变化，请重新操作",BATCH_SIZE_COUNT_REJECTED:"每个批次最多选择 9 个尺寸"};
