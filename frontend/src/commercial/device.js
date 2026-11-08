// This identifies a terminal for shift binding, never a license or a financial source of truth.
export function terminalId(){let id=localStorage.getItem('retail:terminal');if(!id){id=sessionStorage.getItem('retail:terminal')??crypto.randomUUID();localStorage.setItem('retail:terminal',id);}return id;}
