const { sendAnalyzeRequest } = require('./index');

const payload = {
  domain: "bookstore.local",
  request: {
    method: "GET",
    url: "/api/books/",
    query_string: "?id=%3Cscript%3Ealert(1)%3C/script%3E",
    query_params: { id: "<script>alert(1)</script>" },
    ip: "127.0.0.1",
    headers: { host: "localhost:5005" },
    user_agent: "Mozilla/5.0",
    referer: "",
    body: ""
  }
};

const apiKey = "Ix2TtXbbBHJolIam3MYLui0jphKy9oRvF_D3AJjY1tO8MGfWU-NCQzvDuwc_6Dri";

async function run() {
  console.log('Sending test analyze request directly to http://127.0.0.1:8000/api/analyze...');
  const t0 = Date.now();
  try {
    const resp = await sendAnalyzeRequest('http://127.0.0.1:8000', apiKey, payload, 5000);
    console.log(`Received response in ${Date.now() - t0}ms:`, resp);
  } catch (e) {
    console.error('Error during sendAnalyzeRequest:', e);
  }
}

run();
