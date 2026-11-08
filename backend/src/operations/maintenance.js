export function createMaintenance(){
  const state={active:false,restartRequired:false,inFlight:0};
  state.middleware=(req,res,next)=>{if(!req.path.startsWith('/api/')||req.path.startsWith('/api/operations/')||req.path==='/api/health')return next();if(state.active){res.status(503).json({error:{code:'MAINTENANCE',message:'صيانة آمنة قيد التنفيذ / Maintenance in progress'}});return;}state.inFlight++;let released=false;const release=()=>{if(!released){released=true;state.inFlight--;}};res.once('finish',release);res.once('close',release);next();};
  state.drain=async()=>{const start=Date.now();while(state.inFlight){if(Date.now()-start>30000)throw Error('Active requests did not drain; restore cancelled');await new Promise(resolve=>setTimeout(resolve,50));}};return state;
}
