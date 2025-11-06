import { createAccessControl } from "better-auth/plugins/access"
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access"

// Define the access control statement with resources and actions
const statement = {
  ...defaultStatements,
  course: ["create", "read", "update", "delete", "publish"],
  quiz: ["create", "read", "update", "delete"],
  material: ["create", "read", "update", "delete"],
} as const

const ac = createAccessControl(statement)

// Define roles with their permissions
export const userRole = ac.newRole({
  course: ["read"],
  quiz: ["read"],
  material: ["read"],
  user: [],
})

export const instructorRole = ac.newRole({
  course: ["create", "read", "update", "publish"],
  quiz: ["create", "read", "update"],
  material: ["create", "read", "update"],
  user: [],
})

export const adminRole = ac.newRole({
  course: ["create", "read", "update", "delete", "publish"],
  quiz: ["create", "read", "update", "delete"],
  material: ["create", "read", "update", "delete"],
  ...adminAc.statements, // Includes all admin permissions for user and session management
})

export { ac }
