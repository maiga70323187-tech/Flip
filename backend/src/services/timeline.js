export function buildTimeline(project) {
  let cursor=0;
  return project.frames.map((frame,index)=>{
    const start_ms=cursor; cursor+=frame.duration_ms;
    return {index,frame_id:frame.id,start_ms,end_ms:cursor,duration_ms:frame.duration_ms,elements:frame.elements};
  });
}

export function previewManifest(project) {
  const timeline=buildTimeline(project);
  return {project_id:project.id,name:project.name,width:project.width,height:project.height,fps:project.fps,duration_ms:timeline.at(-1)?.end_ms ?? 0,timeline,audio_tracks:project.audio_tracks};
}
