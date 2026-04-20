use serde::Deserialize;

#[derive(Deserialize)]
pub struct CreateOsintRequest {
    pub name: String,
    pub url: String,
}


#[derive(Deserialize)]
pub struct CreateParseRequest{
    pub name: String,
    pub location: String,
    pub limit: i32,
}