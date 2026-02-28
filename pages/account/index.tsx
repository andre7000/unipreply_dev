import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserType } from "@/types/profile";

export default function Account() {
  const { currentUser, loading } = useAuth();
  const { profile, loading: profileLoading, createProfile, setProfile, error } = useUserProfile(currentUser);
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [userType, setUserType] = useState<UserType | "">("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push("/");
    }
  }, [currentUser, loading, router]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? "");
      setUserType(profile.userType);
    } else if (currentUser?.displayName) {
      setDisplayName(currentUser.displayName);
    }
  }, [profile, currentUser?.displayName]);

  const isNewUser = !profileLoading && currentUser && profile === null;
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setSaving(true);
    setSuccess(false);
    try {
      if (isNewUser) {
        if (!userType) return;
        await createProfile(userType as UserType, displayName || undefined);
        router.push("/dashboard");
      } else {
        await setProfile({
          displayName: displayName || undefined,
          userType: userType ? (userType as UserType) : undefined,
        });
        setSuccess(true);
      }
    } catch {
      // Error handled by hook
    } finally {
      setSaving(false);
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <DashboardLayout title="Account">
      <div className="max-w-2xl space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Account</h2>
          <p className="text-muted-foreground">
            {isNewUser
              ? "Complete your profile to get started"
              : "Manage your account settings"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {isNewUser ? "Set Up Your Profile" : "Profile Information"}
            </CardTitle>
            <CardDescription>
              {isNewUser
                ? "Tell us a bit about yourself. Parents can add student profiles later."
                : "Update your display name and account type."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={currentUser.email ?? ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email is managed by your account provider.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div className="space-y-2">
                <Label>Account Type</Label>
                <Select
                  value={userType}
                  onValueChange={(v) => setUserType(v as UserType)}
                  required={!!isNewUser}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Parents can manage multiple student profiles. Students use a
                  single profile.
                </p>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
                  Profile updated successfully.
                </div>
              )}

              <Button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : isNewUser
                    ? "Continue"
                    : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
