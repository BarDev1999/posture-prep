# Artifact A: Reference Brief
## Junior Security Posture Researcher, Cortex Cloud, Palo Alto Networks
### Background document for Assessment Day, 3 September 2026

Product specific claims are backed by sources at the end.

---

## 1. What Cortex Cloud Is

**Cortex Cloud** is the next version of Prisma Cloud, merged with Cortex CDR and running on the Cortex platform. Announced February 2025. Cortex Cloud 2.0 was announced October 2025 and added autonomous AI agents, a unified Cloud Command Center, and a performance optimized CDR agent.

**The product thesis.** Until now posture and SOC were two separate worlds. One team handled misconfigurations in peacetime, another handled live attacks. Cortex Cloud merges both into one continuum: code to cloud to SOC. This is the sentence worth being able to say out loud in an interview or an open question.

### The three pillars

| Pillar | What it does |
|---|---|
| **Application Security** | Prevents risk from reaching production. Unifies native and third party scanners, software supply chain, IaC, and runtime context. Includes ASPM |
| **Cloud Posture Security** | Goes beyond inventory and misconfiguration lists. Adds code context and runtime context to every finding |
| **Cloud Runtime Security** | Stops attacks as they execute. An agent collecting behavioral telemetry, integrated into SOC workflows. This is effectively the CDR |

### Modules under Cloud Posture Security

| Module | Description |
|---|---|
| **CSPM** | Cloud Security Posture Management. Misconfigurations, compliance, automated remediation |
| **AI-SPM** | AI Security Posture Management. Unprotected models, exposed AI pipelines, AI supply chain |
| **DSPM** | Data Security Posture Management. Discover, classify, and protect cloud data |
| **CIEM** | Cloud Infrastructure Entitlement Management. Identity risk, least privilege enforcement, blast radius reduction |
| **Vulnerability Management** | Prioritizing vulnerabilities from the attacker point of view, code to cloud to SOC |
| **Cloud ASM** | Cloud Attack Surface Management. Discovery of unknown internet facing assets |

### Cortex Cloud specific terms worth knowing by name

**SmartGrouping.** Consolidating scattered signals into one holistic case instead of hundreds of standalone alerts.

**SmartScore.** Prioritization by real world exposure and production behavior, not by theoretical severity.

**Cloud Command Center.** The unified view introduced in Cortex Cloud 2.0.

**XQL, Cortex Query Language.** The platform query language. Used for threat hunting, analytics, dashboards, and through the API. Important connection: the muscle you use to write SQL is the same one XQL needs.

**Graph Search.** Exploring relationships between assets and findings. This is the substrate for attack path analysis.

**Attack Path rule.** In the UI: Posture Management, then Rules and Policies, then Rules, then Cloud Security, then Create Rule. Meaning attack path rules are an artifact a posture researcher writes by hand. This is the closest thing to what the role actually produces.

### Figures the company cites, useful for open questions

80 percent of exposures were found in cloud attack surfaces. A 66 percent increase in threats targeting cloud environments. Critical risks stay unresolved for an average of 120 days. Alert volume reduced by a factor of 25 using AI driven prioritization.

---

## 2. Posture Research Vocabulary

### The posture management family

| Term | Full name | What it covers |
|---|---|---|
| **CNAPP** | Cloud Native Application Protection Platform | One platform bundling CSPM, CWPP, CIEM, DSPM, IaC scanning, attack path analysis |
| **CSPM** | Cloud Security Posture Management | Control plane configuration. Public bucket, open security group, encryption off, logging off |
| **CWPP** | Cloud Workload Protection Platform | Protecting the workload itself: VM, container, serverless. Vulnerabilities, runtime, hardening |
| **CIEM** | Cloud Infrastructure Entitlement Management | Permissions and identities. Effective versus granted permissions, privilege escalation paths |
| **DSPM** | Data Security Posture Management | Where the data is, how sensitive it is, who can reach it, whether it is exposed |
| **KSPM** | Kubernetes Security Posture Management | K8s specific posture: RBAC, admission control, pod security, network policies |
| **SSPM** | SaaS Security Posture Management | SaaS application configuration. OAuth apps, sharing, MFA settings |
| **ITDR** | Identity Threat Detection and Response | Detecting and responding to attacks at the identity layer. Token theft, MFA fatigue, federation abuse |
| **AI-SPM** | AI Security Posture Management | Posture of models, datasets, vector stores, inference endpoints |
| **ASPM** | Application Security Posture Management | Unifying AppSec output into one application level risk picture |

### Core terms that keep showing up in questions

**Agentless scanning.** Scanning through the cloud provider API and through disk snapshots. Nothing to install, broad and fast coverage, no performance cost. The price: a point in time picture, no runtime visibility, no ability to block.

**Agent based scanning.** An agent on the workload. Gets process, network, file, and syscall data in real time, and can prevent. The price: deployment, maintenance, performance cost, and partial coverage in practice.

**The practical rule.** Agentless for coverage and posture. Agent for detection and prevention. A good CNAPP does both and correlates between them.

**Attack path analysis.** A graph algorithm over a security graph that finds paths actually exploitable, from entry point to target asset, and points at the single hop whose fix breaks the whole chain.

**Toxic combination.** A combination of findings that are each moderate alone and critical together. The classic example: an internet facing workload, with a vulnerability that has a public exploit, with a broadly permissioned role, that has access to a bucket holding sensitive data.

**Blast radius.** Everything an attacker can reach after taking over a given identity or asset.

**Choke point.** A node many attack paths run through. One fix there gives the highest return.

### Three words never to confuse

| Term | Definition | Example |
|---|---|---|
| **Misconfiguration** | A wrong setting on a resource, not a code bug | S3 bucket with public read, RDS without encryption at rest |
| **Vulnerability** | A flaw in code or in a package, usually with a CVE | Log4Shell inside an image, an outdated library |
| **Exposure** | Whether the flaw is actually reachable and therefore exploitable | Whether the workload with the vulnerability is truly reachable from the internet |

Bottom line for the exam: exposure is what turns a vulnerability from a CVSS number into real risk. That is exactly the idea behind SmartScore.

### Policy as code and shift left

**IaC, Infrastructure as Code.** Terraform, CloudFormation, ARM, Bicep, Helm, Kubernetes manifests.

**IaC scanning.** Checking infrastructure as code before it becomes a real resource.

**Checkov.** An open source IaC scanning tool, a Bridgecrew project acquired by Palo Alto Networks and integrated into Prisma Cloud. Checks are written in Python or YAML. Each check gets an ID in the CKV format. A check is defined on a resource type and returns PASSED or FAILED based on a condition over its fields.

**Policy as code.** The rule itself lives as code in a repo, goes through code review, versioning, and tests. Not a manual setting in a UI.

**Shift left.** Moving the check earlier: IDE, pre commit, pull request, CI. Fixing in code costs a fraction of fixing in production.

**Guardrail versus gate.** A guardrail warns and steers. A gate blocks the merge or the deploy. A posture researcher needs to say which one fits which class of finding, and what false positive rate justifies blocking.

### Compliance frameworks

**CIS Benchmarks.** The most common source for posture rules. There is a benchmark for every platform: AWS, Azure, GCP, Kubernetes, Docker, Linux. Every check is numbered and split into Level 1, a safe baseline that does not break operations, and Level 2, aggressive hardening.

**Others worth knowing by name.** NIST CSF and NIST 800 53, PCI DSS, SOC 2, ISO 27001, HIPAA, CIS Controls. Cortex Cloud ships built in rules mapped to these frameworks and lets you build a custom framework.

---

## 3. What a Posture Researcher Actually Produces

The output is not a report. The output is **detection logic and policy logic that lands in the product codebase**. So for every concept you learn, immediately translate it into one question: how do I turn this into a rule.

### The rule template, seven questions

1. **Data source.** Where do I pull from. Resource config from the cloud API, CloudTrail, the K8s API, an image scan, an IaC file, IdP logs.
2. **Condition.** What exactly am I looking for. A precise condition on a field, not a vague description.
3. **Context and enrichment.** What raises or lowers severity. Is the resource public, does it hold sensitive data, is it in production, is the identity actually in use.
4. **Severity.** Derived from exposure and impact, not from CVSS alone.
5. **False positives and exceptions.** Who legitimate will get caught. How do I allow an exception without opening a hole. A tag, a namespace, a specific account.
6. **Remediation.** The exact fix, and whether it can be safely automated.
7. **Evidence.** What I show the team that has to fix it, so they believe me.

### Full example 1: public bucket holding sensitive data

| Step | Answer |
|---|---|
| Data source | S3 bucket configuration, bucket policy, ACL, Public Access Block, and DSPM classification results |
| Condition | BlockPublicAcls or BlockPublicPolicy disabled, or a policy with Principal set to a wildcard and no restricting Condition |
| Context | Did DSPM classify the contents as PII or secrets. Is there CloudTrail GetObject activity from an external IP |
| Severity | Critical if public and holding sensitive data. Medium if public without sensitive data |
| False positives | Buckets intended to be public: static website, public artifacts. Filter by an approved tag |
| Remediation | Enable Public Access Block at account level, remove the statement, move to presigned URLs or CloudFront with OAC |
| Evidence | The exact policy statement, the data class found, and external access records if any |

### Full example 2: over permissioned role

| Step | Answer |
|---|---|
| Data source | IAM policies, attachments, and real usage data from Access Analyzer or CloudTrail |
| Condition | Effect Allow with Action wildcard and Resource wildcard. Or specific dangerous permissions: iam:PassRole, iam:CreatePolicyVersion, broad sts:AssumeRole, lambda:UpdateFunctionCode |
| Context | Is the role assumable by an externally reachable identity. Were the permissions actually used in the last 90 days |
| Severity | Critical if a privilege escalation path exists to an admin level identity |
| False positives | Break glass roles and automation roles. Documented, justified exceptions only |
| Remediation | Reduce to least privilege based on actual usage, add a Condition, split the role per task |
| Evidence | The full path: who can assume the role, what it grants, and which asset it reaches |

### Full example 3: privileged pod with a mount to the host root

| Step | Answer |
|---|---|
| Data source | Kubernetes manifests, the cluster API, and admission logs |
| Condition | securityContext.privileged set to true, or a hostPath pointing at a sensitive path, or hostPID, or hostNetwork, or allowPrivilegeEscalation not false, or capabilities adding SYS_ADMIN |
| Context | Does the pod service account have broad RBAC. Does the node carry a strong IAM role |
| Severity | Critical. This is a direct container escape path followed by node takeover |
| False positives | Legitimate monitoring and CNI daemonsets. Allowlist by namespace and workload name |
| Remediation | Pod Security Admission in restricted mode, remove the mount, minimal capabilities, read only root filesystem |
| Evidence | The manifest, the service account permissions, and IMDS reachability from inside the pod |

---

## 4. Frameworks Cheat Sheet

### OWASP Top 10 for LLM Applications, 2025 edition

This is the version most people know and the most likely to appear on the exam.

| ID | Name |
|---|---|
| LLM01 | Prompt Injection |
| LLM02 | Sensitive Information Disclosure |
| LLM03 | Supply Chain |
| LLM04 | Data and Model Poisoning |
| LLM05 | Improper Output Handling |
| LLM06 | Excessive Agency |
| LLM07 | System Prompt Leakage |
| LLM08 | Vector and Embedding Weaknesses |
| LLM09 | Misinformation |
| LLM10 | Unbounded Consumption |

### OWASP Top 10 for LLM Applications, 2026 edition

Released summer 2026, grounded in a dataset of thousands of real incidents. Worth knowing the changes, since it shows you are current.

| ID | Name | Primary vector |
|---|---|---|
| LLM01 | Prompt Injection | Direct and indirect, Unicode bypasses, self replicating lures |
| LLM02 | Sensitive Info Disclosure | Training data memorization, RAG chunk leakage, side channels |
| LLM03 | Excessive Agency | Autonomous tool abuse, shell command execution, unchecked API calls |
| LLM04 | Data and Model Poisoning | Contaminated datasets, malicious fine tuning, compromised adapters |
| LLM05 | Improper Supply Chain | Compromised base models, unsafe serialization, rogue registries |
| LLM06 | Insecure Output Handling | Unsanitized code, SQL, or HTML leading to XSS or RCE |
| LLM07 | Vector and Memory Flaws | Embedding manipulation, context poisoning, cross session bleed |
| LLM08 | Misinformation | Hallucinations driving wrong automated actions |
| LLM09 | Hidden Context Exposure | Leaking system prompts, policy logic, tool schemas, guardrails |
| LLM10 | Unbounded Consumption | Cost spikes, token exhaustion, resource starvation |

**Key changes from 2025 to 2026.** Excessive Agency rose to third, because real incidents cluster around agentic systems. Unbounded Consumption rose four places. System Prompt Leakage was broadened into Hidden Context Exposure, covering any context not visible to the user, including RAG schemas and policy logic. Improper Output Handling dropped to tenth, not because it is solved, but because input boundary injection and disclosure now dominate incident records.

### OWASP Top 10 for Agentic Applications, 2026

A separate list, published December 2025, prefixed ASI. It extends rather than replaces the LLM list.

| ID | Name |
|---|---|
| ASI01 | Agent Goal Hijack |
| ASI02 | Tool Misuse and Exploitation |
| ASI03 | Identity and Privilege Abuse |
| ASI04 | Agentic Supply Chain Vulnerabilities |
| ASI05 | Unexpected Code Execution, RCE |
| ASI06 | Memory and Context Poisoning |
| ASI07 | Insecure Inter Agent Communication |
| ASI08 | Cascading Failures |
| ASI09 | Human Agent Trust Exploitation |
| ASI10 | Rogue Agents |

**The two threads running through the whole list.** Identity, meaning managing the agent identity and permissions. Containment, meaning limiting autonomy and impact radius. Articulate those two and you cover most of the list.

**A framing worth quoting.** The distinction between LLM as a component and LLM as an actor. The moment a model gets tools, persistent memory, and execution rights, it is an actor, and you need both lists together.

### OWASP Top 10 for Web Applications, 2025

The eighth edition. If the exam asks about OWASP Top 10 in a web context, this is the current list.

| ID | Name | Note |
|---|---|---|
| A01 | Broken Access Control | Still first. SSRF was folded into this category |
| A02 | Security Misconfiguration | Rose from fifth to second |
| A03 | Software Supply Chain Failures | New category, an expansion of Vulnerable and Outdated Components |
| A04 | Cryptographic Failures | Dropped from second to fourth |
| A05 | Injection | Dropped from third to fifth. Includes SQLi and XSS |
| A06 | Insecure Design | Dropped from fourth to sixth |
| A07 | Authentication Failures | Slight rename from Identification and Authentication Failures |
| A08 | Software or Data Integrity Failures | |
| A09 | Security Logging and Alerting Failures | Renamed to stress alerting, not just monitoring |
| A10 | Mishandling of Exceptional Conditions | New category. Failing open, improper error handling |

**The point for the exam.** SSRF is no longer a standalone category. It is treated as an access control failure. That connects straight to cloud: SSRF reaching IMDS is the classic pipe for stealing role credentials.

### MITRE ATLAS

**Adversarial Threat Landscape for Artificial Intelligence Systems.** The parallel to ATT&CK, but for attacks on AI and ML systems. Structured as tactics and techniques with IDs in the AML format. Includes real case studies. Coverage of GenAI and agentic AI grew substantially in the 2025 and 2026 updates, with techniques such as RAG Poisoning and prompt injection.

**How to place the three standards in one answer.** OWASP LLM Top 10 is a risk list ordered by prevalence and impact, meant for building and prioritizing. MITRE ATLAS is a taxonomy of attacker behavior, meant for threat modeling and detection engineering. NIST AI RMF is a governance and risk management framework. They complement each other, they do not compete.

### MITRE ATT&CK, the cloud and container parts

**Containers, key techniques.** T1610 Deploy Container, deploying a container to run code or evade defenses. T1611 Escape to Host, breaking out of the container onto the host. T1613 Container and Resource Discovery. T1609 Container Administration Command. T1612 Build Image on Host. T1552.007 Container API, reaching secrets through the API.

**Cloud, key topics.** T1078.004 Valid Accounts, Cloud Accounts. T1580 Cloud Infrastructure Discovery. T1526 Cloud Service Discovery. T1098 Account Manipulation, including adding credentials to an identity. T1552.005 Unsecured Credentials, Cloud Instance Metadata API. That is IMDS. T1537 Transfer Data to Cloud Account.

---

## 5. Mapping the Frameworks to the Five Exam Sections

| Section | Weight | What to pull from this document |
|---|---|---|
| 1. Code and SQL | 25 percent | The rule template in section 3. Treat every query as a detection rule |
| 2. AI Security | 25 percent | LLM Top 10 in both editions, ASI Top 10, ATLAS, AI-SPM |
| 3. Cloud Security | 20 percent | CSPM, CIEM, attack paths, toxic combinations, IMDS, CIS Benchmarks |
| 4. Linux, Web, Containers | 20 percent | OWASP Web 2025, ATT&CK Containers, KSPM, Checkov |
| 5. Identity Security | 10 percent | ITDR, federation, Golden SAML, SAML versus OIDC |

---

## 6. Three Bridges from Your Background to This Role

**From Conditional Access to a posture rule.** A Conditional Access policy is exactly a posture rule: a condition on identity, device, and context, with exclusions and a decision between enforce and report only. Same muscle.

**From SniffGuard to detection engineering.** Mapping scan types to T1046 is exactly what a posture researcher does: take a behavior, map it to a framework, write a rule.

**From LLM red teaming to AI-SPM.** Your project is the offensive side. The role also needs the defensive side: which control prevents this, and how do you detect it in real time.

---

## 7. Sources

Cortex Cloud product page: https://www.paloaltonetworks.com/cortex/cloud
Cortex Cloud Posture Security: https://www.paloaltonetworks.com/cortex/cloud/cloud-posture-security
Cortex Cloud as the next version of Prisma Cloud: https://www.paloaltonetworks.com/blog/2025/02/announcing-innovations-cortex-cloud/
Cortex Cloud 2.0 announcement: https://investors.paloaltonetworks.com/news-releases/news-release-details/palo-alto-networks-ushers-autonomous-ai-workforce-cloud-security
CNAPP definition: https://www.paloaltonetworks.com/cyberpedia/what-is-a-cloud-native-application-protection-platform
CDR and toxic combinations: https://www.paloaltonetworks.com/cyberpedia/what-is-cloud-detection-and-response-cdr
Creating an attack path rule in Cortex Cloud: https://cortex-docs.paloaltonetworks.com/cortex-cloud-posture-management/cloud-security-rules-and-policies/create-and-manage-cloud-security-rules/create-an-attack-path-rule
XQL in Cortex Cloud: https://cortex-docs.paloaltonetworks.com/cortex-cloud-runtime-security/cortex-cloud-xql/build-xql-queries/xql-query-entities
OWASP Top 10 for LLM Applications 2025: https://owasp.org/www-project-top-10-for-large-language-model-applications/
OWASP Top 10 for LLM Applications 2026: https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/
OWASP Top 10 for Agentic Applications 2026: https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/
OWASP Top 10 for Web Applications 2025: https://owasp.org/Top10/2025/
MITRE ATLAS: https://atlas.mitre.org/
MITRE ATT&CK, T1611: https://attack.mitre.org/techniques/T1611/
