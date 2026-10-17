const enc=new TextEncoder();
const table=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function crc32(bytes){let c=0xffffffff;for(const x of bytes)c=table[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function block(size){const b=new Uint8Array(size);return [b,new DataView(b.buffer)];}
export async function makeZip(entries,onProgress=()=>{}){
 const parts=[],central=[];let offset=0,index=0;
 for(const e of entries){if(!e.name||e.name.startsWith('/')||e.name.split('/').includes('..'))throw Error('잘못된 ZIP 경로');const name=enc.encode(e.name),data=e.data instanceof Blob?new Uint8Array(await e.data.arrayBuffer()):typeof e.data==='string'?enc.encode(e.data):e.data;if(data.length>0xffffffff||offset+data.length>0xffffffff)throw Error('ZIP 크기 제한');const crc=crc32(data),[h,v]=block(30);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);parts.push(h,name,data);const [c,w]=block(46);w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint16(8,0x800,true);w.setUint32(16,crc,true);w.setUint32(20,data.length,true);w.setUint32(24,data.length,true);w.setUint16(28,name.length,true);w.setUint32(42,offset,true);central.push(c,name);offset+=h.length+name.length+data.length;onProgress(++index,entries.length);}
 const length=central.reduce((n,b)=>n+b.length,0),[end,v]=block(22);v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,length,true);v.setUint32(16,offset,true);return new Blob([...parts,...central,end],{type:'application/zip'});
}
export function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
