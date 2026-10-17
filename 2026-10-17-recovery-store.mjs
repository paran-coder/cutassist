const PREFIX='cutassist.recovery.v1:';
function validate(record){if(record?.schema!=='cutassist-recovery-v1'||typeof record.id!=='string'||!Number.isFinite(record.savedAt)||!['cutassist-web-v2','cutassist-web-v3'].includes(record.plan?.schema)||!Array.isArray(record.plan.clips)||!Array.isArray(record.plan.captions)||!Array.isArray(record.plan.boundaries))throw Error('지원하지 않거나 손상된 복구 기록입니다.');return record;}
export class DraftStore{
 constructor(storage,id){this.storage=storage;this.id=id;}
 save(plan){const record=validate({schema:'cutassist-recovery-v1',id:this.id,savedAt:Date.now(),plan});const text=JSON.stringify(record);if(text.length>4*1024*1024)throw Error('편집 설정이 4MB를 초과합니다. JSON으로 저장하세요.');this.storage.setItem(PREFIX+this.id,text);return record;}
 read(id){const value=this.storage.getItem(PREFIX+id);if(!value)throw Error('복구 기록을 찾지 못했습니다.');const record=validate(JSON.parse(value));if(record.id!==id)throw Error('복구 기록 ID가 일치하지 않습니다.');return record;}
 list(){const records=[];for(let i=0;i<this.storage.length;i++){const key=this.storage.key(i);if(key?.startsWith(PREFIX)){try{records.push(this.read(key.slice(PREFIX.length)));}catch{}}}return records.sort((a,b)=>b.savedAt-a.savedAt);}
 remove(id){this.storage.removeItem(PREFIX+id);}
}
