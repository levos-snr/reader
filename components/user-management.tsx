"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Trash2,
  Edit,
  Search,
  UserPlus,
  Mail,
  User,
  Calendar,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";

export function UserManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const users = useQuery(api.users.listUsers, { limit: 50 });
  const deleteUserMutation = useMutation(api.users.deleteUser);
  const updateUserMutation = useMutation(api.users.updateUserProfile);

  const filteredUsers = users?.users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleDeleteUser = async (userId: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteUserMutation({ userId });
      } catch (error) {
        console.error("Failed to delete user:", error);
      }
    }
  };

  const handleUpdateUser = async (userId: string, data: any) => {
    try {
      await updateUserMutation({ userId, ...data });
      setEditingUser(null);
    } catch (error) {
      console.error("Failed to update user:", error);
    }
  };

  return (
    <div className="space-y-6 mt-18">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold">User Management</h2>
          <p className="text-muted-foreground mt-1">
            Total users: {users?.total || 0}
          </p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)}>
          <UserPlus className="w-4 h-4 mr-2" />
          New User
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers?.map((user) => (
          <Card
            key={user._id}
            className="p-4 hover:border-primary/50 transition-colors"
          >
            {editingUser?._id === user._id ? (
              <div className="space-y-3">
                <Input
                  value={editingUser.name}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, name: e.target.value })
                  }
                  placeholder="Name"
                />
                <Input
                  value={editingUser.email}
                  disabled
                  placeholder="Email"
                  className="opacity-50"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      handleUpdateUser(user.userId, {
                        name: editingUser.name,
                      })
                    }
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingUser(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{user.name}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {user.createdAt && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  )}

                  {user.phoneNumber && (
                    <p className="text-xs text-muted-foreground">
                      Phone: {user.phoneNumber}
                    </p>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingUser(user)}
                      className="flex-1"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteUser(user.userId)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        ))}
      </div>

      {filteredUsers?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No users found
        </div>
      )}
    </div>
  );
}
