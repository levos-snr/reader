"use client";

import type React from "react";
import { authClient } from "@/lib/auth-client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePermissions } from "@/hooks/use-permissions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, UserPlus, Users, LayoutGrid, Loader2 } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function AdminPanelExample() {
  const { isAdmin, role, userRoleData } = usePermissions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [selectedRole, setSelectedRole] = useState("user");
  const [users, setUsers] = useState<any[]>([]);
  const usersQuery = useQuery(api.admin.getAllUsers, { limit: 10, skip: 0 });
  const [isLoading, setIsLoading] = useState(false);

  // Show loading state while checking permissions
  if (userRoleData === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Only show to admins
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12">
        <div className="max-w-2xl mx-auto text-center">
          <Shield className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl sm:text-2xl font-semibold mb-2">Access Denied</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
          You don't have permission to access this page.
        </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2">
            Current role: <span className="font-semibold text-foreground">{role}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-4">
          If you believe you should have access, please contact an administrator.
        </p>
        </div>
      </div>
    );
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await authClient.admin.createUser({
        email,
        password,
        name,
        role: selectedRole,
      });

      if (error) {
        toast.error(error.message || "Failed to create user");
      } else {
        toast.success("User created successfully!");
        setEmail("");
        setPassword("");
        setName("");
        setSelectedRole("user");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleListUsers = async () => {
    setIsLoading(true);
    try {
      if (usersQuery?.users) {
        setUsers(usersQuery.users);
        toast.success(`Found ${usersQuery.total || usersQuery.users.length} users`);
      } else {
        toast.error("Failed to fetch users");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await authClient.admin.setRole({
        userId,
        role: newRole,
      });

      if (error) {
        toast.error(error.message || "Failed to update role");
      } else {
        toast.success("Role updated successfully!");
        handleListUsers();
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    }
  };

  const handleBanUser = async (userId: string) => {
    try {
      const { error } = await authClient.admin.banUser({
        userId,
        banReason: "Banned by admin",
      });

      if (error) {
        toast.error(error.message || "Failed to ban user");
      } else {
        toast.success("User banned successfully!");
        handleListUsers();
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20 sm:pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 space-y-6 sm:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage users, permissions, and system settings. Current role:{" "}
            <span className="font-semibold text-primary">{role}</span>
          </p>
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-4 sm:p-6 hover:border-primary/50 transition cursor-pointer">
            <Link href="/dashboard/admin/users" className="flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-base sm:text-lg">User Management</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  View, edit, and manage all users in organized cards
                </p>
              </div>
            </Link>
          </Card>

          <Card className="p-4 sm:p-6 hover:border-primary/50 transition cursor-pointer">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <LayoutGrid className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-base sm:text-lg">Quick Tools</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Create users and manage permissions below
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Create User Section */}
        <Card className="p-4 sm:p-6 border">
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
            <h2 className="text-xl sm:text-2xl font-semibold">Create New User</h2>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background mt-2 text-foreground"
                >
                  <option value="user">User</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} size="lg" className="w-full sm:w-auto">
              {isLoading ? "Creating..." : "Create User"}
            </Button>
          </form>
        </Card>

        {/* List Users Section */}
        <Card className="p-4 sm:p-6 border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              <h2 className="text-xl sm:text-2xl font-semibold">Quick User List</h2>
            </div>
            <Button onClick={handleListUsers} disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? "Loading..." : "Load Users"}
            </Button>
          </div>

          <div className="text-xs sm:text-sm text-muted-foreground mb-4">
            For a better user management experience with search and filtering,{" "}
            <Link href="/dashboard/admin/users" className="text-primary hover:underline">
              go to the dedicated User Management page
            </Link>
            .
          </div>

          {users.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-card/50 transition gap-3 sm:gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base truncate">{user.name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {user.email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Role:{" "}
                      <span className="font-semibold text-foreground">
                        {user.role || "user"}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={user.role || "user"}
                      onChange={(e) => handleSetRole(user.id, e.target.value)}
                      className="h-9 px-3 rounded-md border border-input bg-background text-xs sm:text-sm text-foreground"
                    >
                      <option value="user">User</option>
                      <option value="instructor">Instructor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleBanUser(user.id)}
                      className="text-xs sm:text-sm"
                    >
                      Ban
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8 text-sm sm:text-base">
              No users loaded. Click "Load Users" to fetch users.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
