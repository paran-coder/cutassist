export function createScrubQueue(player,delay=60){
 let pending=null,timer=null,running=false,dead=false,urgent=false;
 async function flush(){clearTimeout(timer);timer=null;if(running||dead||pending===null)return;const value=pending;pending=null;running=true;try{await player.seek(value,{resume:false});}finally{running=false;if(pending!==null&&!dead){if(urgent){urgent=false;flush();}else timer=setTimeout(flush,delay);}}}
 return {request(value,{final=false}={}){if(dead||!Number.isFinite(value))return;pending=value;if(typeof player.update==='function'){player.time=value;player.update();}urgent=final;if(final)flush();else if(!timer&&!running)timer=setTimeout(flush,delay);},cancel(){pending=null;urgent=false;clearTimeout(timer);timer=null;},destroy(){dead=true;pending=null;clearTimeout(timer);}};
}
export function createLoadingIndicator(show,delay=300){
 let timer=null,loading=false;
 return {update(value){if(value===loading)return;loading=value;clearTimeout(timer);timer=null;if(value)timer=setTimeout(()=>{timer=null;if(loading)show(true);},delay);else show(false);},destroy(){loading=false;clearTimeout(timer);show(false);}};
}
