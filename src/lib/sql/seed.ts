import { addDays } from '../date.ts'

/**
 * Seed data for the query sandbox.
 *
 * The shape is not arbitrary. Each property below exists so that a specific
 * mistake produces a visibly wrong answer rather than a plausible one:
 *
 * - `is_public` holds TRUE, FALSE and NULL, so `= 0` and `IS NULL` return
 *   different non zero counts and forgetting NULL costs rows.
 * - Seven resources have no findings at all, so an anti join returns a real
 *   result set, and two of those are `ec2_instance` for the question that asks
 *   for exactly that.
 * - One account, identity-prod, has no findings and no public resources, so a
 *   LEFT JOIN that should show a zero has something to show it for, and an
 *   INNER JOIN silently loses it.
 * - One bucket carries nine findings and three CVEs, so a double join fans out
 *   to twenty seven rows and a naive SUM or COUNT is obviously inflated.
 * - `identities.last_used_at` holds NULLs and dates well past ninety days, so
 *   the two halves of the stale identity question are both non empty.
 *
 * Everything is deterministic: the same database on the phone and the laptop.
 */

type ResourceSpec = {
  id: string
  account: string
  type: string
  region: string
  name: string
  /** 1, 0 or null. Null means the scanner could not tell, which is its own risk. */
  isPublic: number | null
  createdDaysAgo: number
  findings: number
}

// A small fixed generator. No Math.random, so the seed data never shifts under
// the user between one session and the next.
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const ACCOUNTS: [string, string, string, string][] = [
  ['acc-101', 'aws', 'payments-prod', 'prod'],
  ['acc-102', 'aws', 'platform-prod', 'prod'],
  ['acc-103', 'azure', 'analytics-staging', 'staging'],
  ['acc-104', 'gcp', 'research-dev', 'dev'],
  ['acc-105', 'aws', 'data-dev', 'dev'],
  // No findings and no public resources. This is the account a LEFT JOIN must
  // still show, with a zero, and an INNER JOIN drops.
  ['acc-106', 'azure', 'identity-prod', 'prod'],
]

const RULES: [string, string, string, string, string][] = [
  ['rule-01', 'S3 bucket is publicly readable', 'cspm', 'CIS', 'high'],
  ['rule-02', 'Storage volume is not encrypted at rest', 'cspm', 'PCI-DSS', 'medium'],
  ['rule-03', 'Security group allows 0.0.0.0/0 on port 22', 'cspm', 'CIS', 'critical'],
  ['rule-04', 'Identity policy allows a wildcard action', 'ciem', 'CIS', 'critical'],
  ['rule-05', 'Identity unused for more than 90 days', 'ciem', 'custom', 'medium'],
  ['rule-06', 'Sensitive data in an internet reachable store', 'dspm', 'PCI-DSS', 'critical'],
  ['rule-07', 'Object storage access logging disabled', 'cspm', 'CIS', 'low'],
  ['rule-08', 'Exploitable CVE on an internet reachable host', 'vuln', 'custom', 'critical'],
  ['rule-09', 'Container runs privileged', 'cspm', 'CIS', 'high'],
  ['rule-10', 'Instance metadata service v1 still enabled', 'cspm', 'custom', 'high'],
]

// 40 resources. `findings` is fixed here rather than sampled so the counts the
// exercises depend on cannot drift.
const RESOURCES: ResourceSpec[] = [
  { id: 'res-01', account: 'acc-101', type: 's3_bucket', region: 'us-east-1', name: 'payments-exports', isPublic: 1, createdDaysAgo: 420, findings: 9 },
  { id: 'res-02', account: 'acc-101', type: 's3_bucket', region: 'us-east-1', name: 'payments-backups', isPublic: 0, createdDaysAgo: 400, findings: 2 },
  { id: 'res-03', account: 'acc-101', type: 'ec2_instance', region: 'us-east-1', name: 'payments-api-1', isPublic: 1, createdDaysAgo: 310, findings: 3 },
  { id: 'res-04', account: 'acc-101', type: 'ec2_instance', region: 'us-east-1', name: 'payments-api-2', isPublic: 0, createdDaysAgo: 310, findings: 2 },
  { id: 'res-05', account: 'acc-101', type: 'iam_role', region: 'us-east-1', name: 'payments-lambda-role', isPublic: null, createdDaysAgo: 300, findings: 2 },
  { id: 'res-06', account: 'acc-101', type: 'rds_instance', region: 'us-east-1', name: 'payments-db', isPublic: 0, createdDaysAgo: 380, findings: 2 },
  { id: 'res-07', account: 'acc-101', type: 'lambda_function', region: 'us-east-1', name: 'payments-settle', isPublic: null, createdDaysAgo: 210, findings: 2 },
  { id: 'res-08', account: 'acc-101', type: 's3_bucket', region: 'eu-west-1', name: 'payments-logs', isPublic: 0, createdDaysAgo: 365, findings: 2 },
  { id: 'res-09', account: 'acc-101', type: 'ec2_instance', region: 'eu-west-1', name: 'payments-worker', isPublic: 1, createdDaysAgo: 150, findings: 3 },

  { id: 'res-10', account: 'acc-102', type: 's3_bucket', region: 'us-west-2', name: 'platform-assets', isPublic: 1, createdDaysAgo: 500, findings: 3 },
  { id: 'res-11', account: 'acc-102', type: 's3_bucket', region: 'us-west-2', name: 'platform-artifacts', isPublic: 0, createdDaysAgo: 480, findings: 2 },
  { id: 'res-12', account: 'acc-102', type: 'ec2_instance', region: 'us-west-2', name: 'platform-edge-1', isPublic: 1, createdDaysAgo: 260, findings: 3 },
  // Public, scanned, and clean. An ec2_instance with no findings at all.
  { id: 'res-13', account: 'acc-102', type: 'ec2_instance', region: 'us-west-2', name: 'platform-edge-2', isPublic: 1, createdDaysAgo: 260, findings: 0 },
  { id: 'res-14', account: 'acc-102', type: 'iam_role', region: 'us-west-2', name: 'platform-ci-role', isPublic: null, createdDaysAgo: 240, findings: 2 },
  { id: 'res-15', account: 'acc-102', type: 'rds_instance', region: 'us-west-2', name: 'platform-db', isPublic: 0, createdDaysAgo: 470, findings: 2 },
  { id: 'res-16', account: 'acc-102', type: 'lambda_function', region: 'us-west-2', name: 'platform-hooks', isPublic: 0, createdDaysAgo: 190, findings: 2 },
  { id: 'res-17', account: 'acc-102', type: 'eks_cluster', region: 'us-west-2', name: 'platform-cluster', isPublic: 0, createdDaysAgo: 220, findings: 3 },

  { id: 'res-18', account: 'acc-103', type: 'storage_account', region: 'westeurope', name: 'analytics-raw', isPublic: 1, createdDaysAgo: 330, findings: 3 },
  { id: 'res-19', account: 'acc-103', type: 'storage_account', region: 'westeurope', name: 'analytics-curated', isPublic: 0, createdDaysAgo: 320, findings: 2 },
  { id: 'res-20', account: 'acc-103', type: 'vm_instance', region: 'westeurope', name: 'analytics-spark-1', isPublic: 0, createdDaysAgo: 180, findings: 2 },
  { id: 'res-21', account: 'acc-103', type: 'vm_instance', region: 'westeurope', name: 'analytics-spark-2', isPublic: null, createdDaysAgo: 180, findings: 2 },
  { id: 'res-22', account: 'acc-103', type: 'aks_cluster', region: 'westeurope', name: 'analytics-cluster', isPublic: 0, createdDaysAgo: 200, findings: 2 },
  { id: 'res-23', account: 'acc-103', type: 'key_vault', region: 'westeurope', name: 'analytics-secrets', isPublic: 0, createdDaysAgo: 340, findings: 2 },
  { id: 'res-24', account: 'acc-103', type: 'storage_account', region: 'northeurope', name: 'analytics-archive', isPublic: null, createdDaysAgo: 290, findings: 2 },

  { id: 'res-25', account: 'acc-104', type: 'gcs_bucket', region: 'us-central1', name: 'research-datasets', isPublic: 1, createdDaysAgo: 140, findings: 3 },
  { id: 'res-26', account: 'acc-104', type: 'gcs_bucket', region: 'us-central1', name: 'research-scratch', isPublic: null, createdDaysAgo: 120, findings: 2 },
  { id: 'res-27', account: 'acc-104', type: 'gke_cluster', region: 'us-central1', name: 'research-cluster', isPublic: 0, createdDaysAgo: 160, findings: 3 },
  { id: 'res-28', account: 'acc-104', type: 'vm_instance', region: 'us-central1', name: 'research-notebook', isPublic: 1, createdDaysAgo: 90, findings: 2 },
  { id: 'res-29', account: 'acc-104', type: 'service_account', region: 'us-central1', name: 'research-runner', isPublic: null, createdDaysAgo: 155, findings: 0 },
  { id: 'res-30', account: 'acc-104', type: 'bigquery_dataset', region: 'us-central1', name: 'research-warehouse', isPublic: 0, createdDaysAgo: 130, findings: 2 },

  { id: 'res-31', account: 'acc-105', type: 's3_bucket', region: 'us-east-2', name: 'data-dev-landing', isPublic: 1, createdDaysAgo: 100, findings: 3 },
  { id: 'res-32', account: 'acc-105', type: 's3_bucket', region: 'us-east-2', name: 'data-dev-staging', isPublic: 0, createdDaysAgo: 100, findings: 2 },
  // An ec2_instance with no findings, for the anti join question.
  { id: 'res-33', account: 'acc-105', type: 'ec2_instance', region: 'us-east-2', name: 'data-dev-etl', isPublic: 0, createdDaysAgo: 95, findings: 0 },
  { id: 'res-34', account: 'acc-105', type: 'iam_role', region: 'us-east-2', name: 'data-dev-role', isPublic: null, createdDaysAgo: 95, findings: 2 },
  { id: 'res-35', account: 'acc-105', type: 'rds_instance', region: 'us-east-2', name: 'data-dev-db', isPublic: 0, createdDaysAgo: 110, findings: 2 },
  { id: 'res-36', account: 'acc-105', type: 'lambda_function', region: 'us-east-2', name: 'data-dev-loader', isPublic: 1, createdDaysAgo: 80, findings: 0 },

  // identity-prod: nothing public, nothing found. The zero row a LEFT JOIN keeps.
  { id: 'res-37', account: 'acc-106', type: 'storage_account', region: 'eastus', name: 'identity-audit', isPublic: 0, createdDaysAgo: 260, findings: 0 },
  { id: 'res-38', account: 'acc-106', type: 'vm_instance', region: 'eastus', name: 'identity-idp-1', isPublic: 0, createdDaysAgo: 250, findings: 0 },
  { id: 'res-39', account: 'acc-106', type: 'key_vault', region: 'eastus', name: 'identity-signing', isPublic: 0, createdDaysAgo: 250, findings: 0 },
  { id: 'res-40', account: 'acc-106', type: 'storage_account', region: 'eastus', name: 'identity-logs', isPublic: 0, createdDaysAgo: 240, findings: 0 },
]

const SEVERITIES = ['critical', 'high', 'medium', 'low']
const STATUSES = ['open', 'open', 'open', 'resolved', 'suppressed']

// Every account that has findings gets at least one open critical, so the
// "top five accounts by open critical findings" question ranks five accounts.
const GUARANTEED_CRITICAL = new Set(['res-01', 'res-10', 'res-18', 'res-25', 'res-31'])

type IdentitySpec = {
  id: string
  account: string
  type: string
  name: string
  /** Days since last use, or null for an identity that has never been used. */
  lastUsedDaysAgo: number | null
}

const IDENTITIES: IdentitySpec[] = [
  { id: 'id-01', account: 'acc-101', type: 'user', name: 'deploy-bot', lastUsedDaysAgo: 2 },
  { id: 'id-02', account: 'acc-101', type: 'role', name: 'payments-lambda-role', lastUsedDaysAgo: 5 },
  { id: 'id-03', account: 'acc-101', type: 'role', name: 'payments-legacy-migrator', lastUsedDaysAgo: 220 },
  { id: 'id-04', account: 'acc-101', type: 'service_account', name: 'payments-nightly', lastUsedDaysAgo: null },
  { id: 'id-05', account: 'acc-102', type: 'user', name: 'platform-oncall', lastUsedDaysAgo: 1 },
  { id: 'id-06', account: 'acc-102', type: 'role', name: 'platform-ci-role', lastUsedDaysAgo: 3 },
  { id: 'id-07', account: 'acc-102', type: 'role', name: 'platform-terraform-2021', lastUsedDaysAgo: 640 },
  { id: 'id-08', account: 'acc-102', type: 'service_account', name: 'platform-metrics', lastUsedDaysAgo: 95 },
  { id: 'id-09', account: 'acc-103', type: 'user', name: 'analytics-analyst', lastUsedDaysAgo: 12 },
  { id: 'id-10', account: 'acc-103', type: 'role', name: 'analytics-spark-role', lastUsedDaysAgo: 130 },
  { id: 'id-11', account: 'acc-103', type: 'service_account', name: 'analytics-loader', lastUsedDaysAgo: null },
  { id: 'id-12', account: 'acc-104', type: 'user', name: 'research-intern', lastUsedDaysAgo: 190 },
  { id: 'id-13', account: 'acc-104', type: 'service_account', name: 'research-runner', lastUsedDaysAgo: 40 },
  { id: 'id-14', account: 'acc-104', type: 'role', name: 'research-admin', lastUsedDaysAgo: null },
  { id: 'id-15', account: 'acc-105', type: 'user', name: 'data-dev-owner', lastUsedDaysAgo: 60 },
  { id: 'id-16', account: 'acc-105', type: 'role', name: 'data-dev-role', lastUsedDaysAgo: 320 },
  { id: 'id-17', account: 'acc-105', type: 'service_account', name: 'data-dev-import-2020', lastUsedDaysAgo: 900 },
  { id: 'id-18', account: 'acc-106', type: 'user', name: 'identity-admin', lastUsedDaysAgo: 4 },
  { id: 'id-19', account: 'acc-106', type: 'role', name: 'identity-federation-role', lastUsedDaysAgo: null },
  { id: 'id-20', account: 'acc-106', type: 'service_account', name: 'identity-backup', lastUsedDaysAgo: null },
]

const PERMISSIONS: [string, string, string, string][] = [
  ['id-01', 's3:GetObject', 'arn:aws:s3:::payments-exports/*', 'Allow'],
  ['id-01', 's3:PutObject', 'arn:aws:s3:::payments-exports/*', 'Allow'],
  ['id-02', 's3:GetObject', 'arn:aws:s3:::payments-backups/*', 'Allow'],
  ['id-02', 'iam:PassRole', '*', 'Allow'],
  ['id-03', '*', '*', 'Allow'],
  ['id-03', 'iam:CreatePolicyVersion', 'arn:aws:iam::101:policy/payments-legacy', 'Allow'],
  ['id-04', 's3:ListBucket', 'arn:aws:s3:::payments-logs', 'Allow'],
  ['id-05', 'ec2:DescribeInstances', '*', 'Allow'],
  ['id-06', 'iam:PassRole', 'arn:aws:iam::102:role/platform-deploy', 'Allow'],
  ['id-06', 'lambda:CreateFunction', '*', 'Allow'],
  ['id-07', '*', '*', 'Allow'],
  ['id-08', 'cloudwatch:GetMetricData', '*', 'Allow'],
  ['id-09', 'storage:read', '/subscriptions/103/analytics-curated', 'Allow'],
  ['id-10', 'storage:write', '/subscriptions/103/analytics-raw', 'Allow'],
  ['id-10', 'keyvault:GetSecret', '/subscriptions/103/analytics-secrets', 'Allow'],
  ['id-11', 'storage:read', '/subscriptions/103/analytics-archive', 'Allow'],
  ['id-12', 'storage.objects.get', 'projects/104/research-datasets', 'Allow'],
  ['id-13', 'storage.objects.create', 'projects/104/research-scratch', 'Allow'],
  ['id-14', '*', '*', 'Allow'],
  ['id-14', 'iam.serviceAccounts.actAs', '*', 'Allow'],
  ['id-15', 's3:GetObject', 'arn:aws:s3:::data-dev-landing/*', 'Allow'],
  ['id-16', 'iam:PassRole', '*', 'Allow'],
  ['id-16', 'iam:CreatePolicyVersion', 'arn:aws:iam::105:policy/data-dev', 'Allow'],
  ['id-17', '*', '*', 'Allow'],
  ['id-18', 'keyvault:GetSecret', '/subscriptions/106/identity-signing', 'Allow'],
  ['id-18', 'keyvault:Delete', '/subscriptions/106/identity-signing', 'Deny'],
  ['id-19', 'storage:read', '/subscriptions/106/identity-audit', 'Allow'],
  ['id-20', 'storage:read', '/subscriptions/106/identity-logs', 'Allow'],
  ['id-20', 'storage:delete', '*', 'Deny'],
  ['id-05', 'ssm:StartSession', '*', 'Allow'],
]

/** CVEs, weighted so that public resources carry the exploitable ones. */
const VULNERABILITIES: [string, string, string, number, number][] = [
  ['CVE-2024-3094', 'res-01', 'xz-utils', 10.0, 1],
  ['CVE-2023-44487', 'res-01', 'nghttp2', 7.5, 1],
  ['CVE-2022-22965', 'res-01', 'spring-core', 9.8, 0],
  ['CVE-2021-44228', 'res-03', 'log4j-core', 10.0, 1],
  ['CVE-2023-38545', 'res-03', 'curl', 9.8, 0],
  ['CVE-2024-6387', 'res-09', 'openssh-server', 8.1, 1],
  ['CVE-2023-4863', 'res-09', 'libwebp', 8.8, 1],
  ['CVE-2022-3602', 'res-04', 'openssl', 7.5, 0],
  ['CVE-2021-3156', 'res-06', 'sudo', 7.8, 0],
  ['CVE-2024-3094', 'res-10', 'xz-utils', 10.0, 1],
  ['CVE-2023-44487', 'res-12', 'nghttp2', 7.5, 1],
  ['CVE-2022-42889', 'res-12', 'commons-text', 9.8, 0],
  ['CVE-2021-44228', 'res-13', 'log4j-core', 10.0, 1],
  ['CVE-2023-38545', 'res-15', 'curl', 9.8, 0],
  ['CVE-2024-21626', 'res-17', 'runc', 8.6, 1],
  ['CVE-2023-2728', 'res-17', 'kube-apiserver', 6.5, 0],
  ['CVE-2024-3094', 'res-18', 'xz-utils', 10.0, 1],
  ['CVE-2023-4863', 'res-20', 'libwebp', 8.8, 0],
  ['CVE-2022-0847', 'res-20', 'linux-kernel', 7.8, 1],
  ['CVE-2024-21626', 'res-22', 'runc', 8.6, 1],
  ['CVE-2023-44487', 'res-25', 'nghttp2', 7.5, 1],
  ['CVE-2021-44228', 'res-25', 'log4j-core', 10.0, 1],
  ['CVE-2023-38545', 'res-27', 'curl', 9.8, 0],
  ['CVE-2024-6387', 'res-28', 'openssh-server', 8.1, 1],
  ['CVE-2022-3602', 'res-30', 'openssl', 7.5, 0],
  ['CVE-2024-3094', 'res-31', 'xz-utils', 10.0, 1],
  ['CVE-2023-4863', 'res-31', 'libwebp', 8.8, 0],
  ['CVE-2021-3156', 'res-33', 'sudo', 7.8, 0],
  ['CVE-2023-38545', 'res-35', 'curl', 9.8, 0],
  // identity-prod carries a CVE too, but on a resource that is not public, so
  // the "public and exploitable" count for that account is still zero.
  ['CVE-2022-0847', 'res-38', 'linux-kernel', 7.8, 1],
]

// ------------------------------------------------------------------ helpers

function quote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

function sqlValue(value: string | number | null): string {
  if (value === null) return 'NULL'
  if (typeof value === 'number') return String(value)
  return quote(value)
}

function insert(table: string, columns: string[], rows: (string | number | null)[][]): string {
  const values = rows.map((row) => `  (${row.map(sqlValue).join(', ')})`).join(',\n')
  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES\n${values};`
}

function timestamp(today: string, daysAgo: number, hour: number, minute: number): string {
  const day = addDays(today, -daysAgo)
  return `${day} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
}

export type SeedCounts = {
  accounts: number
  rules: number
  resources: number
  findings: number
  identities: number
  permissions: number
  vulnerabilities: number
}

/**
 * INSERT statements for the whole database. Dates are relative to `today` so
 * that "not used in the last 90 days" stays true whenever the app is opened.
 */
export function seedStatements(today: string): { statements: string[]; counts: SeedCounts } {
  const random = mulberry32(20260903)

  const accountRows = ACCOUNTS.map(([id, provider, name, environment]) => [id, provider, name, environment])

  const ruleRows = RULES.map(([id, name, category, framework, severity]) => [id, name, category, framework, severity])

  const resourceRows = RESOURCES.map((resource) => [
    resource.id,
    resource.account,
    resource.type,
    resource.region,
    resource.name,
    resource.isPublic,
    timestamp(today, resource.createdDaysAgo, 9, 15),
  ])

  const findingRows: (string | number | null)[][] = []
  let findingId = 9001
  for (const resource of RESOURCES) {
    for (let n = 0; n < resource.findings; n++) {
      const forceCritical = n === 0 && GUARANTEED_CRITICAL.has(resource.id)
      const severity = forceCritical ? 'critical' : (SEVERITIES[Math.floor(random() * SEVERITIES.length)] ?? 'medium')
      const status = forceCritical ? 'open' : (STATUSES[Math.floor(random() * STATUSES.length)] ?? 'open')
      const rule = RULES[Math.floor(random() * RULES.length)]
      const firstSeenDaysAgo = 20 + Math.floor(random() * 200)
      const lastSeenDaysAgo = Math.floor(random() * 15)
      findingRows.push([
        findingId,
        resource.id,
        rule ? rule[0] : 'rule-01',
        severity,
        status,
        timestamp(today, firstSeenDaysAgo, 3, 40),
        timestamp(today, lastSeenDaysAgo, 3, 40),
      ])
      findingId += 1
    }
  }

  const identityRows = IDENTITIES.map((identity) => [
    identity.id,
    identity.account,
    identity.type,
    identity.name,
    identity.lastUsedDaysAgo === null ? null : timestamp(today, identity.lastUsedDaysAgo, 14, 5),
  ])

  const permissionRows = PERMISSIONS.map(([identity, action, scope, effect], index) => [
    5001 + index,
    identity,
    action,
    scope,
    effect,
  ])

  const vulnerabilityRows = VULNERABILITIES.map(([cve, resource, packageName, score, exploit]) => [
    cve,
    resource,
    packageName,
    score,
    exploit,
  ])

  const statements = [
    insert('cloud_accounts', ['account_id', 'provider', 'account_name', 'environment'], accountRows),
    insert('rules', ['rule_id', 'rule_name', 'category', 'framework', 'default_severity'], ruleRows),
    insert(
      'resources',
      ['resource_id', 'account_id', 'resource_type', 'region', 'name', 'is_public', 'created_at'],
      resourceRows,
    ),
    insert(
      'findings',
      ['finding_id', 'resource_id', 'rule_id', 'severity', 'status', 'first_seen', 'last_seen'],
      findingRows,
    ),
    insert('identities', ['identity_id', 'account_id', 'identity_type', 'name', 'last_used_at'], identityRows),
    insert('permissions', ['permission_id', 'identity_id', 'action', 'resource_scope', 'effect'], permissionRows),
    insert(
      'vulnerabilities',
      ['cve_id', 'resource_id', 'package_name', 'cvss_score', 'exploit_available'],
      vulnerabilityRows,
    ),
  ]

  return {
    statements,
    counts: {
      accounts: accountRows.length,
      rules: ruleRows.length,
      resources: resourceRows.length,
      findings: findingRows.length,
      identities: identityRows.length,
      permissions: permissionRows.length,
      vulnerabilities: vulnerabilityRows.length,
    },
  }
}
