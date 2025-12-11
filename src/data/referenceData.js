export const roles = [
  {
    id: 'admin',
    name: 'Platform Admin',
    description: 'Full access across the platform',
    permissions: [
      'user:view',
      'user:edit',
      'user:create',
      'user:deactivate',
      'role:manage',
      'sales:view',
      'sales:edit',
      'sales:refund',
      'session:view',
      'session:terminate',
      'feature:view',
      'feature:toggle',
      'audit:view',
      'audit:export',
      'sso:manage'
    ]
  },
  {
    id: 'sales',
    name: 'Sales Manager',
    description: 'Manage orders and refunds',
    permissions: ['sales:view', 'sales:edit', 'sales:refund', 'audit:view']
  },
  {
    id: 'support',
    name: 'Support Agent',
    description: 'Assist with customer accounts and sessions',
    permissions: ['user:view', 'session:view', 'session:terminate', 'sales:view']
  }
];

export const users = [
  {
    id: 'u1',
    email: 'ava@codex.io',
    name: 'Ava Winters',
    status: 'active',
    roles: ['admin'],
    mfa: true,
    lastLogin: '2025-02-11T09:12:00Z'
  },
  {
    id: 'u2',
    email: 'sam.sales@codex.io',
    name: 'Sam Carter',
    status: 'active',
    roles: ['sales'],
    mfa: false,
    lastLogin: '2025-02-10T19:24:00Z'
  },
  {
    id: 'u3',
    email: 'taylor.support@codex.io',
    name: 'Taylor Brooks',
    status: 'suspended',
    roles: ['support'],
    mfa: true,
    lastLogin: '2025-02-09T17:45:00Z'
  }
];

export const orders = [
  {
    id: 'ord-1452',
    customer: 'Sierra Glass',
    status: 'processing',
    total: 18425,
    currency: 'USD',
    placedAt: '2025-02-11T03:40:00Z',
    items: [
      { sku: 'SG-14', name: 'Security Gateway', quantity: 1, unit: 12500 },
      { sku: 'ST-4', name: 'Support Tier', quantity: 1, unit: 5925 }
    ],
    refunds: []
  },
  {
    id: 'ord-1411',
    customer: 'Nova Labs',
    status: 'shipped',
    total: 9240,
    currency: 'USD',
    placedAt: '2025-02-07T13:10:00Z',
    items: [{ sku: 'NL-1', name: 'Notebook Pro', quantity: 2, unit: 4620 }],
    refunds: [
      { id: 'ref-100', amount: 4620, currency: 'USD', reason: 'Damaged in transit', processedBy: 'u2' }
    ]
  },
  {
    id: 'ord-1331',
    customer: 'Beacon Industries',
    status: 'refunded',
    total: 13250,
    currency: 'USD',
    placedAt: '2025-02-01T09:45:00Z',
    items: [{ sku: 'BI-33', name: 'Beacon Router', quantity: 5, unit: 2650 }],
    refunds: [{ id: 'ref-99', amount: 13250, currency: 'USD', reason: 'Recall', processedBy: 'u1' }]
  }
];

export const sessions = [
  {
    id: 'sess-1001',
    userId: 'u1',
    ip: '192.168.0.4',
    userAgent: 'Firefox on macOS',
    issuedAt: '2025-02-11T08:00:00Z',
    expiresAt: '2025-02-11T18:00:00Z',
    active: true
  },
  {
    id: 'sess-1002',
    userId: 'u2',
    ip: '172.16.0.14',
    userAgent: 'Chrome on Windows',
    issuedAt: '2025-02-10T16:00:00Z',
    expiresAt: '2025-02-10T22:00:00Z',
    active: false,
    terminatedBy: 'u1'
  }
];

export const featureFlags = [
  {
    id: 'ff-1',
    key: 'new-dashboard',
    description: 'Serve new dashboard layout',
    enabled: true,
    rollout: 'global',
    overrides: [{ target: 'role:sales', enabled: true }]
  },
  {
    id: 'ff-2',
    key: 'fraud-guard',
    description: 'Activate fraud heuristics for orders',
    enabled: false,
    rollout: 'percentage',
    rolloutValue: 25,
    overrides: [{ target: 'user:u1', enabled: true }]
  }
];

export const auditLogs = [
  {
    id: 'log-1',
    actor: 'Ava Winters',
    action: 'role:update',
    entity: 'Platform Admin',
    timestamp: '2025-02-10T14:10:00Z',
    metadata: 'Added audit:export permission'
  },
  {
    id: 'log-2',
    actor: 'Sam Carter',
    action: 'order:refund',
    entity: 'ord-1411',
    timestamp: '2025-02-09T11:02:00Z',
    metadata: 'Refund 4620 USD'
  },
  {
    id: 'log-3',
    actor: 'Taylor Brooks',
    action: 'session:terminate',
    entity: 'sess-1002',
    timestamp: '2025-02-08T09:33:00Z',
    metadata: 'Security review forced termination'
  }
];

export const loginEvents = [
  {
    id: 'le-1',
    user: 'Ava Winters',
    result: 'success',
    occurredAt: '2025-02-11T09:12:00Z',
    ip: '192.168.0.4'
  },
  {
    id: 'le-2',
    user: 'Sam Carter',
    result: 'failure',
    occurredAt: '2025-02-11T08:49:00Z',
    ip: '10.0.1.20',
    reason: 'Invalid password'
  },
  {
    id: 'le-3',
    user: 'Taylor Brooks',
    result: 'success',
    occurredAt: '2025-02-10T18:22:00Z',
    ip: '172.16.0.14'
  }
];

export const ssoConnections = [
  {
    id: 'sso-1',
    orgId: 'org-northwind',
    orgName: 'Northwind Mediation',
    orgKey: 'northwind',
    protocol: 'OIDC',
    provider: 'Okta',
    providerKey: 'okta',
    displayName: 'Northwind Okta',
    status: 'Published',
    enforcement: 'Required',
    policy: {
      allowLocalFallback: false,
      jitProvisioning: true,
      allowedGroups: ['Mediators', 'Paralegals'],
      sessionTtlMinutes: 60,
      refreshTtlMinutes: 1440,
      mfaRequirement: 'Honor IdP MFA context',
      clockSkewSeconds: 120
    },
    authUrl: 'https://northwind.okta.com/oauth2/default/v1/authorize',
    tokenUrl: 'https://northwind.okta.com/oauth2/default/v1/token',
    metadataUrl: 'https://northwind.okta.com/oauth2/default/.well-known/openid-configuration',
    audience: 'api://client-portal',
    clientId: 'okta-northwind-client',
    redirectUrls: ['https://client.vmh.io/auth/sso/northwind/callback'],
    attributeMap: { email: 'email', name: 'name', role: 'groups' },
    domains: [
      { domain: 'northwindmediators.com', verifiedAt: '2025-02-06T12:00:00Z' },
      { domain: 'northwind-vmh.com', verifiedAt: '2025-02-06T12:00:00Z' }
    ],
    branding: { buttonText: 'Continue with Northwind SSO' },
    lastTestedAt: '2025-02-11T08:45:00Z',
    version: 4,
    health: {
      lastSuccess: '2025-02-11T09:12:00Z',
      lastFailure: '2025-02-11T06:18:00Z',
      errorCode: 'clock_skew_detected',
      metadataExpiry: '2025-03-14T00:00:00Z'
    }
  },
  {
    id: 'sso-2',
    orgId: 'org-beacon',
    orgName: 'Beacon Family Group',
    orgKey: 'beacon',
    protocol: 'SAML',
    provider: 'AzureAD',
    providerKey: 'azuread',
    displayName: 'Beacon AzureAD',
    status: 'Pilot',
    enforcement: 'Optional',
    policy: {
      allowLocalFallback: true,
      jitProvisioning: false,
      allowedGroups: ['Mediation Team'],
      sessionTtlMinutes: 90,
      refreshTtlMinutes: 2160,
      mfaRequirement: 'Require when IdP not asserted',
      clockSkewSeconds: 60
    },
    metadataUrl: 'https://login.microsoftonline.com/<tenant>/federationmetadata/2007-06/federationmetadata.xml',
    audience: 'urn:vmh:client-portal',
    certificate: '-----BEGIN CERTIFICATE-----...-----END CERTIFICATE-----',
    redirectUrls: [
      'https://client.vmh.io/auth/sso/beacon/callback',
      'https://staging-client.vmh.io/auth/sso/beacon/callback'
    ],
    attributeMap: { email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress', name: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name', role: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups' },
    domains: [
      { domain: 'beaconfamily.org', verifiedAt: '2025-02-05T10:00:00Z' }
    ],
    branding: { buttonText: 'Sign in with Beacon SSO' },
    lastTestedAt: '2025-02-10T15:20:00Z',
    version: 2,
    health: {
      lastSuccess: '2025-02-11T07:55:00Z',
      lastFailure: null,
      errorCode: null,
      metadataExpiry: '2025-04-01T00:00:00Z'
    }
  }
];
