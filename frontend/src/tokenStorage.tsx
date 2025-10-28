export function storeToken( tok:any ) : any
{
    try
    {
        // Handle both string tokens and token objects
        // Check for jwtToken, accessToken, or token properties
        const tokenValue = typeof tok === 'string' ? tok : (tok?.jwtToken || tok?.accessToken || tok?.token || tok);
        localStorage.setItem('token_data', tokenValue);
    }
    catch(e)
    {
        console.log(e);
    }
}
export function retrieveToken() : any
{
    var ud;
    try
    {
        ud = localStorage.getItem('token_data');
    }
    catch(e)
    {
        console.log(e);
    }
    return ud;
}