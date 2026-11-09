export class ApiError extends Error {
  constructor(status,error){super(error?.message??'تعذر الاتصال بالخادم / Server request failed');this.status=status;this.code=error?.code;this.details=error?.details;}
}
export function createApiClient({fetcher=globalThis.fetch,base='/api',onUnauthorized=()=>{},onActivationRequired=()=>{}}={}) {
  let csrfToken=null;
  return {
    setCsrfToken(value){csrfToken=value;},
    async request(path,{method='GET',body,key,signal,epoch,setupToken}={}){
      const headers={};if(setupToken)headers['X-Retail-Setup-Token']=setupToken;if(epoch)headers['X-Retail-Data-Epoch']=epoch;if(body!==undefined)headers['Content-Type']='application/json';if(csrfToken&&!['GET','HEAD'].includes(method))headers['X-CSRF-Token']=csrfToken;if(key)headers['Idempotency-Key']=key;
      const response=await fetcher(base+path,{method,headers,credentials:'include',signal,body:body===undefined?undefined:JSON.stringify(body)});
      let data;try{data=await response.json();}catch{throw new ApiError(response.status,{message:'استجابة الخادم غير صالحة / Invalid server response'});}
      if(!response.ok){if(response.status===401)onUnauthorized();if(data.error?.code==='ACTIVATION_REQUIRED')onActivationRequired(data.error.details??{});throw new ApiError(response.status,data.error);}
      if(data.csrfToken)csrfToken=data.csrfToken;
      return data;
    },
  };
}
export function productQuery(query={}) {
  const parameters=new URLSearchParams({page:String(query.page??1),limit:String(query.limit??50)});
  for(const name of ['q','category','stock','warehouseId'])if(query[name]&&query[name]!=='all')parameters.set(name,query[name]);
  return `/products?${parameters}`;
}
