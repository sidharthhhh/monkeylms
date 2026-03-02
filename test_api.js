const fetch = require('node-fetch');

async function test() {
    try {
        const loginRes = await fetch("http://localhost:8080/api/v1/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "mentor@monkeylms.com", password: "password123" })
        });
        const loginData = await loginRes.json();
        if (!loginData.data || !loginData.data.token) {
            console.error("Login failed:", loginData);
            return;
        }

        const token = loginData.data.token;
        const actRes = await fetch("http://localhost:8080/api/v1/submissions/activity/recent?limit=10", {
            headers: { "Authorization": `Bearer ${token}` }
        });

        const actData = await actRes.json();
        console.log("API Response:");
        console.log(JSON.stringify(actData, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
