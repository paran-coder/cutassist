import {shiftWindowChunks} from './2026-10-17-caption-window.mjs';
import {speechDecision} from './2026-10-16-speech-gate.mjs';
import {pipeline,env,Tensor} from './vendor/transformers.min.js';
env.allowRemoteModels=false;env.allowLocalModels=true;
env.localModelPath=new URL('./models/',import.meta.url).href;
env.useBrowserCache=false;
env.backends.onnx.wasm.numThreads=1;
env.backends.onnx.wasm.proxy=false;
env.backends.onnx.wasm.wasmPaths=new URL('./vendor/',import.meta.url).href;
let transcriber=null,working=false;
self.onmessage=async({data})=>{if(data.type!=='transcribe'||working)return;working=true;try{
 if(!transcriber){self.postMessage({type:'status',message:'로컬 Base 모델을 메모리에 읽는 중…'});transcriber=await pipeline('automatic-speech-recognition','whisper-base',{device:'wasm',dtype:'q8',progress_callback:p=>{if(p.status==='progress')self.postMessage({type:'model-progress',file:p.file,progress:p.progress});}});}
 self.postMessage({type:'status',message:'한국어 음성을 인식하는 중…'});const started=performance.now();
 const audio=new Float32Array(data.audio),windows=[],chunks=[];let text='';
 // Screen each 30-second window before decoding text, including silent tails.
 for(let offset=0;offset<audio.length;offset+=480000){
  self.postMessage({type:'status',message:`말소리 검사 · ${(offset/16000).toFixed(1)}초 / ${(audio.length/16000).toFixed(1)}초`});const pcm=audio.slice(offset,offset+480000);let energy=0;for(const v of pcm)energy+=v*v;if(Math.sqrt(energy/pcm.length)<.0001){windows.push({start:offset/16000,end:(offset+pcm.length)/16000,allow:false,status:'silent'});continue;}if(pcm.length<4000){windows.push({start:offset/16000,end:(offset+pcm.length)/16000,allow:false,status:'review',reason:'짧은 마지막 구간'});continue;}
  const features=await transcriber.processor(pcm);
  const raw=await transcriber.model({...features,decoder_input_ids:new Tensor('int64',BigInt64Array.from([BigInt(transcriber.model.config.decoder_start_token_id)]),[1,1])});
  const values=raw.logits.data;let max=-Infinity;for(const value of values)max=Math.max(max,value);
  let sum=0;for(const value of values)sum+=Math.exp(value-max);
  const token=transcriber.tokenizer.model.tokens_to_ids.get('<|nocaptions|>');
  const score=Number.isInteger(token)&&token>=0&&token<values.length?Math.exp(values[token]-max)/sum:NaN;
  const decision=speechDecision(score,data.speechMode||'strict');windows.push({start:offset/16000,end:(offset+pcm.length)/16000,score,...decision});
  for(const value of Object.values(raw))value?.dispose?.();
  for(const value of Object.values(features))value?.dispose?.();
  if(!decision.allow)continue;
  const result=await transcriber(pcm,{language:'korean',task:'transcribe',return_timestamps:true,chunk_length_s:30,stride_length_s:5,do_sample:false});
  text+=result.text||'';chunks.push(...shiftWindowChunks(result.chunks||[],offset/16000,pcm.length/16000));
 }
 self.postMessage({type:'result',result:{text,chunks},windows,seconds:(performance.now()-started)/1000});
 }catch(e){self.postMessage({type:'error',message:String(e.message||e)});}finally{working=false;}};
