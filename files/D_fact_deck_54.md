# Artifact D: The 54 Fact Deck
## Drill this in dead time. Gym, bus, waiting in line.

**How to use it.** Read the question, answer out loud or in your head, then read the answer. Do not read passively, that does nothing. One pass takes about 12 minutes. Do three passes a day. By Thursday you will have seen every fact roughly ten times.

**What it is for.** These are the facts a 90 minute filter test actually asks. It will not make you a researcher. It is built to catch the easy and medium questions in the sections we are not teaching deeply.

---

# Section 1: SQL and Python recall, 8 facts

**1. What is the logical execution order of a SQL query?**
FROM and JOIN, then WHERE, then GROUP BY, then HAVING, then SELECT, then ORDER BY, then LIMIT.

**2. Why can HAVING use COUNT but WHERE cannot?**
WHERE runs before grouping, so no groups exist yet. HAVING runs after grouping.

**3. What is the only way to test for NULL?**
`IS NULL` or `IS NOT NULL`. Any comparison against NULL yields unknown and the row is dropped.

**4. COUNT(*) versus COUNT(column) versus COUNT(DISTINCT column)?**
COUNT(*) counts rows including NULLs. COUNT(column) skips NULLs. COUNT(DISTINCT column) counts unique values.

**5. Which JOIN do you use to find rows that have no match?**
LEFT JOIN plus `WHERE right_table.key IS NULL`. This is the anti join pattern. Alternative is NOT EXISTS.

**6. In a LEFT JOIN, where does a condition on the right table belong?**
In the ON clause. Putting it in WHERE silently turns the LEFT JOIN into an INNER JOIN.

**7. What is the safe way to build a SQL query in Python?**
A parameterized query. `conn.execute("SELECT * FROM users WHERE name = ?", (name,))`. Never concatenate. Escaping is not a fix.

**8. What is the safe way to run a shell command in Python?**
`subprocess.check_output(["ping", "-c", "1", host])` with `shell=False`, which is the default, plus explicit input validation. Never `shell=True` with concatenation.

---

# Section 2: AI Security, 14 facts

**9. What is OWASP?**
The Open Worldwide Application Security Project. A nonprofit publishing ranked security risk lists.

**10. Name the OWASP LLM Top 10, 2025 edition.**
Prompt Injection, Sensitive Information Disclosure, Supply Chain, Data and Model Poisoning, Improper Output Handling, Excessive Agency, System Prompt Leakage, Vector and Embedding Weaknesses, Misinformation, Unbounded Consumption.

**11. What changed in the 2026 edition?**
Excessive Agency rose to LLM03. Unbounded Consumption rose four places. System Prompt Leakage was broadened into Hidden Context Exposure. Improper Output Handling dropped to tenth.

**12. Direct versus indirect prompt injection?**
Direct comes from the user's own input. Indirect is planted in content the model reads: a document, an email, a web page, a RAG chunk. Indirect is the dangerous one.

**13. Why can prompt injection not be fixed by input sanitization?**
The model does not separate instructions from data. Both are text in the same context. There is no syntactic boundary like the one between code and parameters in a prepared statement.

**14. What is Excessive Agency?**
The model or agent holds more tools, permissions, or autonomy than the task requires. Three components: too much functionality, too many permissions, too much autonomy.

**15. What is least agency, and how do you enforce it?**
Grant exactly what the task needs. Narrow scoped tools per task, permissions derived from the specific user rather than one strong service identity, human approval for irreversible actions.

**16. What is RAG poisoning?**
Injecting hostile documents into the source that retrieval pulls from. The effect persists as long as the document is there and needs no access to the model.

**17. Why must you authorize before retrieval, not after?**
If retrieval happens first, the data is already in the context and the model saw it. Filtering afterward is cosmetic, and content can still leak through a summary or an inference.

**18. Memory versus context versus data poisoning, what differs?**
The lifetime. Data poisoning is baked into the weights and affects everyone. Context poisoning affects one request. Memory poisoning persists across sessions.

**19. Why is loading a pickle model file dangerous?**
Deserialization can execute arbitrary code via `__reduce__`. Use `safetensors`, which cannot execute code.

**20. State the output handling principle in one sentence.**
Treat model output as untrusted user input, and validate it at the boundary of every consumer.

**21. What does AI-SPM cover that CSPM does not?**
An asset layer CSPM has no concept of: models, datasets, vector stores, inference endpoints, training pipelines.

**22. How do OWASP LLM Top 10, MITRE ATLAS, and NIST AI RMF differ?**
OWASP is a ranked risk list for building and prioritizing. ATLAS is a taxonomy of attacker tactics and techniques for threat modeling and detection. NIST AI RMF is organizational governance.

**23. Name the top three of the Agentic ASI Top 10, 2026.**
ASI01 Agent Goal Hijack, ASI02 Tool Misuse and Exploitation, ASI03 Identity and Privilege Abuse. The two threads across the whole list are identity and containment.

---

# Section 3: Cloud Security, 12 facts

**24. What is the AWS IAM evaluation order?**
Explicit Deny wins over everything. Then an explicit Allow is required. No Allow means implicit deny.

**25. What can block even when an identity policy says Allow?**
An SCP at organization level, a permission boundary, a resource based policy, a VPC endpoint policy, or a session policy.

**26. What makes a subnet public in a VPC?**
Its route table has a route for `0.0.0.0/0` pointing at an internet gateway. Not the public IP, not the Security Group.

**27. Security Group versus NACL?**
SG is stateful, allow rules only, applies to the instance. NACL is stateless, has allow and deny, applies to the subnet, evaluated in numeric order.

**28. What is IMDS?**
Instance Metadata Service at `169.254.169.254`, reachable from inside an instance, returning metadata and temporary credentials for the attached role.

**29. IMDSv1 versus IMDSv2?**
v1 answers a plain GET, so an SSRF bug steals credentials. v2 requires a PUT to get a token, that token in a header, and a hop limit, so naive SSRF fails. Rule: require `HttpTokens=required` and hop limit 1.

**30. Why is `iam:PassRole` dangerous?**
It lets an identity attach a strong role to compute it creates, for example Lambda or EC2, then run code under that role. Always needs a Condition restricting which roles may be passed.

**31. Why is `iam:CreatePolicyVersion` on your own policy critical?**
The identity can rewrite its own permissions and make itself admin. Full privilege escalation in one call.

**32. Identity based versus resource based policy versus permission boundary?**
Identity based says what an identity can do. Resource based says who can reach a resource, and is the only one granting cross account access without assuming a role. A boundary grants nothing, it caps the maximum.

**33. What is the confused deputy problem, and the fix?**
An intermediary service acts on the attacker's behalf because it cannot tell who it is acting for. Fix: a Condition on `sts:ExternalId`, and for service to service also `aws:SourceArn` and `aws:SourceAccount`.

**34. Does a private subnet with a NAT gateway stop outbound C2 traffic?**
No. NAT allows any outbound connection initiated from inside, it only blocks inbound. You need egress filtering with a destination allowlist.

**35. Misconfiguration versus vulnerability versus exposure?**
Misconfiguration is a wrong resource setting. Vulnerability is a flaw in code or a package. Exposure is whether it is actually reachable, and exposure is what drives prioritization.

---

# Section 4: Linux, Web, Containers, 12 facts

**36. What does mode 4755 mean, and why care?**
setuid is set, so the binary runs as its owner rather than the invoker. If the owner is root, any bug in it is privilege escalation. Attackers enumerate with `find / -perm -4000 -type f 2>/dev/null`.

**37. Which command lists listening ports with process names?**
`ss -tulpn`. t for TCP, u for UDP, l for listening, p for process, n for no resolution.

**38. Name five Linux persistence locations.**
cron and `/etc/cron.*`, systemd units, shell startup files such as `.bashrc`, `~/.ssh/authorized_keys`, and `LD_PRELOAD` or `/etc/ld.so.preload`.

**39. `/etc/passwd` versus `/etc/shadow`?**
passwd holds username, uid, gid, home, shell, and is world readable. shadow holds the password hash and is root only. World readable shadow is critical, it enables offline cracking.

**40. Which Linux capability makes a container equivalent to root on the host?**
`CAP_SYS_ADMIN`. Also dangerous: `CAP_SYS_PTRACE`, `CAP_SYS_MODULE`, `CAP_DAC_READ_SEARCH`. `privileged: true` effectively grants all of them.

**41. Name the OWASP Web Top 10, 2025 edition.**
Broken Access Control, Security Misconfiguration, Software Supply Chain Failures, Cryptographic Failures, Injection, Insecure Design, Authentication Failures, Software or Data Integrity Failures, Security Logging and Alerting Failures, Mishandling of Exceptional Conditions.

**42. What happened to SSRF in the 2025 edition?**
It was folded into A01 Broken Access Control. OWASP now treats it as an access control failure rather than a standalone risk.

**43. What are the two new categories in the 2025 edition?**
A03 Software Supply Chain Failures and A10 Mishandling of Exceptional Conditions.

**44. What is IDOR, and why do scanners miss it?**
Insecure Direct Object Reference: referencing a resource by id without checking authorization. Scanners miss it because the request is valid, the response is a normal 200, and knowing who should be authorized is business knowledge not syntax.

**45. Describe the SSRF to cloud credential theft path.**
User supplies a URL pointing at `169.254.169.254`. The server fetches it from inside the VPC, receives temporary role credentials, and returns them in the response. Controls: enforce IMDSv2, allowlist outbound destinations and block link local ranges, check again after every redirect.

**46. Stored versus reflected versus DOM based XSS?**
Stored is saved server side and served to everyone. Reflected comes back in the same response, so the victim must click a link. DOM based never reaches the server, so a WAF cannot see it.

**47. Fail open versus fail closed?**
Fail closed denies on error. Fail open allows. For any security decision the default on error must be deny. The classic bug is a try block around an authorization call that returns true on failure.

**48. Container versus virtual machine?**
A container shares the host kernel and is isolated by namespaces, meaning separated pid, net, mnt, and user views, plus cgroups for resource limits. One kernel bug breaks every container on that host.

**49. Which four manifest settings make a pod dangerous?**
`privileged: true`, a `hostPath` mount to a sensitive path, `hostPID` or `hostNetwork`, and `allowPrivilegeEscalation` not set to false. Missing: `runAsNonRoot`, `readOnlyRootFilesystem`, resource limits.

**50. Why is a ClusterRoleBinding to cluster-admin for an app service account critical?**
Any RCE in that app equals cluster takeover, and the service account token is mounted inside the pod. MITRE technique for the escape itself is T1611 Escape to Host.

---

# Section 5: Identity, 8 facts

**51. In SAML, who signs and who validates?**
The IdP authenticates the user and signs the assertion. The SP consumes it and validates the signature against the expected IdP certificate.

**52. Which fields must the SP validate in a SAML assertion?**
The signature, `Issuer`, `Audience`, `NotBefore` and `NotOnOrAfter`, `Destination`, and `InResponseTo` plus one time use of the ID.

**53. What breaks if Audience is not validated?**
An assertion minted for a different service provider is accepted. That is token replay across services.

**54. Name three structural differences between SAML and OIDC.**
SAML is XML with XML Signature, OIDC is a layer on OAuth 2.0 using signed JWTs. SAML is browser and web oriented, OIDC also serves APIs, mobile, and SPAs. SAML covers authentication only, OIDC adds identity on top of OAuth authorization. Bonus: OIDC rotates keys automatically via `jwks_uri`, SAML certificates are replaced manually.

**55. What is Golden SAML?**
An attacker with admin on the IdP steals the token signing certificate and private key, then mints valid assertions for any user. MFA does not help because authentication never happens. It is invisible in IdP logs because the IdP was never involved. Evidence exists only on the service provider side.

**56. In OAuth 2.0, what is `state` for, and how does it differ from `nonce`?**
`state` is CSRF protection in the authorization flow. `nonce` is an OIDC value embedded in the id_token that protects against token replay.

**57. What is PKCE and what does it prevent?**
Proof Key for Code Exchange. The client sends a code_challenge up front and the code_verifier when exchanging the code. It prevents authorization code interception, and OAuth 2.1 requires it for all client types.

**58. ITDR versus CIEM?**
CIEM is posture, asking who holds permissions they do not need. ITDR is real time detection at the identity layer. Only ITDR catches session token replay and MFA fatigue, where the permissions are perfectly valid.

---

## Priority if you run out of time

Learn these first, they are the highest frequency: facts 1, 3, 4, 5, 7, 10, 12, 14, 24, 26, 28, 29, 35, 41, 42, 45, 48, 52, 55.
