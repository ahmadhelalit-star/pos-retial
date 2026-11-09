import { ArchiveBoxIcon } from '../components/common/Icons';

export function PageHeading({icon:Icon=ArchiveBoxIcon,title,subtitle}){
  return <header className="retail-page-heading"><span className="retail-heading-icon"><Icon className="h-5 w-5"/></span><div><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div></header>;
}
export function MetricCard({icon:Icon=ArchiveBoxIcon,label,value,unit,tone='blue',note}){
  return <article className={`retail-metric retail-metric-${tone}`}><div className="retail-metric-label"><span>{label}</span><span className="retail-metric-icon"><Icon className="h-4 w-4"/></span></div><div className="retail-metric-value"><strong>{value}</strong>{unit&&<span>{unit}</span>}</div>{note&&<p>{note}</p>}</article>;
}
export function EmptyState({icon:Icon=ArchiveBoxIcon,title,description,compact=false}){
  return <div className={`retail-empty ${compact?'retail-empty-compact':''}`}><span><Icon className="h-7 w-7"/></span><strong>{title}</strong>{description&&<p>{description}</p>}</div>;
}
