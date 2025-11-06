"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone, Calendar, Edit2, Save, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

interface UserProfileProps {
  userId: string;
}

export function UserProfile({ userId }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    displayUsername: "",
  });

  const user = useQuery(api.users.getUserById, { userId });
  const updateUserMutation = useMutation(api.users.updateUserProfile);

  // Initialize form when user data loads
  useEffect(() => {
  if (user && !formData.name) {
    setFormData({
      name: user.name || "",
      phoneNumber: user.phoneNumber || "",
      displayUsername: user.displayUsername || "",
    });
  }
  }, [user, formData.name]);

  const handleSave = async () => {
    try {
      await updateUserMutation({
        userId,
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        displayUsername: formData.displayUsername,
      });
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-8 sm:py-12">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-4 border-border border-t-primary animate-spin mx-auto mb-4"></div>
        <div className="text-muted-foreground">Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">My Profile</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage your account information
          </p>
        </div>
        {!isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>

      <Card className="p-4 sm:p-6 border-border bg-card">
        <div className="space-y-4 sm:space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">
                {user.name}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>

          <div className="border-t border-border pt-4 sm:pt-6">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-sm sm:text-base">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your full name"
                    className="mt-2 bg-background border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="flex items-center gap-2 text-sm sm:text-base">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    value={user.email}
                    disabled
                    className="mt-2 opacity-50 bg-muted border-border"
                  />
                  <p className="text-xs text-muted-foreground mt-2">Email cannot be changed</p>
                </div>

                <div>
                  <Label htmlFor="displayUsername" className="text-sm sm:text-base">
                    Display Username
                  </Label>
                  <Input
                    id="displayUsername"
                    value={formData.displayUsername}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        displayUsername: e.target.value,
                      })
                    }
                    placeholder="How others see you"
                    className="mt-2 bg-background border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="flex items-center gap-2 text-sm sm:text-base">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, phoneNumber: e.target.value })
                    }
                    placeholder="+1 (555) 000-0000"
                    className="mt-2 bg-background border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-4">
                  <Button onClick={handleSave} className="w-full sm:w-auto">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="w-full sm:w-auto"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Full Name</p>
                  <p className="text-base sm:text-lg font-semibold mt-1 text-foreground">
                    {user.name}
                  </p>
                </div>

                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </p>
                  <p className="text-base sm:text-lg font-semibold mt-1 text-foreground truncate">
                    {user.email}
                  </p>
                </div>

                {user.displayUsername && (
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Display Username</p>
                    <p className="text-base sm:text-lg font-semibold mt-1 text-foreground">
                      {user.displayUsername}
                    </p>
                  </div>
                )}

                {user.phoneNumber && (
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone Number
                    </p>
                    <p className="text-base sm:text-lg font-semibold mt-1 text-foreground">
                      {user.phoneNumber}
                    </p>
                  </div>
                )}

                {user.createdAt && (
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Member Since
                    </p>
                    <p className="text-base sm:text-lg font-semibold mt-1 text-foreground">
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
