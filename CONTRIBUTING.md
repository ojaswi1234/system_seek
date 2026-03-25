# Contributing to DriftSeeker

Thank you for your interest in contributing to DriftSeeker! DriftSeeker is a DevOps dashboard for uptime monitoring, configuration drift detection, and recovery tooling. We welcome contributions across the frontend, backend, infrastructure, and integrations.

---

## Prerequisites

Before you start, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **Redis** (Monitor loops rely heavily on Redis pub/sub)
- **MongoDB** (Local or Atlas)
- **Docker** (For testing drift detection locally)

---

## Local Development Setup

1. **Fork & Clone**
   Fork the repository to your GitHub account and clone it locally:

    ```bash
    git clone https://github.com/your-username/driftseeker.git
    cd driftseeker
    ```

2. **Install Dependencies**

    ```bash
    npm install
    ```

3. **Environment Configuration**
   Copy the example environment file:
   
    ```bash
    cp .env.example .env.local
    ```

   Fill in your `.env.local`:
    ```env
   GITHUB_ID=your_github_client_id
   GITHUB_SECRET=your_github_client_secret
   NEXTAUTH_URL=http://localhost:<port>/api/auth/callback/github
   NEXTAUTH_SECRET=supersecretkey
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>mongodb.net/<database-name>?retryWrites=true&w=majority
   REDIS_URL=redis://default:password@127.0.0.1:<port>
    ```

4. **Start Infrastructure**
   Ensure MongoDB and Redis are running. If you have Docker:
   ```bash
   docker run -d -p 6379:6379 redis
   # Start Mongo as well if needed
   ```

5. **Run Development Server**

    ```bash
    npm run dev
    ```

---

## Contribution Workflow

1. **Create a Branch**
   Always create a new branch for your work:
    ```bash
    git checkout -b feature/my-new-feature
    # or
    git checkout -b fix/bug-fix-name
    ```

2. **Backend & Architecture**
   - **Frontend**: Next.js (App Router).
   - **Cache**: Redis. Minimize queries and prefer batching.
   - **Database**: MongoDB.
   - **Background Jobs**: Ensure async/non-blocking behavior for monitoring loops and drift detection.

3. **Commit Changes**
   Write clear, descriptive commit messages:
    ```bash
    git commit -m "feat: add real-time latency monitoring"
    ```

4. **Push & PR**
    ```bash
    git push origin feature/my-new-feature
    ```
   Open a Pull Request to the `main` branch.

---

## Pull Request Guidelines

- **Scope**: Keep PRs focused on a single feature or fix.
- **Description**: Clearly describe what your PR does.
- **Testing**: Include steps to test your changes.
- **Performance**: Ensure no regressions (e.g., unnecessary React re-renders, blocking Redis calls).

### Specific Considerations

- **Redis**: Use efficient data structures.
- **WebSockets**: Keep payloads small.
- **Docker/Jenkins**: Handle long-running tasks asynchronously.

---

## Coding Standards

- **TypeScript**: Use strict typing. Avoid `any`.
- **Styling**: Use Tailwind CSS.
- **Logic**: Keep business logic separate from UI components.
- **Secrets**: Never commit `.env.local` or hardcode secrets.

---

## Reporting Issues

When reporting bugs, please include:
- OS and Browser version.
- Steps to reproduce.
- Expected vs. Actual behavior.
- Logs or screenshots.

---

## Feature Requests

We love new ideas! Please include:
- Problem statement.
- Proposed solution.
- System impact (frontend/backend/cache).

---

## Documentation

- Update documentation when behavior changes.
- Comment complex logic.
- Keep the `README.md` accurate.

---

Happy coding! 🚀