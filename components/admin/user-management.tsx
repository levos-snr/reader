"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function UserManagement() {
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const limit = 20;
  
  const isAdmin = useQuery(api.admin.isAdmin);
  const users = useQuery(api.admin.getAllUsers, {
    limit,
    skip: page * limit,
  });
  const searchResults = useQuery(
    api.admin.searchUsers,
    searchQuery ? { query: searchQuery } : "skip"
  );
  
  const updateRole = useMutation(api.admin.updateUserRole);
  const updateBanStatus = useMutation(api.admin.updateUserBanStatus);
  const deleteUserMutation = useMutation(api.admin.deleteUser);
  
  if (isAdmin === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-background">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-4 border-border border-t-primary animate-spin mx-auto mb-4"></div>
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] bg-background p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl sm:text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            You must be an admin to view this page.
          </p>
        </div>
      </div>
    );
  }
  
  const displayUsers = searchQuery ? searchResults : users?.users;
  
  if (!displayUsers) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-background">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-4 border-border border-t-primary animate-spin mx-auto mb-4"></div>
          <div className="text-muted-foreground">Loading users...</div>
        </div>
      </div>
    );
  }
  
  const handleRoleChange = async (authId: string, role: "admin" | "user") => {
    try {
      await updateRole({ authId, role });
      alert("Role updated successfully");
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };
  
  const handleBanToggle = async (authId: string, currentBanStatus: boolean) => {
    try {
      await updateBanStatus({ authId, banned: !currentBanStatus });
      alert(`User ${!currentBanStatus ? "banned" : "unbanned"} successfully`);
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };
  
  const handleDelete = async (authId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this user? This action cannot be undone and will delete all their courses, materials, and quizzes."
      )
    ) {
      return;
    }
    
    try {
      await deleteUserMutation({ authId });
      alert("User deleted successfully");
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };
  
  return (
    <div className="min-h-[60vh] bg-background transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">User Management</h1>
        </div>
        
        {/* Search Bar */}
        <div className="mb-4 sm:mb-6">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md px-4 py-2 sm:py-3 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors duration-200 text-sm sm:text-base"
          />
        </div>
        
        {/* Table - Responsive */}
        <div className="overflow-x-auto rounded-lg shadow-lg border border-border">
          <table className="min-w-full bg-card border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-3 sm:px-6 py-3 sm:py-4 border-b border-border text-left text-xs sm:text-sm font-semibold text-foreground">
                  Name
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 border-b border-border text-left text-xs sm:text-sm font-semibold text-foreground hidden sm:table-cell">
                  Email
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 border-b border-border text-left text-xs sm:text-sm font-semibold text-foreground">
                  Role
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 border-b border-border text-left text-xs sm:text-sm font-semibold text-foreground">
                  Status
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 border-b border-border text-left text-xs sm:text-sm font-semibold text-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayUsers.map((user) => (
                <tr 
                  key={user._id} 
                  className={`${
                    user.banned
                      ? "bg-destructive/10 dark:bg-destructive/20"
                      : "hover:bg-card/50"
                  } transition-colors duration-150`}
                >
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-foreground">
                    <div className="flex flex-col">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-muted-foreground sm:hidden text-xs mt-1">
                        {user.email}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-muted-foreground hidden sm:table-cell">
                    {user.email}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <select
                      value={user.role || "user"}
                      onChange={(e) =>
                        handleRoleChange(user.authId, e.target.value as "admin" | "user")
                      }
                      className="px-2 sm:px-3 py-1 sm:py-1.5 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-xs sm:text-sm transition-colors duration-200"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    {user.banned ? (
                      <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/20 text-destructive">
                        Banned
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => handleBanToggle(user.authId, user.banned || false)}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-white text-xs sm:text-sm font-medium transition-colors duration-200 ${
                          user.banned
                            ? "bg-primary hover:bg-primary/90"
                            : "bg-accent hover:bg-accent/90"
                          }`}
                      >
                        {user.banned ? "Unban" : "Ban"}
                      </button>
                      <button
                        onClick={() => handleDelete(user.authId)}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 bg-destructive hover:bg-destructive/90 text-white rounded-md text-xs sm:text-sm font-medium transition-colors duration-200"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!searchQuery && users && (
          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-4 items-center justify-between bg-card px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-lg border border-border">
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 sm:px-5 py-2 sm:py-2.5 bg-primary hover:bg-primary/90 text-white rounded-md font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * limit >= users.total}
                className="px-4 sm:px-5 py-2 sm:py-2.5 bg-primary hover:bg-primary/90 text-white rounded-md font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
              >
                Next
              </button>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <span className="text-muted-foreground font-medium">
                Page {page + 1} of {Math.ceil(users.total / limit)}
              </span>
              <span className="text-muted-foreground">
                Total users: <span className="font-semibold text-foreground">{users.total}</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
