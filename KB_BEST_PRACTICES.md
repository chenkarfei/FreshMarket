# PasarHub Authentication Best Practices

This document outlines the two authentication methods available in PasarHub and provides best practices for onboarding new restaurants and managing staff access.

## Available Authentication Methods

PasarHub supports two secure ways for users to log in:

1. **Sign in with Google (Recommended for Owners)**
2. **Standard Email & Password (Recommended for Kitchen Staff)**

Both methods are secure and fully integrated into the Firebase backend.

---

## 1. Sign in with Google

This method uses the user's existing Google account to authenticate.

*   **Best For:** Restaurant Owners, Admins, and Super Admins.
*   **How it works:** The user clicks "Sign in with Google", selects their Google account, and is immediately logged in.
*   **Pros:** No passwords to remember, highly secure (backed by Google's security), one-click login.
*   **Cons:** Requires the user to use their personal or business Gmail account on the device. Not ideal for shared kitchen tablets.

### How to Onboard a User (Google Login)
1. Go to the **Super Admin Dashboard**.
2. Click **Add New User**.
3. Enter their Name, Role, and their **exact Gmail address**.
4. Leave the **Password** field **blank**.
5. Save the user.
6. Tell the user: *"Go to PasarHub and click 'Sign in with Google' using your email."*

---

## 2. Standard Email & Password

This method uses a custom password created by the Super Admin specifically for PasarHub.

*   **Best For:** Kitchen Staff, Head Chefs, and Shared Devices (e.g., a tablet mounted in the kitchen).
*   **How it works:** The user types in their email and the custom password provided by the Super Admin.
*   **Pros:** Perfect for shared devices. The owner doesn't have to log into their personal Gmail on the kitchen tablet. Multiple staff members can use the same login.
*   **Cons:** Requires managing a password.

### How to Onboard a User (Email & Password)
1. Go to the **Super Admin Dashboard**.
2. Click **Add New User**.
3. Enter their Name, Role, and an Email address (e.g., `kitchen@restaurant.com`).
4. Enter a secure **Password** (e.g., `Order123!`).
5. Save the user.
6. Tell the restaurant: *"Your login is `kitchen@restaurant.com` and your password is `Order123!`. You can use this on the kitchen tablet."*

---

## Frequently Asked Questions

### What if a user enters their real Gmail password into the Standard Login form?
It will fail. The Standard Login form only accepts the custom password created in the Super Admin dashboard. If they want to use their real Gmail password, they must click the "Sign in with Google" button.

### Can a user use both methods?
Yes! If you create an account with a Gmail address (e.g., `boss@gmail.com`) and assign it a password (e.g., `PasarHub2026!`), that user can log in using *either* method. Firebase is smart enough to link the accounts securely.

### How do I enable Email & Password login in Firebase?
If you haven't already, you must enable this feature in your Firebase Console:
1. Go to your [Firebase Console](https://console.firebase.google.com/).
2. Select your project.
3. Click on **Authentication** in the left sidebar.
4. Go to the **Sign-in method** tab.
5. Click **Add new provider** and select **Email/Password**.
6. Enable the first toggle (Email/Password) and click **Save**.

### Why does the Super Admin dashboard use a "Secondary Auth" instance?
When you create a new user with an Email and Password using the standard Firebase tools, Firebase automatically logs *you* out and logs the *new user* in. To prevent this annoying behavior, PasarHub spins up a temporary "Secondary" Firebase instance in the background just to create the account, ensuring your Super Admin session is never interrupted.
