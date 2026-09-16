export function CanvasStage({frame,width=1080,height=1920,onSelect,selectedId}){
 const els=[...(frame?.elements??[])].filter(e=>e.visible!==false).sort((a,b)=>a.layer_order-b.layer_order);
 return <div className="stage-wrap"><div className="stage" style={{aspectRatio:`${width}/${height}`}}>{els.map(e=><img key={e.id} onClick={()=>onSelect?.(e)} className={selectedId===e.id?'stage-el selected':'stage-el'} src={e.image_ref} alt={e.type} style={{left:`${e.x}px`,top:`${e.y}px`,zIndex:e.layer_order,transform:`translate(-50%,-50%) rotate(${e.rotation}deg) scale(${e.scale})`}}/>)}</div></div>
}
