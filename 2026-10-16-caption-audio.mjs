export async function decodeClipAudio(clip){
 if(clip.file.size>256*1024*1024)throw Error('자동 자막은 파일당 256MiB 이하를 지원합니다.');
 if(clip.duration>600)throw Error('이 버전의 자동 자막은 원본 길이 10분 이하 영상만 지원합니다.');
 const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)throw Error('이 브라우저는 오디오 디코딩을 지원하지 않습니다.');
 const ctx=new Context();try{
 const audio=await ctx.decodeAudioData(await clip.file.arrayBuffer());
 if(!audio.numberOfChannels)throw Error('오디오 트랙이 없습니다.');
 const from=Math.floor(clip.in*audio.sampleRate),to=Math.min(audio.length,Math.ceil(clip.out*audio.sampleRate));if(to<=from)throw Error('선택 구간에 오디오가 없습니다.');
 const mono=new Float32Array(to-from);for(let ch=0;ch<audio.numberOfChannels;ch++){const channel=audio.getChannelData(ch);for(let i=0;i<mono.length;i++)mono[i]+=channel[from+i]/audio.numberOfChannels;}
 const offline=new OfflineAudioContext(1,Math.max(1,Math.ceil(mono.length/audio.sampleRate*16000)),16000),buffer=offline.createBuffer(1,mono.length,audio.sampleRate);buffer.copyToChannel(mono,0);const source=offline.createBufferSource();source.buffer=buffer;source.connect(offline.destination);source.start();const rendered=await offline.startRendering(),pcm=rendered.getChannelData(0).slice();let energy=0;for(const v of pcm)energy+=v*v;if(Math.sqrt(energy/pcm.length)<.0001)return null;return pcm;
 }catch(e){if(e.name==='EncodingError')throw Error('브라우저가 이 영상의 오디오 코덱을 읽지 못했습니다. 지원되는 MP4/AAC 영상으로 확인하세요.');throw e;}finally{await ctx.close();}
}
