import{AppError}from"./errors.js";
const MAX_ZIP_BYTES=100*1024*1024;let table:Uint32Array|undefined;
function crcTable(){if(table)return table;table=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0}return table}
function crc32(data:Buffer){let c=0xffffffff,t=crcTable();for(const b of data)c=t[(c^b)&255]!^(c>>>8);return(c^0xffffffff)>>>0}
function u16(value:number){const b=Buffer.alloc(2);b.writeUInt16LE(value);return b}
function u32(value:number){const b=Buffer.alloc(4);b.writeUInt32LE(value>>>0);return b}
export function createStoredZip(files:Array<{name:string;data:Buffer}>){
 if(files.length===0)throw new AppError("BATCH_NO_SUCCESSFUL_RESULTS","BATCH_NO_SUCCESSFUL_RESULTS",409);
 let offset=0,total=0;const locals:Buffer[]=[],centrals:Buffer[]=[];
 for(const file of files){
  if(!/^(?:banner-[0-9]+x[0-9]+-(?:gpt-image-2|gemini-flash-lite|gemini-flash|gemini-pro|model)|other-[0-9]+x[0-9]+(?:-safe220)?)\.png$/.test(file.name))throw new AppError("ZIP_FILENAME_REJECTED");
  const name=Buffer.from(file.name,"utf8"),crc=crc32(file.data),local=Buffer.concat([u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(file.data.length),u32(file.data.length),u16(name.length),u16(0),name,file.data]),central=Buffer.concat([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(file.data.length),u32(file.data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]);
  locals.push(local);centrals.push(central);offset+=local.length;total+=local.length+central.length;if(total>MAX_ZIP_BYTES)throw new AppError("ZIP_TOO_LARGE","ZIP_TOO_LARGE",413);
 }
 const central=Buffer.concat(centrals),end=Buffer.concat([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(central.length),u32(offset),u16(0)]),result=Buffer.concat([...locals,central,end]);if(result.length>MAX_ZIP_BYTES)throw new AppError("ZIP_TOO_LARGE","ZIP_TOO_LARGE",413);return result;
}
