"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch, messageFromError, setTokens, getTokens, ApiError, SessionExpiredError } from "@/lib/api-client";
import { Address, AddressFormValues, blankAddressForm, User } from "@/lib/types";

// All state and business logic for the Auth + Profile + Address flow,
// extracted 1:1 out of the old single-file app/page.tsx so the split
// components can stay presentational. Every network call goes through
// apiFetch (lib/api-client.ts) — nothing here calls fetch() directly.
export function useAccount() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"email" | "otp">("email");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [authLanding, setAuthLanding] = useState(true);

  const [editProfile, setEditProfile] = useState(false);
  const [profile, setProfile] = useState({ fullName: "", gender: "", dob: "" });

  const [addressForm, setAddressForm] = useState<AddressFormValues | null>(null);
  const [editingAddress, setEditingAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setInterval(() => setCooldown((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (stage === "otp" || !authLanding) {
      setAuthLanding(false);
      return;
    }
    const timer = window.setTimeout(() => setAuthLanding(false), 3900);
    return () => window.clearTimeout(timer);
  }, [stage, authLanding]);

  const initials = useMemo(
    () =>
      (user?.name || user?.email || "S")
        .split(/\s|@/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0])
        .join("")
        .toUpperCase(),
    [user]
  );

  const clearFeedback = () => {
    setError("");
    setNotice("");
  };

  const resetToSignedOut = () => {
    setTokens(null);
    setIsAuthenticated(false);
    setUser(null);
    setAddresses([]);
    setOtp("");
    setStage("email");
  };

  // Wraps apiFetch for the authenticated endpoints: forces a full local
  // sign-out if a refresh attempt fails mid-request, same as the original
  // inline api() helper did.
  async function authedFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    try {
      return await apiFetch<T>(path, options);
    } catch (e) {
      if (e instanceof SessionExpiredError) resetToSignedOut();
      throw e;
    }
  }

  const loadAccount = async () => {
    const [me, list] = await Promise.all([
      authedFetch<User>("/users/me"),
      authedFetch<{ data: Address[] }>("/users/me/addresses"),
    ]);
    setUser(me);
    setProfile({ fullName: me.name || "", gender: me.gender || "", dob: me.dob || "" });
    setAddresses(list.data || []);
  };

  const sendOtp = async (e: FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setBusy(true);
    try {
      const body = await apiFetch<{ success: boolean; message: string }>(
        "/auth/send-otp",
        { method: "POST", body: JSON.stringify({ email }) },
        { auth: false }
      );
      setStage("otp");
      setCooldown(60);
      setNotice(body.message || "A verification code is on its way.");
    } catch (e) {
      if (e instanceof ApiError && e.retryAfterSeconds) setCooldown(e.retryAfterSeconds);
      setError(messageFromError(e));
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setBusy(true);
    try {
      const body = await apiFetch<{ accessToken: string; refreshToken: string; user: User }>(
        "/auth/verify-otp",
        { method: "POST", body: JSON.stringify({ email, otp }) },
        { auth: false }
      );
      setTokens({ accessToken: body.accessToken, refreshToken: body.refreshToken });
      setIsAuthenticated(true);
      setUser(body.user);
      setProfile({ fullName: body.user.name || "", gender: "", dob: "" });
      setTimeout(() => loadAccount(), 0);
    } catch {
      // Deliberately a fixed message here, not the server's — matches the
      // original behavior of never surfacing the raw verify-otp error text.
      setError("That code is invalid or expired. Please resend a new one.");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async (callApi = true) => {
    const tokens = getTokens();
    if (callApi && tokens) {
      try {
        await apiFetch("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken: tokens.refreshToken }) });
      } catch (e) {
        // A non-2xx logout response is ignored, same as before (the old
        // code never checked response.ok here) — only a network-level
        // failure should propagate.
        if (!(e instanceof ApiError)) throw e;
      } finally {
        resetToSignedOut();
      }
    } else {
      resetToSignedOut();
    }
  };

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setBusy(true);
    try {
      const data: Record<string, string> = {};
      if (profile.fullName !== (user?.name || "")) data.fullName = profile.fullName;
      if (profile.gender !== (user?.gender || "")) data.gender = profile.gender;
      if (profile.dob !== (user?.dob || "")) data.dob = profile.dob;
      const result = await authedFetch<{ data: User }>("/users/me", { method: "PATCH", body: JSON.stringify(data) });
      setUser(result.data);
      setEditProfile(false);
      setNotice("Your profile has been updated.");
    } catch (e) {
      setError(messageFromError(e));
    } finally {
      setBusy(false);
    }
  };

  const beginAddress = (a?: Address) => {
    clearFeedback();
    setEditingAddress(a?.id || null);
    setAddressForm(
      a
        ? {
            label: a.label || "",
            addressLine1: a.addressLine1,
            addressLine2: a.addressLine2 || "",
            city: a.city,
            state: a.state,
            postalCode: a.postalCode,
            latitude: a.latitude?.toString() || "",
            longitude: a.longitude?.toString() || "",
            isDefault: a.isDefault,
          }
        : blankAddressForm
    );
  };

  const saveAddress = async (e: FormEvent) => {
    e.preventDefault();
    if (!addressForm) return;
    clearFeedback();
    setBusy(true);
    try {
      const data: Record<string, string | boolean | number> = { ...addressForm };
      if (data.latitude === "") delete data.latitude;
      else data.latitude = Number(data.latitude);
      if (data.longitude === "") delete data.longitude;
      else data.longitude = Number(data.longitude);

      const result = await authedFetch<{ data?: Address } & Partial<Address>>(
        editingAddress ? `/users/me/addresses/${editingAddress}` : "/users/me/addresses",
        { method: editingAddress ? "PATCH" : "POST", body: JSON.stringify(data) }
      );
      const saved = (result.data || result) as Address;
      setAddresses((all) =>
        editingAddress
          ? all.map((a) => (a.id === editingAddress ? saved : saved.isDefault ? { ...a, isDefault: false } : a))
          : [...all.map((a) => (saved.isDefault ? { ...a, isDefault: false } : a)), saved]
      );
      setAddressForm(null);
      setEditingAddress(null);
      setNotice(editingAddress ? "Address updated." : "Address saved.");
    } catch (e) {
      setError(messageFromError(e));
    } finally {
      setBusy(false);
    }
  };

  const removeAddress = async (id: string) => {
    if (!window.confirm("Remove this saved address?")) return;
    clearFeedback();
    try {
      await authedFetch(`/users/me/addresses/${id}`, { method: "DELETE" });
      setAddresses((all) => all.filter((a) => a.id !== id));
      setNotice("Address removed.");
    } catch (e) {
      setError(messageFromError(e));
    }
  };

  return {
    // auth screen
    email,
    setEmail,
    otp,
    setOtp,
    stage,
    setStage,
    authLanding,
    sendOtp,
    verifyOtp,
    clearFeedback,
    // shared
    isAuthenticated,
    user,
    initials,
    busy,
    cooldown,
    error,
    notice,
    signOut,
    // profile
    editProfile,
    setEditProfile,
    profile,
    setProfile,
    saveProfile,
    // addresses
    addresses,
    addressForm,
    setAddressForm,
    editingAddress,
    setEditingAddress,
    beginAddress,
    saveAddress,
    removeAddress,
  };
}

export type UseAccountReturn = ReturnType<typeof useAccount>;
