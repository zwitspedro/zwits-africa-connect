import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordField, SubmitButton } from "@/components/auth/auth-ui";
import { supabase } from "@/integrations/supabase/client";

const title = "Set a new password — Zwits";
const description = "Choose a new password for your Zwits account.";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Use at least 8 characters.");
    if (password !== confirm) return toast.error("Passwords don't match.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/login", replace: true });
  };

  return (
    <AuthShell
      variant="customer"
      title="Set a new password"
      subtitle="Choose a strong password you don't use anywhere else. You'll stay signed in on this device."
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to login
        </Link>
      }
    >
      <form className="grid gap-4" onSubmit={submit}>
        <PasswordField
          label="New password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          hint="At least 8 characters"
          required
        />
        <PasswordField
          label="Confirm new password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          required
        />
        <SubmitButton loading={loading}>Update password</SubmitButton>
      </form>
    </AuthShell>
  );
}
