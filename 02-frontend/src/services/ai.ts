export async function getAISuggestion(code: string){

  const response = await fetch("/api/v1/ai/suggest",{
    method:"POST",
    headers:{
      "Content-Type":"application/json"
    },
    body:JSON.stringify({code})
  });

  return response.json();

}
