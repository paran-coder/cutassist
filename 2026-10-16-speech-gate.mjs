// Internal Whisper indicator; not a calibrated speech probability.
export function speechDecision(score,mode='strict'){
 if(!['strict','relaxed'].includes(mode))throw Error('Unknown speech mode');
 if(!Number.isFinite(score)||score<0||score>1)return {allow:false,status:'review'};
 if(score>=.6)return {allow:false,status:'no-speech'};
 return score>=(mode==='strict'?.15:.6)?{allow:false,status:'review'}:{allow:true,status:'accepted'};
}
