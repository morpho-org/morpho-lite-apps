async function handler(event) {
  const req = event.request;
  if (!req.uri.includes(".")) {
    req.uri = "/index.html";
  }
  return req;
}
