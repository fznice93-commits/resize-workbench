import type{TargetProfile}from"../shared/contracts.js";
export type SizeChoice={id:string;profile:TargetProfile;label:string;width:number;height:number;note?:string;experimental?:boolean;custom?:boolean};
export type SizeSection={title?:string;choices:readonly SizeChoice[]};
export type SizeGroup={id:TargetProfile;title:string;description?:string;sections:readonly SizeSection[]};
const model=(profile:TargetProfile,label:string,note:string):SizeChoice=>({id:profile,profile,label,width:2000,height:300,note});
export const SIZE_GROUPS:readonly SizeGroup[]=Object.freeze([{id:"other",title:"选择本次使用的模型",description:"每次只调用一个模型；失败不会自动切换",sections:[{choices:[
  model("aha","GPT Image 2","直接请求 2000×300 · quality=low · 首轮能力验证"),
  model("mb","Gemini 3.1 Flash Lite Image","低成本实验 · HIGH thinking · 2K"),
  model("ps-opening","Gemini 3.1 Flash Image","原生 8:1 · 1K · 中央裁切为 2000×300"),
  model("ps-banner","Gemini 3 Pro Image","高质量实验 · HIGH thinking · 2K")
]}]}]);
export const SIZE_PRESETS:readonly SizeChoice[]=Object.freeze(SIZE_GROUPS.flatMap(group=>group.sections.flatMap(section=>section.choices)));
export const sizeKey=(size:Pick<SizeChoice,"profile"|"width"|"height">)=>`${size.profile}:${size.width}x${size.height}`;
export function toggleChoice(selected:SizeChoice[],choice:SizeChoice){return selected.some(item=>sizeKey(item)===sizeKey(choice))?[]:[choice]}
export const PROFILE_ZH:Record<TargetProfile,string>={aha:"GPT Image 2",mb:"Gemini 3.1 Flash Lite Image","ps-opening":"Gemini 3.1 Flash Image","ps-banner":"Gemini 3 Pro Image","ip-msg":"GPT Image 2",other:"模型"};
export const JOB_STATUS_ZH:Record<string,string>={WAITING:"等待",READY_FOR_CONFIRMATION:"等待",GENERATING:"生成中",POST_PROCESSING:"后处理中",COMPLETE:"完成",FAILED:"失败",STOPPED:"已停止",INTERRUPTED:"已中断",SKIPPED:"已跳过",DELETED:"已删除"};
export const BATCH_STATUS_ZH:Record<string,string>={READY_FOR_CONFIRMATION:"待确认",RUNNING:"运行中",PAUSED_FAILED:"失败后暂停",PAUSED_STOPPED:"停止后暂停",COMPLETE:"全部完成",PARTIAL_COMPLETE:"部分完成",DELETED:"已删除"};
export const ERROR_ZH:Record<string,string>={AUTHENTICATION_FAILED:"HiModels Key无效、未配置或该模型未授权",INVALID_PROVIDER_REQUEST:"模型拒绝了所选模型的原生画幅请求；不会自动重试",SAFETY_REJECTED:"内容被安全策略拒绝",NETWORK_FAILED:"网络请求失败",TIMED_OUT:"生成超时",STOPPED:"已由用户停止",UNKNOWN_RESPONSE:"Provider响应无法识别",DOWNLOAD_TOO_LARGE:"Provider结果过大",SSRF_BLOCKED:"结果地址被安全策略拦截",IMAGE_DECODE_FAILED:"返回图片无法解码、尺寸不符或不是横图",EDGE_CONTENT_DETECTED:"最终画面左右边缘检测到疑似被裁断的重要内容；不会自动重试",CRITICAL_TEXT_MISMATCH:"最终画面的关键数字、容量、年份或URL与原图不一致；不会自动重试",CRITICAL_TEXT_MISSING:"最终画面疑似缺少原图中的品牌名称或关键文字；不会自动重试",CRITICAL_TEXT_DUPLICATED:"最终画面疑似重复了原图中的关键文字或权益信息；不会自动重试",OCR_VALIDATION_FAILED:"本地文字一致性检查不可用或执行失败；不会调用或重试模型",POST_PROCESSING_FAILED:"图片后处理失败",LOCAL_REVALIDATION_UNAVAILABLE:"当前失败没有可复用的模型中间图，无法仅做本地复检",UNVERIFIED_TARGET_SIZE:"本平台只允许 2000×300",DUPLICATE_TARGET_SIZE:"本次只能选择一个模型",IDEMPOTENCY_CONFLICT:"准备请求已变化，请重新操作",BATCH_SIZE_COUNT_REJECTED:"本次只能选择一个模型"};
