
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import {
  clearProfileError,
  clearProfileSuccess,
  updateUserProfile,
} from "@/store/auth/authSlice";
import styles from "./edit.module.css";

export default function EditProfilePage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const {
    user,
    initialized,
    restoring,
    profileUpdating,
    profileError,
  } = useSelector((state) => state.auth);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setBio(user.bio || "");
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    dispatch(clearProfileError());
    dispatch(clearProfileSuccess());
  }, [dispatch]);

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setFormError("");

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFormError("Choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError("The image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    const nextPreview = URL.createObjectURL(file);
    setPreview(nextPreview);
    setPhoto(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    dispatch(clearProfileError());

    const cleanName = name.trim();
    const cleanBio = bio.trim();

    if (!cleanName) {
      setFormError("Please enter your name.");
      return;
    }

    if (cleanName.length > 80) {
      setFormError("Your name must be 80 characters or fewer.");
      return;
    }

    if (cleanBio.length > 300) {
      setFormError("Your bio must be 300 characters or fewer.");
      return;
    }

    const formData = new FormData();
    formData.append("name", cleanName);
    formData.append("bio", cleanBio);

    if (photo) {
      formData.append("profileImage", photo);
    }

    try {
      await dispatch(updateUserProfile(formData)).unwrap();
      router.push("/profile");
      router.refresh();
    } catch {
      // The Redux slice supplies the API error through profileError.
    }
  }

  if (!initialized || restoring) {
    return <main className={styles.page}>Loading your profile...</main>;
  }

  if (!user) {
    return (
      <main className={styles.page}>
        <h1>Please sign in first</h1>
        <Link href="/login">Sign in</Link>
      </main>
    );
  }

  const imageUrl = preview || user.profileImage || "";
  const initial = (name || user.name || "U").trim().charAt(0).toUpperCase();

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/profile" className={styles.backLink}>
          ← Back to profile
        </Link>

        <header className={styles.header}>
          <p className={styles.eyebrow}>YOUR ACCOUNT</p>
          <h1>Edit profile</h1>
          <p>Make changes to your personal information.</p>
        </header>

        <form className={styles.card} onSubmit={handleSubmit}>
          <div className={styles.photoSection}>
            <div className={styles.avatar}>
              {imageUrl ? (
                <img src={imageUrl} alt="Profile preview" />
              ) : (
                <span>{initial}</span>
              )}
            </div>

            <div className={styles.photoControls}>
              <label htmlFor="profileImage">Profile photo</label>
              <input
                ref={fileInputRef}
                id="profileImage"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
              />
              <p>JPG, PNG, or WebP · Maximum 5 MB</p>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              autoComplete="name"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="email">Email address</label>
            <input id="email" value={user.email || ""} disabled readOnly />
            <p>Email address cannot be changed here.</p>
          </div>

          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label htmlFor="bio">About you</label>
              <span>{bio.length}/300</span>
            </div>

            <textarea
              id="bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={300}
              rows={4}
              placeholder="Tell us about yourself..."
            />
          </div>

          {(formError || profileError) && (
            <p className={styles.error} role="alert">
              {formError || profileError}
            </p>
          )}

          <div className={styles.actions}>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={profileUpdating}
            >
              {profileUpdating ? "Saving..." : "Save changes"}
            </button>

            <Link href="/profile" className={styles.cancelButton}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
