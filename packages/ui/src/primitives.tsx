import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, PropsWithChildren, ReactNode } from 'react';

export type ButtonVariant='default'|'ghost'|'danger';
export function Button({className='',variant='default',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:ButtonVariant}){return <button className={`mw-button mw-button-${variant} ${className}`} {...props}/>;}
export function Input({className='',...props}:InputHTMLAttributes<HTMLInputElement>){return <input className={`mw-input ${className}`} {...props}/>;}
export function Badge({className='',...props}:PropsWithChildren<HTMLAttributes<HTMLSpanElement>>){return <span className={`mw-badge ${className}`} {...props}/>;}
export function Card({className='',...props}:HTMLAttributes<HTMLDivElement>){return <div className={`mw-card ${className}`} {...props}/>;}
export function CardHeader({className='',...props}:HTMLAttributes<HTMLDivElement>){return <div className={`mw-card-header ${className}`} {...props}/>;}
export function CardTitle({className='',...props}:HTMLAttributes<HTMLHeadingElement>){return <h3 className={`mw-card-title ${className}`} {...props}/>;}
export function CardContent({className='',...props}:HTMLAttributes<HTMLDivElement>){return <div className={`mw-card-content ${className}`} {...props}/>;}
export function Modal({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}){return <div className="mw-modal-backdrop" onClick={onClose}><div className="mw-modal-content" onClick={event=>event.stopPropagation()}><Card className="mw-modal-card"><CardHeader className="mw-modal-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><CardTitle>{title}</CardTitle><Button variant="ghost" onClick={onClose} aria-label="Close" className="mw-modal-close" style={{padding:'.25rem .5rem'}}>✕</Button></CardHeader><CardContent>{children}</CardContent></Card></div></div>;}
