export const createLocalClient=api=>(path,{body,method=body===undefined?'GET':'POST'}={})=>api.request('/local'+path,{method,body});
