export async function searchProjectContext(query:string){

  const response=await fetch("/api/v1/context/search",{
    method:"POST",
    headers:{
      "Content-Type":"application/json"
    },
    body:JSON.stringify({query})
  });

  return response.json();

}
