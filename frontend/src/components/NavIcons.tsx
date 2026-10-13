import type { ReactNode } from 'react'

function IconFrame({ children }: { children: ReactNode }) {
  return (
    <svg
      className="nav-icon-svg"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function IconDashboard() {
  return (
    <IconFrame>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </IconFrame>
  )
}

export function IconMaterials() {
  return (
    <IconFrame>
      <path
        d="M12 3.5 19.5 8v8L12 20.5 4.5 16V8L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 12v8.5M12 12 19.5 8M12 12 4.5 8" stroke="currentColor" strokeWidth="1.5" />
    </IconFrame>
  )
}

export function IconRecipes() {
  return (
    <IconFrame>
      <path
        d="M7 4.5h8.5A2.5 2.5 0 0 1 18 7v12.5H8.5A2.5 2.5 0 0 1 6 17V6a1.5 1.5 0 0 1 1.5-1.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9.5 9h6M9.5 12.5h6M9.5 16h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </IconFrame>
  )
}

export function IconInventory() {
  return (
    <IconFrame>
      <path
        d="M4.5 8.5 12 4.5l7.5 4v7l-7.5 4-7.5-4v-7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M4.5 8.5 12 12.5l7.5-4M12 12.5V20.5" stroke="currentColor" strokeWidth="1.5" />
    </IconFrame>
  )
}

export function IconOrders() {
  return (
    <IconFrame>
      <path
        d="M7 7h12.5l-1.2 8.2a2 2 0 0 1-2 1.7H9.4a2 2 0 0 1-2-1.6L6 4.5H4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="19.5" r="1.2" fill="currentColor" />
      <circle cx="16.5" cy="19.5" r="1.2" fill="currentColor" />
    </IconFrame>
  )
}

export function IconSuppliers() {
  return (
    <IconFrame>
      <path
        d="M4.5 18.5V9.2L12 4.5l7.5 4.7v8.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9.5 18.5v-5h5v5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </IconFrame>
  )
}

export function IconCustomers() {
  return (
    <IconFrame>
      <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4.5 18c.9-2.4 2.6-3.6 4.5-3.6s3.6 1.2 4.5 3.6M14 14.5c1.4 0 2.7.7 3.5 2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </IconFrame>
  )
}

export function IconPurchases() {
  return (
    <IconFrame>
      <path
        d="M5 7.5h14M7.5 7.5v10a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5v-10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M9.5 4.5h5v3h-5v-3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </IconFrame>
  )
}

export function IconReports() {
  return (
    <IconFrame>
      <path d="M5 19.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7.5 16V10M12 16V6.5M16.5 16v-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </IconFrame>
  )
}
