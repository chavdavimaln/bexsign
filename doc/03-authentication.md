# 03 — Authentication Module

## Workflows
1. **Login (`/login`)**: Supports Email/Username and Password. Emits JWT upon success.
2. **Registration (`/register`)**: Collects First Name, Last Name, Email, Password, Company, Phone.
3. **Forgot Password (`/forgot-password`)**: Generates secure reset token & dispatches verification email.
4. **Session Verification**: Middleware validates Bearer token on all protected REST endpoints.
