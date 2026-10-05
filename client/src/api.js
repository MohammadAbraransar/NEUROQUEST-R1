const API = import.meta.env.VITE_API_URL || "";

async function request(path, options={}) {
  const token=localStorage.getItem("neuroquest_token");
  const headers={"Content-Type":"application/json",...(options.headers||{})};
  if(token) headers.Authorization=`Bearer ${token}`;
  const res=await fetch(`${API}/api${path}`,{...options,headers});
  const data=await res.json().catch(()=>({error:"Invalid server response"}));
  if(!res.ok) throw new Error(data.error||`Request failed (${res.status})`);
  return data;
}
export const api={
  login:(teamName,password)=>request("/auth/login",{method:"POST",body:JSON.stringify({teamName,password})}),
  register:(teamName,name,password)=>request("/auth/register",{method:"POST",body:JSON.stringify({teamName,name,password})}),
  me:()=>request("/me"),
  activities:()=>request("/activities"),
  activity:(id)=>request(`/activities/${id}`),
  start:(activityId,infinite=true)=>request("/attempts",{method:"POST",body:JSON.stringify({activityId,infinite})}),
  attempt:(id)=>request(`/attempts/${id}`),
  answer:(id,answer,questionId,round)=>request(`/attempts/${id}/answer`,{method:"POST",body:JSON.stringify({answer,questionId,round})}),
  abandon:(id)=>request(`/attempts/${id}/abandon`,{method:"POST"}),
  finish:(id)=>request(`/attempts/${id}/finish`,{method:"POST"}),
  history:()=>request("/history"),
  leaderboard:(id)=>request(`/leaderboard/${id}`),
  admin:()=>request("/admin/overview"),
  adminTeam:(teamName)=>request(`/admin/teams/${encodeURIComponent(teamName)}`)
};
